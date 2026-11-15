/**
 * replanDiff.js
 *
 * Produces a structured, human-readable before/after diff for every interview
 * changed during a replan.  All raw ObjectId references are resolved to their
 * display names so callers receive a self-contained report without making
 * secondary lookups.
 *
 * Exported functions
 * ──────────────────
 *   buildDiff(changes, entityMaps)  → DiffReport
 *   formatSummaryLine(change)       → string   (single-line text for logging)
 */

// ---------------------------------------------------------------------------
// buildDiff
// ---------------------------------------------------------------------------

/**
 * Build the complete diff report from the raw changes array produced by
 * runReplanner and a set of pre-resolved entity name maps.
 *
 * @param {Array}  changes     Raw change records from the replanner loop
 * @param {Object} entityMaps
 *   @param {Map<string,string>} entityMaps.studentNames  id → "Name (ROLL)"
 *   @param {Map<string,string>} entityMaps.companyNames  id → "Company Name"
 *   @param {Map<string,string>} entityMaps.panelNames    id → "Panel Name"
 *   @param {Map<string,string>} entityMaps.roomNames     id → "Room Number"
 *
 * @returns {Object}  { moved: Array, cancelled: Array, summary: Object }
 */
function buildDiff(changes, entityMaps) {
  const { studentNames, companyNames, panelNames, roomNames } = entityMaps;

  const resolve = (map, id) =>
    id ? (map.get(id.toString()) || id.toString()) : '—';

  const moved     = [];
  const cancelled = [];

  for (const c of changes) {
    const studentLabel = resolve(studentNames, c.student);
    const companyLabel = resolve(companyNames, c.company);

    if (c.action === 'MOVED') {
      const beforePanelLabel = resolve(panelNames, c.before.panel);
      const beforeRoomLabel  = resolve(roomNames,  c.before.room);
      const afterPanelLabel  = resolve(panelNames, c.after.panel);
      const afterRoomLabel   = resolve(roomNames,  c.after.room);

      // Collect which dimensions actually changed
      const changedFields = [];
      if (c.dayChanged)   changedFields.push('day');
      if (c.panelChanged) changedFields.push('panel');
      if (c.roomChanged)  changedFields.push('room');
      // Even if nothing else changed, the time slot shifted
      if (changedFields.length === 0) changedFields.push('time');

      moved.push({
        interviewId:     c.interviewId,
        student:         studentLabel,
        company:         companyLabel,
        changedFields,
        disruptionScore: c.disruptionScore,
        before: {
          day:   c.before.day,
          slot:  c.before.time   || '—',
          panel: beforePanelLabel,
          room:  beforeRoomLabel
        },
        after: {
          day:   c.after.day,
          slot:  c.after.time,
          panel: afterPanelLabel,
          room:  afterRoomLabel
        }
      });

    } else if (c.action === 'CANCELLED') {
      cancelled.push({
        interviewId:   c.interviewId,
        student:       studentLabel,
        company:       companyLabel,
        originalDay:   c.originalDay,
        originalSlot:  c.originalTime  || '—',
        originalPanel: resolve(panelNames, c.originalPanel),
        originalRoom:  resolve(roomNames,  c.originalRoom),
        reason:        c.reason
      });
    }
  }

  // Aggregate change-dimension stats
  const dayChanges      = moved.filter(m => m.changedFields.includes('day')).length;
  const panelChanges    = moved.filter(m => m.changedFields.includes('panel')).length;
  const roomChanges     = moved.filter(m => m.changedFields.includes('room')).length;
  const timeOnlyChanges = moved.filter(
    m => m.changedFields.length === 1 && m.changedFields[0] === 'time'
  ).length;

  const avgScore = moved.length > 0
    ? (moved.reduce((s, m) => s + (m.disruptionScore || 0), 0) / moved.length).toFixed(2)
    : 0;

  const summary = {
    totalChanged:        moved.length + cancelled.length,
    moved:               moved.length,
    cancelled:           cancelled.length,
    dayChanges,
    panelChanges,
    roomChanges,
    timeOnlyChanges,
    avgDisruptionScore:  parseFloat(avgScore)
  };

  return { moved, cancelled, summary };
}

// ---------------------------------------------------------------------------
// formatSummaryLine — for server-side console logging
// ---------------------------------------------------------------------------

/**
 * Format a single raw change record as a one-liner for console/log output.
 * @param {Object} change  — raw change object from the replanner changes array
 * @returns {string}
 */
function formatSummaryLine(change) {
  if (change.action === 'CANCELLED') {
    return `  [CANCELLED] Interview ${change.interviewId} — reason: ${change.reason}`;
  }
  const { before, after } = change;
  const dayNote   = change.dayChanged   ? ` (day ${before.day}→${after.day})` : '';
  const panelNote = change.panelChanged ? ' [panel changed]'                   : '';
  const roomNote  = change.roomChanged  ? ' [room changed]'                    : '';
  return `  [MOVED] Interview ${change.interviewId}  ${before.time} → ${after.time}${dayNote}${panelNote}${roomNote}  score=${change.disruptionScore}`;
}

module.exports = { buildDiff, formatSummaryLine };
