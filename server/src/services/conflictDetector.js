/**
 * conflictDetector.js
 *
 * Pure in-memory helpers for checking scheduling conflicts.
 * The scheduler builds Maps of already-booked slots and passes them here.
 * No MongoDB reads happen inside this module — all data comes from the caller.
 *
 * Time representation: integer minutes since midnight.
 *   e.g.  09:00 → 540,  14:30 → 870
 */

// ---------------------------------------------------------------------------
// Time utilities
// ---------------------------------------------------------------------------

/**
 * Convert "HH:MM" string to minutes since midnight.
 * @param {string} timeStr  e.g. "09:00" or "14:30"
 * @returns {number}
 */
function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes since midnight back to "HH:MM" string.
 * @param {number} mins
 * @returns {string}
 */
function toTimeStr(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Return true if two intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 * Touching edges (aEnd === bStart) are NOT considered overlaps.
 */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// ---------------------------------------------------------------------------
// Slot lookup-key helpers
// Each key uniquely identifies a (entity, day) combination so callers can
// store booked slot arrays per entity per day.
// ---------------------------------------------------------------------------

/** Key for a student's booked slots on a given day. */
const studentDayKey = (studentId, day) => `${studentId}:${day}`;

/** Key for a panel's booked slots on a given day. */
const panelDayKey = (panelId, day) => `${panelId}:${day}`;

/** Key for a room's booked slots on a given day. */
const roomDayKey = (roomId, day) => `${roomId}:${day}`;

// ---------------------------------------------------------------------------
// Conflict check functions
// Each function receives the appropriate booked-slots Map and returns true
// if the proposed slot is FREE (no conflict).
// ---------------------------------------------------------------------------

/**
 * Is the student free during [startMin, endMin) on the given day?
 * @param {Map<string, Array<{start:number, end:number}>>} studentSlots
 * @param {string} studentId
 * @param {number} day
 * @param {number} startMin  minutes since midnight
 * @param {number} endMin    minutes since midnight
 * @returns {boolean}
 */
function isStudentFree(studentSlots, studentId, day, startMin, endMin) {
  const key = studentDayKey(studentId, day);
  const booked = studentSlots.get(key) || [];
  return !booked.some(slot => overlaps(startMin, endMin, slot.start, slot.end));
}

/**
 * Is the panel free during [startMin, endMin) on the given day?
 */
function isPanelFree(panelSlots, panelId, day, startMin, endMin) {
  const key = panelDayKey(panelId, day);
  const booked = panelSlots.get(key) || [];
  return !booked.some(slot => overlaps(startMin, endMin, slot.start, slot.end));
}

/**
 * Find the first available room during [startMin, endMin) on the given day.
 * Returns the room object if found, or null.
 * @param {Map<string, Array<{start:number, end:number}>>} roomSlots
 * @param {Array<{_id: string, roomNumber: string}>} allRooms
 * @param {number} day
 * @param {number} startMin
 * @param {number} endMin
 * @returns {{ _id: string, roomNumber: string } | null}
 */
function findFreeRoom(roomSlots, allRooms, day, startMin, endMin) {
  for (const room of allRooms) {
    const key = roomDayKey(room._id.toString(), day);
    const booked = roomSlots.get(key) || [];
    const isFree = !booked.some(slot => overlaps(startMin, endMin, slot.start, slot.end));
    if (isFree) return room;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Booking registration — called after a slot is confirmed
// ---------------------------------------------------------------------------

function bookStudentSlot(studentSlots, studentId, day, startMin, endMin) {
  const key = studentDayKey(studentId, day);
  if (!studentSlots.has(key)) studentSlots.set(key, []);
  studentSlots.get(key).push({ start: startMin, end: endMin });
}

function bookPanelSlot(panelSlots, panelId, day, startMin, endMin) {
  const key = panelDayKey(panelId, day);
  if (!panelSlots.has(key)) panelSlots.set(key, []);
  panelSlots.get(key).push({ start: startMin, end: endMin });
}

function bookRoomSlot(roomSlots, roomId, day, startMin, endMin) {
  const key = roomDayKey(roomId, day);
  if (!roomSlots.has(key)) roomSlots.set(key, []);
  roomSlots.get(key).push({ start: startMin, end: endMin });
}

// ---------------------------------------------------------------------------
// Company window check
// ---------------------------------------------------------------------------

/**
 * Return true if [startMin, endMin) fits inside the company operating window on that day.
 * @param {string} windowStart  "HH:MM"
 * @param {string} windowEnd    "HH:MM"
 * @param {number} startMin
 * @param {number} endMin
 */
function isWithinCompanyWindow(windowStart, windowEnd, startMin, endMin) {
  const winStart = toMinutes(windowStart);
  const winEnd = toMinutes(windowEnd);
  return startMin >= winStart && endMin <= winEnd;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  toMinutes,
  toTimeStr,
  overlaps,
  studentDayKey,
  panelDayKey,
  roomDayKey,
  isStudentFree,
  isPanelFree,
  findFreeRoom,
  bookStudentSlot,
  bookPanelSlot,
  bookRoomSlot,
  isWithinCompanyWindow
};
