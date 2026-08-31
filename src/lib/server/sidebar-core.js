export const STREAK_TARGETS = [3, 7, 30];

export function getNextMilestone(streak) {
  const current = Number(streak) || 0;
  const target = STREAK_TARGETS.find((t) => t > current) ?? null;
  return target == null ? null : { target, current, daysLeft: target - current };
}