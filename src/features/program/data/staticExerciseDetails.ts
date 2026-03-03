import { ExerciseDetail } from '../hooks/useDayDetail';
import { normalizeExerciseName } from '../utils/exerciseNormalizer';

// Static fallback data for MVP exercises ensures zero loading states for beginners
const rawStaticExercises: ExerciseDetail[] = [
  {
    id: 'ex-bench-press',
    name: 'Dumbbell Bench Press',
    primaryMuscle: 'Chest',
    steps: [
      'Lie back on the bench holding dumbbells directly above your chest',
      'Lower the dumbbells slowly until they are in line with your chest',
      'Press the dumbbells back up to the starting position',
    ],
    formCues: ['Keep your feet flat on the ground', 'Squeeze shoulders down and back'],
    beginnerLoadTip: 'Start with 10-15 lb dumbbells',
    commonMistakes: ['Flaring elbows out too wide', 'Bouncing weights off chest'],
  },
  {
    id: 'ex-overhead-press',
    name: 'Overhead Press',
    primaryMuscle: 'Shoulders',
    steps: [
      'Stand with feet shoulder-width apart, holding dumbbells at shoulder height',
      'Press the weights straight up overhead until arms are extended',
      'Lower under control back to shoulders',
    ],
    formCues: ['Brace your core', 'Do not arch your lower back aggressively'],
    beginnerLoadTip: 'Start with 10-12 lb dumbbells',
    commonMistakes: ['Using momentum from legs', 'Leaning back dangerously'],
  },
  {
    id: 'ex-tricep-pushdown',
    name: 'Tricep Pushdown',
    primaryMuscle: 'Triceps',
    steps: [
      'Grip the cable attachment with elbows pinned to your sides',
      'Extend your arms fully downwards',
      'Return to starting position smoothly',
    ],
    formCues: ['Elbows glued to your ribs', 'Keep your chest up'],
    beginnerLoadTip: 'Start with 15-20 lbs on the stack',
    commonMistakes: ['Letting elbows drift forward', 'Using bodyweight to press down'],
  },
  {
    id: 'ex-lateral-raise',
    name: 'Lateral Raise',
    primaryMuscle: 'Lateral Deltoids',
    steps: [
      'Stand holding dumbbells at your sides with a slight bend in elbows',
      'Raise arms out to the sides until parallel with the floor',
      'Lower slowly back to start',
    ],
    formCues: ['Pour the water out at the top', 'Control the descent'],
    beginnerLoadTip: 'Start very light (5-8 lbs)',
    commonMistakes: ['Using momentum to swing', 'Raising above shoulder level'],
  },
  {
    id: 'ex-barbell-squat',
    name: 'Barbell Squat',
    primaryMuscle: 'Quads / Glutes',
    steps: [
      'Unrack the barbell across your upper back, stepping back',
      'Squat down by pushing hips back and bending knees',
      'Drive through your heels to return to standing',
    ],
    formCues: ['Chest up', 'Knees track over toes', 'Brace core'],
    beginnerLoadTip: 'Start with just the empty bar (45 lbs)',
    commonMistakes: ['Knees caving inward', 'Heels lifting off the ground'],
  },
  {
    id: 'ex-lat-pulldown',
    name: 'Lat Pulldown',
    primaryMuscle: 'Lats (Back)',
    steps: [
      'Sit at the machine and grip the bar wider than shoulder-width',
      'Pull the bar down to your upper chest',
      'Return weight up with control',
    ],
    formCues: ['Drive elbows straight down to your pockets', 'Squeeze shoulder blades together'],
    beginnerLoadTip: 'Start with 40-50 lbs',
    commonMistakes: ['Using excessive lean to pull', 'Pulling bar behind the neck'],
  },
];

// Pre-compute normalized map for instant lookup at runtime
export const STATIC_EXERCISE_MAP = new Map<string, ExerciseDetail>(
  rawStaticExercises.map((ex) => [normalizeExerciseName(ex.name), ex])
);

// Fallback provider helper
export function getStaticExerciseDetail(name: string): ExerciseDetail | null {
  const normalized = normalizeExerciseName(name);
  return STATIC_EXERCISE_MAP.get(normalized) || null;
}
