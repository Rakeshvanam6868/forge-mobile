import { toDateString, getLastNDays } from '../../../core/utils/dateUtils';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type DailyLogRow = {
  id: string;
  user_id: string;
  log_date: string;
  status: 'completed' | 'skipped' | string;
  is_skipped: boolean;
  energy: string;
  plan_day_id?: string;
  difficulty?: 'easy' | 'perfect' | 'hard';
  completed_at?: string;
};

export type GridDay = {
  date: string;
  status: 'completed' | 'skipped' | 'missed' | 'missed_long' | 'today' | 'before_program';
};

// ──────────────────────────────────────────────
// Pure Domain Functions
// ──────────────────────────────────────────────

/**
 * Check if today has a completed log.
 */
export const isTodayCompleted = (logs: DailyLogRow[]): boolean => {
  const todayStr = toDateString(new Date());
  return logs.some((l) => l.log_date === todayStr && l.status === 'completed');
};

/**
 * Check if today was explicitly skipped.
 */
export const isTodaySkipped = (logs: DailyLogRow[]): boolean => {
  const todayStr = toDateString(new Date());
  return logs.some((l) => l.log_date === todayStr && l.is_skipped === true);
};

/**
 * Check if yesterday was missed without action.
 * A miss is when yesterday had NO log at all.
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

  if (yesterday.getTime() < start.getTime()) return false;

  const yesterdayLog = logs.find((l) => l.log_date === yesterdayStr);
  return !yesterdayLog; // True if completely missing
};

/**
 * Calculate the current streak with Grace Period logic.
 * A day counts if: completed OR explicitly skipped.
 * Missed day without action -> Grace state (protects 1 day max).
 * 2 consecutive misses -> Streak reset.
 */
export const calculateStreak = (
  logs: DailyLogRow[],
  programStartDate: string
): number => {
  const activeDates = new Set(
    logs.filter((l) => l.status === 'completed' || l.is_skipped).map((l) => l.log_date)
  );

  const start = new Date(programStartDate + 'T00:00:00');
  start.setHours(0, 0, 0, 0);

  let streak = 0;
  let graceUsed = false;
  
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayStr = toDateString(cursor);

  // If today is active, count it. Otherwise, ignore today (it's not over yet).
  if (activeDates.has(todayStr)) {
    streak++;
  }
  
  // Start walking backwards from yesterday
  cursor.setDate(cursor.getDate() - 1);

  for (let i = 0; i < 365; i++) {
    if (cursor.getTime() < start.getTime()) break;

    const dateStr = toDateString(cursor);

    if (activeDates.has(dateStr)) {
      streak++;
      graceUsed = false; // Reset grace period upon a successful active day
    } else {
      // Missing day
      if (!graceUsed) {
        graceUsed = true; // Protect this 1 day
      } else {
        break; // 2nd consecutive miss, streak broken
      }
    }
    
    cursor.setDate(cursor.getDate() - 1);
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
    logs.filter((l) => l.status === 'completed').map((l) => l.log_date)
  );

  let completed = 0;
  period.forEach((d) => {
    if (logDates.has(d)) completed++;
  });
  return { completed, total: days };
};

/**
 * Calculates the longest streak ever achieved with grace period rules.
 */
export const calculateLongestStreak = (
  logs: DailyLogRow[],
  programStartDate: string
): number => {
  // We can optimize this by just returning the current streak if we don't need historical highest,
  // but to truly calculate historical highest mathematically with grace:
  const sortedDates = logs
    .filter((l) => l.status === 'completed' || l.is_skipped)
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
    } else if (diffDays === 2) {
      // 1 day gap (diffDays = 2), use grace
      current++; 
      if (current > longest) longest = current;
    } else if (diffDays > 2) {
      current = 1;
    }
  }

  return longest;
};

/**
 * Generate the full continuity grid.
 */
export const buildFullGrid = (
  logs: DailyLogRow[],
  programStartDate: string
): GridDay[] => {
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

  const logMap = new Map<string, DailyLogRow>();
  logs.forEach(l => logMap.set(l.log_date, l));

  const grid: GridDay[] = allDates.map((date) => {
    const log = logMap.get(date);
    if (date === todayStr) {
      if (log?.status === 'completed') return { date, status: 'completed' as const };
      if (log?.is_skipped) return { date, status: 'skipped' as const };
      return { date, status: 'today' as const };
    }
    
    if (log?.status === 'completed') return { date, status: 'completed' as const };
    if (log?.is_skipped) return { date, status: 'skipped' as const };
    return { date, status: 'missed' as const };
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

// Remove totalCompleted -> programDay pure function entirely as we are moving to standard Continuity.
