/**
 * replanner.js
 *
 * Disruption / Replanning Engine for Placement Week Scheduler
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STRATEGY: Surgical Replanning — NOT full regeneration
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Phase 1 — Impact Analysis
 *   Identify only the interviews directly broken by the disruption type.
 *   Every other scheduled interview is "locked" and untouched.
 *
 * Phase 2 — State Reconstruction
 *   Load ALL locked interviews into in-memory slot Maps (studentSlots,
 *   panelSlots, roomSlots), excluding affected interviews so we have a
 *   clear view of committed capacity.
 *
 * Phase 3 — Scored Rescheduling
 *   For each affected interview, enumerate ALL feasible candidate slots
 *   across all valid company days and panels.  Score each candidate with
 *   the disruption-penalty function.  Pick the lowest-scoring feasible
 *   candidate, or mark the interview cancelled if none exists.
 *
 * Phase 4 — Diff Generation
 *   Resolve all ObjectIds to human-readable names and build the diff via
 *   replanDiff.buildDiff().
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SCORING FUNCTION (lower = better, minimises disruption):
 *
 *   score = dayChangePenalty        (0 if same day,    +50 if day changed)
 *         + panelChangePenalty      (0 if same panel,  +20 if panel changed)
 *         + roomChangePenalty       (0 if same room,   +10 if room changed)
 *         + waitingTimePenalty      (+1 per 5 min later than original start)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DISRUPTION TYPES:
 *   COMPANY_DELAY     — company starts N minutes late; pre-delay interviews broken
 *   PANEL_DROP        — one panel gone; all its interviews affected
 *   ROOM_UNAVAILABLE  — one room gone for a given day; interviews in it affected
 *   STUDENT_WITHDRAW  — student withdraws; all their interviews cancelled (freeing slots)
 *
 * HARD CONSTRAINTS (never violated):
 *   • No student double-booking
 *   • No room double-booking
 *   • No panel double-booking
 *   • Interview must be within company operating window
 *   • Interview must not use a dropped panel / unavailable room
 */

const Interview = require('../models/Interview');
const Company   = require('../models/Company');
const Room      = require('../models/Room');
const Panel     = require('../models/Panel');
const Student   = require('../models/Student');

const {
  toMinutes,
  toTimeStr,
  isStudentFree,
  isPanelFree,
  findFreeRoom,
  bookStudentSlot,
  bookPanelSlot,
  bookRoomSlot,
  isWithinCompanyWindow
} = require('./conflictDetector');

const { buildDiff, formatSummaryLine } = require('./replanDiff');

// ---------------------------------------------------------------------------
// Constants — match scheduler.js
// ---------------------------------------------------------------------------
const SLOT_INCREMENT = 5;   // minutes between probe points inside a day
const DAY_START_DEFAULT = '09:00';
const DAY_END_DEFAULT   = '18:00';

// ---------------------------------------------------------------------------
// Scoring weights (explainable — each tuned to reflect real disruption cost)
// ---------------------------------------------------------------------------
const SCORE = {
  DAY_CHANGE:    50,   // Moving to a different day is most disruptive
  PANEL_CHANGE:  20,   // Changing panel disrupts company interviewer logistics
  ROOM_CHANGE:   10,   // Changing room is a minor physical inconvenience
  WAIT_PER_5MIN:  1    // Penalise later-in-day slots (student waiting time)
};

