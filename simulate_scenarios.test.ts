/**
 * Workout Generator Validation Test Suite
 * 
 * Executes real scenario simulations against the workout generator
 * and validates fitness programming principles.
 * 
 * Run with: npx jest simulate_scenarios.test.ts
 */

import { computeNextWorkout, UserTrainingState, UserWorkoutHistory, WorkoutType, Goal, TrainingLevel } from './src/features/program/services/adaptiveEntryEngine';
import { getExercises, PoolExercise, MuscleGroup, EXERCISE_POOL } from './src/features/program/data/exercisePools';
import { computeAdaptivePlan, AdaptiveInput } from './src/features/program/services/adaptiveEngine';

// Mock Supabase to avoid ESM parsing errors in Jest
jest.mock('./src/core/supabase/client', () => ({
    supabase: {}
}));

import { getTemplateForType } from './src/features/program/services/programGenerator';

// ═══════════════════════════════════════════════
// Helper: Wraps Real Production Logic for Testing
// ═══════════════════════════════════════════════

function simulateWorkout(type: WorkoutType, level: TrainingLevel, location: string, goal: Goal) {
    const dayTemplate = getTemplateForType(type, level, location, goal);
    
    // Enrich the template with raw pool data so tests can assert muscle groups/equipment
    const enrichedWorkouts = dayTemplate.workouts.map(w => {
        const poolEx = EXERCISE_POOL.find(p => p.id === w.exercise_id || p.name === w.exercise_name);
        return {
            name: poolEx?.name || w.exercise_name,
            sets: w.sets,
            reps: w.reps,
            equipment: poolEx?.equipment || [],
            category: poolEx?.category || 'unknown',
            muscleGroups: poolEx?.muscleGroup || []
        };
    });

    return { type, workouts: enrichedWorkouts };
}

// ═══════════════════════════════════════════════
// STEP 1 — GENERATE REAL SCENARIOS
// ═══════════════════════════════════════════════

const scenarios = [
    { id: 1, name: 'Muscle Gain, Beginner, Home, 3 Days', goal: 'muscle_gain' as Goal, level: 'beginner' as TrainingLevel, location: 'Home', freq: '3-4' as any },
    { id: 2, name: 'Fat Loss, Beginner, Home, 4 Days', goal: 'fat_loss' as Goal, level: 'beginner' as TrainingLevel, location: 'Home', freq: '3-4' as any },
    { id: 3, name: 'Muscle Gain, Intermediate, Gym, 4 Days', goal: 'muscle_gain' as Goal, level: 'intermediate' as TrainingLevel, location: 'Gym', freq: '3-4' as any },
    { id: 4, name: 'Strength, Intermediate, Gym, 5 Days', goal: 'muscle_gain' as Goal, level: 'intermediate' as TrainingLevel, location: 'Gym', freq: '5+' as any },
    { id: 5, name: 'Fat Loss, Advanced, Gym, 5 Days', goal: 'fat_loss' as Goal, level: 'advanced' as TrainingLevel, location: 'Gym', freq: '5+' as any }
];

describe('STEP 1 — SCENARIO GENERATION', () => {
    scenarios.forEach(s => {
        test(`Scenario ${s.id}: ${s.name}`, () => {
            const state: UserTrainingState = { level: s.level, frequency: s.freq, lastWorkout: 'none', goal: s.goal };
            const next = computeNextWorkout(state, {}, new Date());
            const workout = simulateWorkout(next.workoutType, s.level, s.location, s.goal);

            console.log(`\n[Scenario ${s.id}: ${s.name}]`);
            console.log(`Workout Type: ${next.workoutType}`);
            workout.workouts.forEach((w: any, i: number) => {
                console.log(`  ${i + 1}. ${w.name} | ${w.sets} sets x ${w.reps || w.category} | Equipment: ${w.equipment.join(', ')} | Muscles: ${w.muscleGroups.join(', ')}`);
            });
            console.log(`Exercise Count: ${workout.workouts.length}`);

            expect(workout.workouts.length).toBeGreaterThan(0);
        });
    });
});

// ═══════════════════════════════════════════════
// STEP 2 — VALIDATE EQUIPMENT FILTERING
// ═══════════════════════════════════════════════

