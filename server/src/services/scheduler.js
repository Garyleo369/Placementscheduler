/**
 * scheduler.js
 *
 * Greedy Earliest-Available-Slot (EAS) Placement Interview Scheduler
 *
 * Strategy (fully explainable, single-pass):
 * ──────────────────────────────────────────
 * 1. Load all companies sorted by priority ASC (Tier 1 first → highest priority).
 * 2. For each company, load its shortlisted students sorted CGPA DESC.
 * 3. For each operating day of the company:
 *    a. Distribute students evenly across the company's panels for that day.
 *    b. For each panel, maintain a panelNextFreeMinute cursor (starts at 09:00).
 *    c. For each student assigned to this panel:
 *       - Proposed slot: [panelNextFreeMinute, panelNextFreeMinute + duration)
 *       - Check 1: still within company operating window → else COMPANY_WINDOW_EXPIRED
 *       - Check 2: student is free in that slot → else advance cursor & retry (up to
 *                  maxRetries), giving NO_STUDENT_AVAILABILITY if all retries fail
 *       - Check 3: a room is available → else NO_ROOM_AVAILABLE
 *       - If all pass → book student + panel + room slot; record scheduled interview
 *       - If any fail → record unscheduled interview with explicit reason
 *
 * Time representation: integer minutes since midnight (no Date objects).
 * All booked slots live in in-memory Maps during the run.
 * One bulk insertMany at the end writes everything to MongoDB.
 */

const Company = require('../models/Company');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Panel = require('../models/Panel');
const Interview = require('../models/Interview');

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_START = '09:00'; // All companies open at 09:00
const DAY_END = '18:00';   // All companies close at 18:00
const SLOT_INCREMENT = 5;  // Minutes to advance cursor on student conflict retry
const MAX_RETRIES = 50;    // Max cursor advances before giving up on a student

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Split an array of students evenly across N panels.
 * Panel 0 gets students [0, chunkSize), Panel 1 gets [chunkSize, 2*chunkSize), etc.
 * Remainder students go to the last panel.
 *
 * @param {Array} students
 * @param {number} numPanels
 * @returns {Array<Array>}  array of student-arrays, one per panel
 */
function distributeStudentsToPanels(students, numPanels) {
  const buckets = Array.from({ length: numPanels }, () => []);
  students.forEach((stu, idx) => {
    buckets[idx % numPanels].push(stu);
  });
  return buckets;
}

// ---------------------------------------------------------------------------
// Main scheduler
// ---------------------------------------------------------------------------