// ---------------------------------------------------------------------------
// Helper: build in-memory slot Maps from locked (unaffected) interview docs
// Slots belonging to affectedIdSet are excluded — they are being replanned.
// If a room is declared unavailable, its entire day is blocked in roomSlots.
// ---------------------------------------------------------------------------
function buildSlotMaps(allScheduled, affectedIdSet, disruptedRoomId, disruptedDay) {
  const studentSlots = new Map();
  const panelSlots   = new Map();
  const roomSlots    = new Map();

  for (const iv of allScheduled) {
    const ivId = iv._id.toString();

    // Skip affected interviews — their slots are freed for replanning
    if (affectedIdSet.has(ivId)) continue;

    const sid = iv.student.toString();
    const pid = iv.panel  ? iv.panel.toString()  : null;
    const rid = iv.room   ? iv.room.toString()   : null;
    const { day }    = iv;
    const startMin   = toMinutes(iv.startTime);
    const endMin     = toMinutes(iv.endTime);

    // Student slot
    const sk = `${sid}:${day}`;
    if (!studentSlots.has(sk)) studentSlots.set(sk, []);
    studentSlots.get(sk).push({ start: startMin, end: endMin });

    // Panel slot
    if (pid) {
      const pk = `${pid}:${day}`;
      if (!panelSlots.has(pk)) panelSlots.set(pk, []);
      panelSlots.get(pk).push({ start: startMin, end: endMin });
    }

    // Room slot
    if (rid) {
      const rk = `${rid}:${day}`;
      if (!roomSlots.has(rk)) roomSlots.set(rk, []);
      roomSlots.get(rk).push({ start: startMin, end: endMin });
    }
  }

  // Block the entire unavailable room day (09:00–18:00 = 540–1080)
  // This prevents any new assignment to the disrupted room on the disrupted day.
  if (disruptedRoomId && disruptedDay) {
    const rk = `${disruptedRoomId}:${disruptedDay}`;
    if (!roomSlots.has(rk)) roomSlots.set(rk, []);
    // Full day block
    roomSlots.get(rk).push({ start: 540, end: 1080 });
  }
  // If disruptedRoomId but NO day → block all 4 days
  if (disruptedRoomId && !disruptedDay) {
    for (let d = 1; d <= 4; d++) {
      const rk = `${disruptedRoomId}:${d}`;
      if (!roomSlots.has(rk)) roomSlots.set(rk, []);
      roomSlots.get(rk).push({ start: 540, end: 1080 });
    }
  }

  return { studentSlots, panelSlots, roomSlots };
}

// ---------------------------------------------------------------------------
// Scoring: compute disruption penalty for a candidate placement
// ---------------------------------------------------------------------------
function scoreCandidate(original, candidateDay, candidatePanel, candidateRoom, candidateStart) {
  let score = 0;

  // Day change penalty
  if (original.day !== candidateDay) score += SCORE.DAY_CHANGE;

  // Panel change penalty
  const origPanel = original.panel ? original.panel.toString() : null;
  const candPanel = candidatePanel ? candidatePanel._id.toString() : null;
  if (origPanel !== candPanel) score += SCORE.PANEL_CHANGE;

  // Room change penalty
  const origRoom = original.room ? original.room.toString() : null;
  const candRoom = candidateRoom ? candidateRoom._id.toString() : null;
  if (origRoom !== candRoom) score += SCORE.ROOM_CHANGE;

  // Waiting time penalty: penalise slots later than the original start time.
  // Use 0 as fallback if original had no startTime.
  const origStart   = original.startTime ? toMinutes(original.startTime) : toMinutes(DAY_START_DEFAULT);
  const waitBlocks  = Math.max(0, Math.floor((candidateStart - origStart) / 5));
  score += waitBlocks * SCORE.WAIT_PER_5MIN;

  return score;
}

