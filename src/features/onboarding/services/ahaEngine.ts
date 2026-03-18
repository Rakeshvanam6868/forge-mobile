/**
 * Aha Moment Engine — Deterministic Behavioral Archetype Classifier
 * 
 * Maps user onboarding inputs to exactly ONE archetype with personalized
 * mirror, root cause, shift, and tags. No AI, no randomness.
 * Same inputs ALWAYS produce the same output.
 */

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type ArchetypeId =
  | 'restart_builder'
  | 'hidden_potential'
  | 'weekend_hustler'
  | 'explorer'
  | 'stuck_performer'
  | 'comeback_builder';

export interface AhaInput {
  goal: string;           // fat_loss | muscle_gain | recomp | general_fitness
  level: string;          // beginner | intermediate | advanced
  environment: string;    // home | gym
  frequency: string;      // 2-3 | 3-4 | 4-5 | 5+
  lastWorkout: string;    // push | pull | legs | full | none
}

export interface AhaResult {
  archetypeId: ArchetypeId;
  archetypeName: string;
  emoji: string;
  mirror: string;
  rootCause: string;
  progressFeeling: string;
  shift: string;
  personalTags: string[];
}

// ═══════════════════════════════════════════════
// Classification Logic
// ═══════════════════════════════════════════════

function isLowFrequency(freq: string): boolean {
  return freq === '2-3' || freq === '3-4';
}

function isHighFrequency(freq: string): boolean {
  return freq === '4-5' || freq === '5+';
}

function hasRecentWorkout(lastWorkout: string): boolean {
  return lastWorkout !== 'none' && !!lastWorkout;
}

export function classifyArchetype(input: AhaInput): ArchetypeId {
  const { level, frequency, lastWorkout } = input;
  const recent = hasRecentWorkout(lastWorkout);
  const lowFreq = isLowFrequency(frequency);
  const highFreq = isHighFrequency(frequency);

  // Priority order matters — most specific match first

  // 1. Stuck Performer: advanced + frequent + has recent workout (grinding but plateaued)
  if (level === 'advanced' && highFreq && recent) {
    return 'stuck_performer';
  }

  // 2. Hidden Potential Builder: intermediate + consistent (has workout, decent freq)
  if (level === 'intermediate' && recent) {
    return 'hidden_potential';
  }

  // 3. Explorer: beginner + high frequency but has no clear pattern
  if (level === 'beginner' && highFreq) {
    return 'explorer';
  }

  // 4. Weekend Hustler: 2-3 days + has recent activity (any level)
  if (frequency === '2-3' && recent) {
    return 'weekend_hustler';
  }

  // 5. Comeback Builder: has some recent activity but low frequency (stopped recently)
  if (recent && lowFreq) {
    return 'comeback_builder';
  }

  // 6. Restart Builder: beginner + low frequency + no recent workout (default fallback)
  return 'restart_builder';
}

// ═══════════════════════════════════════════════
// Aha Content Generation
// ═══════════════════════════════════════════════

function getGoalLabel(goal: string): string {
  const map: Record<string, string> = {
    fat_loss: 'losing weight',
    muscle_gain: 'building muscle',
    recomp: 'transforming your body',
    general_fitness: 'getting fit',
  };
  return map[goal] || 'getting fit';
}

function getEnvironmentInsight(env: string): string {
  if (env === 'home') {
    return 'Training at home means fewer excuses — but also fewer cues to start. Your plan is designed to make starting effortless.';
  }
  return 'Having gym access is an advantage — but only if you show up with a plan. Random workouts burn time, not fat.';
}

function getFrequencyInsight(freq: string): string {
  const map: Record<string, string> = {
    '2-3': 'With 2–3 days, every session has to count. No room for junk volume — we built each day to maximize impact.',
    '3-4': 'At 3–4 days, you have enough frequency for real progress — if recovery and structure are dialed in.',
    '4-5': 'Training 4–5 days shows serious intent. The risk is overtraining without smart recovery — your plan handles that.',
    '5+': 'Training 5+ days is elite territory. But volume without structure is just fatigue. We balanced intensity with recovery.',
  };
  return map[freq] || map['3-4'];
}

function getLevelInsight(level: string): string {
  const map: Record<string, string> = {
    beginner: 'As a beginner, your body will respond to almost anything — the key is doing the RIGHT things first, not everything.',
    intermediate: 'At intermediate level, the easy gains are behind you. Progress now comes from precision, not just effort.',
    advanced: 'At your level, progress is earned through strategy, not intensity. Your body already knows how to resist change.',
  };
  return map[level] || map['beginner'];
}

