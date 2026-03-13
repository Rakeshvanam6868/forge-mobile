import { upsertExerciseHistory } from '../exerciseHistoryQueries';
import { supabase } from '../../../../core/supabase/client';

// Mock Supabase
jest.mock('../../../../core/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockResolvedValue({ error: null }),
  },
}));

// Mock dateUtils
jest.mock('../../../../core/utils/dateUtils', () => ({
  toDateString: jest.fn().mockReturnValue('2026-03-10'),
}));

describe('Adaptive Weight Progression Logic', () => {
  const userId = 'user-123';
  const exercises = [
    {
      exercise_id: 'bench_press',
      sets: 3,
      reps: 10,
      weight: 60,
      difficulty: 'easy' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should increase weight by 5% when difficulty is easy and energy is high', async () => {
    const sessionEnergy = 3; // High
    
    // Mock current history fetch (not actually used in the final calculation in current implementation, but good to have)
    (supabase.from as jest.Mock)().select.mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [] }),
    });

    await upsertExerciseHistory(userId, exercises, sessionEnergy);

    const upsertCall = (supabase.from as jest.Mock)().upsert.mock.calls[0][0];
    const benchPressRow = upsertCall.find((r: any) => r.exercise_id === 'bench_press');

    // 60 * 1.05 = 63. Rounded to nearest 2.5 = 62.5
    expect(benchPressRow.suggested_weight).toBe(62.5);
  });

  it('should decrease weight by 5% when difficulty is hard', async () => {
    const sessionEnergy = 2; // Medium
    const hardExercises = [{ ...exercises[0], difficulty: 'hard' as const }];

    await upsertExerciseHistory(userId, hardExercises, sessionEnergy);

    const upsertCall = (supabase.from as jest.Mock)().upsert.mock.calls[0][0];
    const benchPressRow = upsertCall.find((r: any) => r.exercise_id === 'bench_press');

    // 60 * 0.95 = 57. Rounded to nearest 2.5 = 57.5
    expect(benchPressRow.suggested_weight).toBe(57.5);
  });

  it('should decrease weight by 5% when energy is low regardless of difficulty', async () => {
    const sessionEnergy = 1; // Low
    const easyExercises = [{ ...exercises[0], difficulty: 'medium' as const }];

    await upsertExerciseHistory(userId, easyExercises, sessionEnergy);

    const upsertCall = (supabase.from as jest.Mock)().upsert.mock.calls[0][0];
    const benchPressRow = upsertCall.find((r: any) => r.exercise_id === 'bench_press');

    // 60 * 0.95 = 57. Rounded to nearest 2.5 = 57.5
    expect(benchPressRow.suggested_weight).toBe(57.5);
  });

  it('should maintain weight if difficulty is medium and energy is average', async () => {
    const sessionEnergy = 2; // Average
    const mediumExercises = [{ ...exercises[0], difficulty: 'medium' as const }];

    await upsertExerciseHistory(userId, mediumExercises, sessionEnergy);

    const upsertCall = (supabase.from as jest.Mock)().upsert.mock.calls[0][0];
    const benchPressRow = upsertCall.find((r: any) => r.exercise_id === 'bench_press');

    expect(benchPressRow.suggested_weight).toBe(60);
  });

  it('should ensure suggested weight never drops below 2.5kg if original was > 0', async () => {
    const sessionEnergy = 1; 
    const lightExercises = [{ ...exercises[0], weight: 1, difficulty: 'hard' as const }];

    await upsertExerciseHistory(userId, lightExercises, sessionEnergy);

    const upsertCall = (supabase.from as jest.Mock)().upsert.mock.calls[0][0];
    const benchPressRow = upsertCall.find((r: any) => r.exercise_id === 'bench_press');

    expect(benchPressRow.suggested_weight).toBe(2.5);
  });
});
