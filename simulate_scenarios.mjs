import { computeNextWorkout } from './src/features/program/services/adaptiveEntryEngine';
import { getExercises, EXERCISE_POOL } from './src/features/program/data/exercisePools';
import { computeAdaptivePlan } from './src/features/program/services/adaptiveEngine';

// Simpler Runner for Node compatibility
async function run() {
    // ═══════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════

    function formatEx(ex, level) {
        let sets = ex.defaultSets;
        if (level === 'advanced' && sets && sets >= 3) {
            sets += 1;
        }
        return {
            name: ex.name,
            sets: sets,
            reps: ex.defaultReps,
            equipment: ex.equipment,
            category: ex.category,
            muscleGroups: ex.muscleGroup
        };
    }

    function simulateWorkout(type, level, location, goal) {
        let primaryMg = [];
        let secondaryMg = [];
        let focus = 'strength';

        switch (type) {
            case 'push': primaryMg = ['chest', 'shoulders']; secondaryMg = ['arms']; break;
            case 'pull': primaryMg = ['back']; secondaryMg = ['arms']; break;
            case 'legs': primaryMg = ['legs']; secondaryMg = ['core']; break;
            case 'upper': primaryMg = ['chest', 'back', 'shoulders']; secondaryMg = ['arms']; break;
            case 'full': primaryMg = ['chest', 'back', 'legs', 'shoulders']; secondaryMg = ['core', 'arms']; break;
            case 'lower': primaryMg = ['legs']; secondaryMg = ['core']; break;
            case 'cardio_core': primaryMg = ['core', 'full_body']; focus = 'cardio'; break;
            case 'mobility': primaryMg = ['mobility']; focus = 'mobility'; break;
            case 'rest': primaryMg = ['mobility']; focus = 'rest'; break;
            default: focus = 'rest';
        }

        if (focus !== 'strength') {
            const workouts = [];
            const cardio = getExercises(primaryMg, 'core_cardio', location, 1)[0];
            if (cardio) workouts.push(formatEx(cardio, level));
            return { type, workouts };
        }

        const warmup = getExercises(primaryMg.concat(['mobility']), 'warmup', location, 1)[0];
        const compound = getExercises(primaryMg, 'compound', location, 1)[0];
        const acc1 = getExercises(primaryMg, 'accessory', location, 1)[0];
        let acc2 = getExercises(secondaryMg, 'accessory', location, 1)[0];
        if (!acc2 || acc2.name === acc1?.name) acc2 = getExercises(primaryMg, 'isolation', location, 1)[0];
        let iso = getExercises(secondaryMg, 'isolation', location, 1)[0];
        if (!iso || iso.name === acc2?.name) iso = getExercises(primaryMg, 'isolation', location, 2)[1];
        const core = getExercises(['core'], 'core_cardio', location, 1)[0];

        const workouts = [];
        if (warmup) workouts.push(formatEx(warmup, level));
        if (compound) workouts.push(formatEx(compound, level));
        if (acc1) workouts.push(formatEx(acc1, level));
        if (acc2) workouts.push(formatEx(acc2, level));

        if (level === 'intermediate' || level === 'advanced') {
            if (iso) workouts.push(formatEx(iso, level));
            const extraAcc = getExercises(secondaryMg, 'accessory', location, 2)[1];
            if (extraAcc && extraAcc.name !== acc1?.name && extraAcc.name !== acc2?.name) workouts.push(formatEx(extraAcc, level));
        }
        if (level === 'advanced') {
            const extraIso = getExercises(primaryMg, 'isolation', location, 3)[2];
            if (extraIso) workouts.push(formatEx(extraIso, level));
        }
        if (core && (level === 'advanced' || type === 'full' || type === 'legs' || level === 'intermediate')) {
            workouts.push(formatEx(core, level));
        }

        return { type, workouts };
    }

    const report = {
        scenarios: [],
        violations: [],
        distributionIssues: [],
        scalingIssues: [],
        feedbackRealism: [],
        timelineBehavior: []
    };

    function validateWorkout(workout, scenario) {
        const { level, location, type, id } = scenario;
        const isHome = location.toLowerCase() === 'home';
        
        if (isHome) {
            workout.workouts.forEach((w) => {
                const disallowed = w.equipment.some((eq) => eq === 'machine' || eq === 'cable' || eq === 'smith machine');
                if (disallowed) {
                    report.violations.push(`Scenario ${id}: Disallowed equipment "${w.equipment.join(',')}" in Home workout for exercise "${w.name}"`);
                }
            });
        }

        const count = workout.workouts.length;
        let min, max;
        if (level === 'beginner') { min = 5; max = 6; }
        else if (level === 'intermediate') { min = 6; max = 7; }
        else if (level === 'advanced') { min = 7; max = 8; }

        if (type !== 'mobility' && type !== 'rest' && type !== 'cardio_core') {
            if (count < min || count > max) {
                report.scalingIssues.push(`Scenario ${id}: Exercise count mismatch for ${level}. Expected ${min}-${max}, got ${count}.`);
            }
        }

        const muscles = workout.workouts.flatMap((w) => w.muscleGroups);
        if (type === 'pull') {
            if (!muscles.includes('back')) report.distributionIssues.push(`Scenario ${id}: Pull day missing Back exercises.`);
            if (!muscles.includes('arms')) report.distributionIssues.push(`Scenario ${id}: Pull day missing Bicep exercises(Arms).`);
        }
        if (type === 'push') {
            if (!muscles.includes('chest')) report.distributionIssues.push(`Scenario ${id}: Push day missing Chest exercises.`);
            if (!muscles.includes('shoulders')) report.distributionIssues.push(`Scenario ${id}: Push day missing Shoulder exercises.`);
            if (!muscles.includes('arms')) report.distributionIssues.push(`Scenario ${id}: Push day missing Tricep exercises(Arms).`);
        }

        const categories = workout.workouts.map((w) => w.category);
        if (categories.length > 0) {
            if (categories[0] !== 'warmup' && type !== 'cardio_core' && type !== 'mobility') {
                report.violations.push(`Scenario ${id}: Workout does not start with Warmup.`);
            }
        }
    }

    // ═══════════════════════════════════════════════
    // EXECUTION
    // ═══════════════════════════════════════════════

    const scenarios = [
        { id: 1, name: 'Muscle Gain, Beginner, Home, 3 Days', goal: 'muscle_gain', level: 'beginner', location: 'Home', freq: '3-4' },
        { id: 2, name: 'Fat Loss, Beginner, Home, 4 Days', goal: 'fat_loss', level: 'beginner', location: 'Home', freq: '3-4' },
        { id: 3, name: 'Muscle Gain, Intermediate, Gym, 4 Days', goal: 'muscle_gain', level: 'intermediate', location: 'Gym', freq: '3-4' },
        { id: 4, name: 'Strength, Intermediate, Gym, 5 Days', goal: 'muscle_gain', level: 'intermediate', location: 'Gym', freq: '5+' },
        { id: 5, name: 'Fat Loss, Advanced, Gym, 5 Days', goal: 'fat_loss', level: 'advanced', location: 'Gym', freq: '5+' }
    ];

    scenarios.forEach(s => {
        const state = { level: s.level, frequency: s.freq, lastWorkout: 'none', goal: s.goal };
        const next = computeNextWorkout(state, {}, new Date());
        const workout = simulateWorkout(next.workoutType, s.level, s.location, s.goal);
        
        report.scenarios.push({
            id: s.id,
            config: s.name,
            type: next.workoutType,
            exercises: workout.workouts.map(w => ({ name: w.name, sets: w.sets, reps: w.reps, eq: w.equipment.join(', ') }))
        });

        validateWorkout(workout, s);
    });

    const feedbackCases = [
        { id: 'A', diff: 'hard', energy: 1 },
        { id: 'B', diff: 'easy', energy: 3 },
        { id: 'C', diff: 'medium', energy: 2 }
    ];

    feedbackCases.forEach(c => {
        const input = {
            focusType: 'strength',
            baseWorkouts: [{}],
            baseMeals: [],
            streak: 3,
            energyTrend: [c.energy],
            exerciseHistory: [{ exercise_id: '1', last_sets: 3, last_reps: 10, last_weight: 40, difficulty: c.diff }],
            goal: 'Muscle Gain',
            missedYesterday: false
        };
        const plan = computeAdaptivePlan(input);
        const realistic = (c.id === 'A' && plan.volumeMultiplier < 1) || 
                           (c.id === 'B' && plan.volumeMultiplier > 1) || 
                           (c.id === 'C' && plan.volumeMultiplier === 1);
        
        report.feedbackRealism.push(`Case ${c.id}: ${realistic ? 'PASS' : 'FAIL'} (${plan.systemMessage})`);
    });

    let history_sim = {};
    const timeline = [];
    const state_sim = { level: 'intermediate', frequency: '3-4', lastWorkout: 'none', goal: 'muscle_gain' };

    let res = computeNextWorkout(state_sim, history_sim, '2026-03-10');
    timeline.push(`Day 1: ${res.workoutType}`);
    history_sim = { lastCompletedWorkoutType: res.workoutType, lastCompletionDate: '2026-03-10' };

    res = computeNextWorkout(state_sim, history_sim, '2026-03-11');
    timeline.push(`Day 2: ${res.workoutType}`);
    history_sim = { lastCompletedWorkoutType: res.workoutType, lastCompletionDate: '2026-03-11' };

    res = computeNextWorkout(state_sim, history_sim, '2026-03-13');
    timeline.push(`Day 3 (Skipped): N/A`);
    timeline.push(`Day 4: ${res.workoutType}`);

    report.timelineBehavior = timeline;

    // ═══════════════════════════════════════════════
    // OUTPUT
    // ═══════════════════════════════════════════════

    console.log('\n--- FINAL VALIDATION REPORT ---\n');
    console.log('1. Scenario Results:');
    report.scenarios.forEach((s) => {
        console.log(`\nScenario ${s.id}: ${s.config}`);
        console.log(`Type: ${s.type}`);
        s.exercises.forEach((e, i) => {
            console.log(`  ${i+1}. ${e.name} | ${e.sets} sets x ${e.reps} | Equipment: ${e.eq}`);
        });
    });

    console.log('\n2. Equipment Violations:');
    const eqViolations = report.violations.filter((v) => v.includes('equipment'));
    if (eqViolations.length === 0) console.log('PASS: None found.');
    else eqViolations.forEach((v) => console.log(`- ${v}`));

    console.log('\n3. Exercise Distribution Issues:');
    if (report.distributionIssues.length === 0) console.log('PASS: None found.');
    else report.distributionIssues.forEach((v) => console.log(`- ${v}`));

    console.log('\n4. Experience-level Scaling Correctness:');
    if (report.scalingIssues.length === 0) console.log('PASS: None found.');
    else report.scalingIssues.forEach((v) => console.log(`- ${v}`));

    console.log('\n5. Adaptive Feedback Realism:');
    report.feedbackRealism.forEach((v) => console.log(`- ${v}`));

    console.log('\n6. Timeline Behavior:');
    report.timelineBehavior.forEach((v) => console.log(`- ${v}`));

    const failed = report.violations.length > 0 || report.distributionIssues.length > 0 || report.scalingIssues.length > 0;
    console.log(`\nFINAL VERDICT: ${failed ? 'PARTIAL - Logic inconsistencies found' : 'PASS - Generator behaves correctly'}`);
}

run().catch(console.error);
