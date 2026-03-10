/**
 * WorkoutSummaryScreen — Post-Workout Stats + Feedback + PR Detection
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WorkoutSummary, useWorkoutSessionStore } from '../stores/workoutSessionStore';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { useAuth } from '../../auth/hooks/useAuth';
import { supabase } from '../../../core/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { upsertExerciseHistory } from '../../program/services/exerciseHistoryQueries';
import { trackEvent } from '../../retention/services/retentionService';
import { Difficulty } from '../../program/services/adaptiveEngine';
import { toDateString } from '../../../core/utils/dateUtils';

// ═══════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════

const StatBox = ({ emoji, value, label }: { emoji: string; value: string | number; label: string }) => (
  <View style={statStyles.box}>
    <Text style={statStyles.emoji}>{emoji}</Text>
    <Text style={statStyles.value}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  box: {
    flex: 1, backgroundColor: palette.white, borderRadius: radius.card,
    padding: spacing.cardPadding, alignItems: 'center', justifyContent: 'center',
    minHeight: 110, ...shadows.card,
  },
  emoji: { fontSize: 28, marginBottom: 6 },
  value: { ...fonts.statValue, color: palette.textPrimary },
  label: { ...fonts.statLabel, color: palette.textSecondary, marginTop: 2, textAlign: 'center' },
});

// ─── Energy Selector ────────────────────────────
const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Low' },
  { value: 2, emoji: '😐', label: 'Normal' },
  { value: 3, emoji: '⚡', label: 'High' },
];

const EnergySelector = ({ value, onChange }: { value: number | null; onChange: (v: number) => void }) => (
  <View style={fbStyles.section}>
    <Text style={fbStyles.sectionTitle}>How was your energy?</Text>
    <View style={fbStyles.optionRow}>
      {ENERGY_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[fbStyles.optionBtn, value === opt.value && fbStyles.optionBtnActive]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={fbStyles.optionEmoji}>{opt.emoji}</Text>
          <Text style={[fbStyles.optionLabel, value === opt.value && fbStyles.optionLabelActive]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ─── Difficulty Selector ────────────────────────
const DIFFICULTY_OPTIONS: { value: Difficulty; emoji: string; label: string }[] = [
  { value: 'easy', emoji: '🟢', label: 'Easy' },
  { value: 'medium', emoji: '🟡', label: 'Medium' },
  { value: 'hard', emoji: '🔴', label: 'Hard' },
];

const DifficultySelector = ({ value, onChange }: { value: Difficulty | null; onChange: (v: Difficulty) => void }) => (
  <View style={fbStyles.section}>
    <Text style={fbStyles.sectionTitle}>How hard was this workout?</Text>
    <View style={fbStyles.optionRow}>
      {DIFFICULTY_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[fbStyles.optionBtn, value === opt.value && fbStyles.optionBtnActive]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={fbStyles.optionEmoji}>{opt.emoji}</Text>
          <Text style={[fbStyles.optionLabel, value === opt.value && fbStyles.optionLabelActive]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const fbStyles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...fonts.sectionHeader, color: palette.textPrimary, marginBottom: 12 },
  optionRow: { flexDirection: 'row', gap: 12 },
  optionBtn: {
    flex: 1, backgroundColor: palette.white, borderRadius: radius.card,
    paddingVertical: 16, alignItems: 'center', borderWidth: 2,
    borderColor: 'transparent', ...shadows.card,
  },
  optionBtnActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  optionEmoji: { fontSize: 28, marginBottom: 4 },
  optionLabel: { ...fonts.label, color: palette.textSecondary },
  optionLabelActive: { color: palette.primary, fontWeight: '700' },
});

// ═══════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════

export const WorkoutSummaryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clearSession = useWorkoutSessionStore(s => s.clearSession);
  const summary: WorkoutSummary | null = route.params?.summary ?? null;

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Feedback state
  const [energy, setEnergy] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  // ─── PR Detection ──────────────────────────────
  // Fetch historical max weight & reps per exercise for PR comparison
  const exerciseIds = useMemo(() => {
    if (!summary) return [];
    return summary.exercises
      .filter(ex => ex.sets.some(s => s.completed))
      .map(ex => ex.exerciseId);
  }, [summary]);

  const { data: historicalPRs } = useQuery({
    queryKey: ['historical_prs', user?.id, exerciseIds],
    queryFn: async () => {
      if (!user?.id || exerciseIds.length === 0) return {};
      const { data, error } = await supabase
        .from('workout_sets')
        .select('exercise_id, weight, reps')
        .eq('user_id', user.id)
        .in('exercise_id', exerciseIds);

      if (error) return {};

      // Compute max weight and max volume per exercise from history
      const prMap: Record<string, { maxWeight: number; maxVolume: number }> = {};
      (data || []).forEach((row: any) => {
        const id = row.exercise_id;
        if (!prMap[id]) prMap[id] = { maxWeight: 0, maxVolume: 0 };
        if (row.weight) prMap[id].maxWeight = Math.max(prMap[id].maxWeight, row.weight);
        if (row.weight && row.reps) prMap[id].maxVolume = Math.max(prMap[id].maxVolume, row.weight * row.reps);
      });
      return prMap;
    },
    enabled: !!user?.id && exerciseIds.length > 0,
  });

  // Detect PRs in current session
  const prExercises = useMemo(() => {
    if (!summary || !historicalPRs) return new Set<string>();
    const prs = new Set<string>();
    summary.exercises.forEach(ex => {
      const hist = historicalPRs[ex.exerciseId];
      const completedSets = ex.sets.filter(s => s.completed);
      completedSets.forEach(s => {
        if (!hist) {
          // First time doing this exercise — it's a PR by definition
          if (s.weight && s.weight > 0) prs.add(ex.exerciseId);
          return;
        }
        if (s.weight && s.weight > hist.maxWeight) prs.add(ex.exerciseId);
        if (s.weight && s.reps && (s.weight * s.reps) > hist.maxVolume) prs.add(ex.exerciseId);
      });
    });
    return prs;
  }, [summary, historicalPRs]);

  // ─── Save Mutation ─────────────────────────────
  const saveWorkout = useMutation({
    mutationFn: async () => {
      if (!user?.id || !summary) return;

      const rows: any[] = [];
      summary.exercises.forEach(ex => {
        ex.sets.forEach((s, idx) => {
          if (s.completed) {
            rows.push({
              user_id: user.id,
              workout_id: summary.sessionId,
              exercise_id: ex.exerciseId,
              set_number: idx + 1,
              weight: s.weight,
              reps: s.reps,
              duration: s.duration,
              timestamp: s.timestamp || new Date().toISOString()
            });
          }
        });
      });

      if (rows.length > 0) {
        // 1. Insert Session Metadata
        const { error: sessionError } = await supabase.from('workout_sessions').insert({
          id: summary.sessionId,
          user_id: user.id,
          started_at: new Date(summary.startTime).toISOString(),
          completed_at: new Date(summary.endTime).toISOString(),
          duration: summary.durationMinutes,
          calories: summary.estimatedCalories,
          total_volume: summary.totalVolume
        });

        if (sessionError) {
          console.error('Failed to insert workout session:', sessionError);
          return;
        }

        // 2. Insert Sets
        const { error } = await supabase.from('workout_sets').insert(rows);
        if (error) {
          console.warn('Failed to insert workout sets:', error);
        }
      }

      // 3. Store energy feedback in plan_logs for adaptive engine
      if (energy !== null) {
        await supabase.from('plan_logs').upsert({
          user_id: user.id,
          log_date: toDateString(new Date()),
          energy,
          completed: true,
          difficulty: difficulty || 'medium',
        }, { onConflict: 'user_id, log_date' }).then(({ error }) => {
          if (error) console.warn('Failed to insert plan_log:', error);
        });
      }

      // 4. Upsert exercise history with difficulty for adaptive engine
      if (difficulty) {
        const historyRows = summary.exercises
          .filter(ex => ex.sets.some(s => s.completed))
          .map(ex => {
            const completedSets = ex.sets.filter(s => s.completed);
            const lastSet = completedSets[completedSets.length - 1];
            return {
              exercise_id: ex.exerciseId,
              sets: completedSets.length,
              reps: lastSet?.reps ?? null,
              difficulty: difficulty,
            };
          });
        await upsertExerciseHistory(user.id, historyRows).catch(e =>
          console.warn('Failed to upsert exercise history:', e)
        );
      }

      // 5. Track DAY_COMPLETED event for streak system
      await trackEvent(user.id, 'DAY_COMPLETED', {
        sessionId: summary.sessionId,
        exercisesCompleted: summary.exercisesCompleted,
        totalVolume: summary.totalVolume,
      });
    },
    onSettled: () => {
      // Invalidate ALL relevant queries for fresh data
      queryClient.invalidateQueries({ queryKey: ['historical_weight'] });
      queryClient.invalidateQueries({ queryKey: ['progress_consistency'] });
      queryClient.invalidateQueries({ queryKey: ['progress_muscle_balance'] });
      queryClient.invalidateQueries({ queryKey: ['progress_weekly_volume'] });
      queryClient.invalidateQueries({ queryKey: ['progress_prs'] });
      queryClient.invalidateQueries({ queryKey: ['userEvents'] });
      queryClient.invalidateQueries({ queryKey: ['exerciseHistory'] });
      queryClient.invalidateQueries({ queryKey: ['energyTrend'] });
      clearSession();
      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    }
  });

  const handleDone = () => {
    if (saveWorkout.isPending) return;
    saveWorkout.mutate();
  };

  if (!summary) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={styles.emptyText}>No workout data available.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const completionPct = summary.totalExercises > 0
    ? Math.round((summary.exercisesCompleted / summary.totalExercises) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bgPrimary} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.celebEmoji}>🎉</Text>
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.subtitle}>Great job pushing through. Here's your session summary.</Text>
        </View>

        {/* PR Banner */}
        {prExercises.size > 0 && (
          <View style={styles.prBanner}>
            <Text style={styles.prBannerEmoji}>🏆</Text>
            <Text style={styles.prBannerText}>
              {prExercises.size} Personal Record{prExercises.size > 1 ? 's' : ''} Set!
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatBox emoji="⏱️" value={formatDuration(summary.durationMinutes)} label="Duration" />
            <StatBox emoji="💪" value={summary.exercisesCompleted} label="Exercises" />
          </View>
          <View style={styles.statsRow}>
            <StatBox emoji="🔄" value={summary.setsCompleted} label="Sets" />
            <StatBox emoji="🔥" value={`${summary.estimatedCalories}`} label="Est. Calories" />
          </View>
          <View style={styles.statsRow}>
            <StatBox emoji="⚖️" value={summary.totalVolume > 0 ? `${Math.round(summary.totalVolume).toLocaleString()} lbs` : '—'} label="Total Volume" />
            <StatBox emoji="📊" value={`${completionPct}%`} label="Completion" />
          </View>
        </View>

        <View style={styles.breakdown}>
          <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
          {summary.exercises.map((ex, idx) => {
            const completedSets = ex.sets.filter(s => s.completed);
            const isSkipped = useWorkoutSessionStore.getState().skippedExercises[ex.exerciseId];
            const isPR = prExercises.has(ex.exerciseId);

            return (
              <View key={idx} style={[styles.exRow, isSkipped && styles.exRowSkipped]}>
                <View style={styles.exInfo}>
                  <View style={styles.exNameRow}>
                    <Text style={[styles.exName, isSkipped && styles.textSkipped]}>{ex.exerciseName}</Text>
                    {isPR && <Text style={styles.prBadge}>🏆 PR</Text>}
                  </View>
                  <Text style={[styles.exSets, isSkipped && styles.textSkipped]}>
                    {isSkipped ? 'Skipped' : `${completedSets.length}/${ex.targetSets} sets completed`}
                  </Text>
                </View>
                {!isSkipped && (
                  <Text style={styles.exBadgeText}>
                    {completedSets.length === ex.targetSets ? '✅' : `${completedSets.length}/${ex.targetSets}`}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* ══════ POST-WORKOUT FEEDBACK ══════ */}
        <View style={styles.feedbackSection}>
          <EnergySelector value={energy} onChange={setEnergy} />
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.7} disabled={saveWorkout.isPending}>
          {saveWorkout.isPending ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={styles.doneBtnText}>Save & Return Home</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgPrimary },
  center: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...fonts.body, color: palette.textMuted },
  content: { padding: spacing.screenPadding, paddingBottom: 60 },
  header: { alignItems: 'center', paddingVertical: spacing['3xl'] },
  celebEmoji: { fontSize: 56, marginBottom: 12 },
  title: { ...fonts.programDayTitle, color: palette.textPrimary, marginBottom: 8 },
  subtitle: { ...fonts.body, color: palette.textSecondary, textAlign: 'center', maxWidth: 280 },

  // PR Banner
  prBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.warningLight, borderRadius: radius.card,
    paddingVertical: 14, paddingHorizontal: 20, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: palette.warning + '40',
  },
  prBannerEmoji: { fontSize: 24, marginRight: 8 },
  prBannerText: { ...fonts.sectionHeader, color: '#92400E' },

  statsGrid: { gap: 12, marginBottom: spacing.sectionGap },
  statsRow: { flexDirection: 'row', gap: 12 },
  breakdown: { marginBottom: spacing.sectionGap },
  sectionTitle: { ...fonts.sectionHeader, color: palette.textPrimary, marginBottom: 12 },
  exRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: palette.white, borderRadius: radius.sm, padding: 14,
    marginBottom: 8, ...shadows.card,
  },
  exRowSkipped: { backgroundColor: palette.bgSecondary, opacity: 0.7 },
  exInfo: { flex: 1 },
  exNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  exName: { ...fonts.cardTitle, color: palette.textPrimary },
  textSkipped: { color: palette.textMuted },
  exSets: { ...fonts.caption, color: palette.textSecondary },
  exBadgeText: { fontSize: 18, paddingLeft: 12 },
  prBadge: { ...fonts.badge, color: palette.warning, backgroundColor: palette.warningLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },

  // Feedback
  feedbackSection: { marginBottom: spacing.sectionGap },

  doneBtn: { backgroundColor: palette.primary, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', ...shadows.button },
  doneBtnText: { ...fonts.button, color: palette.white },
});
