import { useWorkoutSessionStore } from '../workoutSessionStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdaptedWorkout } from '../../../program/services/adaptiveEngine';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Workout Session Store & Persistence', () => {
  const dummyWorkouts: AdaptedWorkout[] = [
    {
      id: 'ex1',
      exercise_name: 'Push Ups',
      sets: 3,
      reps: '10',
      isAdapted: false,
      adaptedSets: 3,
      adaptedReps: '10',
      category: 'calisthenics'
    } as any
  ];

  beforeEach(() => {
    // Reset Zustand store state before each test
    // Since zustand doesn't have a built-in "reset everything" for persisted stores easily, 
    // we use a fresh initial state call if the store allows it.
    // For simplicity, we just clear the session.
    useWorkoutSessionStore.getState().clearSession();
    jest.clearAllMocks();
  });

  it('should initialize a session correctly when startSession is called', () => {
    const store = useWorkoutSessionStore.getState();
    store.startSession(dummyWorkouts);

    const state = useWorkoutSessionStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.exercises.length).toBe(1);
    expect(state.exercises[0].exerciseName).toBe('Push Ups');
    expect(state.sessionId).toBeDefined();
  });

  it('should update progression as sets are completed', () => {
    const store = useWorkoutSessionStore.getState();
    store.startSession(dummyWorkouts);
    
    // Complete first set
    store.completeSet(0, 10, null);
    
    const state = useWorkoutSessionStore.getState();
    expect(state.exercises[0].sets[0].completed).toBe(true);
    expect(state.currentSetIndex).toBe(1);
  });

  it('should be able to abandon a workout and clear state', () => {
    const store = useWorkoutSessionStore.getState();
    store.startSession(dummyWorkouts);
    store.abandonWorkout();
    
    const state = useWorkoutSessionStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.exercises.length).toBe(0);
  });

  it('should handle pause and resume logic correctly', () => {
    const store = useWorkoutSessionStore.getState();
    store.startSession(dummyWorkouts);
    
    store.pauseSession();
    expect(useWorkoutSessionStore.getState().isPaused).toBe(true);
    
    store.resumeSession();
    expect(useWorkoutSessionStore.getState().isPaused).toBe(false);
  });
});
