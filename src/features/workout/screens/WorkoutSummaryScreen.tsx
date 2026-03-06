/**
 * WorkoutSummaryScreen — Post-Workout Stats Display
 *
 * Shows total workout stats after completing a session:
 * duration, exercises, sets, volume, and estimated calories.
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WorkoutSummary } from '../stores/workoutSessionStore';
import { useWorkoutSessionStore } from '../stores/workoutSessionStore';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

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

  const handleDone = () => {
    clearSession();
    // Navigate to the main tabs (reset the stack)
    navigation.reset({
      index: 0,
      routes: [{ name: 'AppTabs' }],
    });
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
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bgPrimary} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Celebration Header */}
        <View style={styles.header}>
          <Text style={styles.celebEmoji}>🎉</Text>
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.subtitle}>Great job pushing through. Here's your session summary.</Text>
        </View>

        {/* Stats Grid */}
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

        {/* Exercise Breakdown */}
        <View style={styles.breakdown}>
          <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
          {summary.exercises.map((ex, idx) => {
            const completedSets = ex.sets.filter(s => s.completed);
            return (
              <View key={idx} style={styles.exRow}>
                <View style={styles.exInfo}>
                  <Text style={styles.exName}>{ex.exerciseName}</Text>
                  <Text style={styles.exSets}>
                    {completedSets.length}/{ex.targetSets} sets completed
                  </Text>
                </View>
                <View style={styles.exBadge}>
                  <Text style={styles.exBadgeText}>
                    {completedSets.length === ex.targetSets ? '✅' : `${completedSets.length}/${ex.targetSets}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Done Button */}
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.7}>
          <Text style={styles.doneBtnText}>Save & Return Home</Text>
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

  // Header
  header: { alignItems: 'center', paddingVertical: spacing['3xl'] },
  celebEmoji: { fontSize: 56, marginBottom: 12 },
  title: { ...fonts.programDayTitle, color: palette.textPrimary, marginBottom: 8 },
  subtitle: { ...fonts.body, color: palette.textSecondary, textAlign: 'center', maxWidth: 280 },

  // Stats
  statsGrid: { gap: 12, marginBottom: spacing.sectionGap },
  statsRow: { flexDirection: 'row', gap: 12 },

  // Breakdown
  breakdown: { marginBottom: spacing.sectionGap },
  sectionTitle: { ...fonts.sectionHeader, color: palette.textPrimary, marginBottom: 12 },
  exRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: palette.white, borderRadius: radius.sm, padding: 14,
    marginBottom: 8, ...shadows.card,
  },
  exInfo: { flex: 1 },
  exName: { ...fonts.cardTitle, color: palette.textPrimary, marginBottom: 2 },
  exSets: { ...fonts.caption, color: palette.textSecondary },
  exBadge: { paddingLeft: 12 },
  exBadgeText: { fontSize: 18 },

  // Done
  doneBtn: {
    backgroundColor: palette.primary, borderRadius: radius.sm,
    paddingVertical: 16, alignItems: 'center',
    ...shadows.button,
  },
  doneBtnText: { ...fonts.button, color: palette.white },
});
