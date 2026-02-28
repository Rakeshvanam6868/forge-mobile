/**
 * Analytics Engine — Phase 6.5
 *
 * PURE, DETERMINISTIC, SIDE-EFFECT FREE.
 * Single input: events[]. Single output: AnalyticsResult.
 * All dates normalized to local calendar day strings.
 */

import { toDateString } from '../../../core/utils/dateUtils';
import {
  UserEvent,
  AnalyticsResult,
  RetentionMetrics,
  ActivationMetrics,
  FunnelMetrics,
  DropOffMetrics,
  StreakIntelligence,
  UsageMetrics,
  SessionDepth,
  UserCohort,
} from '../types/analytics';

// ═══════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════

export const computeAnalytics = (
  events: UserEvent[],
  today: string // 'YYYY-MM-DD' local date
): AnalyticsResult => {
  // Normalize: group by local date & event type, deduplicate
  const byDate = buildDateIndex(events);
  const openDates = byDate.get('APP_OPEN') ?? new Set<string>();
  const viewDates = byDate.get('DAY_VIEWED') ?? new Set<string>();
  const completeDates = byDate.get('DAY_COMPLETED') ?? new Set<string>();
  const breakDates = byDate.get('STREAK_BROKEN') ?? new Set<string>();

  const firstSeenDate = computeFirstSeen(events);
  const retention = computeRetention(firstSeenDate, openDates, today);
  const activation = computeActivation(events, firstSeenDate);
  const funnel = computeFunnel(openDates, viewDates, completeDates);
  const dropOff = computeDropOff(viewDates, completeDates, today);
  const streakIntelligence = computeStreakIntelligence(completeDates);
  const usage = computeUsage(openDates, today);
  const sessionDepth = computeSessionDepth(openDates, viewDates, completeDates);
  const consistencyScore = computeConsistencyScore(
    retention, streakIntelligence, funnel, usage, firstSeenDate, today
  );
  const userType = computeCohort(
    firstSeenDate, activation, streakIntelligence, openDates, today
  );

  return {
    firstSeenDate,
    userType,
    retention,
    activation,
    funnel,
    dropOff,
    streakIntelligence,
    usage,
    sessionDepth,
    consistencyScore,
  };
};

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

