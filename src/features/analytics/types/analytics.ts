// ═══════════════════════════════════════════════
// Phase 6.5 — Analytics Types
// ═══════════════════════════════════════════════

export type UserEvent = {
  id: string;
  user_id: string;
  event_type: 'APP_OPEN' | 'DAY_VIEWED' | 'DAY_COMPLETED' | 'STREAK_BROKEN' | 'PROGRAM_STARTED';
  event_date: string; // DATE string 'YYYY-MM-DD'
  event_meta: Record<string, unknown>;
  created_at: string;
};

export type RetentionMetrics = {
  d1: boolean | null;  // null = not yet reached
  d3: boolean | null;
  d7: boolean | null;
  d14: boolean | null;
  d30: boolean | null;
};

export type ActivationMetrics = {
  isActivated: boolean;
  activationTimeHours: number | null;
};

export type FunnelMetrics = {
  openDays: number;
  viewedDays: number;
  completedDays: number;
  openToViewRate: number;
  viewToCompleteRate: number;
  openToCompleteRate: number;
};

export type DropOffMetrics = {
  dropOffProgramDay: number | null;
  dropOffDate: string | null;
  daysSinceDropOff: number | null;
};

export type StreakIntelligence = {
  currentStreak: number;
  longestStreak: number;
  averageStreakLength: number;
  totalStreakBreaks: number;
  streakRecoveryCount: number;
};

export type UsageMetrics = {
  activeDaysLast7: number;
  activeDaysLast30: number;
  usageTrend: 'up' | 'down' | 'stable';
};

export type SessionDepth = {
  completionPerActiveDay: number;
  viewOnlyDays: number;
  openOnlyDays: number;
};

export type UserCohort =
  | 'new'
  | 'exploring'
  | 'committed'
  | 'at_risk'
  | 'churned';

export type AnalyticsResult = {
  firstSeenDate: string | null;
  userType: UserCohort;
  retention: RetentionMetrics;
  activation: ActivationMetrics;
  funnel: FunnelMetrics;
  dropOff: DropOffMetrics;
  streakIntelligence: StreakIntelligence;
  usage: UsageMetrics;
  sessionDepth: SessionDepth;
  consistencyScore: number; // 0-100
};
