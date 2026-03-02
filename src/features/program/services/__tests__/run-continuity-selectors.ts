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

const START_DATE = '2026-03-01';

// SCENARIO 1
const events1 = [
  createEvent(START_DATE, 'PROGRAM_STARTED'),
  createEvent('2026-03-01'), // Completed Day 1
  createEvent('2026-03-03'), // Completed Day 2
];
const result1 = buildConsistencyGrid(START_DATE, '2026-03-04', '3-4', events1);
console.log('\\n--- SCENARIO 1: Happy Path (Alternating Days) ---');
console.log('Grid:', JSON.stringify(result1.grid, null, 2));
console.log('Today is Training Day?', result1.isTodayTrainingDay);
console.log('Current Streak:', result1.currentStreak);
console.log('Next Training Date:', result1.nextTrainingDateStr);
console.log('Today State UI:', getTodayState(START_DATE, '2026-03-04', '3-4', events1));

// SCENARIO 2
const events2 = [
  createEvent(START_DATE, 'PROGRAM_STARTED'),
  createEvent('2026-03-01'), // Completed Day 1
];
const result2 = buildConsistencyGrid(START_DATE, '2026-03-04', '5+', events2);
console.log('\\n--- SCENARIO 2: Missed Days (Everyday Training) ---');
console.log('Grid:', JSON.stringify(result2.grid, null, 2));
console.log('Today is Training Day?', result2.isTodayTrainingDay);
console.log('Current Streak:', result2.currentStreak);
console.log('Next Training Date:', result2.nextTrainingDateStr);
console.log('Today State UI:', getTodayState(START_DATE, '2026-03-04', '5+', events2));

// SCENARIO 3
const events3 = [
  createEvent(START_DATE, 'PROGRAM_STARTED'),
  createEvent('2026-03-01'), // Completed Day 1
];
const result3 = buildConsistencyGrid(START_DATE, '2026-03-04', '3-4', events3);
console.log('\\n--- SCENARIO 3: Shift Forward Rule ---');
console.log('Expected: 03-02 is REST. 03-03 is MISSED. 03-04 is TODAY (but intrinsically a training day).');
console.log('Grid:', JSON.stringify(result3.grid, null, 2));
console.log('Today is Training Day?', result3.isTodayTrainingDay);
console.log('Next Training Date:', result3.nextTrainingDateStr);
