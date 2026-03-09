/**
 * WorkoutSummaryScreen — Post-Workout Stats Display
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WorkoutSummary, useWorkoutSessionStore } from '../stores/workoutSessionStore';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { useAuth } from '../../auth/hooks/useAuth';
import { supabase } from '../../../core/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator } from 'react-native';

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

export const WorkoutSummaryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clearSession = useWorkoutSessionStore(s => s.clearSession);
  const summary: WorkoutSummary | null = route.params?.summary ?? null;

  const { user } = useAuth();
  const queryClient = useQueryClient();

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
        const { error } = await supabase.from('workout_sets').insert(rows);
        if (error) {
          console.warn('Failed to insert workout sets:', error);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['historical_weight'] });
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

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bgPrimary} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.celebEmoji}>🎉</Text>
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.subtitle}>Great job pushing through. Here's your session summary.</Text>
        </View>

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
            <StatBox emoji="📊" value={`${summary.exercisesCompleted}/${summary.totalExercises}`} label="Completion" />
          </View>
        </View>

        <View style={styles.breakdown}>
          <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
          {summary.exercises.map((ex, idx) => {
            const completedSets = ex.sets.filter(s => s.completed);
            
            // To check if this exercise was skipped, we need to read from the store state.
            // But since the summary takes a snapshot, we could also pass skippedExercises in the summary payload.
            // Let's modify the store to include skippedExercises in the WorkoutSummary.
            // For now, we'll read it straight from the store.
            const isSkipped = useWorkoutSessionStore.getState().skippedExercises[ex.exerciseId];
            
            return (
              <View key={idx} style={[styles.exRow, isSkipped && styles.exRowSkipped]}>
                <View style={styles.exInfo}>
                  <Text style={[styles.exName, isSkipped && styles.textSkipped]}>{ex.exerciseName}</Text>
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
  exName: { ...fonts.cardTitle, color: palette.textPrimary, marginBottom: 2 },
  textSkipped: { color: palette.textMuted },
  exSets: { ...fonts.caption, color: palette.textSecondary },
  exBadgeText: { fontSize: 18, paddingLeft: 12 },
  doneBtn: { backgroundColor: palette.primary, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', ...shadows.button },
  doneBtnText: { ...fonts.button, color: palette.white },
});
