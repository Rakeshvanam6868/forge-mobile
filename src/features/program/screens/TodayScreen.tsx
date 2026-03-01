import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert, Animated as RNAnimated,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useAdaptiveDay } from '../hooks/useAdaptiveDay';
import { upsertExerciseHistory } from '../services/exerciseHistoryQueries';
import { Difficulty, AdaptedWorkout } from '../services/adaptiveEngine';
import { useRetention } from '../../retention/hooks/useRetention';
import { AuthButton } from '../../auth/components/AuthButton';
import { Badge } from '../../../core/components/Badge';
import { PrimaryCard } from '../../../core/components/PrimaryCard';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GradientCard } from '../../../core/components/GradientCard';
import { GreetingHeader } from '../../../core/components/GreetingHeader';
import { CelebrationOverlay } from '../../../core/components/CelebrationOverlay';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { SCROLL_BOTTOM_PADDING } from '../../../core/theme/layout';

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
const FOCUS_ICONS: Record<string, string> = { strength: '💪', cardio: '🏃', mobility: '🧘', rest: '😴' };
const MEAL_EMOJI: Record<string, string> = { breakfast: '🌅', lunch: '☀️', snack: '🍎', dinner: '🌙' };
const MEAL_ADJUSTMENT_LABELS: Record<string, string> = {
  calorie_up: '⬆️ +150 cal (muscle gain boost)',
  calorie_down: '⬇️ -150 cal (rest day cut)',
  none: '',
};

