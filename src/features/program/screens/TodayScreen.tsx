import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useAdaptiveDay } from '../hooks/useAdaptiveDay';
import { upsertExerciseHistory } from '../services/exerciseHistoryQueries';
import { Difficulty, AdaptedWorkout } from '../services/adaptiveEngine';
import { useRetention } from '../../retention/hooks/useRetention';
import { AuthButton } from '../../auth/components/AuthButton';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';

const ENERGIES = [
  { level: 1, emoji: '😫', label: 'Low' },
  { level: 2, emoji: '😐', label: 'Average' },
  { level: 3, emoji: '🤩', label: 'High' },
];

const DIFFICULTIES: { value: Difficulty; emoji: string; label: string }[] = [
  { value: 'easy', emoji: '😎', label: 'Easy' },
  { value: 'medium', emoji: '💪', label: 'Just Right' },
  { value: 'hard', emoji: '🥵', label: 'Hard' },
];

const FOCUS_ICONS: Record<string, string> = {
  strength: '💪',
  cardio: '🏃',
  mobility: '🧘',
  rest: '😴',
};

const MEAL_ADJUSTMENT_LABELS: Record<string, string> = {
  calorie_up: '⬆️ +150 cal (muscle gain boost)',
  calorie_down: '⬇️ -150 cal (rest day cut)',
  none: '',
};

const INTENSITY_COLORS: Record<string, string> = {
  low: '#3B82F6',
  normal: '#22C55E',
  high: '#EF4444',
};

