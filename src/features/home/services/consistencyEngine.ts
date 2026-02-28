import { toDateString, getLastNDays } from '../../../core/utils/dateUtils';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type DailyLogRow = {
  id: string;
  user_id: string;
  log_date: string;
  completed: boolean;
  energy: number;
  created_at: string;
};

export type GridDay = {
  date: string;
  status: 'completed' | 'missed' | 'missed_long' | 'today' | 'before_program';
};

// ──────────────────────────────────────────────
// Pure Domain Functions
// ──────────────────────────────────────────────

/**
 * Derive the current program day from the total number of completed days.
 * USER-CONTROLLED: Day advances ONLY when user completes a workout.
 *
 * totalCompleted = 0 → Day 1 (hasn't done anything yet)
 * totalCompleted = 1 → Day 2 (did Day 1, now on Day 2)
 * totalCompleted = 7 → Day 8 (completed full cycle, starting second)
 */
export const getProgramDay = (totalCompleted: number): number => {
  return totalCompleted + 1;
};

/**
 * Map a program day to a 1-7 workout cycle day.
 * Day 1 → workout 1, Day 7 → workout 7, Day 8 → workout 1, etc.
 */
export const getWorkoutDayNumber = (totalCompleted: number): number => {
  return (totalCompleted % 7) + 1;
};

/**
 * Pure function: derive program progress from log count only.
 * This is the SINGLE source of truth for program position.
 *
 * programDay = totalCompleted + 1
 * currentWeekNumber = ceil(programDay / 7)   (1-4, wraps at 28)
 * dayNumberInWeek = ((programDay - 1) % 7) + 1  (1-7)
 */
export type ProgramProgress = {
  programDay: number;
  currentWeekNumber: number;
  dayNumberInWeek: number;
};

export const getProgramProgress = (totalCompleted: number): ProgramProgress => {
  const programDay = totalCompleted + 1;
  // Wrap within 28-day (4-week) cycle
  const dayInCycle = ((programDay - 1) % 28) + 1;
  const currentWeekNumber = Math.ceil(dayInCycle / 7);
  const dayNumberInWeek = ((dayInCycle - 1) % 7) + 1;
  return { programDay, currentWeekNumber, dayNumberInWeek };
};

/**
 * Check if today has a completed log.
 */
export const isTodayCompleted = (logs: DailyLogRow[]): boolean => {
  const todayStr = toDateString(new Date());
  return logs.some((l) => l.log_date === todayStr && l.completed === true);
};

/**
 * Check if yesterday was missed.
 * RULES:
 *  - If yesterday is BEFORE the user's program_start_date → NOT missed
 *  - If the user has zero completed days ever → NOT missed (brand new)
 *  - Otherwise, check if yesterday has a completed log
 */
export const wasMissedYesterday = (
  logs: DailyLogRow[],
  programStartDate: string
): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const yesterdayStr = toDateString(yesterday);

  const start = new Date(programStartDate + 'T00:00:00');
  start.setHours(0, 0, 0, 0);

  // Yesterday is before their program started — not a miss
  if (yesterday.getTime() < start.getTime()) return false;

  // Brand new user with no completed logs — don't show missed
  const hasAnyCompletedLog = logs.some((l) => l.completed);
  if (!hasAnyCompletedLog) return false;

  // Check if yesterday specifically has a completed log
  const yesterdayLog = logs.find((l) => l.log_date === yesterdayStr);
  return !yesterdayLog || !yesterdayLog.completed;
};

/**
 * Calculate the current streak.
 * Streak = consecutive COMPLETED calendar days going backwards.
 *
 * EDGE CASES:
 *  - Today not yet completed → check from yesterday backwards
 *  - Today completed → count today, then check yesterday backwards
 *  - Only counts days >= programStartDate
 *  - User completed 3 consecutive days → streak = 3
 *  - User missed 1 day in between → streak resets to days after the gap
 */
export const calculateStreak = (
  logs: DailyLogRow[],
  programStartDate: string
): number => {
  const logDates = new Set(
    logs.filter((l) => l.completed).map((l) => l.log_date)
  );

  const start = new Date(programStartDate + 'T00:00:00');
  start.setHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayStr = toDateString(cursor);

  // If today has a completed log, count it and move to yesterday
  // If today is NOT completed, skip today (day isn't over yet) and start from yesterday
  if (logDates.has(todayStr)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    cursor.setDate(cursor.getDate() - 1);
  }

  // Now walk backwards from yesterday (or day before if today counted)
  for (let i = 0; i < 365; i++) {
    if (cursor.getTime() < start.getTime()) break;

    const dateStr = toDateString(cursor);

    if (logDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break; // Gap found, streak ends
    }
  }

  return streak;
};

/**
 * Count completed days in a given number of recent calendar days.
 */
export const calculateCompletionInPeriod = (
  logs: DailyLogRow[],
  days: number
): { completed: number; total: number } => {
  const period = getLastNDays(days);
  const logDates = new Set(
    logs.filter((l) => l.completed).map((l) => l.log_date)
  );

  let completed = 0;
  period.forEach((d) => {
    if (logDates.has(d)) completed++;
  });
  return { completed, total: days };
};

/**
 * Calculate the longest streak ever achieved.
 * Walks all completed log dates sorted ascending, finds max consecutive run.
 * Pure function — deterministic on same logs.
 */
export const calculateLongestStreak = (
  logs: DailyLogRow[],
  programStartDate: string
): number => {
  const sortedDates = logs
    .filter((l) => l.completed)
    .map((l) => l.log_date)
    .sort();

  if (sortedDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1] + 'T00:00:00');
    const currDate = new Date(sortedDates[i] + 'T00:00:00');

    const diffMs = currDate.getTime() - prevDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
      if (current > longest) longest = current;
    } else if (diffDays > 1) {
      current = 1;
    }
    // diffDays === 0 means duplicate date, skip
  }

  return longest;
};

/**
 * Generate the full grid from program start date to today.
 * Works for any duration: 1 day, 30 days, 100 days, 365 days.
 * Each cell is tagged with a status for coloring:
 *  - 'completed'    → green
 *  - 'missed'       → yellow (1-2 consecutive)
 *  - 'missed_long'  → red (3+ consecutive)
 *  - 'today'        → blue ring (not yet done)
 *  - 'before_program' → hidden
 */
export const buildFullGrid = (
  logs: DailyLogRow[],
  programStartDate: string
): GridDay[] => {
  // Generate every date from programStartDate to today
  const todayStr = toDateString(new Date());
  const allDates: string[] = [];
  const cursor = new Date(programStartDate + 'T00:00:00');
  cursor.setHours(0, 0, 0, 0);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= todayDate.getTime()) {
    allDates.push(toDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const logDates = new Set(
    logs.filter((l) => l.completed).map((l) => l.log_date)
  );

  // First pass: assign base status
  const grid: GridDay[] = allDates.map((date) => {
    if (date === todayStr) {
      return {
        date,
        status: logDates.has(date) ? 'completed' as const : 'today' as const,
      };
    }
    return {
      date,
      status: logDates.has(date) ? 'completed' as const : 'missed' as const,
    };
  });

  // Second pass: 3+ consecutive misses → red
  let i = 0;
  while (i < grid.length) {
    if (grid[i].status === 'missed') {
      let runStart = i;
      while (i < grid.length && grid[i].status === 'missed') {
        i++;
      }
      if (i - runStart >= 3) {
        for (let j = runStart; j < i; j++) {
          grid[j] = { ...grid[j], status: 'missed_long' };
        }
      }
    } else {
      i++;
    }
  }

  return grid;
};