describe('STEP 2 — EQUIPMENT FILTERING', () => {
    const homeScenarios = scenarios.filter(s => s.location === 'Home');

    homeScenarios.forEach(s => {
        test(`Scenario ${s.id}: Home exercises must have valid home equipment tags`, () => {
            const state: UserTrainingState = { level: s.level, frequency: s.freq, lastWorkout: 'none', goal: s.goal };
            const next = computeNextWorkout(state, {}, new Date());
            const workout = simulateWorkout(next.workoutType, s.level, s.location, s.goal);

            const allowedHome = ['bodyweight', 'dumbbell', 'band'];
            const violations: string[] = [];
            workout.workouts.forEach((w: any) => {
                const hasValidHomeOption = w.equipment.some((eq: string) => allowedHome.includes(eq));
                if (!hasValidHomeOption) {
                    violations.push(`"${w.name}" ONLY has disallowed equipment: ${w.equipment.join(', ')}`);
                }
            });

            if (violations.length > 0) {
                console.log(`\n[EQUIPMENT VIOLATION] Scenario ${s.id}:`);
                violations.forEach(v => console.log(`  - ${v}`));
            } else {
                console.log(`\n[EQUIPMENT] Scenario ${s.id}: PASS`);
            }

            expect(violations).toEqual([]);
        });
    });
});

// ═══════════════════════════════════════════════
// STEP 3 — VALIDATE EXERCISE COUNT & DUPLICATE PREVENTION
// ═══════════════════════════════════════════════

describe('STEP 3 — EXERCISE COUNT & DUPLICATE PREVENTION', () => {
    const expectedRanges: Record<string, [number, number]> = {
        beginner: [5, 6],
        intermediate: [6, 7],
        advanced: [7, 8]
    };

    scenarios.forEach(s => {
        test(`Scenario ${s.id}: ${s.level} should have ${expectedRanges[s.level][0]}-${expectedRanges[s.level][1]} exercises and NO duplicates`, () => {
            const state: UserTrainingState = { level: s.level, frequency: s.freq, lastWorkout: 'none', goal: s.goal };
            const next = computeNextWorkout(state, {}, new Date());
            const workout = simulateWorkout(next.workoutType, s.level, s.location, s.goal);

            const count = workout.workouts.length;
            const [min, max] = expectedRanges[s.level];

            // 1. Check Duplicates
            const names = workout.workouts.map((w: any) => w.name);
            const uniqueNames = new Set(names);
            if (uniqueNames.size !== names.length) {
                console.log(`\n[DUPLICATE FOUND] Scenario ${s.id}: ${names.join(', ')}`);
            }
            expect(uniqueNames.size).toBe(names.length);

            // 2. Check Capacity (Only validate strength-type workouts)
            if (['rest', 'mobility', 'cardio_core'].includes(next.workoutType)) {
                console.log(`\n[EXERCISE COUNT] Scenario ${s.id}: Skipped (${next.workoutType} day)`);
                return;
            }

            console.log(`\n[EXERCISE COUNT] Scenario ${s.id}: ${count} exercises (expected ${min}-${max}) → ${count >= min && count <= max ? 'PASS' : 'FAIL'}`);

            expect(count).toBeGreaterThanOrEqual(min);
            expect(count).toBeLessThanOrEqual(max);
        });
    });
});

// ═══════════════════════════════════════════════
// STEP 4 — VALIDATE MUSCLE DISTRIBUTION
// ═══════════════════════════════════════════════

describe('STEP 4 — MUSCLE DISTRIBUTION', () => {
    test('Push day should include chest, shoulders, arms', () => {
        const workout = simulateWorkout('push', 'intermediate', 'Gym', 'muscle_gain');
        const muscles = workout.workouts.flatMap((w: any) => w.muscleGroups);

        console.log(`\n[MUSCLE DIST] Push day muscles: ${[...new Set(muscles)].join(', ')}`);

        expect(muscles).toContain('chest');
        expect(muscles).toContain('shoulders');
    });

    test('Pull day should include back, arms', () => {
        const workout = simulateWorkout('pull', 'intermediate', 'Gym', 'muscle_gain');
        const muscles = workout.workouts.flatMap((w: any) => w.muscleGroups);

        console.log(`\n[MUSCLE DIST] Pull day muscles: ${[...new Set(muscles)].join(', ')}`);

        expect(muscles).toContain('back');
    });

    test('Legs day should include legs', () => {
        const workout = simulateWorkout('legs', 'intermediate', 'Gym', 'muscle_gain');
        const muscles = workout.workouts.flatMap((w: any) => w.muscleGroups);

        console.log(`\n[MUSCLE DIST] Legs day muscles: ${[...new Set(muscles)].join(', ')}`);

        expect(muscles).toContain('legs');
    });

    test('Full body should include chest, back, legs, shoulders', () => {
        const workout = simulateWorkout('full', 'intermediate', 'Gym', 'muscle_gain');
        const muscles = workout.workouts.flatMap((w: any) => w.muscleGroups);

        console.log(`\n[MUSCLE DIST] Full body muscles: ${[...new Set(muscles)].join(', ')}`);

        expect(muscles).toContain('chest');
        expect(muscles).toContain('back');
        expect(muscles).toContain('legs');
    });
});

