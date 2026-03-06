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
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useExerciseDetail } from '../../program/hooks/useExerciseDetail';
import { AdaptedWorkout } from '../../program/services/adaptiveEngine';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

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
      <Text style={progressStyles.label}>Exercise {current + 1} of {total}</Text>
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: { paddingHorizontal: spacing.screenPadding, paddingVertical: spacing.sm },
  barBg: { height: 6, backgroundColor: palette.primaryLight, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: palette.primary, borderRadius: 3 },
  label: { ...fonts.caption, color: palette.textSecondary, textAlign: 'center', marginTop: 6 },
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
      <Text style={headerStyles.guideIcon}>ℹ️</Text>
      <Text style={headerStyles.guideText}>Exercise Guide</Text>
    </TouchableOpacity>
  </View>
);

const headerStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.screenPadding },
  name: { ...fonts.programDayTitle, color: palette.textPrimary, textAlign: 'center', marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tag: { backgroundColor: palette.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { ...fonts.badge, color: palette.primary },
  target: { ...fonts.body, color: palette.textSecondary, marginBottom: 10 },
  guideBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: palette.primarySoft, borderRadius: radius.pill,
  },
  guideIcon: { fontSize: 16 },
  guideText: { ...fonts.label, color: palette.primary },
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
        <Text style={restStyles.restLabel}>REST</Text>
      </Animated.View>

      {/* Next Exercise Preview */}
      {nextExercise && (
        <View style={restStyles.nextPreview}>
          <Text style={restStyles.nextTitle}>Up Next</Text>
          <Text style={restStyles.nextName}>{nextExercise.name}</Text>
          <Text style={restStyles.nextDetail}>
            {nextExercise.targetSets} × {nextExercise.targetReps || nextExercise.targetDuration || '—'}
          </Text>
        </View>
      )}

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
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  timerCircle: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 3, borderColor: palette.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 28, marginBottom: 4 },
  time: { ...fonts.heroNumber, color: palette.white, fontSize: 42 },
  restLabel: { ...fonts.label, color: palette.textOnDarkMuted, marginTop: 2 },
  nextPreview: {
    marginTop: 28, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.card,
    paddingVertical: 16, paddingHorizontal: 24, minWidth: 220,
  },
  nextTitle: { ...fonts.badge, color: palette.textOnDarkMuted, marginBottom: 6, letterSpacing: 1 },
  nextName: { ...fonts.cardTitle, color: palette.white, marginBottom: 4, textAlign: 'center' },
  nextDetail: { ...fonts.caption, color: palette.textOnDarkMuted },
  skipBtn: {
    marginTop: 24, paddingVertical: 14, paddingHorizontal: 32,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill,
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
                <Text style={guideStyles.muscleLabel}>🎯 Primary Muscle</Text>
                <View style={guideStyles.muscleTag}>
                  <Text style={guideStyles.muscleTagText}>{data.primaryMuscle}</Text>
                </View>
              </View>
            )}

            {data?.steps && data.steps.length > 0 && (
              <>
                <Text style={guideStyles.sectionTitle}>How to Perform</Text>
                <View style={guideStyles.stepsWrap}>
                  {data.steps.map((step, i) => (
                    <View key={i} style={guideStyles.stepRow}>
                      <Text style={guideStyles.stepNum}>{i + 1}.</Text>
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
                    <Text style={guideStyles.tipIcon}>💡</Text>
                    <Text style={guideStyles.tipText}>{cue}</Text>
                  </View>
                ))}
              </>
            )}

            {data?.commonMistakes && data.commonMistakes.length > 0 && (
              <>
                <Text style={guideStyles.sectionTitle}>Common Mistakes</Text>
                {data.commonMistakes.map((mistake, i) => (
                  <View key={i} style={guideStyles.mistakeBox}>
                    <Text style={guideStyles.mistakeIcon}>⚠️</Text>
                    <Text style={guideStyles.mistakeText}>{mistake}</Text>
                  </View>
                ))}
              </>
            )}

            {data?.beginnerLoadTip && (
              <View style={guideStyles.loadTipBox}>
                <Text style={guideStyles.loadTipIcon}>🏋️</Text>
                <Text style={guideStyles.loadTipText}>{data.beginnerLoadTip}</Text>
              </View>
            )}

            {!data && (
              <View style={guideStyles.noData}>
                <Text style={guideStyles.noDataEmoji}>📝</Text>
                <Text style={guideStyles.noDataText}>No exercise instructions available yet.</Text>
                <Text style={guideStyles.noDataSub}>Focus on controlled form and full range of motion.</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const guideStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: palette.bgPrimary, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card,
    minHeight: '50%', maxHeight: '80%', padding: spacing.screenPadding, ...shadows.level2,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.borderSubtle, alignSelf: 'center', marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { ...fonts.screenTitle, color: palette.textPrimary, flex: 1 },
  closeBtn: { fontSize: 24, color: palette.textMuted },
  scroll: { flexGrow: 1 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  muscleLabel: { ...fonts.label, color: palette.textSecondary },
  muscleTag: { backgroundColor: palette.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  muscleTagText: { ...fonts.badge, color: palette.primary },
  sectionTitle: { ...fonts.sectionHeader, color: palette.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  stepsWrap: { gap: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepNum: { ...fonts.body, color: palette.primary, marginRight: spacing.sm, width: 22, fontWeight: '600' },
  stepText: { ...fonts.body, color: palette.textSecondary, flex: 1, lineHeight: 22 },
  tipBox: {
    backgroundColor: palette.primarySoft, padding: spacing.innerMd, borderRadius: radius.sm,
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm,
  },
  tipIcon: { fontSize: 16, marginRight: spacing.sm },
  tipText: { ...fonts.body, color: palette.primary, flex: 1, lineHeight: 22 },
  mistakeBox: {
    backgroundColor: palette.warningSoft, padding: spacing.innerMd, borderRadius: radius.sm,
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm,
  },
  mistakeIcon: { fontSize: 16, marginRight: spacing.sm },
  mistakeText: { ...fonts.body, color: '#92400E', flex: 1, lineHeight: 22 },
  loadTipBox: {
    backgroundColor: palette.successSoft, padding: spacing.cardPadding, borderRadius: radius.card,
    flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.lg,
  },
  loadTipIcon: { fontSize: 20, marginRight: spacing.sm },
  loadTipText: { ...fonts.body, color: palette.success, flex: 1, lineHeight: 22 },
  noData: { paddingVertical: spacing['3xl'], alignItems: 'center' },
  noDataEmoji: { fontSize: 40, marginBottom: 12 },
  noDataText: { ...fonts.cardTitle, color: palette.textSecondary, marginBottom: 4 },
  noDataSub: { ...fonts.caption, color: palette.textMuted, textAlign: 'center' },
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
  } = useWorkoutSession();

  // Input state
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [elapsed, setElapsed] = useState('00:00');
  const startTimeRef = useRef<number | null>(null);

  // Edit mode for completed sets
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editDuration, setEditDuration] = useState('');

  // Exercise Guide modal
  const [guideVisible, setGuideVisible] = useState(false);

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
      if (store.startTime) startTimeRef.current = new Date(store.startTime).getTime();
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
    const summary = finish();
    navigation.replace('WorkoutSummary', { summary });
  }, [finish, navigation]);

  const handleExit = useCallback(() => {
    Alert.alert('End Workout?', 'Your progress will be saved.', [
      { text: 'Continue Workout', style: 'cancel' },
      { text: 'End & Save', style: 'destructive', onPress: () => { const summary = finish(); navigation.replace('WorkoutSummary', { summary }); } },
      { text: 'Discard', style: 'destructive', onPress: () => { abandon(); navigation.goBack(); } },
    ]);
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

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleExit} hitSlop={12}>
          <Text style={styles.exitBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.elapsed}>⏱ {elapsed}</Text>
        <View style={{ width: 32 }} />
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
                  {isCompleted && !isEditing && <Text style={styles.checkMark}>✅</Text>}
                  {isCurrentSet && <Text style={styles.currentDot}>← CURRENT</Text>}
                  {isEditing && <Text style={styles.editingDot}>✏️ EDITING</Text>}
                </View>

                {isEditing ? (
                  /* Editing a completed set */
                  <View style={styles.inputArea}>
                    <View style={styles.inputRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Weight (lbs)</Text>
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
                      {setLog.weight ? `${setLog.weight} lbs` : 'Bodyweight'}
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
                        <Text style={styles.inputLabel}>Weight (lbs)</Text>
                        <TextInput style={styles.input} value={weightInput} onChangeText={setWeightInput}
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
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  exitBtn: { fontSize: 22, color: palette.textMuted, padding: 4 },
  elapsed: { ...fonts.tabular, color: palette.textSecondary },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  setsContainer: { paddingHorizontal: spacing.screenPadding, gap: 12 },

  // Set cards
  setCard: { backgroundColor: palette.white, borderRadius: radius.card, padding: spacing.cardPadding, ...shadows.card },
  setCardActive: { borderWidth: 2, borderColor: palette.primary, ...shadows.focus },
  setCardDone: { backgroundColor: palette.successLight, opacity: 0.9 },
  setCardEditing: { borderWidth: 2, borderColor: palette.accentAmber, backgroundColor: palette.warningLight },
  setCardUpcoming: { opacity: 0.5 },
  setHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  setLabel: { ...fonts.cardTitle, color: palette.textSecondary },
  setLabelDone: { color: palette.success },
  checkMark: { fontSize: 18 },
  currentDot: { ...fonts.badge, color: palette.primary },
  editingDot: { ...fonts.badge, color: palette.accentAmber },

  completedInfo: { ...fonts.body, color: palette.success },
  tapToEdit: { ...fonts.caption, color: palette.textMuted, marginTop: 4, fontStyle: 'italic' },

  // Inputs
  inputArea: { gap: 12 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { ...fonts.label, color: palette.textSecondary, marginBottom: 4 },
  input: { backgroundColor: palette.inputBackground, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, ...fonts.cardValue, color: palette.textPrimary },
  completeSetBtn: { backgroundColor: palette.primary, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', ...shadows.button },
  completeSetText: { ...fonts.button, color: palette.white },

  // Edit buttons
  editBtnRow: { flexDirection: 'row', gap: 12 },
  saveEditBtn: { flex: 1, backgroundColor: palette.success, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  saveEditText: { ...fonts.button, color: palette.white },
  cancelEditBtn: { flex: 1, backgroundColor: palette.bgSecondary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: palette.borderSubtle },
  cancelEditText: { ...fonts.button, color: palette.textSecondary },

  // Navigation
  navArea: { paddingHorizontal: spacing.screenPadding, paddingTop: 24, gap: 12 },
  nextBtn: { backgroundColor: palette.primary, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', ...shadows.button },
  nextBtnText: { ...fonts.button, color: palette.white },
  finishBtn: { backgroundColor: palette.success, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', ...shadows.button },
  finishBtnText: { ...fonts.button, color: palette.white },
});
