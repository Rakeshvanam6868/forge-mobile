import { calculateStreaks } from '../streakCalculator';
import { toDateString } from '../../../../core/utils/dateUtils';

// Mock dateUtils to have a fixed "today"
jest.mock('../../../../core/utils/dateUtils', () => ({
  toDateString: jest.fn((date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }),
}));

describe('Streak Calculation Logic', () => {
  const last30Days = [
    '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05',
    '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10'
  ];

  // We need to fix "today" for the test
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-10T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should return 0 streak if no workouts completed', () => {
    const completedDaysMap = {};
    const { currentStreak } = calculateStreaks(completedDaysMap, last30Days);
    expect(currentStreak).toBe(0);
  });

  it('should return 1 for a single completed workout today', () => {
    const completedDaysMap = { '2026-03-10': true };
    const { currentStreak } = calculateStreaks(completedDaysMap, last30Days);
    expect(currentStreak).toBe(1);
  });

  it('should return 1 for a workout completed yesterday (today not yet done)', () => {
    const completedDaysMap = { '2026-03-09': true };
    const { currentStreak } = calculateStreaks(completedDaysMap, last30Days);
    expect(currentStreak).toBe(1); // Streak stays alive until end of day
  });

  it('should increment correctly for consecutive days', () => {
    const completedDaysMap = {
      '2026-03-08': true,
      '2026-03-09': true,
      '2026-03-10': true
    };
    const { currentStreak } = calculateStreaks(completedDaysMap, last30Days);
    expect(currentStreak).toBe(3);
  });

  it('should reset current streak if a gap exists before yesterday', () => {
    const completedDaysMap = {
      '2026-03-01': true,
      '2026-03-02': true,
      '2026-03-10': true
    };
    const { currentStreak } = calculateStreaks(completedDaysMap, last30Days);
    expect(currentStreak).toBe(1);
  });

  it('should correctly calculate longest streak from history', () => {
    const completedDaysMap = {
      '2026-03-01': true,
      '2026-03-02': true,
      '2026-03-03': true,
      '2026-03-07': true,
      '2026-03-08': true
    };
    const { longestStreak } = calculateStreaks(completedDaysMap, last30Days);
    expect(longestStreak).toBe(3);
  });
});
