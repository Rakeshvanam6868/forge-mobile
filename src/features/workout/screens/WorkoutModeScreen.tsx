/**
 * WorkoutModeScreen — Live Training Companion v2
 *
 * Displays ONE exercise at a time with:
 * - Set logging with weight/reps/duration inputs
 * - Editable completed sets (tap to edit)
 * - Rest timer overlay with next exercise preview
 * - Exercise Guide modal with instructions/form cues
 * - Exercise-based progress bar
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, SafeAreaView, StatusBar, Animated, Modal, Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useExerciseDetail } from '../../program/hooks/useExerciseDetail';
import { AdaptedWorkout } from '../../program/services/adaptiveEngine';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { useWorkoutSessionStore } from '../stores/workoutSessionStore';
import { useWeight } from '../../../core/hooks/useWeight';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../../../core/supabase/client';
import { EXERCISE_POOL, PoolExercise } from '../../program/data/exercisePools';
import { trackAnalyticsEvent } from '../../../core/analytics/posthog';

// ═══════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════

// ─── Progress Bar (exercise-based) ─────────────
const WorkoutProgressBar = ({ progress, current, total }: { progress: number; current: number; total: number }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: Math.min(progress * 100, 100),
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, fillAnim]);

  const animWidth = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.barBg}>
        <Animated.View style={[progressStyles.barFill, { width: animWidth }]} />
      </View>
      <Text style={progressStyles.label}>Exercise {current + 1} of {total} - {Math.round(progress * 100)}%</Text>
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: { paddingHorizontal: spacing.screenPadding, paddingVertical: spacing.md },
  barBg: { height: 6, backgroundColor: palette.bgInner, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: palette.primary, borderRadius: 3 },
  label: { ...fonts.label, color: palette.textSecondary, textAlign: 'center', marginTop: 8, textTransform: 'uppercase', fontSize: 10 },
});

// ─── Exercise Header ───────────────────────────
const ExerciseHeader = ({ name, category, targetSets, targetReps, targetDuration, onGuidePress }: {
  name: string; category: string; targetSets: number;
  targetReps: string | null; targetDuration: string | null;
  onGuidePress: () => void;
}) => (
  <View style={headerStyles.container}>
    <Text style={headerStyles.name}>{name}</Text>
    <View style={headerStyles.tagRow}>
      <View style={headerStyles.tag}>
        <Text style={headerStyles.tagText}>{category.replace('_', ' / ').toUpperCase()}</Text>
      </View>
    </View>
    <Text style={headerStyles.target}>
      {targetSets} sets × {targetReps || targetDuration || '—'}
    </Text>
    <TouchableOpacity style={headerStyles.guideBtn} onPress={onGuidePress} activeOpacity={0.7}>
      <Text style={headerStyles.guideText}>Exercise Guide</Text>
    </TouchableOpacity>
  </View>
);

const headerStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.screenPadding },
  name: { ...fonts.h1, color: palette.textPrimary, textAlign: 'center', marginBottom: 12 },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: { backgroundColor: palette.bgInner, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: palette.borderLight },
  tagText: { ...fonts.label, color: palette.primary, fontSize: 10, fontWeight: '700' },
  target: { ...fonts.body, color: palette.textSecondary, marginBottom: 16 },
  guideBtn: {
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: palette.bgElevated, borderRadius: 8,
    borderWidth: 1, borderColor: palette.borderLight,
  },
  guideText: { ...fonts.label, color: palette.textPrimary, fontWeight: '600' },
});

// ─── Rest Timer Overlay (with next exercise preview) ─────
type NextPreview = { name: string; category: string; targetSets: number; targetReps: string | null; targetDuration: string | null } | null;

const RestTimerOverlay = ({ display, onSkip, nextExercise }: {
  display: string; progress: number; onSkip: () => void; nextExercise: NextPreview;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  return (
    <View style={restStyles.overlay}>
      <Animated.View style={[restStyles.timerCircle, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={restStyles.time}>{display}</Text>
        <Text style={restStyles.restLabel}>RESTING</Text>
      </Animated.View>

      {/* Next Exercise Preview */}
      {nextExercise && (
        <View style={restStyles.nextPreview}>
          <Text style={restStyles.nextTitle}>UP NEXT</Text>
          <Text style={restStyles.nextName}>{nextExercise.name}</Text>
          <Text style={restStyles.nextDetail}>
            {nextExercise.targetSets} × {nextExercise.targetReps || nextExercise.targetDuration || '—'}
          </Text>
        </View>
      )}

      <TouchableOpacity style={restStyles.skipBtn} onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSkip();
      }} activeOpacity={0.7}>
        <Text style={restStyles.skipText}>Skip Rest →</Text>
      </TouchableOpacity>
    </View>
  );
};

const restStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  timerCircle: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: palette.bgCard,
    borderWidth: 2, borderColor: palette.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: palette.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  time: { ...fonts.stat, color: palette.white, fontSize: 56 },
  restLabel: { ...fonts.label, color: palette.textSecondary, marginTop: 4, letterSpacing: 2 },
  nextPreview: {
    marginTop: 40, alignItems: 'center',
    backgroundColor: palette.bgCard, borderRadius: radius.lg,
    paddingVertical: 20, paddingHorizontal: 32, minWidth: 260,
    borderWidth: 1, borderColor: palette.borderSubtle,
  },
  nextTitle: { ...fonts.label, color: palette.primary, marginBottom: 8, letterSpacing: 1.5, fontWeight: '700', fontSize: 10 },
  nextName: { ...fonts.h3, color: palette.white, marginBottom: 4, textAlign: 'center' },
  nextDetail: { ...fonts.body, color: palette.textSecondary, fontSize: 13 },
  skipBtn: {
    marginTop: 32, paddingVertical: 14, paddingHorizontal: 32,
    backgroundColor: palette.bgElevated, borderRadius: 12,
    borderWidth: 1, borderColor: palette.borderLight,
  },
  skipText: { ...fonts.button, color: palette.white },
});

// ─── Exercise Guide Modal ──────────────────────
const ExerciseGuideModal = ({ visible, onClose, exerciseId }: {
  visible: boolean; onClose: () => void; exerciseId: string | null;
}) => {
  const detail = useExerciseDetail(exerciseId);
  const data = detail?.data;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={guideStyles.overlay} onPress={onClose}>
        <Pressable style={guideStyles.sheet} onPress={() => {}}>
          <View style={guideStyles.handle} />
          <View style={guideStyles.header}>
            <Text style={guideStyles.title} numberOfLines={2}>{data?.name || 'Exercise Guide'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={guideStyles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={guideStyles.scroll}>
            {data?.primaryMuscle && (
              <View style={guideStyles.muscleRow}>
                <Text style={guideStyles.muscleLabel}>TARGET</Text>
                <View style={guideStyles.muscleTag}>
                  <Text style={guideStyles.muscleTagText}>{data.primaryMuscle.toUpperCase()}</Text>
                </View>
              </View>
            )}

            {data?.steps && data.steps.length > 0 && (
              <>
                <Text style={guideStyles.sectionTitle}>Instructions</Text>
                <View style={guideStyles.stepsWrap}>
                  {data.steps.map((step, i) => (
                    <View key={i} style={guideStyles.stepRow}>
                      <Text style={guideStyles.stepNum}>{i + 1}</Text>
                      <Text style={guideStyles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {data?.formCues && data.formCues.length > 0 && (
              <>
                <Text style={guideStyles.sectionTitle}>Form Cues</Text>
                {data.formCues.map((cue, i) => (
                  <View key={i} style={guideStyles.tipBox}>
                    <Text style={guideStyles.tipText}>{cue}</Text>
                  </View>
                ))}
              </>
            )}

            {!data && (
              <View style={guideStyles.noData}>
                <Text style={guideStyles.noDataEmoji}>—</Text>
                <Text style={guideStyles.noDataText}>No detailed guide available.</Text>
                <Text style={guideStyles.noDataSub}>Focus on slow, controlled movements.</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const guideStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: palette.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    minHeight: '60%', maxHeight: '85%', paddingHorizontal: spacing.screenPadding,
    borderWidth: 1, borderColor: palette.borderSubtle, borderBottomWidth: 0,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.bgInner, alignSelf: 'center', marginVertical: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { ...fonts.h2, color: palette.textPrimary, flex: 1 },
  closeBtn: { fontSize: 24, color: palette.textSecondary },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  muscleLabel: { ...fonts.label, color: palette.textMuted, letterSpacing: 1 },
  muscleTag: { backgroundColor: palette.bgInner, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: palette.borderLight },
  muscleTagText: { ...fonts.label, color: palette.primary, fontSize: 11, fontWeight: '700' },
  sectionTitle: { ...fonts.label, color: palette.textSecondary, marginTop: 32, marginBottom: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
  stepsWrap: { gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepNum: { ...fonts.label, color: palette.primary, marginRight: 16, marginTop: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: palette.bgInner, textAlign: 'center', textAlignVertical: 'center', lineHeight: 24 },
  stepText: { ...fonts.body, color: palette.textSecondary, flex: 1, lineHeight: 24 },
  tipBox: {
    backgroundColor: palette.bgInner, padding: 16, borderRadius: 12,
    marginBottom: 10, borderWidth: 1, borderColor: palette.borderLight,
  },
  tipText: { ...fonts.body, color: palette.textPrimary, lineHeight: 22 },
  noData: { paddingVertical: 60, alignItems: 'center' },
  noDataEmoji: { fontSize: 40, marginBottom: 12 },
  noDataText: { ...fonts.h3, color: palette.textSecondary, marginBottom: 8 },
  noDataSub: { ...fonts.body, color: palette.textMuted, textAlign: 'center' },
});

// ─── Exercise Replacement Modal ────────────────
const ExerciseReplacementModal = ({ visible, onClose, currentExerciseName, onSelect }: {
  visible: boolean; onClose: () => void; currentExerciseName: string;
  onSelect: (exercise: PoolExercise) => void;
}) => {
  // Get user profile for location (equipment logic)
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('users').select('workout_location').eq('id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Find muscle groups and category of current exercise
  const currentPool = EXERCISE_POOL.find(e => e.name === currentExerciseName);
  const muscleGroups = currentPool?.muscleGroup || [];
  const category = currentPool?.category;

  const alternatives = EXERCISE_POOL.filter(e => {
    if (e.name === currentExerciseName) return false;
    if (category && e.category !== category) return false; // Must match compound to compound, isolation to isolation
    if (!e.muscleGroup.some(mg => muscleGroups.includes(mg))) return false;

    // Filter by location equipment constraints (e.g. Home = no machines)
    if (profile?.workout_location?.toLowerCase() === 'home') {
      if (e.equipment.includes('machine') || e.equipment.includes('cable') || e.equipment.includes('barbell')) return false;
    }
    
    return true;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={replaceStyles.overlay} onPress={onClose}>
        <Pressable style={replaceStyles.sheet} onPress={() => {}}>
          <View style={replaceStyles.handle} />
          <View style={replaceStyles.header}>
            <Text style={replaceStyles.title}>Replace Exercise</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={replaceStyles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={replaceStyles.subtitle}>
            Same muscle group as {currentExerciseName}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={replaceStyles.scroll}>
            {alternatives.map(ex => (
              <TouchableOpacity
                key={ex.id}
                style={replaceStyles.exRow}
                onPress={() => { onSelect(ex); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={replaceStyles.exInfo}>
                  <Text style={replaceStyles.exName}>{ex.name}</Text>
                  <Text style={replaceStyles.exMeta}>
                    {ex.category.toUpperCase()} · {ex.equipment.join(', ')}
                  </Text>
                </View>
                <Text style={replaceStyles.exArrow}>→</Text>
              </TouchableOpacity>
            ))}
            {alternatives.length === 0 && (
              <Text style={replaceStyles.noAlt}>No alternatives available for this muscle group.</Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const replaceStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    minHeight: '50%', maxHeight: '75%', padding: spacing.screenPadding, ...shadows.level2,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.borderSubtle, alignSelf: 'center', marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { ...fonts.h1, color: '#FFFFFF' },
  closeBtn: { fontSize: 24, color: palette.textMuted },
  subtitle: { ...fonts.body, color: '#9A9A9A', marginBottom: spacing.lg },
  scroll: { flexGrow: 1 },
  exRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1C1C1C', borderRadius: 12, 
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 12, ...shadows.card,
  },
  exInfo: { flex: 1 },
  exName: { ...fonts.h3, color: '#FFFFFF', marginBottom: 2 },
  exMeta: { ...fonts.body, color: '#9A9A9A' },
  exArrow: { ...fonts.h3, color: palette.primary, paddingLeft: 12 },
  noAlt: { ...fonts.body, color: palette.textMuted, textAlign: 'center', paddingVertical: 24 },
});

// ═══════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════

export const WorkoutModeScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    isActive, start, currentExercise, currentExerciseIndex,
    currentSetIndex, totalExercises, overallProgress,
    isCurrentExerciseComplete, isLastExercise, isWorkoutComplete,
    completeCurrentSet, nextExercise, finish, abandon, restTimer,
    exercises, editSet, nextExercisePreview,
    pauseSession, resumeSession, pausedDurationMs
  } = useWorkoutSession();

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { weightUnit, formatWithUnit, convert } = useWeight();
  
  // Need store direct actions for skip / cancel / replace that aren't in the hook
  const { skipExercise, cancelWorkout, replaceExercise } = useWorkoutSessionStore();

  // Input state
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, string>>({});
  const [repsInput, setRepsInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [elapsed, setElapsed] = useState('00:00');
  const startTimeRef = useRef<number | null>(null);

  // Edit mode for completed sets
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editDuration, setEditDuration] = useState('');

  // UI Debounce
  const [isCompleting, setIsCompleting] = useState(false);

  // Exercise Guide modal
  const [guideVisible, setGuideVisible] = useState(false);

  // Exercise Replacement modal
  const [replaceVisible, setReplaceVisible] = useState(false);

  // Historical Weight Fetching from workout_sets
  const { data: previousWeight } = useQuery({
    queryKey: ['historical_weight', user?.id, currentExercise?.exerciseId],
    queryFn: async () => {
      if (!user?.id || !currentExercise?.exerciseId) return null;
      const { data } = await supabase
        .from('workout_sets')
        .select('weight')
        .eq('user_id', user.id)
        .eq('exercise_id', currentExercise.exerciseId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.weight !== undefined && data?.weight !== null) ? data.weight : null;
    },
    enabled: !!user?.id && !!currentExercise?.exerciseId,
  });

  // Initialize session from route params
  useEffect(() => {
    if (!isActive && route.params?.workouts) {
      start(route.params.workouts as AdaptedWorkout[]);
      navigation.setParams({ workouts: undefined });
      trackAnalyticsEvent('workout_started', { workout_count: route.params.workouts.length, user_id: user?.id });
    }
  }, [isActive, route.params?.workouts]);

  // AppState listener for pausing
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') resumeSession();
      else if (state === 'background') pauseSession();
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [pauseSession, resumeSession]);

  // Prevent session loss on back gesture
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // If workout is active and not just finished, show alert
      if (isActive && !isWorkoutComplete && !route.params?.summary) {
        e.preventDefault();
        Alert.alert(
          'Workout in Progress',
          'Are you sure you want to leave? Your progress will be saved, and you can resume later.',
          [
            { text: 'Stay', style: 'cancel', onPress: () => {} },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
          ]
        );
      }
    });

    return unsubscribe;
  }, [navigation, isActive, isWorkoutComplete, route.params?.summary]);

  // Restore start time ref
  useEffect(() => {
    if (isActive) {
      const storeState = useWorkoutSessionStore.getState();
      if (storeState.startTime) {
        startTimeRef.current = new Date(storeState.startTime).getTime();
      }
    }
  }, [isActive]);

  // Elapsed time updater
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const ms = Math.max(0, Date.now() - startTimeRef.current - pausedDurationMs);
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        setElapsed(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, pausedDurationMs]);

  // Pre-fill reps/duration from target when exercise changes
  useEffect(() => {
    if (currentExercise) {
      const exId = currentExercise.exerciseId;
      setEditingSetIndex(null);
      if (currentExercise.targetReps) {
        const num = currentExercise.targetReps.match(/\d+/)?.[0] || '';
        setRepsInput(num);
      } else {
        setRepsInput('');
      }
      if (currentExercise.targetDuration) {
        const dur = currentExercise.targetDuration.match(/\d+/)?.[0] || '';
        setDurationInput(dur);
      } else {
        setDurationInput('');
      }

      // Feature 1: Auto-prefill weight logic based on ISOLATED state
      const increment = profile?.level === 'beginner' ? 2.5 : 5;
      const suggestedWeight = (previousWeight !== null && previousWeight !== undefined) ? Number(previousWeight) + increment : null;

      const lastCompletedSet = currentExercise.sets.slice().reverse().find(s => s.completed);
      let newWeightVal = exerciseWeights[exId] || '';

      if (lastCompletedSet) {
        if (lastCompletedSet.weight === null) {
          newWeightVal = '';
        } else {
          newWeightVal = String(lastCompletedSet.weight);
        }
      } else if (!exerciseWeights[exId]) {
        // First set of this exercise -> check historical DB weight
        if (suggestedWeight !== null) {
          newWeightVal = String(suggestedWeight);
        } else if (previousWeight !== null && previousWeight !== undefined) {
          newWeightVal = String(previousWeight);
        }
      }

      setExerciseWeights(prev => ({ ...prev, [exId]: newWeightVal }));
    }
  }, [currentExerciseIndex, currentExercise, previousWeight, profile?.level]);

  // ─── Handlers ────────────────────────────────
  const handleCompleteSet = useCallback(() => {
    if (isCompleting || !currentExercise) return;

    const currentWeightStr = exerciseWeights[currentExercise.exerciseId] || '';
    const weight = currentWeightStr ? parseFloat(currentWeightStr) : null;
    const reps = repsInput ? parseInt(repsInput, 10) : null;
    const duration = durationInput ? parseInt(durationInput, 10) : null;
    if (!reps && !duration) {
      Alert.alert('Missing Input', 'Please enter reps or duration before completing the set.');
      return;
    }
    
    setIsCompleting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completeCurrentSet(weight, reps, duration);
    
    // Release debounce after transition
    setTimeout(() => setIsCompleting(false), 500);
  }, [exerciseWeights, currentExercise, repsInput, durationInput, completeCurrentSet, isCompleting]);

  const handleEditSet = useCallback((setIndex: number) => {
    if (!currentExercise) return;
    const set = currentExercise.sets[setIndex];
    if (!set || !set.completed) return;
    setEditingSetIndex(setIndex);
    setEditWeight(set.weight ? String(set.weight) : '');
    setEditReps(set.reps ? String(set.reps) : '');
    setEditDuration(set.duration ? String(set.duration) : '');
  }, [currentExercise]);

  const handleSaveEditSet = useCallback(() => {
    if (editingSetIndex === null) return;
    editSet(currentExerciseIndex, editingSetIndex, {
      weight: editWeight ? parseFloat(editWeight) : null,
      reps: editReps ? parseInt(editReps, 10) : null,
      duration: editDuration ? parseInt(editDuration, 10) : null,
    });
    setEditingSetIndex(null);
  }, [editingSetIndex, editWeight, editReps, editDuration, editSet, currentExerciseIndex]);

  const handleFinish = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const summary = finish();
    trackAnalyticsEvent('workout_completed', { 
      duration_minutes: summary.durationMinutes,
      total_volume: summary.totalVolume,
      user_id: user?.id,
    });
    navigation.replace('WorkoutSummary', { summary });
  }, [finish, navigation]);

  const handleExit = useCallback(() => {
    Alert.alert('Cancel Workout?', 'Progress will be lost.', [
      { text: 'Continue Workout', style: 'cancel' },
      { text: 'Cancel Session', style: 'destructive', onPress: () => { 
        cancelWorkout(); 
        navigation.navigate('MainTabs', { screen: 'Today' }); 
      } },
    ]);
  }, [cancelWorkout, navigation]);

  const handleSkipExercise = useCallback(() => {
    Alert.alert('Skip Exercise?', 'This exercise will be marked as skipped.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip', style: 'destructive', onPress: () => {
        skipExercise();
        if (isLastExercise) {
          handleFinish();
        }
      } },
    ]);
  }, [skipExercise, isLastExercise, handleFinish]);

  const handleReplaceExercise = useCallback((poolEx: PoolExercise) => {
    replaceExercise(currentExerciseIndex, {
      id: poolEx.id,
      name: poolEx.name,
      category: poolEx.category,
    });
    trackAnalyticsEvent('exercise_replaced', {
      user_id: user?.id,
      from_exercise_id: currentExercise?.exerciseId,
      from_exercise_name: currentExercise?.exerciseName,
      to_exercise_id: poolEx.id,
      to_exercise_name: poolEx.name,
    });
    // Clear weight input for the new exercise
    setExerciseWeights(prev => {
      const next = { ...prev };
      delete next[currentExercise?.exerciseId || ''];
      return next;
    });
  }, [replaceExercise, currentExerciseIndex, currentExercise, user?.id]);

  // ─── Guard ───────────────────────────────────
  if (!isActive || !currentExercise) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={styles.emptyText}>No active workout session.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isDurationBased = !!currentExercise.targetDuration && !currentExercise.targetReps;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bgBase} />

      {/* Rest Timer Overlay with Next Exercise Preview */}
      {restTimer.isActive && (
        <RestTimerOverlay
          display={restTimer.display}
          progress={restTimer.progress}
          onSkip={restTimer.skip}
          nextExercise={isCurrentExerciseComplete ? nextExercisePreview : null}
        />
      )}

      {/* Exercise Guide Modal */}
      <ExerciseGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        exerciseId={currentExercise.exerciseId}
      />

      {/* Exercise Replacement Modal */}
      <ExerciseReplacementModal
        visible={replaceVisible}
        onClose={() => setReplaceVisible(false)}
        currentExerciseName={currentExercise.exerciseName}
        onSelect={handleReplaceExercise}
      />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleExit} hitSlop={20} style={styles.exitWrap}>
          <Text style={styles.exitBtn}>← Exit</Text>
        </TouchableOpacity>
        <Text style={styles.elapsed}>{elapsed}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Progress Bar */}
      <WorkoutProgressBar progress={overallProgress} current={currentExerciseIndex} total={totalExercises} />

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Exercise Header with Guide Button */}
        <ExerciseHeader
          name={currentExercise.exerciseName}
          category={currentExercise.category}
          targetSets={currentExercise.targetSets}
          targetReps={currentExercise.targetReps}
          targetDuration={currentExercise.targetDuration}
          onGuidePress={() => setGuideVisible(true)}
        />

        {/* Suggested Weight UI */}
        {previousWeight !== null && previousWeight !== undefined && currentSetIndex === 0 && !currentExercise.sets[0].completed && (
          <View style={styles.historyBox}>
            <Text style={styles.historyText}>
              Last: {formatWithUnit(previousWeight)} | Suggested: {formatWithUnit(Number(previousWeight) + (profile?.level === 'beginner' ? 2.5 : 5))}
            </Text>
          </View>
        )}

        {/* Set List */}
        <View style={styles.setsContainer}>
          {currentExercise.sets.map((setLog, idx) => {
            const isCurrentSet = idx === currentSetIndex && !setLog.completed;
            const isCompleted = setLog.completed;
            const isEditing = editingSetIndex === idx;

            return (
              <View key={idx} style={[
                styles.setCard,
                isCurrentSet && styles.setCardActive,
                isCompleted && !isEditing && styles.setCardDone,
                isEditing && styles.setCardEditing,
                (!isCurrentSet && !isCompleted) && styles.setCardUpcoming,
              ]}>
                <View style={styles.setHeader}>
                  <Text style={[styles.setLabel, isCompleted && !isEditing && styles.setLabelDone]}>
                    Set {idx + 1} of {currentExercise.targetSets}
                  </Text>
                  {isCompleted && !isEditing && <Text style={styles.checkMark}>DONE</Text>}
                  {isCurrentSet && <Text style={styles.currentDot}>← CURRENT</Text>}
                  {isEditing && <Text style={styles.editingDot}>EDITING</Text>}
                </View>

                {isEditing ? (
                  /* Editing a completed set */
                  <View style={styles.inputArea}>
                    <View style={styles.inputRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Weight ({weightUnit})</Text>
                        <TextInput style={styles.input} value={editWeight} onChangeText={setEditWeight}
                          keyboardType="numeric" placeholder="optional" placeholderTextColor={palette.textMuted} />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{isDurationBased ? 'Duration (sec)' : 'Reps'}</Text>
                        <TextInput style={styles.input}
                          value={isDurationBased ? editDuration : editReps}
                          onChangeText={isDurationBased ? setEditDuration : setEditReps}
                          keyboardType="numeric" placeholderTextColor={palette.textMuted} />
                      </View>
                    </View>
                    <View style={styles.editBtnRow}>
                      <TouchableOpacity style={styles.saveEditBtn} onPress={handleSaveEditSet} activeOpacity={0.7}>
                        <Text style={styles.saveEditText}>Save ✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setEditingSetIndex(null)} activeOpacity={0.7}>
                        <Text style={styles.cancelEditText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : isCompleted ? (
                  /* Completed set — tappable to edit */
                  <TouchableOpacity onPress={() => handleEditSet(idx)} activeOpacity={0.7}>
                    <Text style={styles.completedInfo}>
                      {setLog.weight ? formatWithUnit(setLog.weight) : 'Bodyweight'}
                      {setLog.reps ? ` × ${setLog.reps} reps` : ''}
                      {setLog.duration ? ` × ${setLog.duration}s` : ''}
                    </Text>
                    <Text style={styles.tapToEdit}>Tap to edit</Text>
                  </TouchableOpacity>
                ) : isCurrentSet ? (
                  /* Current set — input form */
                  <View style={styles.inputArea}>
                    <View style={styles.inputRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Weight ({weightUnit})</Text>
                        <TextInput style={styles.input}
                          value={exerciseWeights[currentExercise.exerciseId] || ''}
                          onChangeText={(val) => setExerciseWeights(p => ({ ...p, [currentExercise.exerciseId]: val }))}
                          keyboardType="numeric" placeholder="optional" placeholderTextColor={palette.textMuted} />
                      </View>
                      {isDurationBased ? (
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Duration (sec)</Text>
                          <TextInput style={styles.input} value={durationInput} onChangeText={setDurationInput}
                            keyboardType="numeric" placeholder={currentExercise.targetDuration || '30'} placeholderTextColor={palette.textMuted} />
                        </View>
                      ) : (
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Reps</Text>
                          <TextInput style={styles.input} value={repsInput} onChangeText={setRepsInput}
                            keyboardType="numeric" placeholder={currentExercise.targetReps || '12'} placeholderTextColor={palette.textMuted} />
                        </View>
                      )}
                    </View>
                    <TouchableOpacity style={styles.completeSetBtn} onPress={handleCompleteSet} activeOpacity={0.7}>
                      <Text style={styles.completeSetText}>Complete Set ✓</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Navigation */}
        <View style={styles.navArea}>
          {isCurrentExerciseComplete && !isLastExercise && (
            <TouchableOpacity style={styles.nextBtn} onPress={() => nextExercise()} activeOpacity={0.7}>
              <Text style={styles.nextBtnText}>Next Exercise →</Text>
            </TouchableOpacity>
          )}
          
          {!isCurrentExerciseComplete && (
            <View style={styles.skipReplaceRow}>
              <TouchableOpacity style={styles.replaceExBtn} onPress={() => setReplaceVisible(true)} activeOpacity={0.7}>
                <Text style={styles.replaceExBtnText}>💪 Replace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipExBtn} onPress={handleSkipExercise} activeOpacity={0.7}>
                <Text style={styles.skipExBtnText}>Skip Exercise</Text>
              </TouchableOpacity>
            </View>
          )}

          {(isWorkoutComplete || (isCurrentExerciseComplete && isLastExercise)) && (
            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.7}>
              <Text style={styles.finishBtnText}>🏆 Finish Workout</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgBase },
  center: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...fonts.body, color: palette.textMuted },
  backBtn: { marginTop: 16, padding: 12 },
  backBtnText: { ...fonts.button, color: palette.primary },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.screenPadding, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: palette.borderSubtle,marginTop: 25
  },
  exitWrap: { padding: 8 },
  exitBtn: { ...fonts.label, color: palette.textSecondary, fontWeight: '700' },
  elapsed: { ...fonts.stat, fontSize: 26, color: palette.primary },

  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  historyBox: {
    marginHorizontal: spacing.screenPadding, marginBottom: spacing.lg,
    padding: 12, borderRadius: 12, backgroundColor: palette.bgInner,
    borderWidth: 1, borderColor: palette.borderLight, alignItems: 'center',
  },
  historyText: { ...fonts.label, color: palette.textSecondary, fontSize: 11 },

  setsContainer: { paddingHorizontal: spacing.screenPadding, gap: 12 },
  setCard: {
    backgroundColor: palette.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: palette.borderSubtle,
  },
  setCardActive: { borderColor: palette.primary, borderWidth: 2 },
  setCardDone: { opacity: 0.8 },
  setCardEditing: { borderColor: palette.info, borderWidth: 1.5 },
  setCardUpcoming: { opacity: 0.4 },

  setHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  setLabel: { ...fonts.label, color: palette.textSecondary, textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 },
  setLabelDone: { color: palette.textMuted },
  checkMark: { fontSize: 16 },
  currentDot: { ...fonts.label, color: palette.primary, fontWeight: '800', fontSize: 10 },
  editingDot: { ...fonts.label, color: palette.info, fontWeight: '800', fontSize: 10 },

  completedInfo: { ...fonts.stat, fontSize: 20, color: palette.textPrimary, marginBottom: 4 },
  tapToEdit: { ...fonts.label, color: palette.textMuted, fontSize: 10 },

  inputArea: { gap: 16 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { ...fonts.label, color: palette.textSecondary, marginBottom: 8, fontSize: 10, textTransform: 'uppercase' },
  input: {
    backgroundColor: palette.bgInner, borderRadius: 12, padding: 14,
    ...fonts.h3, color: palette.textPrimary, borderWidth: 1, borderColor: palette.borderLight,
    textAlign: 'center',
  },
  completeSetBtn: {
    backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center',
  },
  completeSetText: { ...fonts.button, color: palette.white, fontWeight: '800' },

  editBtnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  saveEditBtn: { flex: 2, backgroundColor: palette.info, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveEditText: { ...fonts.button, color: palette.white, fontSize: 14 },
  cancelEditBtn: { flex: 1, backgroundColor: palette.bgInner, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: palette.borderLight },
  cancelEditText: { ...fonts.label, color: palette.textSecondary, fontSize: 14 },

  // Navigation
  navArea: { paddingHorizontal: spacing.screenPadding, paddingTop: 24, gap: 12 },
  nextBtn: { backgroundColor: palette.primary, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', ...shadows.button },
  nextBtnText: { ...fonts.button, color: palette.white },
  finishBtn: { backgroundColor: palette.success, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', ...shadows.button },
  finishBtnText: { ...fonts.button, color: palette.white },
  skipExBtn: { flex: 1, backgroundColor: palette.bgElevated, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: palette.borderSubtle },
  skipExBtnText: { ...fonts.button, color: palette.textSecondary },
  skipReplaceRow: { flexDirection: 'row', gap: 12 },
  replaceExBtn: { flex: 1, backgroundColor: palette.primarySoft, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: palette.primary + '30' },
  replaceExBtnText: { ...fonts.button, color: palette.primary },
});