async function runScheduler(options = {}) {
  const { clearExisting = true } = options;

  const startTime = Date.now();

  // ------------------------------------------------------------------
  // 0. Optionally wipe previous schedule
  // ------------------------------------------------------------------
  if (clearExisting) {
    await Interview.deleteMany({});
  }

  // ------------------------------------------------------------------
  // 1. Load data from MongoDB
  // ------------------------------------------------------------------
  const [companies, rooms, panels] = await Promise.all([
    Company.find({}).sort({ priority: 1 }).lean(), // Tier 1 first
    Room.find({}).lean(),
    Panel.find({}).lean()
  ]);

  if (companies.length === 0) {
    throw new Error('No companies found. Please run POST /api/data/generate first.');
  }
  if (rooms.length === 0) {
    throw new Error('No rooms found. Please run POST /api/data/generate first.');
  }

  // Build a company-id → panels lookup
  const panelsByCompany = new Map();
  panels.forEach(panel => {
    const cid = panel.company.toString();
    if (!panelsByCompany.has(cid)) panelsByCompany.set(cid, []);
    panelsByCompany.get(cid).push(panel);
  });

  // ------------------------------------------------------------------
  // 2. In-memory booking state
  //    Maps keyed by "entityId:day" → [{start, end}]
  // ------------------------------------------------------------------
  const studentSlots = new Map(); // student bookings
  const panelSlots = new Map();   // panel bookings
  const roomSlots = new Map();    // room bookings

  // ------------------------------------------------------------------
  // 3. Accumulators
  // ------------------------------------------------------------------
  const interviewDocs = [];   // final batch to insert
  const unscheduledLog = [];  // failure records with reasons

  let totalScheduled = 0;
  let totalUnscheduled = 0;

  // Per-company metrics for the response
  const companyMetrics = [];

  // Room utilisation: roomId → total minutes booked
  const roomMinutesBooked = new Map();
  rooms.forEach(r => roomMinutesBooked.set(r._id.toString(), 0));

  // ------------------------------------------------------------------
  // 4. Main scheduling loop — companies ordered by priority
  // ------------------------------------------------------------------
  for (const company of companies) {
    const cid = company._id.toString();
    const companyPanels = panelsByCompany.get(cid) || [];
    const duration = company.interviewDuration; // minutes

    let companyScheduled = 0;
    let companyUnscheduled = 0;

    // Guard: no panels defined for this company
    if (companyPanels.length === 0) {
      // Mark every shortlisted student as unschedulable
      for (const studentId of company.shortlist) {
        interviewDocs.push({
          student: studentId,
          company: company._id,
          panel: null,
          room: null,
          day: null,
          startTime: null,
          endTime: null,
          duration,
          status: 'conflict',
          unscheduledReason: 'NO_PANEL_AVAILABLE'
        });
        totalUnscheduled++;
        companyUnscheduled++;
      }
      companyMetrics.push({ company: company.name, tier: company.tier, scheduled: 0, unscheduled: companyUnscheduled, reason: 'NO_PANEL_AVAILABLE' });
      continue;
    }

    // Load shortlisted students for this company sorted CGPA DESC
    // (high achievers scheduled first → better for them, more conflicts surface early)
    const shortlistedStudents = await Student.find(
      { _id: { $in: company.shortlist } },
      '_id cgpa'
    ).sort({ cgpa: -1 }).lean();

    // Spread interviews across operating days
    // Each day gets a fresh "chunk" of students so work is distributed.
    const operatingDays = company.operatingDays;
    const studentsPerDay = Math.ceil(shortlistedStudents.length / operatingDays.length);

    let studentIdx = 0; // global cursor across days

    for (const day of operatingDays) {
      // Students assigned to this day
      const dayStudents = shortlistedStudents.slice(studentIdx, studentIdx + studentsPerDay);
      studentIdx += studentsPerDay;

      if (dayStudents.length === 0) continue;

      // Panels active on this day
      const dayPanels = companyPanels.filter(p => p.operatingDays.includes(day));

      if (dayPanels.length === 0) {
        // No panels available this day → mark all day's students unscheduled
        for (const stu of dayStudents) {
          interviewDocs.push({
            student: stu._id,
            company: company._id,
            panel: null,
            room: null,
            day,
            startTime: null,
            endTime: null,
            duration,
            status: 'conflict',
            unscheduledReason: 'NO_PANEL_AVAILABLE'
          });
          totalUnscheduled++;
          companyUnscheduled++;
        }
        continue;
      }

      // Distribute day's students across available panels (round-robin)
      const panelBuckets = distributeStudentsToPanels(dayStudents, dayPanels.length);

      // For each panel, maintain a cursor (next free minute for that panel)
      for (let pi = 0; pi < dayPanels.length; pi++) {
        const panel = dayPanels[pi];
        const pid = panel._id.toString();
        const assignedStudents = panelBuckets[pi];

        if (!assignedStudents || assignedStudents.length === 0) continue;

        // Panel cursor: start of operating day
        let panelCursor = toMinutes(company.operatingHours.start || DAY_START);
        const dayEndMin = toMinutes(company.operatingHours.end || DAY_END);

        for (const student of assignedStudents) {
          const sid = student._id.toString();
          let scheduled = false;
          let failureReason = null;

          // --- Check A: panel still has time in its operating window ---
          if (panelCursor + duration > dayEndMin) {
            failureReason = 'COMPANY_WINDOW_EXPIRED';
          } else {
            // --- Try to find the earliest valid slot for this student ---
            let tryStart = panelCursor;
            let retries = 0;

            while (retries <= MAX_RETRIES) {
              const tryEnd = tryStart + duration;

              // Check operating window
              if (!isWithinCompanyWindow(
                company.operatingHours.start || DAY_START,
                company.operatingHours.end || DAY_END,
                tryStart,
                tryEnd
              )) {
                failureReason = 'COMPANY_WINDOW_EXPIRED';
                break;
              }

              // Check panel availability
              if (!isPanelFree(panelSlots, pid, day, tryStart, tryEnd)) {
                // Panel is busy (shouldn't normally happen with cursor approach, but safety check)
                tryStart += SLOT_INCREMENT;
                retries++;
                continue;
              }

              // Check student availability
              if (!isStudentFree(studentSlots, sid, day, tryStart, tryEnd)) {
                tryStart += SLOT_INCREMENT;
                retries++;
                failureReason = 'NO_STUDENT_AVAILABILITY'; // tentative
                continue;
              }

              // Check room availability
              const freeRoom = findFreeRoom(roomSlots, rooms, day, tryStart, tryEnd);
              if (!freeRoom) {
                tryStart += SLOT_INCREMENT;
                retries++;
                failureReason = 'NO_ROOM_AVAILABLE'; // tentative
                continue;
              }

              // ✅ All three constraints satisfied — book this slot
              const rid = freeRoom._id.toString();
              bookStudentSlot(studentSlots, sid, day, tryStart, tryEnd);
              bookPanelSlot(panelSlots, pid, day, tryStart, tryEnd);
              bookRoomSlot(roomSlots, rid, day, tryStart, tryEnd);

              // Advance panel cursor to right after this interview
              panelCursor = tryEnd;

              // Track room utilisation
              roomMinutesBooked.set(rid, (roomMinutesBooked.get(rid) || 0) + duration);

              interviewDocs.push({
                student: student._id,
                company: company._id,
                panel: panel._id,
                room: freeRoom._id,
                day,
                startTime: toTimeStr(tryStart),
                endTime: toTimeStr(tryEnd),
                duration,
                status: 'scheduled',
                unscheduledReason: null
              });

              scheduled = true;
              totalScheduled++;
              companyScheduled++;
              break; // move to next student
            }

            if (!scheduled && failureReason === null) {
              failureReason = 'NO_FEASIBLE_SLOT';
            }
          }

          if (!scheduled) {
            interviewDocs.push({
              student: student._id,
              company: company._id,
              panel: panel._id,
              room: null,
              day,
              startTime: null,
              endTime: null,
              duration,
              status: 'conflict',
              unscheduledReason: failureReason
            });
            totalUnscheduled++;
            companyUnscheduled++;

            unscheduledLog.push({
              companyName: company.name,
              studentId: student._id,
              day,
              reason: failureReason
            });
          }
        } // end students in panel bucket
      } // end panels for this day
    } // end operating days

    companyMetrics.push({
      company: company.name,
      tier: company.tier,
      priority: company.priority,
      shortlistSize: company.shortlist.length,
      scheduled: companyScheduled,
      unscheduled: companyUnscheduled,
      schedulingRate: company.shortlist.length > 0
        ? `${((companyScheduled / company.shortlist.length) * 100).toFixed(1)}%`
        : 'N/A'
    });
  } // end companies loop

  // ------------------------------------------------------------------
  // 5. Bulk write all interview documents to MongoDB
  // ------------------------------------------------------------------
  if (interviewDocs.length > 0) {
    await Interview.insertMany(interviewDocs);
  }

  // ------------------------------------------------------------------
  // 6. Compute room utilisation metrics
  // ------------------------------------------------------------------
  const totalDayMinutes = 4 * (toMinutes(DAY_END) - toMinutes(DAY_START)); // 4 days × 9h
  const roomUtilisation = rooms.map(room => {
    const rid = room._id.toString();
    const booked = roomMinutesBooked.get(rid) || 0;
    const pct = ((booked / totalDayMinutes) * 100).toFixed(1);
    return {
      room: room.roomNumber,
      building: room.building,
      minutesBooked: booked,
      utilisationPct: `${pct}%`
    };
  });

  const avgRoomUtil = (
    roomUtilisation.reduce((sum, r) => sum + parseFloat(r.utilisationPct), 0) /
    (roomUtilisation.length || 1)
  ).toFixed(1);

  // Failure reason breakdown
  const reasonBreakdown = {};
  unscheduledLog.forEach(({ reason }) => {
    reasonBreakdown[reason] = (reasonBreakdown[reason] || 0) + 1;
  });

  const durationMs = Date.now() - startTime;
  const totalInterviews = totalScheduled + totalUnscheduled;

  return {
    success: true,
    message: 'Scheduling complete',
    executionTimeMs: durationMs,
    metrics: {
      totalInterviews,
      scheduledInterviews: totalScheduled,
      unscheduledInterviews: totalUnscheduled,
      schedulingPercentage: totalInterviews > 0
        ? `${((totalScheduled / totalInterviews) * 100).toFixed(2)}%`
        : '0.00%',
      avgRoomUtilisation: `${avgRoomUtil}%`
    },
    failureReasonBreakdown: reasonBreakdown,
    roomUtilisation,
    companyMetrics
  };
}

module.exports = { runScheduler };