/** Build a map of event_type → Set<date_string> for dedup */
function buildDateIndex(events: UserEvent[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const e of events) {
    const dateStr = e.event_date; // already a date string from DB
    if (!map.has(e.event_type)) map.set(e.event_type, new Set());
    map.get(e.event_type)!.add(dateStr);
  }
  return map;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

function sortedDates(dates: Set<string>): string[] {
  return Array.from(dates).sort();
}

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

// ═══════════════════════════════════════════════
// 1. First-Seen Date
// ═══════════════════════════════════════════════

function computeFirstSeen(events: UserEvent[]): string | null {
  const opens = events
    .filter((e) => e.event_type === 'APP_OPEN')
    .map((e) => e.event_date)
    .sort();
  return opens.length > 0 ? opens[0] : null;
}

// ═══════════════════════════════════════════════
// 2. Retention (D1/D3/D7/D14/D30)
// ═══════════════════════════════════════════════

function computeRetention(
  firstSeen: string | null,
  openDates: Set<string>,
  today: string
): RetentionMetrics {
  if (!firstSeen) return { d1: null, d3: null, d7: null, d14: null, d30: null };

  const checkDay = (n: number): boolean | null => {
    const targetDate = addDays(firstSeen, n);
    if (targetDate > today) return null; // not reached yet
    return openDates.has(targetDate);
  };

  return {
    d1: checkDay(1),
    d3: checkDay(3),
    d7: checkDay(7),
    d14: checkDay(14),
    d30: checkDay(30),
  };
}

// ═══════════════════════════════════════════════
// 3. Activation
// ═══════════════════════════════════════════════

function computeActivation(
  events: UserEvent[],
  firstSeen: string | null
): ActivationMetrics {
  if (!firstSeen) return { isActivated: false, activationTimeHours: null };

  const firstOpenTs = events
    .filter((e) => e.event_type === 'APP_OPEN' && e.event_date === firstSeen)
    .map((e) => new Date(e.created_at).getTime())
    .sort()[0];

  if (!firstOpenTs) return { isActivated: false, activationTimeHours: null };

  const firstCompletion = events
    .filter((e) => e.event_type === 'DAY_COMPLETED')
    .map((e) => new Date(e.created_at).getTime())
    .sort()[0];

  if (!firstCompletion) return { isActivated: false, activationTimeHours: null };

  // Completion before first open → ignore
  if (firstCompletion < firstOpenTs) return { isActivated: false, activationTimeHours: null };

  const diffHours = (firstCompletion - firstOpenTs) / (1000 * 60 * 60);
  return {
    isActivated: diffHours <= 24,
    activationTimeHours: Math.round(diffHours * 10) / 10,
  };
}

// ═══════════════════════════════════════════════
// 4. Engagement Funnel
// ═══════════════════════════════════════════════

function computeFunnel(
  openDates: Set<string>,
  viewDates: Set<string>,
  completeDates: Set<string>
): FunnelMetrics {
  const o = openDates.size;
  const v = viewDates.size;
  const c = completeDates.size;

  return {
    openDays: o,
    viewedDays: v,
    completedDays: c,
    openToViewRate: safeDiv(v, o),
    viewToCompleteRate: safeDiv(c, v),
    openToCompleteRate: safeDiv(c, o),
  };
}

// ═══════════════════════════════════════════════
// 5. Drop-Off Detection
// ═══════════════════════════════════════════════

function computeDropOff(
  viewDates: Set<string>,
  completeDates: Set<string>,
  today: string
): DropOffMetrics {
  if (viewDates.size === 0) return { dropOffProgramDay: null, dropOffDate: null, daysSinceDropOff: null };

  const sorted = sortedDates(viewDates);
  // Find last viewed day that has no completion on same day or later
  const lastCompletedDate = completeDates.size > 0
    ? sortedDates(completeDates)[completeDates.size - 1]
    : null;

  // If last view is after last completion (or no completion), that's drop-off
  const lastView = sorted[sorted.length - 1];

  if (!lastCompletedDate || lastView > lastCompletedDate) {
    const daysSince = daysBetween(lastView, today);
    if (daysSince <= 1) return { dropOffProgramDay: null, dropOffDate: null, daysSinceDropOff: null }; // still active today/yesterday
    return {
      dropOffProgramDay: sorted.indexOf(lastView) + 1,
      dropOffDate: lastView,
      daysSinceDropOff: daysSince,
    };
  }

  return { dropOffProgramDay: null, dropOffDate: null, daysSinceDropOff: null };
}

// ═══════════════════════════════════════════════
// 6. Streak Intelligence
// ═══════════════════════════════════════════════

function computeStreakIntelligence(completeDates: Set<string>): StreakIntelligence {
  const sorted = sortedDates(completeDates);

  if (sorted.length === 0) {
    return { currentStreak: 0, longestStreak: 0, averageStreakLength: 0, totalStreakBreaks: 0, streakRecoveryCount: 0 };
  }

  const streaks: number[] = [];
  let current = 1;
  let totalBreaks = 0;
  let recoveries = 0;

  for (let i = 1; i < sorted.length; i++) {
    const diff = daysBetween(sorted[i - 1], sorted[i]);
    if (diff === 1) {
      current++;
    } else if (diff > 1) {
      streaks.push(current);
      totalBreaks++;
      // Recovery = completion within 48h of break
      if (diff <= 2) recoveries++;
      current = 1;
    }
    // diff === 0 means duplicate date, skip
  }
  streaks.push(current); // push last streak

  const longest = Math.max(...streaks);
  const avg = streaks.length > 0 ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;

  // Current streak: check if the last date is today or yesterday
  const lastDate = sorted[sorted.length - 1];
  const todayStr = toDateString(new Date());
  const daysSinceLast = daysBetween(lastDate, todayStr);
  const currentStreak = daysSinceLast <= 1 ? current : 0;

  return {
    currentStreak,
    longestStreak: longest,
    averageStreakLength: Math.round(avg * 10) / 10,
    totalStreakBreaks: totalBreaks,
    streakRecoveryCount: recoveries,
  };
}

// ═══════════════════════════════════════════════
// 7. Usage Frequency
// ═══════════════════════════════════════════════

function computeUsage(openDates: Set<string>, today: string): UsageMetrics {
  let last7 = 0;
  let prev7 = 0;
  let last30 = 0;

  for (const d of openDates) {
    const diff = daysBetween(d, today);
    if (diff >= 0 && diff < 7) last7++;
    if (diff >= 7 && diff < 14) prev7++;
    if (diff >= 0 && diff < 30) last30++;
  }

  let usageTrend: 'up' | 'down' | 'stable' = 'stable';
  if (last7 > prev7) usageTrend = 'up';
  else if (last7 < prev7) usageTrend = 'down';

  return { activeDaysLast7: last7, activeDaysLast30: last30, usageTrend };
}

// ═══════════════════════════════════════════════
// 8. Session Depth Signal
// ═══════════════════════════════════════════════

function computeSessionDepth(
  openDates: Set<string>,
  viewDates: Set<string>,
  completeDates: Set<string>
): SessionDepth {
  let openOnly = 0;
  let viewOnly = 0;

  for (const d of openDates) {
    const viewed = viewDates.has(d);
    const completed = completeDates.has(d);
    if (!viewed && !completed) openOnly++;
    else if (viewed && !completed) viewOnly++;
  }

  return {
    completionPerActiveDay: safeDiv(completeDates.size, openDates.size),
    viewOnlyDays: viewOnly,
    openOnlyDays: openOnly,
  };
}

// ═══════════════════════════════════════════════
// 9. Consistency Score (0-100)
//
// Weighted composite:
//   Retention health   (25%) — how many D-milestones hit
//   Streak health      (30%) — current/longest ratio + current raw
//   Completion rate    (25%) — view-to-complete ratio
//   Usage frequency    (20%) — 7-day active / 7
// ═══════════════════════════════════════════════

function computeConsistencyScore(
  retention: RetentionMetrics,
  streak: StreakIntelligence,
  funnel: FunnelMetrics,
  usage: UsageMetrics,
  firstSeen: string | null,
  today: string
): number {
  // Retention component (0-1)
  const retentionVals = [retention.d1, retention.d3, retention.d7, retention.d14, retention.d30];
  const measurable = retentionVals.filter((v) => v !== null);
  const retentionScore = measurable.length > 0
    ? measurable.filter((v) => v === true).length / measurable.length
    : 0;

  // Streak component (0-1)
  const streakRaw = Math.min(streak.currentStreak / 14, 1); // cap at 14 days
  const streakRatio = streak.longestStreak > 0
    ? streak.currentStreak / streak.longestStreak
    : 0;
  const streakScore = (streakRaw * 0.6) + (streakRatio * 0.4);

  // Completion component (0-1)
  const completionScore = funnel.viewToCompleteRate;

  // Usage component (0-1)
  const usageScore = usage.activeDaysLast7 / 7;

  const score = (
    retentionScore * 25 +
    streakScore * 30 +
    completionScore * 25 +
    usageScore * 20
  );

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ═══════════════════════════════════════════════
// 10. Cohort Tagging
// ═══════════════════════════════════════════════

function computeCohort(
  firstSeen: string | null,
  activation: ActivationMetrics,
  streak: StreakIntelligence,
  openDates: Set<string>,
  today: string
): UserCohort {
  if (!firstSeen) return 'new';

  const daysSinceFirstSeen = daysBetween(firstSeen, today);

  // Find last active date
  const sorted = sortedDates(openDates);
  const lastActive = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const daysSinceLastActive = lastActive ? daysBetween(lastActive, today) : daysSinceFirstSeen;

  // Churned: no activity for 14+ days
  if (daysSinceLastActive >= 14) return 'churned';

  // At risk: no activity for 5-13 days OR streak broken + low activity
  if (daysSinceLastActive >= 5) return 'at_risk';

  // New: first seen within 3 days
  if (daysSinceFirstSeen <= 3) return 'new';

  // Committed: activated + streak ≥ 3
  if (activation.isActivated && streak.currentStreak >= 3) return 'committed';

  // Exploring: everything else
  return 'exploring';
}
