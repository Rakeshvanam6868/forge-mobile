import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useCurrentProgram } from '../hooks/useProgram';
import { useCurrentWeek, ProgramDay } from '../hooks/useWeekPlan';
import { useDayDetail } from '../hooks/useDayDetail';
import { useProgramState } from '../../home/hooks/useProgramState';
import { AuthButton } from '../../auth/components/AuthButton';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';

const ENERGIES = [
  { level: 1, emoji: '😫', label: 'Low' },
  { level: 2, emoji: '😐', label: 'Average' },
  { level: 3, emoji: '🤩', label: 'High' },
];

const FOCUS_ICONS: Record<string, string> = {
  strength: '💪',
  cardio: '🏃',
  mobility: '🧘',
  rest: '😴',
};

export const TodayScreen = () => {
  const { data: program, isLoading: progLoading } = useCurrentProgram();
  const { state, isLoading: stateLoading, completeToday } = useProgramState();
  const [energyLevel, setEnergyLevel] = useState(2);

  // Pure progress from logs — NOT from local state
  const { programDay, currentWeekNumber, dayNumberInWeek } = state?.progress ?? {
    programDay: 1,
    currentWeekNumber: 1,
    dayNumberInWeek: 1,
  };

  // Fetch program_week by week_number, then find program_day by day_number
  const { data: weekData, isLoading: weekLoading } = useCurrentWeek(program?.id, currentWeekNumber);

  const currentDay: ProgramDay | undefined = weekData?.days.find(
    (d) => d.day_number === dayNumberInWeek
  );

  const { data: dayDetail, isLoading: dayLoading } = useDayDetail(currentDay?.id);

  const handleDone = () => {
    if (completeToday.isPending) return;
    completeToday.mutate(energyLevel, {
      onError: (error: any) => {
        Alert.alert('Error completing today', error.message);
      },
    });
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Today?',
      'Skipping will break your streak. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: () => {
          // No DB write. The absence of a log for today
          // is what "skip" means. Tomorrow, missedYesterday = true.
          // programDay does NOT advance.
        }},
      ]
    );
  };

  // Loading
  if (progLoading || stateLoading || weekLoading || dayLoading || !state) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dayDetail) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>No program found. Complete onboarding first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
      {dayDetail.workouts.map((w, i) => (
        <View key={w.id} style={styles.card}>
          <View style={styles.exerciseRow}>
            <Text style={styles.exerciseNumber}>{i + 1}</Text>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{w.exercise_name}</Text>
              <Text style={styles.exerciseDetail}>
                {w.sets ? `${w.sets} sets` : ''}
                {w.reps && w.reps !== '—' ? ` × ${w.reps}` : ''}
                {w.duration ? ` · ${w.duration}` : ''}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* Meals Section */}
      <Text style={styles.sectionTitle}>Meals</Text>
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

      {/* Completion */}
      {state.todayCompleted ? (
        <View style={styles.completedBox}>
          <Text style={styles.completedTitle}>✅ Day Complete</Text>
          <Text style={styles.completedText}>Great job! See you tomorrow.</Text>
        </View>
      ) : (
        <View style={styles.actionSection}>
          <Text style={styles.actionTitle}>How is your energy today?</Text>
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
            title={completeToday.isPending ? 'Saving...' : 'Complete Day'}
            onPress={handleDone}
            disabled={completeToday.isPending}
          />
          <View style={{ height: 12 }} />
          <AuthButton
            title="Skip Today"
            onPress={handleSkip}
            variant="outline"
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerLabel: { ...typography.bodySmall, color: colors.primary, fontWeight: '600', marginBottom: 4 },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { ...typography.h2, fontSize: 18, color: colors.text, marginTop: 24, marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  exerciseNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, color: '#FFF',
    textAlign: 'center', lineHeight: 28,
    fontSize: 13, fontWeight: '700', marginRight: 12,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...typography.body, color: colors.text, fontWeight: '600' },
  exerciseDetail: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  mealType: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  mealTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  mealDesc: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  emptyText: { ...typography.body, color: colors.textSecondary },
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
