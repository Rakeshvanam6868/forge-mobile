import {
  computeNextWorkout,
  UserTrainingState,
  UserWorkoutHistory,
  PROGRAM_DAYS,
} from '../adaptiveEntryEngine';

describe('Workout Timeline & Rotation Logic', () => {
  const baseState: UserTrainingState = {
    level: 'intermediate',
    frequency: '3-4',
    lastWorkout: 'none',
    goal: 'general_fitness',
  };

  const todayStr = '2026-03-10';

  describe('Missed Day Logic', () => {
    it('should shift the workout to the next slot when a day is missed (3-day inactivity)', () => {
      // User did 'pull' on Mar 7. 
      // 3 days inactivity (Mar 8, 9, 10) should restart safely with 'full' for intermediate.
      const history: UserWorkoutHistory = {
        lastCompletedWorkoutType: 'pull',
        lastCompletionDate: '2026-03-07',
      };
      
      const result = computeNextWorkout(baseState, history, todayStr);
      
      expect(result.workoutType).toBe('full');
      expect(result.reason).toBe('Restart after inactivity');
    });

    it('should force a reduced volume full-body session after 7+ days of inactivity', () => {
      const history: UserWorkoutHistory = {
        lastCompletedWorkoutType: 'legs',
        lastCompletionDate: '2026-03-01', // 9 days ago
      };
      
      const result = computeNextWorkout(baseState, history, todayStr);
      
      expect(result.workoutType).toBe('full');
      expect(result.volumeModifier).toBe('reduced');
      expect(result.reason).toContain('restarting with a smart low-volume session');
    });
  });

  describe('Frequency-based Rotations', () => {
    it('should follow Upper/Lower rotation for 3-4 days frequency', () => {
      const history: UserWorkoutHistory = {
        lastCompletedWorkoutType: 'upper',
        lastCompletionDate: '2026-03-09',
      };
      
      const result = computeNextWorkout(baseState, history, todayStr);
      expect(result.workoutType).toBe('lower');
    });

    it('should follow PPL + Upper rotation for 5+ days frequency', () => {
      const state: UserTrainingState = { ...baseState, frequency: '5+' };
      
      // Last was legs -> Next should be upper
      let history: UserWorkoutHistory = {
        lastCompletedWorkoutType: 'legs',
        lastCompletionDate: '2026-03-09',
      };
      let result = computeNextWorkout(state, history, todayStr);
      expect(result.workoutType).toBe('upper');

      // Last was upper -> Next should be cardio_core
      history = {
        lastCompletedWorkoutType: 'upper',
        lastCompletionDate: '2026-03-10',
      };
      result = computeNextWorkout(state, history, '2026-03-11');
      expect(result.workoutType).toBe('cardio_core');
    });

    it('should follow simple Full/Cardio/Mobility rotation for 1-2 days frequency', () => {
      const state: UserTrainingState = { ...baseState, frequency: '1-2' };
      
      const history: UserWorkoutHistory = {
        lastCompletedWorkoutType: 'full',
        lastCompletionDate: '2026-03-08',
      };
      
      const result = computeNextWorkout(state, history, todayStr);
      expect(result.workoutType).toBe('cardio_core');
    });
  });

  describe('Timeline Consistency', () => {
    it('should not duplicate workouts if called multiple times with same state', () => {
      const history: UserWorkoutHistory = {
        lastCompletedWorkoutType: 'push',
        lastCompletionDate: '2026-03-09',
      };
      
      const firstResult = computeNextWorkout(baseState, history, todayStr);
      const secondResult = computeNextWorkout(baseState, history, todayStr);
      
      expect(firstResult.workoutType).toBe(secondResult.workoutType);
      expect(firstResult.workoutType).toBe('lower'); // 3-4 days freq: push -> lower
    });
  });
});
