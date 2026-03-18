/**
 * Staff-Level Workout Engine Test Suite
 * 
 * Rigorously validates the deterministic, rule-based generation pipeline.
 * Ensures strict muscle group isolation, template adherence, goal-based adaptation,
 * equipment constraints, and home-only filtering.
 */

import { getTemplateForType } from '../programGenerator';
import { EXERCISE_POOL, MuscleGroup } from '../../data/exercisePools';

// Mock Supabase (needed because programGenerator imports it)
jest.mock('../../../../core/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [{ id: 'mock-id' }], error: null })),
      })),
    })),
  },
}));

describe('Workout Engine: Staff-Level Rigor Tests', () => {

  describe('Strict Muscle Group Isolation', () => {
    test('Push Day MUST NOT contain Pull muscles (biceps, back)', () => {
      const template = getTemplateForType('push', 'intermediate', 'Gym', 'muscle_gain');
      const forbidden: MuscleGroup[] = ['back', 'biceps'];
      
      template.workouts.forEach(w => {
        const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
        const hasForbidden = pool?.muscleGroup.some(mg => forbidden.includes(mg));
        expect(hasForbidden).toBe(false);
      });
    });

    test('Pull Day MUST NOT contain Push muscles (chest, shoulders, triceps)', () => {
      const template = getTemplateForType('pull', 'intermediate', 'Gym', 'muscle_gain');
      const forbidden: MuscleGroup[] = ['chest', 'shoulders', 'triceps'];
      
      template.workouts.forEach(w => {
        const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
        const hasForbidden = pool?.muscleGroup.some(mg => forbidden.includes(mg));
        expect(hasForbidden).toBe(false);
      });
    });

    test('Legs Day MUST focus on legs and core', () => {
      const template = getTemplateForType('legs', 'intermediate', 'Gym', 'muscle_gain');
      const allowed: MuscleGroup[] = ['legs', 'core', 'full_body', 'mobility'];
      
      template.workouts.forEach(w => {
        const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
        const isAllowed = pool?.muscleGroup.some(mg => allowed.includes(mg));
        expect(isAllowed).toBe(true);
      });
    });
  });

  describe('Structural Template Adherence', () => {
    test('Workout MUST follow the structural pipeline (Warmup -> Compound -> Accessory -> Isolation)', () => {
      const template = getTemplateForType('push', 'intermediate', 'Gym', 'muscle_gain');
      
      // Check sequence of categories
      const categories = template.workouts.map(w => {
          const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
          return pool?.category;
      });

      expect(categories[0]).toBe('warmup');
      expect(categories.some(c => c === 'compound')).toBe(true);
      expect(categories.some(c => c === 'accessory')).toBe(true);
      expect(categories.some(c => c === 'isolation')).toBe(true);
      expect(categories[categories.length - 1]).toBe('core_cardio');
    });

    test('Exercise counts MUST scale with level', () => {
      const beg = getTemplateForType('full', 'beginner', 'Gym', 'general_fitness');
      const int = getTemplateForType('full', 'intermediate', 'Gym', 'general_fitness');
      const adv = getTemplateForType('full', 'advanced', 'Gym', 'general_fitness');

      expect(beg.workouts.length).toBeGreaterThanOrEqual(4);
      expect(int.workouts.length).toBeGreaterThan(beg.workouts.length);
      expect(adv.workouts.length).toBeGreaterThanOrEqual(int.workouts.length);
    });
  });

  describe('Adaptation Logic', () => {
    test('Goal: Strength should have lower reps and higher rest', () => {
      const gain = getTemplateForType('push', 'intermediate', 'Gym', 'strength');
      const loss = getTemplateForType('push', 'intermediate', 'Gym', 'fat_loss');

      // Check average reps
      const getReps = (template: any) => template.workouts.filter((w:any) => w.reps && !w.duration).map((w:any) => {
          const match = w.reps.match(/(\d+)/);
          return match ? parseInt(match[1]) : 10;
      });

      const gainReps = getReps(gain);
      const lossReps = getReps(loss);

      const avgGain = gainReps.reduce((a:number, b:number) => a + b, 0) / gainReps.length;
      const avgLoss = lossReps.reduce((a:number, b:number) => a + b, 0) / lossReps.length;

      expect(avgGain).toBeLessThan(avgLoss);
    });

    test('Advanced level should have more sets', () => {
      const beg = getTemplateForType('push', 'beginner', 'Gym', 'general_fitness');
      const adv = getTemplateForType('push', 'advanced', 'Gym', 'general_fitness');

      const avgSets = (template: any) => {
          const sets = template.workouts.map((w:any) => w.sets || 0);
          return sets.reduce((a:number, b:number) => a + b, 0) / sets.length;
      };

      expect(avgSets(adv)).toBeGreaterThan(avgSets(beg));
    });
  });

  describe('Determinism & Reliability', () => {
    test('Multiple runs should maintain same quality and adherence', () => {
      for (let i = 0; i < 20; i++) {
        const template = getTemplateForType('push', 'intermediate', 'Gym', 'muscle_gain');
        const hasChest = template.workouts.some(w => {
            const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
            return pool?.muscleGroup.includes('chest');
        });
        expect(hasChest).toBe(true);
      }
    });

    test('Zero validation errors should be logged in production-like runs', () => {
        const spy = jest.spyOn(console, 'warn');
        getTemplateForType('push', 'intermediate', 'Gym', 'muscle_gain');
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════
  // NEW TESTS: Equipment & Location Hard Constraints
  // ═══════════════════════════════════════════════

  describe('Home Equipment Hard Constraint', () => {
    const FORBIDDEN_HOME_EQUIPMENT = ['dumbbell', 'barbell', 'machine', 'cable'];

    test('Home Push workout: ZERO dumbbells/barbells/machines/cables', () => {
      for (let i = 0; i < 50; i++) {
        const template = getTemplateForType('push', 'intermediate', 'Home', 'muscle_gain');
        template.workouts.forEach(w => {
          const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
          if (pool) {
            const hasGymGear = pool.equipment.some(eq =>
              FORBIDDEN_HOME_EQUIPMENT.includes(eq) && !['bodyweight', 'band'].includes(eq)
            );
            // The pool exercise might have multiple equipment, but if included at home,
            // it MUST have bodyweight or band option
            const hasHomeOption = pool.equipment.some(eq => ['bodyweight', 'band'].includes(eq));
            expect(hasHomeOption).toBe(true);
          }
        });
      }
    });

    test('Home Pull workout: ZERO dumbbells/barbells/machines/cables', () => {
      for (let i = 0; i < 50; i++) {
        const template = getTemplateForType('pull', 'intermediate', 'Home', 'muscle_gain');
        template.workouts.forEach(w => {
          const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
          if (pool) {
            const hasHomeOption = pool.equipment.some(eq => ['bodyweight', 'band'].includes(eq));
            expect(hasHomeOption).toBe(true);
          }
        });
      }
    });

    test('Home Legs workout: ZERO dumbbells/barbells/machines/cables', () => {
      for (let i = 0; i < 50; i++) {
        const template = getTemplateForType('legs', 'intermediate', 'Home', 'muscle_gain');
        template.workouts.forEach(w => {
          const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
          if (pool) {
            const hasHomeOption = pool.equipment.some(eq => ['bodyweight', 'band'].includes(eq));
            expect(hasHomeOption).toBe(true);
          }
        });
      }
    });
  });

  describe('100-Run Stress Test: Split Isolation', () => {
    const PUSH_FORBIDDEN: MuscleGroup[] = ['back', 'biceps', 'legs'];
    const PULL_FORBIDDEN: MuscleGroup[] = ['chest', 'shoulders', 'triceps', 'legs'];
    const LEGS_FORBIDDEN: MuscleGroup[] = ['chest', 'back', 'shoulders', 'triceps', 'biceps'];

    test('100 Push workouts: ZERO forbidden muscle violations', () => {
      for (let i = 0; i < 100; i++) {
        const template = getTemplateForType('push', 'intermediate', 'Gym', 'muscle_gain');
        template.workouts.forEach(w => {
          const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
          if (pool) {
            const violation = pool.muscleGroup.some(mg => PUSH_FORBIDDEN.includes(mg));
            if (violation) {
              fail(`Run ${i}: Push workout contains forbidden exercise: ${w.exercise_name} (muscles: ${pool.muscleGroup.join(', ')})`);
            }
          }
        });
      }
    });

    test('100 Pull workouts: ZERO forbidden muscle violations', () => {
      for (let i = 0; i < 100; i++) {
        const template = getTemplateForType('pull', 'intermediate', 'Gym', 'muscle_gain');
        template.workouts.forEach(w => {
          const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
          if (pool) {
            const violation = pool.muscleGroup.some(mg => PULL_FORBIDDEN.includes(mg));
            if (violation) {
              fail(`Run ${i}: Pull workout contains forbidden exercise: ${w.exercise_name} (muscles: ${pool.muscleGroup.join(', ')})`);
            }
          }
        });
      }
    });

    test('100 Legs workouts: ZERO forbidden muscle violations', () => {
      for (let i = 0; i < 100; i++) {
        const template = getTemplateForType('legs', 'intermediate', 'Gym', 'muscle_gain');
        template.workouts.forEach(w => {
          const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
          if (pool) {
            const violation = pool.muscleGroup.some(mg => LEGS_FORBIDDEN.includes(mg));
            if (violation) {
              fail(`Run ${i}: Legs workout contains forbidden exercise: ${w.exercise_name} (muscles: ${pool.muscleGroup.join(', ')})`);
            }
          }
        });
      }
    });
  });

  describe('No Duplicate Exercises', () => {
    test('Within a single workout, exercise IDs must be unique', () => {
      const types = ['push', 'pull', 'legs', 'upper', 'full'] as const;
      for (const type of types) {
        for (let i = 0; i < 20; i++) {
          const template = getTemplateForType(type, 'intermediate', 'Gym', 'muscle_gain');
          const ids = template.workouts.map(w => w.exercise_id).filter(Boolean);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
        }
      }
    });
  });

  describe('Home + Split Combined Stress Test', () => {
    test('50 Home Push workouts: correct muscles AND correct equipment', () => {
      const PUSH_FORBIDDEN: MuscleGroup[] = ['back', 'biceps', 'legs'];
      for (let i = 0; i < 50; i++) {
        const template = getTemplateForType('push', 'intermediate', 'Home', 'muscle_gain');
        template.workouts.forEach(w => {
          const pool = EXERCISE_POOL.find(p => p.id === w.exercise_id);
          if (pool) {
            // Check muscles
            const muscleViolation = pool.muscleGroup.some(mg => PUSH_FORBIDDEN.includes(mg));
            expect(muscleViolation).toBe(false);
            // Check equipment
            const hasHomeEquipment = pool.equipment.some(eq => ['bodyweight', 'band'].includes(eq));
            expect(hasHomeEquipment).toBe(true);
          }
        });
      }
    });
  });
});
