export const DAY_MS = 24 * 60 * 60 * 1000;

export function clampHour(value) {
  return Math.max(0, Math.min(23, Number(value) || 0));
}

export function clampMinute(value) {
  return Math.max(0, Math.min(59, Number(value) || 0));
}

export function clampWeekday(value) {
  return Math.max(0, Math.min(6, Number(value) || 0));
}

export function clampDayOfMonth(value) {
  return Math.max(1, Math.min(31, Number(value) || 1));
}

export function normalizeSchedule(schedule = {}) {
  const freq = ["daily", "weekly", "monthly"].includes(schedule.freq) ? schedule.freq : "daily";
  return {
    freq,
    hour: clampHour(schedule.hour),
    minute: clampMinute(schedule.minute),
    weekday: freq === "weekly" ? clampWeekday(schedule.weekday) : 0,
    dayOfMonth: freq === "monthly" ? clampDayOfMonth(schedule.dayOfMonth) : 1,
  };
}

export function computeNextRun(schedule, afterMillis = Date.now()) {
  const s = normalizeSchedule(schedule);
  for (let i = 0; i < 370; i++) {
    const next = new Date(afterMillis + i * DAY_MS);
    next.setUTCHours(s.hour, s.minute, 0, 0);
    if (next.getTime() <= afterMillis) continue;
    if (s.freq === "weekly" && next.getUTCDay() !== s.weekday) continue;
    if (s.freq === "monthly" && next.getUTCDate() !== s.dayOfMonth) continue;
    return next.getTime();
  }
  return null;
}

export function formatSchedule(schedule = {}) {
  const s = normalizeSchedule(schedule);
  const time = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
  if (s.freq === "weekly") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return `${days[s.weekday]} at ${time}`;
  }
  if (s.freq === "monthly") {
    return `Monthly on day ${s.dayOfMonth} at ${time}`;
  }
  return `Daily at ${time}`;
}