export const TodayScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { adaptiveState, isLoading, completeToday } = useAdaptiveDay();
  const { logEvent } = useRetention();
  const [energyLevel, setEnergyLevel] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  // Track DAY_VIEWED once per screen mount
  useEffect(() => {
    if (adaptiveState?.programDay) {
      logEvent('DAY_VIEWED', { programDay: adaptiveState.programDay });
    }
  }, [adaptiveState?.programDay]);

  // Writeback mutation: save exercise history after completion
  const saveHistory = useMutation({
    mutationFn: async () => {
      if (!user?.id || !adaptiveState) return;
      const exercises = adaptiveState.adaptedWorkouts
        .filter((w) => w.adaptedSets || w.adaptedReps)
        .map((w) => ({
          exercise_id: w.exercise_name,
          sets: w.adaptedSets,
          reps: w.adaptedReps ? parseInt(w.adaptedReps, 10) || null : null,
          difficulty,
        }));
      await upsertExerciseHistory(user.id, exercises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseHistory', user?.id] });
    },
  });

  const handleDone = useCallback(() => {
    if (completeToday.isPending || saveHistory.isPending) return;
    completeToday.mutate(energyLevel, {
      onSuccess: () => {
        saveHistory.mutate();
      },
      onError: (error: any) => {
        Alert.alert('Error completing today', error.message);
      },
    });
  }, [completeToday, saveHistory, energyLevel, difficulty]);

  const handleSkip = () => {
    Alert.alert(
      'Skip Today?',
      'Skipping will break your streak. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  // Loading
  if (isLoading || !adaptiveState) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { dayDetail, adaptivePlan, adaptedWorkouts, programDay, currentWeekNumber, dayNumberInWeek } = adaptiveState;

  if (!dayDetail) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>No program found. Complete onboarding first.</Text>
      </View>
    );
  }

  // Action section (shared between missed-day and normal flows)
  const renderActionSection = () => (
    <View style={styles.actionSection}>
      {/* Difficulty feedback */}
      <Text style={styles.actionTitle}>How was this workout?</Text>
      <View style={styles.energyRow}>
        {DIFFICULTIES.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[styles.energyBtn, difficulty === d.value && styles.energyBtnSelected]}
            onPress={() => setDifficulty(d.value)}
          >
            <Text style={styles.energyEmoji}>{d.emoji}</Text>
            <Text style={[styles.energyLabel, difficulty === d.value && styles.energyLabelSelected]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Energy level */}
      <Text style={styles.actionTitle}>How is your energy?</Text>
      <View style={styles.energyRow}>
        {ENERGIES.map((e) => (
          <TouchableOpacity
            key={e.level}
            style={[styles.energyBtn, energyLevel === e.level && styles.energyBtnSelected]}
            onPress={() => setEnergyLevel(e.level)}
          >
            <Text style={styles.energyEmoji}>{e.emoji}</Text>
            <Text style={[styles.energyLabel, energyLevel === e.level && styles.energyLabelSelected]}>
              {e.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <AuthButton
        title={completeToday.isPending || saveHistory.isPending ? 'Saving...' : 'Complete Day'}
        onPress={handleDone}
        disabled={completeToday.isPending || saveHistory.isPending}
      />
      <View style={{ height: 12 }} />
      <AuthButton
        title="Skip Today"
        onPress={handleSkip}
        variant="outline"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* System Message Banner */}
      {adaptivePlan.systemMessage ? (
        <View style={[styles.systemBanner, { borderLeftColor: INTENSITY_COLORS[adaptivePlan.intensity] }]}>
          <Text style={styles.systemMessage}>{adaptivePlan.systemMessage}</Text>
          <View style={styles.intensityBadgeRow}>
            <View style={[styles.intensityBadge, { backgroundColor: INTENSITY_COLORS[adaptivePlan.intensity] }]}>
              <Text style={styles.intensityBadgeText}>
                {adaptivePlan.intensity.toUpperCase()}
              </Text>
            </View>
            {adaptivePlan.recoveryMode && (
              <View style={[styles.intensityBadge, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.intensityBadgeText}>RECOVERY</Text>
              </View>
            )}
          </View>
        </View>
      ) : null}

      {/* Streak Broken Warning */}
      {!adaptiveState.todayCompleted && adaptiveState.missedYesterday && (
        <View style={styles.streakBrokenBox}>
          <Text style={styles.streakBrokenTitle}>⚡ Streak reset</Text>
          <Text style={styles.streakBrokenText}>
            You missed a day — start a new streak today.
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Program Day {programDay}</Text>
        <Text style={styles.title}>
          {FOCUS_ICONS[dayDetail.focusType] || '📋'} {dayDetail.title}
        </Text>
        <Text style={styles.subtitle}>Week {currentWeekNumber} · Day {dayNumberInWeek}</Text>
      </View>

      {/* Workout Section */}
      <Text style={styles.sectionTitle}>Workout</Text>
      {adaptedWorkouts.map((w: AdaptedWorkout, i: number) => (
        <View key={w.id} style={[styles.card, w.isAdapted && styles.cardAdapted]}>
          <View style={styles.exerciseRow}>
            <Text style={styles.exerciseNumber}>{i + 1}</Text>
            <View style={styles.exerciseInfo}>
              <View style={styles.exerciseNameRow}>
                <Text style={styles.exerciseName}>{w.exercise_name}</Text>
                {w.isAdapted && <Text style={styles.adaptedTag}>ADAPTED</Text>}
              </View>
              <Text style={styles.exerciseDetail}>
                {w.adaptedSets ? `${w.adaptedSets} sets` : ''}
                {w.adaptedReps && w.adaptedReps !== '—' ? ` × ${w.adaptedReps}` : ''}
                {w.duration ? ` · ${w.duration}` : ''}
              </Text>
              {w.isAdapted && (
                <Text style={styles.baseValues}>
                  Base: {w.sets ? `${w.sets} sets` : ''}
                  {w.reps && w.reps !== '—' ? ` × ${w.reps}` : ''}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}

      {/* Meals Section */}
      <Text style={styles.sectionTitle}>Meals</Text>
      {adaptivePlan.mealAdjustment !== 'none' && (
        <View style={styles.mealAdjustBanner}>
          <Text style={styles.mealAdjustText}>
            {MEAL_ADJUSTMENT_LABELS[adaptivePlan.mealAdjustment]}
          </Text>
        </View>
      )}
      {dayDetail.meals.map((m) => (
        <View key={m.id} style={styles.card}>
          <Text style={styles.mealType}>
            {m.meal_type === 'breakfast' ? '🌅' :
             m.meal_type === 'lunch' ? '☀️' :
             m.meal_type === 'snack' ? '🍎' : '🌙'}{' '}
            {m.meal_type.charAt(0).toUpperCase() + m.meal_type.slice(1)}
          </Text>
          <Text style={styles.mealTitle}>{m.title}</Text>
          {m.description && <Text style={styles.mealDesc}>{m.description}</Text>}
        </View>
      ))}

      {/* Completion or Actions */}
      {adaptiveState.todayCompleted ? (
        <View style={styles.completedBox}>
          <Text style={styles.completedTitle}>🔥 Day {programDay} Complete</Text>
          <Text style={styles.completedText}>
            Streak: {adaptiveState.streak} day{adaptiveState.streak !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : (
        renderActionSection()
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },

  // System message banner
  systemBanner: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  systemMessage: { ...typography.body, color: colors.text, lineHeight: 22 },
  intensityBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  intensityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  intensityBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  // Streak broken
  streakBrokenBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  streakBrokenTitle: { ...typography.body, color: '#92400E', fontWeight: '700' },
  streakBrokenText: { ...typography.bodySmall, color: '#A16207', marginTop: 4 },

  // Header
  header: { marginBottom: 24 },
  headerLabel: { ...typography.bodySmall, color: colors.primary, fontWeight: '600', marginBottom: 4 },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { ...typography.h2, fontSize: 18, color: colors.text, marginTop: 24, marginBottom: 12 },

  // Cards
  card: {
    backgroundColor: colors.surface, padding: 16, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  cardAdapted: { borderColor: '#F59E0B', borderWidth: 1.5, backgroundColor: '#FFFBEB' },

  // Exercise
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  exerciseNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, color: '#FFF',
    textAlign: 'center', lineHeight: 28,
    fontSize: 13, fontWeight: '700', marginRight: 12,
  },
  exerciseInfo: { flex: 1 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exerciseName: { ...typography.body, color: colors.text, fontWeight: '600' },
  adaptedTag: {
    fontSize: 9, fontWeight: '800', color: '#D97706',
    backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 3, overflow: 'hidden',
  },
  exerciseDetail: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  baseValues: { ...typography.bodySmall, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' },

  // Meals
  mealAdjustBanner: {
    backgroundColor: '#FFF7ED', borderColor: '#FDBA74', borderWidth: 1,
    borderRadius: 8, padding: 10, marginBottom: 12,
  },
  mealAdjustText: { ...typography.bodySmall, color: '#C2410C', fontWeight: '600', textAlign: 'center' },
  mealType: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  mealTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  mealDesc: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },

  // Empty
  emptyText: { ...typography.body, color: colors.textSecondary },

  // Action section
  actionSection: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border },
  actionTitle: { ...typography.body, color: colors.text, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  energyRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 },
  energyBtn: {
    alignItems: 'center', padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, width: 80,
  },
  energyBtnSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  energyEmoji: { fontSize: 28, marginBottom: 4 },
  energyLabel: { ...typography.bodySmall, color: colors.textSecondary },
  energyLabelSelected: { color: colors.primary, fontWeight: '600' },
  completedBox: {
    backgroundColor: '#F0FDF4', borderColor: '#86EFAC', borderWidth: 1,
    borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 24,
  },
  completedTitle: { ...typography.h2, fontSize: 20, color: '#166534', marginBottom: 8 },
  completedText: { ...typography.body, color: '#15803D', textAlign: 'center' },
});