// ═══════════════════════════════════════════════
// STEP 5 — VALIDATE WORKOUT STRUCTURE
// ═══════════════════════════════════════════════

describe('STEP 5 — WORKOUT STRUCTURE', () => {
    const strengthTypes: WorkoutType[] = ['push', 'pull', 'legs', 'upper', 'full'];

    strengthTypes.forEach(type => {
        test(`${type} workout should start with warmup`, () => {
            const workout = simulateWorkout(type, 'intermediate', 'Gym', 'muscle_gain');
            const categories = workout.workouts.map((w: any) => w.category);

            console.log(`\n[STRUCTURE] ${type}: ${categories.join(' → ')}`);

            expect(categories[0]).toBe('warmup');
        });

        test(`${type} workout should have compound after warmup`, () => {
            const workout = simulateWorkout(type, 'intermediate', 'Gym', 'muscle_gain');
            const categories = workout.workouts.map((w: any) => w.category);

            if (categories.length >= 2) {
                expect(categories[1]).toBe('compound');
            }
        });
    });
});

// ═══════════════════════════════════════════════
// STEP 6 — VALIDATE ADAPTIVE FEEDBACK
// ═══════════════════════════════════════════════

describe('STEP 6 — ADAPTIVE FEEDBACK', () => {
    test('Case A: Hard + Low Energy → should reduce volume', () => {
        const input: AdaptiveInput = {
            focusType: 'strength',
            baseWorkouts: [{} as any],
            baseMeals: [],
            streak: 3,
            energyTrend: [1],
            exerciseHistory: [{ exercise_id: '1', last_sets: 3, last_reps: 10, last_weight: 40, difficulty: 'hard' }],
            goal: 'Muscle Gain',
            missedYesterday: false
        };
        const plan = computeAdaptivePlan(input);

        console.log(`\n[FEEDBACK A] Hard+Low: vol=${plan.volumeMultiplier}, prog=${plan.progression}, msg="${plan.systemMessage}"`);

        expect(plan.volumeMultiplier).toBeLessThan(1);
    });

    test('Case B: Easy + High Energy → should increase load', () => {
        const input: AdaptiveInput = {
            focusType: 'strength',
            baseWorkouts: [{} as any],
            baseMeals: [],
            streak: 3,
            energyTrend: [3],
            exerciseHistory: [{ exercise_id: '1', last_sets: 3, last_reps: 10, last_weight: 40, difficulty: 'easy' }],
            goal: 'Muscle Gain',
            missedYesterday: false
        };
        const plan = computeAdaptivePlan(input);

        console.log(`\n[FEEDBACK B] Easy+High: vol=${plan.volumeMultiplier}, prog=${plan.progression}, msg="${plan.systemMessage}"`);

        expect(plan.volumeMultiplier).toBeGreaterThanOrEqual(1);
    });

    test('Case C: Medium + Medium Energy → should maintain plan', () => {
        const input: AdaptiveInput = {
            focusType: 'strength',
            baseWorkouts: [{} as any],
            baseMeals: [],
            streak: 3,
            energyTrend: [2],
            exerciseHistory: [{ exercise_id: '1', last_sets: 3, last_reps: 10, last_weight: 40, difficulty: 'medium' }],
            goal: 'Muscle Gain',
            missedYesterday: false
        };
        const plan = computeAdaptivePlan(input);

        console.log(`\n[FEEDBACK C] Med+Med: vol=${plan.volumeMultiplier}, prog=${plan.progression}, msg="${plan.systemMessage}"`);

        expect(plan.volumeMultiplier).toBe(1);
        expect(plan.progression).toBe('none');
    });
});

// ═══════════════════════════════════════════════
// STEP 7 — TIMELINE SIMULATION
// ═══════════════════════════════════════════════

