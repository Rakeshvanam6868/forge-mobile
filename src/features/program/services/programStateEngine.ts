import { UserEvent } from '../../analytics/types/analytics';
import { ProgramDay } from '../hooks/useWeekPlan';

export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.floor(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

export type SessionState = 'COMPLETED' | 'TARGET' | 'UPCOMING' | 'MISSED';

export type TimelineDay = {
  id: string; // Event ID or Program Day ID
  dayNumber: number;
  title: string;
  focusType: string;
  state: SessionState;
  dateStr?: string; // Only for completed days
  difficulty?: string;
};

export type TrainingLifecycleState = 
  | 'NOT_STARTED'
  | 'PLAN_READY_NOT_STARTED'
  | 'READY_TO_TRAIN_TODAY'
  | 'SESSION_IN_PROGRESS'
  | 'SESSION_COMPLETED_TODAY'
  | 'RECOVERY_DAY'
  | 'MISSED_TRAINING_DAY'
  | 'PROGRAM_TRANSITION_PENDING';

export type ProgramStateResolution = {
  lifecycleState: TrainingLifecycleState;
  nextTrainingDateString: string;
  
  completedDaysCount: number;
  currentProgramDay: number;
  isTodayCompleted: boolean;
  todayCardState: 'COMPLETED' | 'TARGET';
  nextSession: ProgramDay | null;
  lastCompletedSession: {
    programDayNumber: number;
    difficulty: string | null;
    energy: number | null;
  } | null;
  timeline: TimelineDay[];
};



export function formatNextTrainingDate(lastCompletedDateStr: string | null, frequency: string | undefined, todayLocalDateStr: string): string {
  if (!lastCompletedDateStr) return 'Today';
  
  const restDays = deriveRestDays(frequency);
  const nextDate = new Date(lastCompletedDateStr + 'T00:00:00');
  nextDate.setDate(nextDate.getDate() + restDays + 1);
  
  const today = new Date(todayLocalDateStr + 'T00:00:00');
  
  const diffDays = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  
  return nextDate.toLocaleDateString(undefined, { weekday: 'long' });
}

export function getUserTrainingLifecycleState(
  events: UserEvent[], 
  programStructure: ProgramDay[], 
  profile: { onboarding_completed?: boolean; weekly_frequency?: string } | null | undefined, 
  todayLocalDate: string
): TrainingLifecycleState {
  if (!profile?.onboarding_completed || !programStructure || programStructure.length === 0) {
    return 'NOT_STARTED';
  }
  
  const completionEvents = events.filter(e => e.event_type === 'DAY_COMPLETED');
  if (completionEvents.length === 0) {
    return 'PLAN_READY_NOT_STARTED';
  }

  // Ensure chronological sort
  const sortedCompletions = [...completionEvents].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const lastEvent = sortedCompletions[sortedCompletions.length - 1];
  const isCompletedToday = lastEvent.event_date === todayLocalDate;
  
  if (isCompletedToday) {
    return 'SESSION_COMPLETED_TODAY';
  }

  const daysSinceLast = getDaysDifference(todayLocalDate, lastEvent.event_date);
  const expectedRestDays = deriveRestDays(profile.weekly_frequency);
  
  if (daysSinceLast > 0 && daysSinceLast <= expectedRestDays) {
    return 'RECOVERY_DAY';
  } else if (daysSinceLast > expectedRestDays) {
    // If they were supposed to train but haven't yet, and today IS the day they missed? 
    // wait, if today is the day after rest, they should be training TODAY.
    // e.g., expectedRest = 1. daysSinceLast = 2. 
    // yesterday was rest. today is training.
    // If today is training day, it's READY. If yesterday was training day and they didn't train, it's MISSED.
    // If daysSinceLast > expectedRestDays + 1, it implies they missed a training day.
    if (daysSinceLast > expectedRestDays + 1) {
      return 'MISSED_TRAINING_DAY';
    }
  }

  return 'READY_TO_TRAIN_TODAY';
}

import { buildConsistencyGrid, getStartDate, deriveRestDays } from './continuitySelectors';

/**
 * resolveProgramState
 * 
 * PURE FUNCTION.
 * Derives the exact user progress cursor, next session target, and timeline
 * from the stream of user_events.
 */
export const resolveProgramState = (
  events: UserEvent[],
  programStructure: ProgramDay[],
  profile: { onboarding_completed?: boolean; weekly_frequency?: string } | null | undefined,
  todayLocalDate: string
): ProgramStateResolution => {
  const lifecycleState = getUserTrainingLifecycleState(events, programStructure, profile, todayLocalDate);

  if (!programStructure || programStructure.length === 0) {
    return {
      lifecycleState,
      nextTrainingDateString: 'Unknown',
      completedDaysCount: 0,
      currentProgramDay: 1,
      isTodayCompleted: false,
      todayCardState: 'TARGET',
      nextSession: null,
      lastCompletedSession: null,
      timeline: [],
    };
  }

  const completionEvents = events.filter(e => e.event_type === 'DAY_COMPLETED');
  const sortedCompletions = [...completionEvents].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  const completedDaysCount = completionEvents.length;
  const currentProgramDay = completedDaysCount + 1;
  const isTodayCompleted = completionEvents.some(e => e.event_date === todayLocalDate);
  const todayCardState = isTodayCompleted ? 'COMPLETED' : 'TARGET';

  let lastCompletedSession = null;
  let lastCompletedDateStr: string | null = null;
  
  if (sortedCompletions.length > 0) {
    const lastEvent = sortedCompletions[sortedCompletions.length - 1];
    lastCompletedDateStr = lastEvent.event_date;
    lastCompletedSession = {
      programDayNumber: completedDaysCount,
      difficulty: (lastEvent.event_meta?.difficulty as string) || null,
      energy: (lastEvent.event_meta?.energyLevel as number) || null,
    };
  }

  const nextTrainingDateString = formatNextTrainingDate(lastCompletedDateStr, profile?.weekly_frequency, todayLocalDate);

  const timeline: TimelineDay[] = [];
  
  const start = getStartDate(events) || todayLocalDate;
  const { grid } = buildConsistencyGrid(start, todayLocalDate, profile?.weekly_frequency, events);
  
  let programCursor = 1;

  grid.forEach((day) => {
    if (day.date === todayLocalDate) return; // Skip today in the past loop
    
    const structIndex = (programCursor - 1) % programStructure.length;
    const structureDay = programStructure[structIndex];

    if (day.state === 'COMPLETED') {
      const ev = sortedCompletions.find(e => e.event_date === day.date);
      if (ev) {
        timeline.push({
          id: ev.id,
          dayNumber: programCursor,
          title: structureDay.title,
          focusType: structureDay.focus_type,
          state: 'COMPLETED',
          dateStr: day.date,
          difficulty: (ev.event_meta?.difficulty as string) || undefined,
        });
        programCursor++;
      }
    } else if (day.state === 'MISSED') {
      timeline.push({
        id: `missed-${day.date}`,
        dayNumber: programCursor,
        title: structureDay.title,
        focusType: 'rest', // Show as missed/rest to user
        state: 'MISSED',
        dateStr: day.date,
      });
      // DO NOT increment programCursor - the actual workout shifts forward naturally!
    }
  });

  if (isTodayCompleted) {
      const ev = sortedCompletions.find(e => e.event_date === todayLocalDate)!;
      const structIndex = (programCursor - 1) % programStructure.length;
      const structureDay = programStructure[structIndex];
      
      timeline.push({
          id: ev.id,
          dayNumber: programCursor,
          title: structureDay.title,
          focusType: structureDay.focus_type,
          state: 'COMPLETED',
          dateStr: todayLocalDate,
          difficulty: (ev.event_meta?.difficulty as string) || undefined,
      });
      programCursor++;
  }

  const nextSessionIndex = (programCursor - 1) % programStructure.length;
  const nextSession = programStructure[nextSessionIndex];

  timeline.push({
    id: `target-${programCursor}`,
    dayNumber: programCursor,
    title: nextSession.title,
    focusType: nextSession.focus_type,
    state: 'TARGET',
  });

  for (let i = 1; i <= 3; i++) {
    const upcomingDayNum = programCursor + i;
    const upcomingIndex = (upcomingDayNum - 1) % programStructure.length;
    const upcomingStruct = programStructure[upcomingIndex];
    timeline.push({
      id: `upcoming-${upcomingDayNum}`,
      dayNumber: upcomingDayNum,
      title: upcomingStruct.title,
      focusType: upcomingStruct.focus_type,
      state: 'UPCOMING',
    });
  }

  return {
    lifecycleState,
    nextTrainingDateString,
    completedDaysCount,
    currentProgramDay,
    isTodayCompleted,
    todayCardState,
    nextSession,
    lastCompletedSession,
    timeline
  };
};
