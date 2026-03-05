import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert, Modal, Pressable
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// import exercisesData from '../data/exercises.json'; // Replaced by useExerciseDetail
import { useAuth } from '../../auth/hooks/useAuth';
import { useAdaptiveDay } from '../hooks/useAdaptiveDay';
import { upsertExerciseHistory } from '../services/exerciseHistoryQueries';
import { Difficulty, AdaptedWorkout } from '../services/adaptiveEngine';
import { useRetention } from '../../retention/hooks/useRetention';
import { useExerciseDetail } from '../hooks/useExerciseDetail';
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

function getRecoveryInsight(difficulty: string | null, energy: number | null): string {
  if (!difficulty || !energy) return "Adaptive load will measure your next session based on today's effort.";
  if (difficulty === 'hard' && energy === 1) return "You pushed hard today on low energy! Your body will need extra fuel and deep rest to recover adequately.";
  if (difficulty === 'hard') return "High intensity effort! Tomorrow's routine is dynamically adjusting to ensure you don't overtrain.";
  if (difficulty === 'easy' && energy === 3) return "Great energy today! We'll slightly increase the challenge in your next session to keep you progressing.";
  if (energy <= 1) return "Low energy detected. Consider focusing on hydration and sleep tonight before your next workout.";
  return "Solid session. Your baseline is steady and tomorrow's target is locked in.";
}