// ═══════════════════════════════════════════════
// Archetype Content Database
// ═══════════════════════════════════════════════

interface ArchetypeContent {
  name: string;
  emoji: string;
  mirror: string;
  rootCause: string;
  progressFeeling: string;
  shift: string;
}

const ARCHETYPE_CONTENT: Record<ArchetypeId, ArchetypeContent> = {
  restart_builder: {
    name: 'The Restart Builder',
    emoji: '🔄',
    mirror: "You've thought about starting more times than you've actually started. Each Monday feels like a new beginning — but by Wednesday, life wins again.",
    rootCause: "It's not laziness. You don't have a system that survives a bad day. Motivation got you here, but motivation doesn't last past Tuesday.",
    progressFeeling: 'invisible',
    shift: "You don't need more willpower. You need a plan so simple that skipping it feels harder than doing it. That's exactly what we built.",
  },

  hidden_potential: {
    name: 'The Hidden Potential',
    emoji: '🔓',
    mirror: "You show up. You put in the work. But something feels off — like you're running on a treadmill that doesn't move forward.",
    rootCause: "You're consistent, but you're doing the same things that worked six months ago. Your body adapted. Your routine didn't.",
    progressFeeling: 'stuck despite effort',
    shift: "Your consistency is your superpower — it just needs a smarter target. We built your plan to break through the exact plateau you're sitting on.",
  },

  weekend_hustler: {
    name: 'The Weekend Hustler',
    emoji: '⚡',
    mirror: "You squeeze in workouts when life allows it — weekends, late nights, random bursts of energy. You work hard when you show up. But the gaps between sessions are where your gains disappear.",
    rootCause: "It's not about how hard you train — it's about how often your muscles get the signal to grow. Sporadic effort creates sporadic results.",
    progressFeeling: 'inconsistent',
    shift: "We don't need more sessions from you. We need the right sessions at the right time. Your plan is built to make 2–3 days hit like 5.",
  },

  explorer: {
    name: 'The Explorer',
    emoji: '🧭',
    mirror: "You're eager, maybe too eager. You try everything — new exercises, new routines, new challenges. But nothing sticks long enough to produce results.",
    rootCause: "Variety feels productive, but your muscles can't adapt to something they only do once. Real progress is boring on purpose.",
    progressFeeling: 'slow despite high energy',
    shift: "Your energy is an asset — we just need to aim it. Your plan channels that drive into a structured path where effort actually compounds.",
  },

  stuck_performer: {
    name: 'The Stuck Performer',
    emoji: '🏔️',
    mirror: "You train hard. You train often. You know more than most people in the gym. But the numbers haven't moved in months — and you're quietly frustrated about it.",
    rootCause: "You've been optimizing the wrong variable. More volume won't fix a plateau — smarter periodization will. Your body needs a new stimulus, not a harder one.",
    progressFeeling: 'plateaued despite discipline',
    shift: "You don't need to work harder — you need to work differently. Your plan introduces strategic variation designed to shock your system back into growth.",
  },

  comeback_builder: {
    name: 'The Comeback Builder',
    emoji: '🔥',
    mirror: "You've done this before. You know what progress feels like. But something pulled you away — life, work, injury — and getting back feels heavier than starting fresh.",
    rootCause: "The hardest part isn't the workouts — it's the gap between who you were and who you are right now. That comparison is what keeps you stuck, not your fitness.",
    progressFeeling: 'behind where you used to be',
    shift: "Your muscle memory is still there. Your experience is still there. Your plan doesn't start from zero — it starts from where your body actually is, and builds fast.",
  },
};

// ═══════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════

export function classifyUser(input: AhaInput): AhaResult {
  const archetypeId = classifyArchetype(input);
  const content = ARCHETYPE_CONTENT[archetypeId];

  const personalTags = [
    getFrequencyInsight(input.frequency),
    getLevelInsight(input.level),
    getEnvironmentInsight(input.environment),
  ];

  return {
    archetypeId,
    archetypeName: content.name,
    emoji: content.emoji,
    mirror: content.mirror,
    rootCause: content.rootCause,
    progressFeeling: content.progressFeeling,
    shift: content.shift,
    personalTags,
  };
}
