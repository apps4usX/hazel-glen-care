// Time helpers — day-of-week mapping, "HH:mm" parsing, and interval overlap.

const DOW = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
];

/** DayOfWeek enum value for a Date (uses the date's local day). */
function dayOfWeek(date) {
  return DOW[new Date(date).getDay()];
}

/** Minutes-since-midnight for a "HH:mm" string. */
function minutesOfDay(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Minutes-since-midnight for a Date instance. */
function minutesOfDate(date) {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}

/** True if two [start,end) intervals overlap (numbers or Dates). */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/**
 * Does an availability window cover a shift's time range?
 * Handles both recurring (dayOfWeek) and one-off (specificDate) windows.
 * @param {object} avail  StaffAvailability record
 * @param {Date}   start  shift start
 * @param {Date}   end    shift end
 */
function availabilityCoversShift(avail, start, end) {
  if (!avail.isAvailable) return false;

  // one-off window: must be the same calendar date as the shift start
  if (avail.specificDate) {
    const sameDay =
      new Date(avail.specificDate).toDateString() === new Date(start).toDateString();
    if (!sameDay) return false;
  } else if (avail.dayOfWeek) {
    if (avail.dayOfWeek !== dayOfWeek(start)) return false;
  } else {
    return false;
  }

  const winStart = minutesOfDay(avail.startTime);
  const winEnd = minutesOfDay(avail.endTime);
  const shiftStart = minutesOfDate(start);
  const shiftEnd = minutesOfDate(end);
  return winStart <= shiftStart && shiftEnd <= winEnd;
}

/** Hours between two Dates, minus break minutes, rounded to 2dp. */
function billableHours(start, end, breakMinutes = 0) {
  const ms = new Date(end) - new Date(start);
  const hrs = ms / 3_600_000 - breakMinutes / 60;
  return Math.max(0, Math.round(hrs * 100) / 100);
}

module.exports = {
  dayOfWeek,
  minutesOfDay,
  minutesOfDate,
  overlaps,
  availabilityCoversShift,
  billableHours,
};