export const TodayScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { adaptiveState, isLoading, completeToday } = useAdaptiveDay();
  const { logEvent } = useRetention();
  const [energyLevel, setEnergyLevel] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showCelebration, setShowCelebration] = useState(false);
  const justCompleted = useRef(false);

  useEffect(() => {
    if (adaptiveState?.programDay) logEvent('DAY_VIEWED', { programDay: adaptiveState.programDay });
  }, [adaptiveState?.programDay]);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exerciseHistory', user?.id] }),
  });

  const handleDone = useCallback(() => {
    if (completeToday.isPending || saveHistory.isPending) return;
    completeToday.mutate(energyLevel, {
      onSuccess: () => {
        justCompleted.current = true;
        setShowCelebration(true);
        saveHistory.mutate();
        // Auto-dismiss celebration after 3 seconds
        setTimeout(() => setShowCelebration(false), 3000);
      },
      onError: (error: any) => Alert.alert('Error completing today', error.message),
    });
  }, [completeToday, saveHistory, energyLevel, difficulty]);

  const handleSkip = () =>
    Alert.alert('Skip Today?', 'Skipping will break your streak.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip', style: 'destructive', onPress: () => {} },
    ]);

  if (isLoading || !adaptiveState) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  const { dayDetail, adaptivePlan, adaptedWorkouts, programDay, currentWeekNumber, dayNumberInWeek } = adaptiveState;

  if (!dayDetail) {
    return <View style={[styles.screen, styles.center]}><Text style={styles.emptyText}>No program found. Complete onboarding first.</Text></View>;
  }

  return (
    <View style={styles.screen}>
      {/* 🎉 Celebration overlay */}
      <CelebrationOverlay
        visible={showCelebration}
        streak={adaptiveState.streak}
        message={`Day ${programDay} Complete!`}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 👋 Greeting */}
        <GreetingHeader />

        {/* ══════ HERO: Adaptive Intelligence (gradient) ══════ */}
        {adaptivePlan.systemMessage ? (
          <GradientCard colors={['#1E293B', '#2D3A4F']} style={styles.heroCustom}>
            <View style={styles.heroInner}>
              <View style={styles.heroIconWrap}>
                <Text style={styles.heroIcon}>🧠</Text>
              </View>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroMessage}>{adaptivePlan.systemMessage}</Text>
                <View style={styles.heroBadges}>
                  <Badge label={adaptivePlan.intensity.toUpperCase()} variant="dark" />
                  {adaptivePlan.recoveryMode && <Badge label="RECOVERY" variant="dark" />}
                </View>
              </View>
            </View>
          </GradientCard>
        ) : null}

        {/* Streak reset warning */}
        {!adaptiveState.todayCompleted && adaptiveState.missedYesterday && (
          <View style={styles.warningBanner}>
            <View style={styles.iconWrap}><Text style={styles.iconInner}>⚡</Text></View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Streak reset</Text>
              <Text style={styles.warningText}>You missed a day — start fresh today.</Text>
            </View>
          </View>
        )}

        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.headerCaption}>PROGRAM DAY {programDay}</Text>
          <Text style={styles.headerTitle}>{FOCUS_ICONS[dayDetail.focusType] || '📋'}  {dayDetail.title}</Text>
          <Text style={styles.headerMeta}>Week {currentWeekNumber} · Day {dayNumberInWeek}</Text>
        </View>

        {/* ══════ WORKOUTS ══════ */}
        <SectionBlock title="Workout">
          {adaptedWorkouts.map((w: AdaptedWorkout, i: number) => (
            <PrimaryCard key={w.id} state={w.isAdapted ? 'adapted' : 'default'} accentColor={w.isAdapted ? palette.accentAmber : undefined}>
              <View style={styles.exerciseRow}>
                <View style={styles.stepCircle}><Text style={styles.stepNum}>{i + 1}</Text></View>
                <View style={styles.exerciseBody}>
                  <View style={styles.exerciseNameRow}>
                    <Text style={styles.exerciseName} numberOfLines={2}>{w.exercise_name}</Text>
                    {w.isAdapted && <Badge label="ADAPTED" variant="warning" />}
                  </View>
                  <Text style={styles.exerciseSets}>
                    {w.adaptedSets ? `${w.adaptedSets} sets` : ''}
                    {w.adaptedReps && w.adaptedReps !== '—' ? ` × ${w.adaptedReps}` : ''}
                    {w.duration ? ` · ${w.duration}` : ''}
                  </Text>
                  {w.isAdapted && (
                    <Text style={styles.exerciseBase}>
                      Base: {w.sets ? `${w.sets} sets` : ''}{w.reps && w.reps !== '—' ? ` × ${w.reps}` : ''}
                    </Text>
                  )}
                </View>
              </View>
            </PrimaryCard>
          ))}
        </SectionBlock>

        {/* ══════ MEALS ══════ */}
        <SectionBlock title="Meals">
          {adaptivePlan.mealAdjustment !== 'none' && (
            <View style={styles.mealAdjustBanner}>
              <Text style={styles.mealAdjustText}>{MEAL_ADJUSTMENT_LABELS[adaptivePlan.mealAdjustment]}</Text>
            </View>
          )}
          {dayDetail.meals.length === 0 ? (
            <PrimaryCard><Text style={styles.emptyText}>No meals for today.</Text></PrimaryCard>
          ) : (
            dayDetail.meals.map((m) => (
              <PrimaryCard key={m.id}>
                <View style={styles.mealRow}>
                  <View style={styles.iconWrap}><Text style={styles.iconInner}>{MEAL_EMOJI[m.meal_type] || '🍽️'}</Text></View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealType}>{m.meal_type.charAt(0).toUpperCase() + m.meal_type.slice(1)}</Text>
                    <Text style={styles.mealTitle}>{m.title}</Text>
                    {m.description ? <Text style={styles.mealDesc}>{m.description}</Text> : null}
                  </View>
                </View>
              </PrimaryCard>
            ))
          )}
        </SectionBlock>

        {/* ══════ COMPLETION / ACTIONS ══════ */}
        {adaptiveState.todayCompleted ? (
          <GradientCard colors={['#166534', '#15803D']} style={styles.completionCard}>
            <View style={styles.completionContent}>
              <Text style={styles.completionFlame}>🔥</Text>
              <Text style={styles.completionNum}>{adaptiveState.streak}</Text>
              <Text style={styles.completionTitle}>Day {programDay} Complete</Text>
              <Text style={styles.completionSub}>{adaptiveState.streak} day streak 🏆</Text>
            </View>
          </GradientCard>
        ) : (
          <View style={styles.actionSection}>
            {renderFeedback('How was this workout?', DIFFICULTIES.map((d) => ({ key: d.value, emoji: d.emoji, label: d.label })), difficulty, setDifficulty)}
            {renderFeedback('How is your energy?', ENERGIES.map((e) => ({ key: String(e.level), emoji: e.emoji, label: e.label })), String(energyLevel), (v: string) => setEnergyLevel(parseInt(v, 10)))}
            <AuthButton title={completeToday.isPending || saveHistory.isPending ? 'Saving...' : 'Complete Day'} onPress={handleDone} disabled={completeToday.isPending || saveHistory.isPending} />
            <AuthButton title="Skip Today" onPress={handleSkip} variant="outline" />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function renderFeedback(title: string, items: { key: string; emoji: string; label: string }[], selected: string, onSelect: (val: any) => void) {
  return (
    <View style={styles.fbBlock}>
      <Text style={styles.fbTitle}>{title}</Text>
      <View style={styles.fbRow}>
        {items.map((it) => (
          <TouchableOpacity key={it.key} style={[styles.fbBtn, selected === it.key && styles.fbBtnActive]} onPress={() => onSelect(it.key)} activeOpacity={0.8}>
            <Text style={styles.fbEmoji}>{it.emoji}</Text>
            <Text style={[styles.fbLabel, selected === it.key && styles.fbLabelActive]}>{it.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgPrimary },
  scrollView: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.screenPadding, paddingTop: 56, paddingBottom: SCROLL_BOTTOM_PADDING },
  emptyText: { ...fonts.body, color: palette.textMuted },

  // Hero
  heroCustom: { paddingVertical: spacing['2xl'], paddingHorizontal: spacing['2xl'] },
  heroInner: { flexDirection: 'row', alignItems: 'flex-start' },
  heroIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.innerMd,
  },
  heroIcon: { fontSize: 20 },
  heroTextBlock: { flex: 1 },
  heroMessage: { ...fonts.body, color: palette.textOnDark, lineHeight: 22 },
  heroBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.innerMd },

  // Warning
  warningBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: palette.warningSoft, borderRadius: radius.inner,
    padding: spacing.lg, marginBottom: spacing.cardGap,
  },
  warningContent: { flex: 1, marginLeft: spacing.innerMd },
  warningTitle: { ...fonts.cardTitle, color: '#92400E' },
  warningText: { ...fonts.body, color: '#A16207', marginTop: 2 },

  // Icon
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: palette.iconTint,
    alignItems: 'center', justifyContent: 'center',
  },
  iconInner: { fontSize: 20 },

  // Header
  headerBlock: { marginBottom: spacing.innerSm },
  headerCaption: { ...fonts.badge, color: palette.primary, marginBottom: spacing.xs },
  headerTitle: { ...fonts.programDayTitle, color: palette.textPrimary },
  headerMeta: { ...fonts.label, color: palette.textMuted, marginTop: spacing.innerSm },

  // Exercise
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.innerMd,
  },
  stepNum: { ...fonts.label, color: palette.white, fontWeight: '600' },
  exerciseBody: { flex: 1 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  exerciseName: { ...fonts.cardTitle, color: palette.textPrimary, flexShrink: 1 },
  exerciseSets: { ...fonts.body, color: palette.textSecondary, marginTop: 2 },
  exerciseBase: { ...fonts.caption, color: palette.textMuted, marginTop: 2, fontStyle: 'italic' },

  // Meals
  mealAdjustBanner: {
    backgroundColor: palette.warningSoft, borderRadius: radius.inner,
    padding: spacing.innerMd, marginBottom: spacing.cardGap,
  },
  mealAdjustText: { ...fonts.bodyMedium, color: '#C2410C', textAlign: 'center' },
  mealRow: { flexDirection: 'row', alignItems: 'center' },
  mealInfo: { flex: 1, marginLeft: spacing.innerMd },
  mealType: { ...fonts.caption, color: palette.textMuted, textTransform: 'uppercase' },
  mealTitle: { ...fonts.cardTitle, color: palette.textPrimary, marginTop: 1 },
  mealDesc: { ...fonts.body, color: palette.textMuted, marginTop: 2 },

  // Completion (gradient green)
  completionCard: { marginTop: spacing.sectionGap },
  completionContent: { alignItems: 'center' },
  completionFlame: { fontSize: 44, marginBottom: spacing.innerSm },
  completionNum: { ...fonts.heroNumber, color: palette.white },
  completionTitle: { ...fonts.sectionHeader, color: 'rgba(255,255,255,0.85)', marginTop: spacing.innerSm },
  completionSub: { ...fonts.body, color: 'rgba(255,255,255,0.55)', marginTop: spacing.xs },

  // Actions
  actionSection: {
    marginTop: spacing.sectionGap, paddingTop: spacing['2xl'],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.borderSubtle,
  },
  fbBlock: { marginBottom: spacing.xl },
  fbTitle: { ...fonts.cardTitle, color: palette.textPrimary, textAlign: 'center', marginBottom: spacing.innerMd },
  fbRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.innerMd },
  fbBtn: {
    alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.innerMd,
    borderRadius: radius.inner, backgroundColor: palette.bgSecondary,
    width: 94, minHeight: 84, ...shadows.level1,
  },
  fbBtnActive: { backgroundColor: palette.bgElevated, ...shadows.focus },
  fbEmoji: { fontSize: 26, marginBottom: spacing.xs },
  fbLabel: { ...fonts.caption, color: palette.textMuted },
  fbLabelActive: { color: palette.primary },
});
