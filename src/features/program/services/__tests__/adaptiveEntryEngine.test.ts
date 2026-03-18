import {
  computeNextWorkout,
  UserTrainingState,
  UserWorkoutHistory,
  WorkoutType,
} from '../adaptiveEntryEngine';

describe('Adaptive Workout Entry Engine', () => {
  const baseState: UserTrainingState = {
    level: 'intermediate',
    frequency: '3-4',
    lastWorkout: 'none',
    goal: 'general_fitness',
  };

  const baseHistory: UserWorkoutHistory = {};

  const todayStr = '2026-03-01';

  it('1. New user (no history) -> map onboarding (none -> push)', () => {
    const result = computeNextWorkout(baseState, baseHistory, todayStr);
    expect(result.workoutType).toBe('push');
    expect(result.reason).toBe('Based on onboarding profile');
    expect(result.volumeModifier).toBe('normal');
  });

  it('2. Advanced user, 5+ frequency -> skips mobility, allows higher intensity', () => {
    const state: UserTrainingState = { ...baseState, level: 'advanced', frequency: '5+' };
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'cardio_core',
      lastCompletionDate: '2026-02-28', // 1 day ago
    };
    const result = computeNextWorkout(state, history, todayStr);
    
    // cardio_core normally -> mobility. For 5+ -> push
    expect(result.workoutType).toBe('push');
    expect(result.volumeModifier).toBe('intense');
  });

  it('3. 3-day inactivity -> restarts safely with full', () => {
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'pull',
      lastCompletionDate: '2026-02-26', // exactly 3 days ago from 03-01
    };
    const result = computeNextWorkout(baseState, history, todayStr);
    
    expect(result.workoutType).toBe('full');
    expect(result.reason).toBe('Restart after inactivity');
    expect(result.uiSubLabel).toBe('Restart after short break');
    expect(result.volumeModifier).toBe('normal'); // intermediate
  });

  it('4. Return after long break (7+ days) -> force full with reduced volume', () => {
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'legs',
      lastCompletionDate: '2026-02-20', // 9 days ago
    };
    const result = computeNextWorkout(baseState, history, todayStr);
    
    expect(result.workoutType).toBe('full');
    expect(result.reason).toBe('Welcome back — restarting with a smart low-volume session');
    expect(result.volumeModifier).toBe('reduced'); // forced reduced even if intermediate
  });

  it('5. Same day repeat open -> shows mobility (recovery)', () => {
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'push',
      lastCompletionDate: '2026-03-01', // same day
    };
    const result = computeNextWorkout(baseState, history, todayStr);
    
    expect(result.workoutType).toBe('mobility');
    expect(result.reason).toBe('Already trained today');
    expect(result.uiSubLabel).toBe('Active recovery (trained today)');
  });

  it('6. Beginner low frequency (1-2) -> simplified rotation', () => {
    const state: UserTrainingState = { ...baseState, level: 'beginner', frequency: '1-2' };
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'full',
      lastCompletionDate: '2026-02-28',
    };
    const result = computeNextWorkout(state, history, todayStr);
    
    expect(result.workoutType).toBe('rest');
    expect(result.volumeModifier).toBe('reduced'); // beginner
  });

  it('7. Corrupted onboarding data fallback', () => {
    // Missing fields simulating corrupted data
    const state = {
      level: undefined,
      frequency: undefined,
      lastWorkout: undefined,
      goal: undefined,
    } as unknown as UserTrainingState;
    const result = computeNextWorkout(state, baseHistory, todayStr);
    
    expect(result.workoutType).toBe('push'); // defaults
    expect(result.volumeModifier).toBe('reduced'); // falls back to beginner
    expect(result.uiLabel).toBe('Consistency focus'); // falls back to general_fitness
  });

  it('8. Timezone change normalization (uses YYYY-MM-DD safely)', () => {
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'push',
      lastCompletionDate: '2026-02-28T23:59:59.999Z',
    };
    const result = computeNextWorkout(baseState, history, new Date('2026-03-01T01:00:00.000Z'));
    
    // Days diff is 1. (Feb 28 to Mar 1)
    expect(result.workoutType).toBe('lower');
  });
});
