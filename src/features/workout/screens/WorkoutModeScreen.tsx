/**
 * WorkoutModeScreen — Live Training Companion
 *
 * Displays ONE exercise at a time with set logging, rest timer,
 * progress tracking, and exercise navigation.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, SafeAreaView, StatusBar, Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useRestTimer } from '../hooks/useRestTimer';
import { AdaptedWorkout } from '../../program/services/adaptiveEngine';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

// ═══════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════

// ─── Progress Bar ──────────────────────────────
const WorkoutProgressBar = ({ progress, current, total }: { progress: number; current: number; total: number }) => (
  <View style={progressStyles.container}>
    <View style={progressStyles.barBg}>
      <View style={[progressStyles.barFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
    </View>
    <Text style={progressStyles.label}>Exercise {current + 1} of {total}</Text>
  </View>
);

const progressStyles = StyleSheet.create({
  container: { paddingHorizontal: spacing.screenPadding, paddingVertical: spacing.sm },
  barBg: { height: 6, backgroundColor: palette.primaryLight, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: palette.primary, borderRadius: 3 },
  label: { ...fonts.caption, color: palette.textSecondary, textAlign: 'center', marginTop: 6 },
});

// ─── Exercise Header ───────────────────────────
const ExerciseHeader = ({ name, category, targetSets, targetReps, targetDuration }: {
  name: string; category: string; targetSets: number;
  targetReps: string | null; targetDuration: string | null;
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
  </View>
);

const headerStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.screenPadding },
  name: { ...fonts.programDayTitle, color: palette.textPrimary, textAlign: 'center', marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tag: { backgroundColor: palette.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { ...fonts.badge, color: palette.primary },
  target: { ...fonts.body, color: palette.textSecondary },
});

// ─── Rest Timer Overlay ────────────────────────
const RestTimerOverlay = ({ display, progress, onSkip }: {
  display: string; progress: number; onSkip: () => void;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={restStyles.overlay}>
      <Animated.View style={[restStyles.timerCircle, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={restStyles.emoji}>⏱️</Text>
        <Text style={restStyles.time}>{display}</Text>
        <Text style={restStyles.label}>REST</Text>
      </Animated.View>
      <TouchableOpacity style={restStyles.skipBtn} onPress={onSkip} activeOpacity={0.7}>
        <Text style={restStyles.skipText}>Skip Rest →</Text>
      </TouchableOpacity>
    </View>
  );
};

const restStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  timerCircle: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 3, borderColor: palette.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 28, marginBottom: 4 },
  time: { ...fonts.heroNumber, color: palette.white, fontSize: 42 },
  label: { ...fonts.label, color: palette.textOnDarkMuted, marginTop: 2 },
  skipBtn: {
    marginTop: 32, paddingVertical: 14, paddingHorizontal: 32,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill,
  },
  skipText: { ...fonts.button, color: palette.white },
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
    completeCurrentSet, nextExercise, finish, abandon,
    exercises, editSet, restTimer,
  } = useWorkoutSession();

  // Input state
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [durationInput, setDurationInput] = useState('');

  // Elapsed time ticker
  const [elapsed, setElapsed] = useState('00:00');
  const startTimeRef = useRef<number | null>(null);

  // Initialize session from route params
  useEffect(() => {
    if (!isActive && route.params?.workouts) {
      start(route.params.workouts as AdaptedWorkout[]);
    }
  }, []);

  // Restore start time ref
  useEffect(() => {
    if (isActive) {
      const store = require('../stores/workoutSessionStore').useWorkoutSessionStore.getState();
      if (store.startTime) {
        startTimeRef.current = new Date(store.startTime).getTime();
      }
    }
  }, [isActive]);

  // Elapsed time updater
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const ms = Date.now() - startTimeRef.current;
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        setElapsed(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Pre-fill reps/duration from target when exercise changes
  useEffect(() => {
    if (currentExercise) {
      setWeightInput('');
      if (currentExercise.targetReps) {
        // Extract first number from strings like "12-15" → "12"
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
    }
  }, [currentExerciseIndex, currentExercise]);

  // ─── Handlers ────────────────────────────────
  const handleCompleteSet = useCallback(() => {
    const weight = weightInput ? parseFloat(weightInput) : null;
    const reps = repsInput ? parseInt(repsInput, 10) : null;
    const duration = durationInput ? parseInt(durationInput, 10) : null;

    if (!reps && !duration) {
      Alert.alert('Missing Input', 'Please enter reps or duration before completing the set.');
      return;
    }

    completeCurrentSet(weight, reps, duration);
  }, [weightInput, repsInput, durationInput, completeCurrentSet]);

  const handleNextExercise = useCallback(() => {
    nextExercise();
  }, [nextExercise]);

  const handleFinish = useCallback(() => {
    const summary = finish();
    navigation.replace('WorkoutSummary', { summary });
  }, [finish, navigation]);

  const handleExit = useCallback(() => {
    Alert.alert(
      'End Workout?',
      'Your progress will be saved. You can finish the remaining exercises later.',
      [
        { text: 'Continue Workout', style: 'cancel' },
        {
          text: 'End & Save',
          style: 'destructive',
          onPress: () => {
            const summary = finish();
            navigation.replace('WorkoutSummary', { summary });
          },
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            abandon();
            navigation.goBack();
          },
        },
      ]
    );
  }, [finish, abandon, navigation]);

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
      <StatusBar barStyle="dark-content" backgroundColor={palette.bgPrimary} />

      {/* Rest Timer Overlay */}
      {restTimer.isActive && (
        <RestTimerOverlay
          display={restTimer.display}
          progress={restTimer.progress}
          onSkip={restTimer.skip}
        />
      )}

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleExit} hitSlop={12}>
          <Text style={styles.exitBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.elapsed}>⏱ {elapsed}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress Bar */}
      <WorkoutProgressBar
        progress={overallProgress}
        current={currentExerciseIndex}
        total={totalExercises}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Header */}
        <ExerciseHeader
          name={currentExercise.exerciseName}
          category={currentExercise.category}
          targetSets={currentExercise.targetSets}
          targetReps={currentExercise.targetReps}
          targetDuration={currentExercise.targetDuration}
        />

        {/* Set List */}
        <View style={styles.setsContainer}>
          {currentExercise.sets.map((setLog, idx) => {
            const isCurrentSet = idx === currentSetIndex && !setLog.completed;
            const isCompleted = setLog.completed;
            const isUpcoming = idx > currentSetIndex && !setLog.completed;

            return (
              <View
                key={idx}
                style={[
                  styles.setCard,
                  isCurrentSet && styles.setCardActive,
                  isCompleted && styles.setCardDone,
                  isUpcoming && styles.setCardUpcoming,
                ]}
              >
                <View style={styles.setHeader}>
                  <Text style={[styles.setLabel, isCompleted && styles.setLabelDone]}>
                    Set {idx + 1} of {currentExercise.targetSets}
                  </Text>
                  {isCompleted && <Text style={styles.checkMark}>✅</Text>}
                  {isCurrentSet && <Text style={styles.currentDot}>← CURRENT</Text>}
                </View>

                {isCompleted ? (
                  <Text style={styles.completedInfo}>
                    {setLog.weight ? `${setLog.weight} lbs` : 'Bodyweight'}
                    {setLog.reps ? ` × ${setLog.reps} reps` : ''}
                    {setLog.duration ? ` × ${setLog.duration}s` : ''}
                  </Text>
                ) : isCurrentSet ? (
                  <View style={styles.inputArea}>
                    <View style={styles.inputRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Weight (lbs)</Text>
                        <TextInput
                          style={styles.input}
                          value={weightInput}
                          onChangeText={setWeightInput}
                          keyboardType="numeric"
                          placeholder="optional"
                          placeholderTextColor={palette.textMuted}
                        />
                      </View>
                      {isDurationBased ? (
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Duration (sec)</Text>
                          <TextInput
                            style={styles.input}
                            value={durationInput}
                            onChangeText={setDurationInput}
                            keyboardType="numeric"
                            placeholder={currentExercise.targetDuration || '30'}
                            placeholderTextColor={palette.textMuted}
                          />
                        </View>
                      ) : (
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Reps</Text>
                          <TextInput
                            style={styles.input}
                            value={repsInput}
                            onChangeText={setRepsInput}
                            keyboardType="numeric"
                            placeholder={currentExercise.targetReps || '12'}
                            placeholderTextColor={palette.textMuted}
                          />
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.completeSetBtn}
                      onPress={handleCompleteSet}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.completeSetText}>Complete Set ✓</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navArea}>
          {isCurrentExerciseComplete && !isLastExercise && (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNextExercise} activeOpacity={0.7}>
              <Text style={styles.nextBtnText}>Next Exercise →</Text>
            </TouchableOpacity>
          )}
          {(isWorkoutComplete || (isCurrentExerciseComplete && isLastExercise)) && (
            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.7}>
              <Text style={styles.finishBtnText}>🎉 Finish Workout</Text>
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
  screen: { flex: 1, backgroundColor: palette.bgPrimary },
  center: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...fonts.body, color: palette.textMuted, textAlign: 'center' },
  backBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: palette.primary, borderRadius: radius.sm },
  backBtnText: { ...fonts.button, color: palette.white },

  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  exitBtn: { fontSize: 22, color: palette.textMuted, padding: 4 },
  elapsed: { ...fonts.tabular, color: palette.textSecondary },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Sets
  setsContainer: { paddingHorizontal: spacing.screenPadding, gap: 12 },
  setCard: {
    backgroundColor: palette.white, borderRadius: radius.card, padding: spacing.cardPadding,
    ...shadows.card,
  },
  setCardActive: {
    borderWidth: 2, borderColor: palette.primary,
    ...shadows.focus,
  },
  setCardDone: {
    backgroundColor: palette.successLight, opacity: 0.85,
  },
  setCardUpcoming: {
    opacity: 0.5,
  },
  setHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  setLabel: { ...fonts.cardTitle, color: palette.textSecondary },
  setLabelDone: { color: palette.success },
  checkMark: { fontSize: 18 },
  currentDot: { ...fonts.badge, color: palette.primary },

  completedInfo: { ...fonts.body, color: palette.success },

  // Inputs
  inputArea: { gap: 12 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { ...fonts.label, color: palette.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: palette.inputBackground, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    ...fonts.cardValue, color: palette.textPrimary,
  },
  completeSetBtn: {
    backgroundColor: palette.primary, borderRadius: radius.sm,
    paddingVertical: 14, alignItems: 'center',
    ...shadows.button,
  },
  completeSetText: { ...fonts.button, color: palette.white },

  // Navigation
  navArea: { paddingHorizontal: spacing.screenPadding, paddingTop: 24, gap: 12 },
  nextBtn: {
    backgroundColor: palette.primary, borderRadius: radius.sm,
    paddingVertical: 16, alignItems: 'center',
    ...shadows.button,
  },
  nextBtnText: { ...fonts.button, color: palette.white },
  finishBtn: {
    backgroundColor: palette.success, borderRadius: radius.sm,
    paddingVertical: 16, alignItems: 'center',
    ...shadows.button,
  },
  finishBtnText: { ...fonts.button, color: palette.white },
});
