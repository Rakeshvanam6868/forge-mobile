import { UserEvent } from '../../../analytics/types/analytics';
import {
  buildConsistencyGrid,
  getTodayState,
  getScheduleForDate,
  getStartDate,
} from '../continuitySelectors';

const createEvent = (date: string, type: UserEvent['event_type'] = 'DAY_COMPLETED'): UserEvent => ({
  id: `evt-${date}`,
  user_id: 'user-1',
  event_type: type,
  event_date: date,
  event_meta: {},
  created_at: new Date(date + 'T12:00:00Z').toISOString(),
});

describe('Continuity Selectors', () => {
  const START_DATE = '2026-03-01';
  
  it('Scenario 1: Happy Path - Completed 2 days on alternating schedule', () => {
    // 3-4 days a week means 1 rest day between workouts
    const events = [
      createEvent(START_DATE, 'PROGRAM_STARTED'),
      createEvent('2026-03-01'), // Completed Day 1
      createEvent('2026-03-03'), // Completed Day 2
    ];
    
    // Check 2026-03-04 (should be rest day, NEXT workout is 2026-03-05)
    const result = buildConsistencyGrid(START_DATE, '2026-03-04', '3-4', events);
    
    console.log('\\n--- SCENARIO 1: Happy Path (Alternating Days) ---');
    console.log('Grid:', JSON.stringify(result.grid, null, 2));
    console.log('Today is Training Day?', result.isTodayTrainingDay);
    console.log('Current Streak:', result.currentStreak);
    console.log('Next Training Date:', result.nextTrainingDateStr);
    console.log('Today State UI:', getTodayState(START_DATE, '2026-03-04', '3-4', events));
    
    expect(result.isTodayTrainingDay).toBe(false);
  });

  it('Scenario 2: Missed Days and Streak Reset', () => {
    // 5+ days a week means 0 rest days (Train everyday)
    const events = [
      createEvent(START_DATE, 'PROGRAM_STARTED'),
      createEvent('2026-03-01'), // Completed Day 1
      // misses 2nd and 3rd
    ];
    
    // Check 2026-03-04
    const result = buildConsistencyGrid(START_DATE, '2026-03-04', '5+', events);
    
    console.log('\\n--- SCENARIO 2: Missed Days (Everyday Training) ---');
    console.log('Grid:', JSON.stringify(result.grid, null, 2));
    console.log('Today is Training Day?', result.isTodayTrainingDay);
    console.log('Current Streak:', result.currentStreak);
    console.log('Next Training Date:', result.nextTrainingDateStr);
    console.log('Today State UI:', getTodayState(START_DATE, '2026-03-04', '5+', events));
  });

  it('Scenario 3: Shifts Forward Rule', () => {
    // 3-4 days (1 rest day). 
    // Start 03-01. Did 03-01. Therefore 03-02 is REST. 03-03 is TRAINING.
    // User does NOT train on 03-03.
    // Therefore 03-04 should still be a TRAINING day, not REST!
    const events = [
      createEvent(START_DATE, 'PROGRAM_STARTED'),
      createEvent('2026-03-01'), // Completed Day 1
    ];
    
    // Check 2026-03-04
    const result = buildConsistencyGrid(START_DATE, '2026-03-04', '3-4', events);
    
    console.log('\\n--- SCENARIO 3: Shift Forward Rule ---');
    console.log('Expected: 03-02 is REST. 03-03 is MISSED. 03-04 is TODAY (but intrinsically a training day).');
    console.log('Grid:', JSON.stringify(result.grid, null, 2));
    console.log('Today is Training Day?', result.isTodayTrainingDay);
    console.log('Next Training Date:', result.nextTrainingDateStr);
  });
});
