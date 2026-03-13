import {
  computeNextWorkout,
  UserTrainingState,
  UserWorkoutHistory,
} from '../adaptiveEntryEngine';

describe('Recovery Adjustment Logic', () => {
  const baseState: UserTrainingState = {
    level: 'intermediate',
    frequency: '3-4',
    lastWorkout: 'none',
    goal: 'general_fitness',
  };

  const todayStr = '2026-03-10';

  it('should reduce volume when difficulty was HARD', () => {
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'push',
      lastCompletionDate: '2026-03-09',
      lastDifficulty: 'hard',
    };
    
    const result = computeNextWorkout(baseState, history, todayStr);
    expect(result.volumeModifier).toBe('reduced');
  });

  it('should increase intensity for ADVANCED users with HIGH energy', () => {
    const state: UserTrainingState = { ...baseState, level: 'advanced' };
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'push',
      lastCompletionDate: '2026-03-09',
      lastEnergy: 'high',
    };
    
    const result = computeNextWorkout(state, history, todayStr);
    expect(result.volumeModifier).toBe('intense');
  });

  it('should maintain NORMAL volume for intermediate level with medium energy', () => {
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'push',
      lastCompletionDate: '2026-03-09',
      lastEnergy: 'medium',
    };
    
    const result = computeNextWorkout(baseState, history, todayStr);
    expect(result.volumeModifier).toBe('normal');
  });

  it('should default to REDUCED volume for beginners', () => {
    const state: UserTrainingState = { ...baseState, level: 'beginner' };
    const history: UserWorkoutHistory = {
      lastCompletedWorkoutType: 'push',
      lastCompletionDate: '2026-03-09',
    };
    
    const result = computeNextWorkout(state, history, todayStr);
    expect(result.volumeModifier).toBe('reduced');
  });
});