// ---------------------------------------------------------------------------
// Find the best feasible slot for a single affected interview.
// Exhaustively probes every SLOT_INCREMENT position within each valid
// (day, panel) combination to guarantee the global minimum-score assignment.
// Returns { day, panel, room, startMin, endMin, score } or null if no slot.
// ---------------------------------------------------------------------------
function findBestSlot(
  affectedInterview,
  company,
  allPanels,          // all panels belonging to this company
  allRooms,           // available rooms (may exclude disrupted room)
  droppedPanelId,     // null unless PANEL_DROP; this panel is excluded
  effectiveWindowStart, // "HH:MM" — may differ from company.operatingHours.start for COMPANY_DELAY
  studentSlots,
  panelSlots,
  roomSlots
) {
  const sid        = affectedInterview.student.toString();
  const duration   = company.interviewDuration;
  const dayEnd     = toMinutes(company.operatingHours.end || DAY_END_DEFAULT);
  const dayStart   = toMinutes(effectiveWindowStart);

  let best = null; // { day, panel, room, startMin, endMin, score }

  for (const day of company.operatingDays) {
    // Panels available on this day — exclude the dropped panel
    const dayPanels = allPanels.filter(p =>
      p.operatingDays.includes(day) &&
      (!droppedPanelId || p._id.toString() !== droppedPanelId)
    );

    if (dayPanels.length === 0) continue;

    for (const panel of dayPanels) {
      const pid = panel._id.toString();

      // Exhaustive probe of every slot from dayStart to dayEnd - duration
      let tryStart = dayStart;

      while (tryStart + duration <= dayEnd) {
        const tryEnd = tryStart + duration;

        // Hard constraint: operating window
        if (!isWithinCompanyWindow(
          effectiveWindowStart,
          company.operatingHours.end || DAY_END_DEFAULT,
          tryStart, tryEnd
        )) {
          break; // No point going further; window is exceeded
        }

        // Hard constraint: panel must be free
        if (!isPanelFree(panelSlots, pid, day, tryStart, tryEnd)) {
          tryStart += SLOT_INCREMENT;
          continue;
        }

        // Hard constraint: student must be free
        if (!isStudentFree(studentSlots, sid, day, tryStart, tryEnd)) {
          tryStart += SLOT_INCREMENT;
          continue;
        }

        // Hard constraint: a room must be free
        const freeRoom = findFreeRoom(roomSlots, allRooms, day, tryStart, tryEnd);
        if (!freeRoom) {
          tryStart += SLOT_INCREMENT;
          continue;
        }

        // ✅ All constraints satisfied — compute disruption score
        const s = scoreCandidate(affectedInterview, day, panel, freeRoom, tryStart);

        if (best === null || s < best.score) {
          best = { day, panel, room: freeRoom, startMin: tryStart, endMin: tryEnd, score: s };
        }

        // Advance by SLOT_INCREMENT to find next candidate for this (day, panel)
        tryStart += SLOT_INCREMENT;
      }
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Phase 1 helpers — determine affected interviews per disruption type
// ---------------------------------------------------------------------------

async function getAffectedForCompanyDelay(companyId, company, delayMinutes, affectedDays) {
  const query = { company: companyId, status: 'scheduled' };
  if (affectedDays && affectedDays.length > 0) {
    query.day = { $in: affectedDays };
  }
  const candidates = await Interview.find(query).lean();

  // Effective new start = company's own start + delay
  const baseStart = toMinutes(company.operatingHours.start || DAY_START_DEFAULT);
  const newStart  = baseStart + delayMinutes;

  // Any interview that begins BEFORE the new effective start is broken
  return candidates.filter(iv => toMinutes(iv.startTime) < newStart);
}

async function getAffectedForPanelDrop(panelId) {
  return Interview.find({ panel: panelId, status: 'scheduled' }).lean();
}

async function getAffectedForRoomUnavailable(roomId, day) {
  const query = { room: roomId, status: 'scheduled' };
  if (day) query.day = day;
  return Interview.find(query).lean();
}

async function getAffectedForStudentWithdraw(studentId) {
  return Interview.find({ student: studentId, status: 'scheduled' }).lean();
}

// ---------------------------------------------------------------------------
// Entity name resolution — for human-readable diff output
// ---------------------------------------------------------------------------
async function buildEntityMaps(affectedInterviews, changes) {
  // Collect all IDs that appear in the change set
  const studentIds = new Set();
  const companyIds = new Set();
  const panelIds   = new Set();
  const roomIds    = new Set();

  for (const iv of affectedInterviews) {
    if (iv.student) studentIds.add(iv.student.toString());
    if (iv.company) companyIds.add(iv.company.toString());
    if (iv.panel)   panelIds.add(iv.panel.toString());
    if (iv.room)    roomIds.add(iv.room.toString());
  }

  // Also include new panel/room assignments from the changes
  for (const c of changes) {
    if (c.after) {
      if (c.after.panel) panelIds.add(c.after.panel.toString());
      if (c.after.room)  roomIds.add(c.after.room.toString());
    }
  }

  // Bulk fetch from MongoDB
  const [students, companies, panels, rooms] = await Promise.all([
    Student.find({ _id: { $in: [...studentIds] } }, 'name rollNumber').lean(),
    Company.find({ _id: { $in: [...companyIds] } }, 'name').lean(),
    Panel.find(  { _id: { $in: [...panelIds]   } }, 'name panelNumber').lean(),
    Room.find(   { _id: { $in: [...roomIds]    } }, 'roomNumber').lean()
  ]);

  const studentNames = new Map(students.map(s => [s._id.toString(), `${s.name} (${s.rollNumber})`]));
  const companyNames = new Map(companies.map(c => [c._id.toString(), c.name]));
  const panelNames   = new Map(panels.map(p   => [p._id.toString(), p.name]));
  const roomNames    = new Map(rooms.map(r    => [r._id.toString(), r.roomNumber]));

  return { studentNames, companyNames, panelNames, roomNames };
}

// ---------------------------------------------------------------------------
// Main replanning function
// ---------------------------------------------------------------------------

async function runReplanner(disruption) {
  const { type } = disruption;
  const startTime = Date.now();

  // ------------------------------------------------------------------
  // 1. Validate disruption & load context
  // ------------------------------------------------------------------
  let company           = null;
  let droppedPanel      = null;
  let disruptedRoom     = null;
  let disruptedStudent  = null;
  let affectedInterviews = [];
  let disruptionDescription = '';

  if (type === 'COMPANY_DELAY') {
    const { companyId, delayMinutes, affectedDays } = disruption;
    if (!companyId || !delayMinutes) {
      throw new Error('COMPANY_DELAY requires companyId and delayMinutes');
    }
    company = await Company.findById(companyId).lean();
    if (!company) throw new Error(`Company ${companyId} not found`);

    const days = (affectedDays && affectedDays.length > 0)
      ? affectedDays
      : company.operatingDays;

    affectedInterviews = await getAffectedForCompanyDelay(companyId, company, delayMinutes, days);

    const baseStart  = toMinutes(company.operatingHours.start || DAY_START_DEFAULT);
    const newStart   = toTimeStr(baseStart + delayMinutes);
    disruptionDescription = `${company.name} delayed ${delayMinutes} min (new start: ${newStart}) on day(s) ${days.join(', ')}`;

  } else if (type === 'PANEL_DROP') {
    const { panelId } = disruption;
    if (!panelId) throw new Error('PANEL_DROP requires panelId');

    droppedPanel = await Panel.findById(panelId).lean();
    if (!droppedPanel) throw new Error(`Panel ${panelId} not found`);

    company = await Company.findById(droppedPanel.company).lean();
    if (!company) throw new Error(`Company for panel ${panelId} not found`);

    affectedInterviews = await getAffectedForPanelDrop(panelId);
    disruptionDescription = `Panel "${droppedPanel.name}" (${company.name}) dropped — ${affectedInterviews.length} interviews affected`;

  } else if (type === 'ROOM_UNAVAILABLE') {
    const { roomId, day } = disruption;
    if (!roomId) throw new Error('ROOM_UNAVAILABLE requires roomId');

    disruptedRoom = await Room.findById(roomId).lean();
    if (!disruptedRoom) throw new Error(`Room ${roomId} not found`);

    affectedInterviews = await getAffectedForRoomUnavailable(roomId, day || null);
    const dayLabel = day ? `on day ${day}` : '(all days)';
    disruptionDescription = `Room "${disruptedRoom.roomNumber}" unavailable ${dayLabel} — ${affectedInterviews.length} interviews affected`;

  } else if (type === 'STUDENT_WITHDRAW') {
    const { studentId } = disruption;
    if (!studentId) throw new Error('STUDENT_WITHDRAW requires studentId');

    disruptedStudent = await Student.findById(studentId).lean();
    if (!disruptedStudent) throw new Error(`Student ${studentId} not found`);

    affectedInterviews = await getAffectedForStudentWithdraw(studentId);
    disruptionDescription = `Student "${disruptedStudent.name}" (${disruptedStudent.rollNumber}) withdrew — ${affectedInterviews.length} interviews cancelled`;

  } else {
    throw new Error(
      `Unknown disruption type: "${type}". Valid types: COMPANY_DELAY | PANEL_DROP | ROOM_UNAVAILABLE | STUDENT_WITHDRAW`
    );
  }

  // ------------------------------------------------------------------
  // STUDENT_WITHDRAW — special case: cancel all, no rescheduling
  // ------------------------------------------------------------------
  if (type === 'STUDENT_WITHDRAW') {
    // Snapshot total scheduled BEFORE updating (avoid race condition)
    const originalTotal = await Interview.countDocuments({ status: 'scheduled' });

    const affectedIds = affectedInterviews.map(iv => iv._id);
    await Interview.updateMany(
      { _id: { $in: affectedIds } },
      { $set: { status: 'cancelled', unscheduledReason: 'STUDENT_WITHDREW' } }
    );

    const rawChanges = affectedInterviews.map(iv => ({
      action:       'CANCELLED',
      interviewId:  iv._id,
      reason:       'STUDENT_WITHDREW',
      student:      iv.student,
      company:      iv.company,
      originalDay:  iv.day,
      originalTime: iv.startTime ? `${iv.startTime}–${iv.endTime}` : null,
      originalPanel: iv.panel,
      originalRoom:  iv.room
    }));

    // Build human-readable diff
    const entityMaps = await buildEntityMaps(affectedInterviews, rawChanges);
    const diff = buildDiff(rawChanges, entityMaps);

    const churnPct = originalTotal > 0
      ? `${((affectedInterviews.length / originalTotal) * 100).toFixed(2)}%`
      : '0.00%';

    return {
      success: true,
      disruption: {
        type,
        description: disruptionDescription,
        input: disruption
      },
      summary: {
        affectedInterviews: affectedInterviews.length,
        moved:     0,
        cancelled: affectedInterviews.length,
        preserved: originalTotal - affectedInterviews.length,
        totalScheduledAfterReplan: originalTotal - affectedInterviews.length,
        replanChurn:            churnPct,
        affectedStudentCount:   1,
        affectedRoomCount:      [...new Set(affectedInterviews.filter(iv => iv.room).map(iv => iv.room.toString()))].length,
        affectedPanelCount:     [...new Set(affectedInterviews.filter(iv => iv.panel).map(iv => iv.panel.toString()))].length
      },
      diff: diff,
      rawChanges,
      executionTimeMs: Date.now() - startTime
    };
  }

  // ------------------------------------------------------------------
  // 2. Build affected ID set & reconstruct slot state from locked interviews
  // ------------------------------------------------------------------
  const affectedIdSet = new Set(affectedInterviews.map(iv => iv._id.toString()));

  // Load ALL currently-scheduled interviews for slot state reconstruction
  const allScheduled = await Interview.find({ status: 'scheduled' }).lean();

  const disruptedRoomId  = disruptedRoom ? disruptedRoom._id.toString() : null;
  const disruptedRoomDay = type === 'ROOM_UNAVAILABLE' ? (disruption.day || null) : null;

  const { studentSlots, panelSlots, roomSlots } = buildSlotMaps(
    allScheduled,
    affectedIdSet,
    disruptedRoomId,
    disruptedRoomDay
  );

  // ------------------------------------------------------------------
  // 3. Load rooms & company context for rescheduling
  // ------------------------------------------------------------------
  const allRooms = await Room.find({}).lean();

  // For ROOM_UNAVAILABLE: the disrupted room stays in allRooms but its slots
  // are fully blocked inside roomSlots (done in buildSlotMaps above).
  // findFreeRoom will skip it because the day-block is in the map.
  // No need to filter allRooms — the slot map already handles exclusion.

  // Build company / panels maps for all involved companies
  const involvedCompanyIds = [...new Set(affectedInterviews.map(iv => iv.company.toString()))];

  const [involvedCompanies, allPanelsForInvolved] = await Promise.all([
    Company.find({ _id: { $in: involvedCompanyIds } }).lean(),
    Panel.find({ company: { $in: involvedCompanyIds } }).lean()
  ]);

  const companiesMap   = new Map();
  const panelsByCompany = new Map();

  involvedCompanies.forEach(c => companiesMap.set(c._id.toString(), c));
  allPanelsForInvolved.forEach(p => {
    const cid = p.company.toString();
    if (!panelsByCompany.has(cid)) panelsByCompany.set(cid, []);
    panelsByCompany.get(cid).push(p);
  });

  // For COMPANY_DELAY: adjust the effective window start on the in-memory object
  // so findBestSlot uses the delayed start when checking the operating window.
  let effectiveWindowStarts = new Map(); // companyId → "HH:MM"
  if (type === 'COMPANY_DELAY') {
    const comp = companiesMap.get(disruption.companyId.toString());
    if (comp) {
      const baseStart = toMinutes(comp.operatingHours.start || DAY_START_DEFAULT);
      const newStartStr = toTimeStr(baseStart + disruption.delayMinutes);
      effectiveWindowStarts.set(disruption.companyId.toString(), newStartStr);
    }
  }

  // ------------------------------------------------------------------
  // 4. Scored rescheduling loop
  // ------------------------------------------------------------------
  const rawChanges = [];
  let moved     = 0;
  let cancelled = 0;

  for (const affected of affectedInterviews) {
    const cid        = affected.company.toString();
    const comp       = companiesMap.get(cid);
    const compPanels = panelsByCompany.get(cid) || [];

    if (!comp) {
      // Defensive: company not found in map — cancel this interview
      await Interview.findByIdAndUpdate(affected._id, {
        status: 'cancelled',
        unscheduledReason: 'NO_FEASIBLE_SLOT'
      });
      rawChanges.push({
        action:        'CANCELLED',
        interviewId:   affected._id,
        reason:        'NO_FEASIBLE_SLOT',
        student:       affected.student,
        company:       affected.company,
        originalDay:   affected.day,
        originalTime:  affected.startTime ? `${affected.startTime}–${affected.endTime}` : null,
        originalPanel: affected.panel,
        originalRoom:  affected.room
      });
      cancelled++;
      continue;
    }

    const droppedPanelId    = type === 'PANEL_DROP' ? disruption.panelId : null;
    const effectiveWinStart = effectiveWindowStarts.get(cid)
      || comp.operatingHours.start
      || DAY_START_DEFAULT;

    // Find the globally best scored alternative slot
    const best = findBestSlot(
      affected,
      comp,
      compPanels,
      allRooms,
      droppedPanelId,
      effectiveWinStart,
      studentSlots,
      panelSlots,
      roomSlots
    );

    if (!best) {
      // No feasible slot found — determine explicit reason
      let reason = 'NO_FEASIBLE_SLOT';
      if (type === 'PANEL_DROP')      reason = 'NO_PANEL_AVAILABLE';
      if (type === 'COMPANY_DELAY')   reason = 'COMPANY_WINDOW_EXPIRED';
      if (type === 'ROOM_UNAVAILABLE') reason = 'NO_ROOM_AVAILABLE';

      await Interview.findByIdAndUpdate(affected._id, {
        status: 'cancelled',
        unscheduledReason: reason
      });

      rawChanges.push({
        action:        'CANCELLED',
        interviewId:   affected._id,
        reason,
        student:       affected.student,
        company:       affected.company,
        originalDay:   affected.day,
        originalTime:  affected.startTime ? `${affected.startTime}–${affected.endTime}` : null,
        originalPanel: affected.panel,
        originalRoom:  affected.room
      });
      cancelled++;

    } else {
      // Commit the best slot — update slot maps first (in-memory), then DB
      const { day, panel, room, startMin, endMin } = best;
      const sid = affected.student.toString();
      const pid = panel._id.toString();
      const rid = room._id.toString();

      bookStudentSlot(studentSlots, sid, day, startMin, endMin);
      bookPanelSlot(panelSlots,     pid, day, startMin, endMin);
      bookRoomSlot(roomSlots,       rid, day, startMin, endMin);

      await Interview.findByIdAndUpdate(affected._id, {
        day,
        startTime:       toTimeStr(startMin),
        endTime:         toTimeStr(endMin),
        panel:           panel._id,
        room:            room._id,
        status:          'scheduled',
        unscheduledReason: null
      });

      const wasOnSameDay   = affected.day   === day;
      const wasOnSamePanel = affected.panel  && affected.panel.toString()  === pid;
      const wasOnSameRoom  = affected.room   && affected.room.toString()   === rid;

      rawChanges.push({
        action:         'MOVED',
        interviewId:    affected._id,
        disruptionScore: best.score,
        student:        affected.student,
        company:        affected.company,
        before: {
          day:   affected.day,
          time:  affected.startTime ? `${affected.startTime}–${affected.endTime}` : null,
          panel: affected.panel,
          room:  affected.room
        },
        after: {
          day,
          time:  `${toTimeStr(startMin)}–${toTimeStr(endMin)}`,
          panel: panel._id,
          room:  room._id
        },
        dayChanged:   !wasOnSameDay,
        panelChanged: !wasOnSamePanel,
        roomChanged:  !wasOnSameRoom
      });
      moved++;
    }
  }

  // ------------------------------------------------------------------
  // 5. Build human-readable diff
  // ------------------------------------------------------------------
  const entityMaps = await buildEntityMaps(affectedInterviews, rawChanges);
  const diff       = buildDiff(rawChanges, entityMaps);

  // Log to console for server-side visibility
  console.log(`[Replanner] ${type} — ${moved} moved, ${cancelled} cancelled`);
  rawChanges.forEach(c => console.log(formatSummaryLine(c)));

  // ------------------------------------------------------------------
  // 6. Summary metrics
  // ------------------------------------------------------------------
  const totalScheduledAfter = await Interview.countDocuments({ status: 'scheduled' });
  const originalTotal       = allScheduled.length;
  const churnPct = originalTotal > 0
    ? `${(((moved + cancelled) / originalTotal) * 100).toFixed(2)}%`
    : '0.00%';

  const affectedStudentIds = [...new Set(affectedInterviews.map(iv => iv.student.toString()))];
  const affectedRoomIds    = [...new Set(affectedInterviews.filter(iv => iv.room).map(iv => iv.room.toString()))];
  const affectedPanelIds   = [...new Set(affectedInterviews.filter(iv => iv.panel).map(iv => iv.panel.toString()))];

  return {
    success: true,
    disruption: {
      type,
      description: disruptionDescription,
      input: disruption
    },
    summary: {
      affectedInterviews:       affectedInterviews.length,
      moved,
      cancelled,
      preserved:                originalTotal - affectedInterviews.length,
      totalScheduledAfterReplan: totalScheduledAfter,
      replanChurn:              churnPct,
      affectedStudentCount:     affectedStudentIds.length,
      affectedRoomCount:        affectedRoomIds.length,
      affectedPanelCount:       affectedPanelIds.length
    },
    scoringWeights: SCORE,
    diff,
    executionTimeMs: Date.now() - startTime
  };
}

module.exports = { runReplanner };