export const TodayScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { adaptiveState, lifecycleState: hookLifecycle, isLoading, isError: hookIsError, completeToday } = useAdaptiveDay();
  const { logEvent } = useRetention();
  
  const [energyLevel, setEnergyLevel] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [strengthRating, setStrengthRating] = useState<number | null>(null);
  const [pumpRating, setPumpRating] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const exerciseDetail = useExerciseDetail(selectedExercise);
  const justCompleted = useRef(false);

  // Fallback timeout to prevent infinite loading loop (especially Day 2 issue)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isLoading) {
      console.log('[TodayScreen] Fetching session started...');
      timeoutId = setTimeout(() => {
        setLoadError('Session could not be loaded. Please check your connection or try restarting the app.');
        console.warn('[TodayScreen] Loader timeout hit! Session generation might have failed.');
      }, 5000);
    } else {
      setLoadError(null);
    }
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  useEffect(() => {
    if (adaptiveState?.workoutType) logEvent('DAY_VIEWED', { workoutType: adaptiveState.workoutType });
  }, [adaptiveState?.workoutType, logEvent]);

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
    if (completeToday.isPending || saveHistory.isPending || !adaptiveState) return;
    
    completeToday.mutate({
      energyLevel,
      difficulty,
      programDayNumber: adaptiveState.currentProgramDay,
    }, {
      onSuccess: () => {
        justCompleted.current = true;
        setShowCelebration(true);
        saveHistory.mutate();
        setTimeout(() => setShowCelebration(false), 3000);
      },
      onError: (error: any) => Alert.alert('Error completing today', error.message),
    });
  }, [completeToday, saveHistory, energyLevel, difficulty, adaptiveState]);

  if (loadError || hookIsError) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
        <Text style={[styles.emptyText, { textAlign: 'center', paddingHorizontal: 32 }]}>
          {loadError || 'An error occurred while loading your session.'}
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: palette.primary, borderRadius: 8 }}
          onPress={() => {
            setLoadError(null);
            queryClient.invalidateQueries({ queryKey: ['programStructure'] });
            queryClient.invalidateQueries({ queryKey: ['userEvents'] });
            queryClient.invalidateQueries({ queryKey: ['dayDetail'] });
          }}
        >
          <Text style={{ color: palette.white, fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  if (hookLifecycle === 'NOT_STARTED' || !adaptiveState || !adaptiveState.dayDetail) {
    return <View style={[styles.screen, styles.center]}><Text style={styles.emptyText}>No program found. Complete onboarding first.</Text></View>;
  }

  const { dayDetail, adaptivePlan, adaptedWorkouts, workoutType, uiLabel, uiSubLabel, lifecycleState, nextTrainingDateString } = adaptiveState;

  // Pure UI Conditional Sub-renders based on State Machine:
  const renderWorkoutSection = () => {
    const warmupBlocks = dayDetail.blocks?.filter((b: any) => b.type === 'warmup') || [];

    return (
    <>
      {warmupBlocks.map((block: any, bi: number) => (
        <SectionBlock key={`warmup-${bi}`} title={block.title || 'Warm-up'}>
          <PrimaryCard>
            <View style={styles.warmupCardInner}>
              {block.exercises.map((ex: any, ei: number) => (
                <View key={`ex-${ei}`} style={styles.warmupRow}>
                  <Text style={styles.warmupDot}>•</Text>
                  <Text style={styles.warmupText}>
                    <Text style={styles.warmupName}>{ex.name}</Text>
                    {ex.duration ? ` - ${ex.duration}` : ''}
                    {ex.sets || ex.reps ? ` - ` : ''}
                    {ex.sets ? `${ex.sets} sets ` : ''}
                    {ex.reps ? `× ${ex.reps}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </PrimaryCard>
        </SectionBlock>
      ))}

      <SectionBlock title="Workout">
        {adaptedWorkouts.map((w: AdaptedWorkout, i: number) => {
          // console.log('[TodayScreen] Rendering Exercise Row:', w);
          return (
          <TouchableOpacity key={w.id} activeOpacity={0.8} onPress={() => setSelectedExercise(w.exercise_name)}>
            <PrimaryCard state={w.isAdapted ? 'adapted' : 'default'} accentColor={w.isAdapted ? palette.accentAmber : undefined}>
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
                    {w.restSec ? ` · ${w.restSec}s rest` : ''}
                  </Text>
                  
                  {/* NEW AI DATA FIELDS */}
                  {(w.load || w.cue) && (
                    <View style={styles.aiMetaRow}>
                      {w.load && (
                        <View style={styles.aiMetaBadge}>
                          <Text style={styles.aiMetaBadgeText}>⚖️ {w.load}</Text>
                        </View>
                      )}
                      {w.cue && (
                        <Text style={styles.aiCueText} numberOfLines={1}>💡 {w.cue}</Text>
                      )}
                    </View>
                  )}

                  {w.progression && (
                    <View style={styles.progressionBox}>
                      <Text style={styles.progressionText}>↑ Next: {w.progression}</Text>
                    </View>
                  )}
                </View>
              </View>
            </PrimaryCard>
          </TouchableOpacity>
        )})}
      </SectionBlock>

      <View style={styles.actionSection}>
        {renderFeedback('How was this workout?', DIFFICULTIES.map((d) => ({ key: d.value, emoji: d.emoji, label: d.label })), difficulty, setDifficulty)}
        {renderFeedback('How is your energy?', ENERGIES.map((e) => ({ key: String(e.level), emoji: e.emoji, label: e.label })), String(energyLevel), (v: string) => setEnergyLevel(parseInt(v, 10)))}
        {/* {renderRating('Strength Rating (1-10)', strengthRating, setStrengthRating)}
        {renderRating('Pump Rating (1-10)', pumpRating, setPumpRating)} */}
        <AuthButton title={completeToday.isPending || saveHistory.isPending ? 'Saving...' : 'Complete Day'} onPress={handleDone} disabled={completeToday.isPending || saveHistory.isPending} />
      </View>
    </>
    );
  };

  const renderCompletedState = () => (
    <View style={styles.completedContainer}>
      <GradientCard colors={['#166534', '#15803D']} style={styles.completionCard}>
        <View style={styles.completionContent}>
          <Text style={styles.completionFlame}>🔥</Text>
          <Text style={styles.completionTitle}>Session Finished</Text>
          <Text style={styles.completionSub}>You crushed today's target.</Text>
        </View>
      </GradientCard>
      
      <View style={styles.insightBox}>
        <Text style={styles.heroIcon}>🧠</Text>
        <Text style={styles.insightText}>Recovery Insight:</Text>
        <Text style={styles.insightValue}>
          {getRecoveryInsight(
            adaptiveState.lastCompletedSession?.difficulty || null,
            adaptiveState.lastCompletedSession?.energy || null
          )}
        </Text>
      </View>

      <View style={styles.nextDateBox}>
        <Text style={styles.nextDateLabel}>Next session</Text>
        <Text style={styles.nextDateValue}>{nextTrainingDateString}</Text>
        {lifecycleState !== 'RECOVERY_DAY' && (
          <Text style={styles.nextDatePreview}>Preview: {FOCUS_ICONS[workoutType]} {dayDetail.title}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <CelebrationOverlay
        visible={showCelebration}
        streak={1} // To be connected to Analytics
        message="Session Complete!"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreetingHeader />

        {lifecycleState === 'MISSED_TRAINING_DAY' && (
          <View style={styles.warningBanner}>
            <View style={styles.iconWrapWarning}><Text style={styles.iconInner}>⚠️</Text></View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Missed Session</Text>
              <Text style={styles.warningText}>You missed your scheduled day. Catch up on this workout to protect your sequence.</Text>
            </View>
          </View>
        )}

        {lifecycleState === 'RECOVERY_DAY' && (
          <View style={styles.infoBanner}>
            <View style={styles.iconWrapInfo}><Text style={styles.iconInner}>🧘</Text></View>
            <View style={styles.warningContent}>
              <Text style={styles.infoTitle}>Recovery Day</Text>
              <Text style={styles.infoText}>Your body grows while resting. Next session is {nextTrainingDateString}.</Text>
            </View>
          </View>
        )}

        {adaptivePlan.systemMessage && lifecycleState !== 'SESSION_COMPLETED_TODAY' ? (
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

        {lifecycleState !== 'SESSION_COMPLETED_TODAY' && (
          <View style={styles.headerBlock}>
            <Text style={styles.headerCaption}>UPCOMING SESSION</Text>
            <Text style={styles.headerTitle}>{FOCUS_ICONS[workoutType] || '📋'}  {dayDetail.title}</Text>
            <Text style={styles.headerMeta}>{uiSubLabel}</Text>
          </View>
        )}

        {/* STRICT STATE SWITCH */}
        {lifecycleState === 'SESSION_COMPLETED_TODAY' 
          ? renderCompletedState() 
          : lifecycleState === 'RECOVERY_DAY'
            ? null // Just show the top info banner for recovery days
            : renderWorkoutSection()
        }

        {/* MEALS - Only show if not completed today, and usually on rest days they have specific meal plans too */}
        {lifecycleState !== 'SESSION_COMPLETED_TODAY' && (
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
        )}
      </ScrollView>

      {/* Exercise Detail Modal */}
      <Modal visible={!!selectedExercise} animationType="slide" transparent={true} onRequestClose={() => setSelectedExercise(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedExercise(null)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectedExercise}</Text>
              <TouchableOpacity onPress={() => setSelectedExercise(null)} hitSlop={10}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {(() => {
                const details = exerciseDetail.data;

                if (!details) {
                  return null; // Empty section if no data per requirements
                }

                return (
                  <>
                    <View style={styles.tagWrap}>
                      <View style={styles.muscleTag}><Text style={styles.muscleTagText}>{details.primaryMuscle}</Text></View>
                    </View>
                    
                    <Text style={styles.sectionHeader}>How to perform</Text>
                    <View style={styles.stepsWrap}>
                      {details.steps.map((step: string, index: number) => (
                        <View key={index} style={styles.stepRow}>
                          <Text style={styles.stepDot}>•</Text>
                          <Text style={styles.stepText}>{step}</Text>
                        </View>
                      ))}
                    </View>

                    {details.formCues && details.formCues.length > 0 && (
                      <>
                        <Text style={styles.sectionHeader}>Form Cues</Text>
                        <View style={styles.stepsWrap}>
                          {details.formCues.map((cue: string, index: number) => (
                            <View key={index} style={styles.stepRow}>
                              <Text style={styles.stepDot}>💡</Text>
                              <Text style={styles.stepText}>{cue}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {details.beginnerLoadTip && (
                      <>
                        <Text style={styles.sectionHeader}>Beginner Weight Selection</Text>
                        <View style={styles.tipBox}>
                          <Text style={styles.tipIcon}>⚖️</Text>
                          <Text style={styles.tipText}>{details.beginnerLoadTip}</Text>
                        </View>
                      </>
                    )}

                    {details.commonMistakes && details.commonMistakes.length > 0 && (
                      <>
                        <Text style={styles.sectionHeader}>Common Mistakes</Text>
                        <View style={styles.stepsWrap}>
                          {details.commonMistakes.map((mistake: string, index: number) => (
                            <View key={index} style={styles.stepRow}>
                              <Text style={styles.stepDot}>⚠️</Text>
                              <Text style={styles.stepText}>{mistake}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </>
                );
              })()}
              <View style={{height: 40}} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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

function renderRating(title: string, value: number | null, onSelect: (val: number) => void) {
  return (
    <View style={styles.ratingBlock}>
      <Text style={styles.fbTitle}>{title}</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <TouchableOpacity key={num} style={[styles.ratingBtn, value === num && styles.ratingBtnActive]} onPress={() => onSelect(num)} activeOpacity={0.8}>
            <Text style={[styles.ratingLabel, value === num && styles.ratingLabelActive]}>{num}</Text>
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
  heroCustom: { paddingVertical: spacing['2xl'], paddingHorizontal: spacing['2xl'], marginBottom: spacing.lg },
  heroInner: { flexDirection: 'row', alignItems: 'flex-start' },
  heroIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.innerMd },
  heroIcon: { fontSize: 20 },
  heroTextBlock: { flex: 1 },
  heroMessage: { ...fonts.body, color: palette.textOnDark, lineHeight: 22 },
  heroBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.innerMd },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.iconTint, alignItems: 'center', justifyContent: 'center' },
  iconWrapWarning: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  iconWrapInfo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  iconInner: { fontSize: 20 },
  headerBlock: { marginBottom: spacing.innerSm, marginTop: spacing.innerMd },
  headerCaption: { ...fonts.badge, color: palette.primary, marginBottom: spacing.xs },
  headerTitle: { ...fonts.programDayTitle, color: palette.textPrimary },
  headerMeta: { ...fonts.label, color: palette.textMuted, marginTop: spacing.innerSm },
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.innerMd },
  stepNum: { ...fonts.label, color: palette.white, fontWeight: '600' },
  exerciseBody: { flex: 1 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  exerciseName: { ...fonts.cardTitle, color: palette.textPrimary, flexShrink: 1 },
  exerciseSets: { ...fonts.body, color: palette.textSecondary, marginTop: 2 },
  
  // AI Optional Fields Styles
  aiMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, flexWrap: 'wrap', gap: spacing.sm },
  aiMetaBadge: { backgroundColor: palette.bgSecondary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.inner },
  aiMetaBadgeText: { ...fonts.caption, color: palette.textPrimary },
  aiCueText: { ...fonts.caption, color: palette.textMuted, flexShrink: 1, fontStyle: 'italic' },
  progressionBox: { backgroundColor: palette.primarySoft, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.inner, marginTop: spacing.xs },
  progressionText: { ...fonts.caption, color: palette.primary, fontWeight: '600' },

  // Warm-up Block Styles
  warmupCardInner: { paddingVertical: spacing.xs },
  warmupRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  warmupDot: { ...fonts.body, color: palette.primary, marginRight: spacing.sm, fontSize: 18, lineHeight: 22 },
  warmupText: { ...fonts.body, color: palette.textSecondary, flex: 1, lineHeight: 22 },
  warmupName: { color: palette.textPrimary, fontWeight: '500' },

  mealAdjustBanner: { backgroundColor: palette.warningSoft, borderRadius: radius.inner, padding: spacing.innerMd, marginBottom: spacing.cardGap },
  mealAdjustText: { ...fonts.bodyMedium, color: '#C2410C', textAlign: 'center' },
  mealRow: { flexDirection: 'row', alignItems: 'center' },
  mealInfo: { flex: 1, marginLeft: spacing.innerMd },
  mealType: { ...fonts.caption, color: palette.textMuted, textTransform: 'uppercase' },
  mealTitle: { ...fonts.cardTitle, color: palette.textPrimary, marginTop: 1 },
  mealDesc: { ...fonts.body, color: palette.textMuted, marginTop: 2 },
  
  // States
  completedContainer: { marginTop: spacing.sectionGap },
  completionCard: { paddingVertical: spacing['2xl'] },
  completionContent: { alignItems: 'center' },
  completionFlame: { fontSize: 44, marginBottom: spacing.innerSm },
  completionTitle: { ...fonts.sectionHeader, color: 'rgba(255,255,255,0.85)', marginTop: spacing.innerSm },
  completionSub: { ...fonts.body, color: 'rgba(255,255,255,0.55)', marginTop: spacing.xs },
  
  insightBox: { backgroundColor: palette.bgSecondary, padding: spacing.innerMd, borderRadius: radius.card, marginTop: spacing.cardGap, flexDirection: 'row', alignItems: 'center', ...shadows.level1 },
  insightText: { ...fonts.label, color: palette.textPrimary, marginLeft: spacing.sm, marginRight: spacing.xs },
  insightValue: { ...fonts.body, color: palette.textMuted, flex: 1 },
  
  nextDateBox: { backgroundColor: palette.bgElevated, padding: spacing.lg, borderRadius: radius.card, marginTop: spacing.cardGap, alignItems: 'center', borderWidth: 1, borderColor: palette.borderSubtle },
  nextDateLabel: { ...fonts.label, color: palette.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  nextDateValue: { ...fonts.screenTitle, color: palette.primary },
  nextDatePreview: { ...fonts.caption, color: palette.textSecondary, marginTop: spacing.sm },

  actionSection: { marginTop: spacing.sectionGap, paddingTop: spacing['2xl'], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.borderSubtle },
  fbBlock: { marginBottom: spacing.xl },
  fbTitle: { ...fonts.cardTitle, color: palette.textPrimary, textAlign: 'center', marginBottom: spacing.innerMd },
  fbRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.innerMd },
  fbBtn: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.innerMd, borderRadius: radius.inner, backgroundColor: palette.bgSecondary, width: 94, minHeight: 84, ...shadows.level1 },
  fbBtnActive: { backgroundColor: palette.bgElevated, ...shadows.focus },
  fbEmoji: { fontSize: 26, marginBottom: spacing.xs },
  fbLabel: { ...fonts.caption, color: palette.textMuted },
  fbLabelActive: { color: palette.primary },

  warningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.warningSoft, borderRadius: radius.inner, padding: spacing.lg, marginBottom: spacing.lg },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', borderRadius: radius.inner, padding: spacing.lg, marginBottom: spacing.lg },
  warningContent: { flex: 1, marginLeft: spacing.innerMd },
  warningTitle: { ...fonts.cardTitle, color: '#92400E' },
  warningText: { ...fonts.body, color: '#B45309', marginTop: 2 },
  infoTitle: { ...fonts.cardTitle, color: '#0369A1' },
  infoText: { ...fonts.body, color: '#0284C7', marginTop: 2 },
  
  ratingBlock: { marginBottom: spacing.xl },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.sm },
  ratingBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.bgSecondary, alignItems: 'center', justifyContent: 'center', ...shadows.level1 },
  ratingBtnActive: { backgroundColor: palette.primary, ...shadows.focus },
  ratingLabel: { ...fonts.body, color: palette.textMuted },
  ratingLabelActive: { color: palette.white, fontWeight: 'bold' },
  
  // Modal Bottom Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: palette.bgPrimary, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, minHeight: '50%', maxHeight: '85%', padding: spacing.screenPadding, ...shadows.level2 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.borderSubtle, alignSelf: 'center', marginBottom: spacing.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  sheetTitle: { ...fonts.screenTitle, color: palette.textPrimary, flex: 1 },
  closeBtn: { fontSize: 24, color: palette.textMuted },
  sheetScroll: { flexGrow: 1 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  muscleTag: { backgroundColor: palette.bgSecondary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.inner },
  muscleTagText: { ...fonts.caption, color: palette.textPrimary, fontWeight: '500' },
  sectionHeader: { ...fonts.label, color: palette.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  stepsWrap: { gap: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepDot: { ...fonts.body, color: palette.primary, marginRight: spacing.sm, width: 20 },
  stepText: { ...fonts.body, color: palette.textSecondary, flex: 1, lineHeight: 22 },
  tipBox: { backgroundColor: palette.primarySoft, padding: spacing.innerMd, borderRadius: radius.card, flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs },
  tipIcon: { fontSize: 20, marginRight: spacing.sm },
  tipText: { ...fonts.body, color: palette.primary, flex: 1, lineHeight: 22 },
});
