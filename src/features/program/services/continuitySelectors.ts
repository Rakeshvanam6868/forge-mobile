import { UserEvent } from '../../analytics/types/analytics';
import { deriveRestDays } from './programStateEngine';

export type ConsistencyState = 'PLANNED' | 'COMPLETED' | 'MISSED' | 'REST' | 'TODAY';

export type ConsistencyGridDay = {
  date: string;
  state: ConsistencyState;
};

export type TodayState = 'COMPLETED' | 'TARGET' | 'RECOVERY';

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function getStartDate(events: UserEvent[]): string | null {
  const startEvent = events.find(e => e.event_type === 'PROGRAM_STARTED');
  if (startEvent) return startEvent.event_date;
  
  const completions = events
    .filter(e => e.event_type === 'DAY_COMPLETED')
    .map(e => e.event_date)
    .sort();
    
  return completions.length > 0 ? completions[0] : null;
}

export function buildConsistencyGrid(
  startDateStr: string | null,
  todayDateStr: string,
  frequency: string | undefined,
  events: UserEvent[],
  streakMissThreshold: number = 2
) {
  if (!startDateStr || startDateStr > todayDateStr) {
    return { 
      grid: [{ date: todayDateStr, state: 'TODAY' }] as ConsistencyGridDay[], 
      currentStreak: 0, 
      isStreakActive: false,
      isTodayTrainingDay: true,
      nextTrainingDateStr: todayDateStr
    };
  }

  const completions = new Set(
    events.filter(e => e.event_type === 'DAY_COMPLETED').map(e => e.event_date)
  );
  
  const restDays = deriveRestDays(frequency);
  
  let currentDate = startDateStr;
  let isTrainingDay = true; // Always start program on a training day
  let restDaysAccumulated = 0;
  
  const grid: ConsistencyGridDay[] = [];
  let currentStreak = 0;
  let consecutiveMisses = 0;
  
  while (currentDate <= todayDateStr) {
    const isToday = currentDate === todayDateStr;
    const isCompleted = completions.has(currentDate);
    
    let stateForDay: ConsistencyState;
    
    if (isCompleted) {
      stateForDay = 'COMPLETED';
      currentStreak++;
      consecutiveMisses = 0;
      
      if (isTrainingDay) {
        // Completed scheduled day -> transition to rest if applicable
        if (restDays > 0) {
          isTrainingDay = false;
          restDaysAccumulated = 0;
        }
      } else {
        // Completed on a rest day -> stay in rest, but reset counter
        restDaysAccumulated = 0;
      }
    } else {
      if (isToday) {
        stateForDay = 'TODAY';
      } else {
        if (isTrainingDay) {
          stateForDay = 'MISSED';
          consecutiveMisses++;
          if (consecutiveMisses >= streakMissThreshold) {
            currentStreak = 0; // Streak resets
          }
          // Next day remains a training day (shifts forward)
        } else {
          stateForDay = 'REST';
          restDaysAccumulated++;
          if (restDaysAccumulated >= restDays) {
            isTrainingDay = true;
          }
        }
      }
    }

    if (isToday && !isCompleted) {
      stateForDay = 'TODAY';
    }
    
    grid.push({ date: currentDate, state: stateForDay });
    
    if (isToday) break;
    currentDate = addDays(currentDate, 1);
  }
  
  // Calculate next training date for recovery UI
  let nextTrainingDateStr = todayDateStr;
  if (!isTrainingDay && !completions.has(todayDateStr)) {
    const daysUntilTraining = restDays - restDaysAccumulated;
    nextTrainingDateStr = addDays(todayDateStr, daysUntilTraining > 0 ? daysUntilTraining : 1);
  } else if (isTrainingDay && completions.has(todayDateStr)) { // completed today, next is in future
     const futureRestDays = restDays > 0 ? restDays : 0;
     nextTrainingDateStr = addDays(todayDateStr, futureRestDays + 1);
  }

  return {
    grid,
    currentStreak,
    isStreakActive: currentStreak > 0,
    isTodayTrainingDay: isTrainingDay,
    nextTrainingDateStr
  };
}

export function getTodayState(
  startDateStr: string | null,
  todayDateStr: string,
  frequency: string | undefined,
  events: UserEvent[]
): TodayState {
  const completions = events.filter(e => e.event_type === 'DAY_COMPLETED').map(e => e.event_date);
  if (completions.includes(todayDateStr)) {
    return 'COMPLETED';
  }
  
  const { isTodayTrainingDay } = buildConsistencyGrid(startDateStr, todayDateStr, frequency, events);
  return isTodayTrainingDay ? 'TARGET' : 'RECOVERY';
}

export function getScheduleForDate(
  targetDateStr: string,
  startDateStr: string | null,
  frequency: string | undefined,
  events: UserEvent[]
): boolean {
  // If we just build the grid up to targetDateStr, we get exactly what we need!
  const { isTodayTrainingDay } = buildConsistencyGrid(startDateStr, targetDateStr, frequency, events);
  return isTodayTrainingDay;
}