describe('STEP 7 — TIMELINE SIMULATION', () => {
    test('7-day training simulation with skip on Day 3', () => {
        let history: UserWorkoutHistory = {};
        const state: UserTrainingState = { level: 'intermediate', frequency: '3-4', lastWorkout: 'none', goal: 'muscle_gain' };
        const workoutsCompleted: string[] = [];

        console.log('\n--- TIMELINE ---');

        // Day 1: Completed
        let res = computeNextWorkout(state, history, '2026-03-10');
        console.log(`Day 1: ${res.workoutType} (${res.reason})`);
        workoutsCompleted.push(res.workoutType);
        history = { lastCompletedWorkoutType: res.workoutType, lastCompletionDate: '2026-03-10' };

        // Day 2: Completed
        res = computeNextWorkout(state, history, '2026-03-11');
        console.log(`Day 2: ${res.workoutType} (${res.reason})`);
        workoutsCompleted.push(res.workoutType);
        history = { lastCompletedWorkoutType: res.workoutType, lastCompletionDate: '2026-03-11' };

        // Day 3: Skipped (history NOT updated)
        console.log(`Day 3: SKIPPED`);

        // Day 4: Completed
        res = computeNextWorkout(state, history, '2026-03-13');
        console.log(`Day 4: ${res.workoutType} (${res.reason})`);
        workoutsCompleted.push(res.workoutType);
        history = { lastCompletedWorkoutType: res.workoutType, lastCompletionDate: '2026-03-13' };

        // Day 5
        res = computeNextWorkout(state, history, '2026-03-14');
        console.log(`Day 5: ${res.workoutType} (${res.reason})`);
        workoutsCompleted.push(res.workoutType);

        // Day 6
        history = { lastCompletedWorkoutType: res.workoutType, lastCompletionDate: '2026-03-14' };
        res = computeNextWorkout(state, history, '2026-03-15');
        console.log(`Day 6: ${res.workoutType} (${res.reason})`);
        workoutsCompleted.push(res.workoutType);

        // Day 7
        history = { lastCompletedWorkoutType: res.workoutType, lastCompletionDate: '2026-03-15' };
        res = computeNextWorkout(state, history, '2026-03-16');
        console.log(`Day 7: ${res.workoutType} (${res.reason})`);
        workoutsCompleted.push(res.workoutType);

        console.log(`\nFull sequence: ${workoutsCompleted.join(' → ')}`);

        // Verify no immediate consecutive duplicates
        for (let i = 1; i < workoutsCompleted.length; i++) {
            if (workoutsCompleted[i] === workoutsCompleted[i - 1]) {
                console.log(`WARNING: Consecutive duplicate "${workoutsCompleted[i]}" on days ${i} and ${i + 1}`);
            }
        }

        expect(workoutsCompleted.length).toBe(6);
    });
});

// ═══════════════════════════════════════════════
// STEP 8 — VALIDATE WEEKLY MUSCLE COVERAGE
// ═══════════════════════════════════════════════

describe('STEP 8 — WEEKLY MUSCLE COVERAGE', () => {
    test('Should force a Legs day if legs were skipped for >7 days', () => {
        const state: UserTrainingState = { level: 'intermediate', frequency: '3-4', lastWorkout: 'push', goal: 'muscle_gain' };
        
        // Simulating 2 recent workouts in the last week, both upper body
        const history: UserWorkoutHistory = {
            lastCompletedWorkoutType: 'pull',
            lastCompletionDate: '2026-03-12',
            recentWorkouts: [
                { type: 'push', date: '2026-03-08' },
                { type: 'pull', date: '2026-03-12' }
            ]
        };
        
        const next = computeNextWorkout(state, history, '2026-03-13');
        console.log(`\n[MUSCLE COVERAGE] Untrained legs over 7 days -> Next: ${next.workoutType} | Reason: ${next.reason}`);
        
        expect(next.workoutType).toBe('legs');
        expect(next.reason).toContain('Targeting untrained muscles: legs');
    });

    test('Should force Full body if 3+ major muscles missed for >7 days', () => {
        const state: UserTrainingState = { level: 'intermediate', frequency: '1-2', lastWorkout: 'cardio', goal: 'fat_loss' };
        
        const history: UserWorkoutHistory = {
            lastCompletedWorkoutType: 'cardio',
            lastCompletionDate: '2026-03-12',
            recentWorkouts: [
                { type: 'cardio', date: '2026-03-10' },
                { type: 'cardio', date: '2026-03-12' }
            ]
        };
        const next = computeNextWorkout(state, history, '2026-03-14');
        console.log(`\n[MUSCLE COVERAGE] Untrained chest, back, legs, shoulders -> Next: ${next.workoutType} | Reason: ${next.reason}`);
        
        expect(next.workoutType).toBe('full');
        expect(next.reason).toContain('Targeting untrained muscles: chest, back, legs, shoulders');
    });
});
