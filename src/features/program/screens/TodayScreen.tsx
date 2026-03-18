import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert, Modal, Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
// import exercisesData from '../data/exercises.json'; // Replaced by useExerciseDetail
import { useAuth } from '../../auth/hooks/useAuth';
import { useAdaptiveDay } from '../hooks/useAdaptiveDay';
import { upsertExerciseHistory } from '../services/exerciseHistoryQueries';
import { useQuery } from '@tanstack/react-query';
import { Difficulty, AdaptedWorkout } from '../services/adaptiveEngine';
import { generateProgram } from '../services/programGenerator';
import { useRetention } from '../../retention/hooks/useRetention';
import { useExerciseDetail } from '../hooks/useExerciseDetail';
import { supabase } from '../../../core/supabase/client';
import { AuthButton } from '../../auth/components/AuthButton';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { Badge } from '../../../core/components/Badge';
import { PrimaryCard } from '../../../core/components/PrimaryCard';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GradientCard } from '../../../core/components/GradientCard';
import { BrandHeader } from '../../../core/components/BrandHeader';
import { CelebrationOverlay } from '../../../core/components/CelebrationOverlay';
import { PredictionCard } from '../components/PredictionCard';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { useWeight } from '../../../core/hooks/useWeight';
import { useLayoutTokens } from '../../../core/theme/layout';

const ENERGY_OPTIONS = [
  { value: 1, icon: 'battery-dead', activeColor: palette.warning, label: 'Low' },
  { value: 2, icon: 'battery-half', activeColor: '#3B82F6', label: 'Normal' },
  { value: 3, icon: 'flash', activeColor: palette.primary, label: 'High' },
];
const DIFFICULTY_OPTIONS = [
  { value: 'easy', icon: 'leaf', activeColor: palette.success, label: 'Easy' },
  { value: 'medium', icon: 'barbell', activeColor: '#3B82F6', label: 'Medium' },
  { value: 'hard', icon: 'flame', activeColor: palette.primary, label: 'Hard' },
];
const FOCUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  strength: 'barbell',
  cardio: 'heart-half',
  mobility: 'body',
  rest: 'bed'
};
const MEAL_EMOJI: Record<string, string> = { breakfast: 'AM', lunch: 'NOON', snack: 'SNACK', dinner: 'PM' };
const MEAL_ADJUSTMENT_LABELS: Record<string, string> = {
  calorie_up: '+150 cal (muscle gain boost)',
  calorie_down: '-150 cal (rest day cut)',
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

const getIntensityConfig = (intensity: string) => {
  switch (intensity.toLowerCase()) {
    case 'high':
    case 'intense':
      return {
        icon: 'flame',
        color: palette.primary,
        bg: 'rgba(255, 59, 59, 0.08)',
        borderColor: 'rgba(255, 59, 59, 0.25)',
      };
    case 'reduced':
      return {
        icon: 'battery-low',
        color: palette.warning,
        bg: 'rgba(255, 193, 7, 0.08)',
        borderColor: 'rgba(255, 193, 7, 0.25)',
      };
    case 'recovery':
      return {
        icon: 'leaf',
        color: palette.success,
        bg: 'rgba(34, 197, 94, 0.08)',
        borderColor: 'rgba(34, 197, 94, 0.25)',
      };
    case 'easy':
      return {
        icon: 'feather',
        color: palette.success,
        bg: 'rgba(34, 197, 94, 0.08)',
        borderColor: 'rgba(34, 197, 94, 0.25)',
      };
    case 'normal':
    case 'medium':
    default:
      return {
        icon: 'pulse',
        color: '#3B82F6', // Modern distinct blue for normal
        bg: 'rgba(59, 130, 246, 0.08)',
        borderColor: 'rgba(59, 130, 246, 0.25)',
      };
  }
};

export const TodayScreen = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const { adaptiveState, lifecycleState: hookLifecycle, isLoading, isError: hookIsError, completeToday } = useAdaptiveDay();
  const { logEvent } = useRetention();
  const navigation = useNavigation<any>();

  const { scrollBottomPadding } = useLayoutTokens();
  const { weightUnit, formatWithUnit } = useWeight();
  const [energyLevel, setEnergyLevel] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [strengthRating, setStrengthRating] = useState<number | null>(null);
  const [pumpRating, setPumpRating] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const exerciseDetail = useExerciseDetail(selectedExercise);
  const justCompleted = useRef(false);

  // Fetch exercise history for dynamic weights
  const { data: exerciseHistory } = useQuery({
    queryKey: ['exerciseHistory', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('exercise_history')
        .select('exercise_id, last_weight, suggested_weight')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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
          sets: w.adaptedSets ? parseInt(String(w.adaptedSets), 10) : null,
          reps: w.adaptedReps ? parseInt(String(w.adaptedReps), 10) || null : null,
          weight: null, // TodayScreen doesn't log weight per set, it uses suggested baseline
          difficulty,
        }));
      await upsertExerciseHistory(user.id, exercises, energyLevel);
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
        <Text style={{ fontSize: 14, marginBottom: 16, color: palette.warning, fontWeight: '700', letterSpacing: 2 }}>WARNING</Text>
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

  const { dayDetail, adaptivePlan, adaptedWorkouts, sections, workoutType, uiLabel, uiSubLabel, lifecycleState, nextTrainingDateString } = adaptiveState;

  // Pure UI Conditional Sub-renders based on State Machine:
  const renderWorkoutSection = () => {
    if (!sections || sections.length === 0) {
      return (
        <SectionBlock title="Workout">
          <PrimaryCard>
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ fontSize: 14, marginBottom: 16, color: palette.warning, fontWeight: '700', letterSpacing: 2 }}>WARNING</Text>
              <Text style={[styles.emptyText, { textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 }]}>
                Program data is missing or interrupted. Please reset to regenerate your training plan.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: palette.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8, width: '100%', alignItems: 'center' }}
                onPress={async () => {
                  if (!user?.id) return;
                  try {
                    await supabase.from('users').update({ onboarding_completed: false }).eq('id', user.id);
                    await supabase.from('programs').delete().eq('user_id', user.id);
                    queryClient.invalidateQueries();
                    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
                  } catch (e) {
                    Alert.alert('Error', 'Could not reset program. Please check your connection.');
                  }
                }}
              >
                <Text style={{ color: palette.white, fontWeight: 'bold' }}>Reset Program</Text>
              </TouchableOpacity>
            </View>
          </PrimaryCard>
        </SectionBlock>
      );
    }

    return (
      <>
        {sections.map((group, groupIdx) => (
          <View key={group.title} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.sectionHeader}>{group.title}</Text>
            {group.data.map((w, i) => {
              const history = (exerciseHistory || []).find((h: any) => h.exercise_id === (w as any).poolId || h.exercise_id === w.exercise_name);
              const isWarmup = group.title === 'Warmup';
              const cat = (w as any).poolCategory;
              const equipment = (w as any).poolEquipment;

              return (
                <TouchableOpacity key={w.id} activeOpacity={0.8} onPress={() => setSelectedExercise((w as any).poolId)}>
                  <PrimaryCard state={w.isAdapted ? 'adapted' : 'default'} accentColor={w.isAdapted ? palette.accentAmber : undefined}>
                    <View style={styles.exerciseRow}>
                      <View style={styles.stepCircle}><Text style={styles.stepNum}>{i + 1}</Text></View>
                      <View style={styles.exerciseBody}>
                        <View style={styles.exerciseNameRow}>
                          <Text style={styles.exerciseName} numberOfLines={2}>{w.exercise_name}</Text>
                          {w.isAdapted && <Badge label="ADAPTED" variant="warning" />}
                        </View>



                        <Text style={styles.exerciseSets}>
                          {isWarmup ? `${(w as any).targetReps || '10-15'} reps · ${w.adaptedSets} sets` :
                            `${w.adaptedSets} sets${w.adaptedReps && w.adaptedReps !== '—' ? ` × ${w.adaptedReps}` : ''}`}
                          {(w as any).duration ? ` · ${(w as any).duration}` : ''}
                          {(w as any).restSec ? ` · ${(w as any).restSec}s rest` : ''}
                        </Text>

                        {/* DYNAMIC WEIGHTS */}
                        {history && (history.last_weight || history.suggested_weight) && (
                          <View style={styles.dynamicWeightsRow}>
                            <Text style={styles.weightText}>
                              Last: <Text style={styles.weightValue}>{formatWithUnit(history.last_weight)}</Text>
                            </Text>
                            <Text style={styles.weightDivider}>|</Text>
                            <Text style={styles.weightText}>
                              Suggested: <Text style={styles.weightValueAccent}>{formatWithUnit(history.suggested_weight)}</Text>
                            </Text>
                          </View>
                        )}


                        {/* CATEGORY & EQUIPMENT FIELDS */}
                        {(cat || (equipment && equipment.length > 0)) && (
                          <View style={styles.aiMetaRow}>
                            {cat && (
                              <View style={[styles.aiMetaBadge, { backgroundColor: palette.primarySoft }]}>
                                <Text style={[styles.aiMetaBadgeText, { color: palette.primary }]}>
                                  {String(cat).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            {equipment && equipment.length > 0 && (
                              <View style={styles.aiMetaBadge}>
                                <Text style={styles.aiMetaBadgeText}>
                                  {equipment.join(', ')}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}

                      </View>
                    </View>
                  </PrimaryCard>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        {/* Start Workout Button */}
        <View style={styles.startWorkoutWrap}>
          <TouchableOpacity
            style={styles.startWorkoutBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('WorkoutMode', { workouts: adaptedWorkouts })}
          >
            <Ionicons name="play" size={22} color={palette.white} />
            <Text style={styles.startWorkoutText}>Start Workout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionSection}>
          {renderModernFeedback('How was this workout?', DIFFICULTY_OPTIONS, difficulty, setDifficulty)}
          {renderModernFeedback('How is your energy?', ENERGY_OPTIONS, energyLevel, setEnergyLevel)}
          <AuthButton title={completeToday.isPending || saveHistory.isPending ? 'Saving...' : 'Complete Day'} onPress={handleDone} disabled={completeToday.isPending || saveHistory.isPending} />
        </View>
      </>
    );
  };

  const renderCompletedState = () => (
    <View style={styles.completedContainer}>
      <View style={styles.completionCard}>
        <View style={styles.rowCenter}>
          <Ionicons name="checkmark-circle" size={24} color={palette.success} />
          <View style={styles.flex}>
            <Text style={styles.completionTitle}>Session Finished</Text>
            <Text style={styles.completionSub}>You crushed today's target.</Text>
          </View>
        </View>
      </View>

      <View style={styles.insightBox}>
        <Ionicons name="medical" size={24} color={palette.success} />
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 }}>
            <Ionicons name={FOCUS_ICONS[workoutType] || 'barbell'} size={16} color={palette.textSecondary} />
            <Text style={[styles.nextDatePreview, { marginTop: 0 }]}>Preview: {dayDetail.title}</Text>
          </View>
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

      <View style={styles.floatingHeader}>
        <BrandHeader />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContainer}>
          <PredictionCard currentWorkoutType={adaptiveState.workoutType} />

          {lifecycleState === 'MISSED_TRAINING_DAY' && (
            <View style={styles.warningBanner}>
              <View style={styles.iconWrap}><Ionicons name="information-circle" size={24} color={palette.primary} /></View>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Missed Session</Text>
                <Text style={styles.warningText}>You missed your scheduled day. Catch up on this workout to protect your sequence.</Text>
              </View>
            </View>
          )}

          {lifecycleState === 'RECOVERY_DAY' && (
            <View style={styles.infoBanner}>
              <View style={styles.iconWrap}><Ionicons name="leaf" size={24} color={palette.primary} /></View>
              <View style={styles.warningContent}>
                <Text style={styles.infoTitle}>Recovery Day</Text>
                <Text style={styles.infoText}>Your body grows while resting. Next session is {nextTrainingDateString}.</Text>
              </View>
            </View>
          )}

          {adaptivePlan.systemMessage && lifecycleState !== 'SESSION_COMPLETED_TODAY' ? (() => {
            const config = getIntensityConfig(adaptivePlan.intensity || 'normal');
            return (
              <View style={[styles.heroCustom, { backgroundColor: config.bg, borderColor: config.borderColor }]}>
                <View style={styles.heroInner}>
                  <View style={[styles.heroIconWrap, { backgroundColor: config.bg, borderColor: config.borderColor }]}>
                    <Ionicons name={config.icon as any} size={24} color={config.color} />
                  </View>
                  <View style={styles.heroTextBlock}>
                    <Text style={styles.heroMessage}>{adaptivePlan.systemMessage}</Text>
                    <View style={styles.heroBadges}>
                      <View style={[styles.intensityBadge, { backgroundColor: config.color }]}>
                        <Text style={[styles.intensityBadgeText, { color: '#FFFFFF' }]}>
                          {adaptivePlan.intensity.toUpperCase()}                        </Text>
                      </View>
                      {adaptivePlan.recoveryMode && (
                        <View style={[styles.intensityBadge, { backgroundColor: 'transparent', borderWidth: 1, borderColor: config.color }]}>
                          <Text style={[styles.intensityBadgeText, { color: config.color }]}>RECOVERY</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })() : null}

          {lifecycleState !== 'SESSION_COMPLETED_TODAY' && (
            <View style={styles.headerBlock}>
              <Text style={styles.headerCaption}>UPCOMING SESSION</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* <Ionicons name={FOCUS_ICONS[workoutType] || 'barbell'} size={24} color={palette.textPrimary} /> */}
                <Text style={styles.headerTitle}>{workoutType === 'rest' ? 'REST DAY' : dayDetail.title}</Text>
              </View>
              <Text style={styles.headerMeta}>{uiSubLabel}</Text>
            </View>
          )}

          {/* STRICT STATE SWITCH */}
          {lifecycleState === 'SESSION_COMPLETED_TODAY'
            ? renderCompletedState()
            : lifecycleState === 'PROGRAM_TRANSITION_PENDING'
              ? (
                <View style={styles.completedContainer}>
                  <View style={[styles.completionCard, { borderColor: palette.primary }]}>
                    <View style={styles.rowCenter}>
                      <Ionicons name="rocket" size={24} color={palette.primary} />
                      <View style={styles.flex}>
                        <Text style={styles.completionTitle}>Program Phase Complete</Text>
                        <Text style={styles.completionSub}>You've finished your 4-week cycle. Time for a fresh challenge.</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.startWorkoutBtn, { marginTop: 24 }]}
                      onPress={async () => {
                        if (!user?.id || !profile) return;
                        try {
                          await generateProgram(user.id, profile.goal, profile.level, profile.environment, profile.diet_type);
                          queryClient.invalidateQueries();
                          Alert.alert("Success", "Your new training phase is ready!");
                        } catch (e) {
                          Alert.alert("Error", "Could not generate next phase.");
                        }
                      }}
                    >
                      <Text style={styles.startWorkoutText}>Generate New Phase</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
              : lifecycleState === 'RECOVERY_DAY'
                ? null // Just show the top info banner for recovery days
                : renderWorkoutSection()
          }

          {/* MEALS - Only show if not completed today, and usually on rest days they have specific meal plans too */}
          {/* ... */}
        </View>
      </ScrollView>

      {/* Exercise Detail Modal */}
      <Modal visible={!!selectedExercise} animationType="slide" transparent={true} onRequestClose={() => setSelectedExercise(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedExercise(null)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{exerciseDetail.data?.name || 'Loading...'}</Text>
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
                              <Ionicons name="bulb" size={16} color={palette.primary} style={{ marginRight: 8, marginTop: 2 }} />
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
                          <Ionicons name="barbell" size={20} color={palette.primary} style={styles.tipIcon} />
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
                              <Ionicons name="warning" size={16} color={palette.warning} style={{ marginRight: 8, marginTop: 2 }} />
                              <Text style={styles.stepText}>{mistake}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </>
                );
              })()}
              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

function renderModernFeedback(
  title: string,
  options: any[],
  selectedValue: any,
  onSelect: (val: any) => void
) {
  return (
    <View style={styles.fbSection}>
      <Text style={styles.fbSectionTitle}>{title}</Text>
      <View style={styles.fbOptionRow}>
        {options.map((opt) => {
          const isActive = selectedValue === opt.value;
          const iconColor = isActive ? opt.activeColor : palette.textSecondary;
          const bgColor = isActive ? opt.activeColor + '1A' : palette.bgCard; // ~10% opacity
          const borderColor = isActive ? opt.activeColor : palette.borderSubtle;

          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.fbOptionBtn, { backgroundColor: bgColor, borderColor }]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.7}
            >
              <Ionicons name={opt.icon as any} size={28} color={iconColor} style={{ marginBottom: 8 }} />
              <Text style={[styles.fbOptionLabel, { color: iconColor }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgBase },
  floatingHeader: {
    position: 'absolute',
    top: 0, // Header handles safe area internally
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 110, paddingBottom: spacing.xxl }, // Adjusted for floating header
  mainContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.screenPadding, paddingTop: 40 },
  emptyText: { ...fonts.body, color: palette.textSecondary },
  heroCustom: { paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, marginBottom: 24, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroInner: { width: '100%', alignItems: 'center' },
  heroIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, borderWidth: 1 },
  heroTextBlock: { alignItems: 'center', width: '100%' },
  heroMessage: { ...fonts.h3, color: palette.textPrimary, lineHeight: 28, textAlign: 'center', fontWeight: '600' },
  heroBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, justifyContent: 'center' },
  intensityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, justifyContent: 'center' },
  intensityBadgeText: { ...fonts.labelXs, fontWeight: '800', letterSpacing: 1.5 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.bgElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.borderSubtle },
  iconInner: { fontSize: 20 },
  headerBlock: { marginBottom: 24, marginTop: 8, alignItems: 'center' },
  headerCaption: { ...fonts.label, color: palette.primary, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { ...fonts.h1, color: palette.textPrimary, textAlign: 'center' },
  headerMeta: { ...fonts.body, color: palette.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.bgElevated, alignItems: 'center', justifyContent: 'center', marginRight: spacing.innerMd, borderWidth: 1, borderColor: palette.borderLight },
  stepNum: { ...fonts.label, color: palette.textSecondary, fontWeight: '700' },
  exerciseBody: { flex: 1 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  exerciseName: { ...fonts.h3, color: palette.textPrimary, flexShrink: 1 },
  exerciseSets: { ...fonts.body, color: palette.textSecondary, marginTop: 4 },
  sectionHeader: {
    ...fonts.label,
    color: palette.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
    opacity: 0.8,
  },

  // Dynamic Weights Block
  dynamicWeightsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  weightText: { ...fonts.label, color: palette.textSecondary, fontSize: 11, textTransform: 'uppercase' },
  weightValue: { color: palette.textPrimary, fontWeight: '600' },
  weightDivider: { color: palette.borderSubtle, fontSize: 12 },
  weightValueAccent: { color: palette.primary, fontWeight: '700' },

  // AI Optional Fields Styles
  aiMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, flexWrap: 'wrap', gap: spacing.sm },
  aiMetaBadge: { backgroundColor: palette.bgElevated, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.md, borderWidth: 1, borderColor: palette.borderLight },
  aiMetaBadgeText: { ...fonts.label, color: palette.textSecondary, fontSize: 11 },
  aiCueText: { ...fonts.body, color: palette.textMuted, fontSize: 13, flexShrink: 1, fontStyle: 'italic' },
  progressionBox: { backgroundColor: palette.primarySoft, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.md, marginTop: spacing.sm, borderWidth: 1, borderColor: palette.primarySubtle },
  progressionText: { ...fonts.label, color: palette.primary, fontWeight: '700', fontSize: 11 },

  // Warm-up Block Styles
  warmupCardInner: { paddingVertical: spacing.xs },
  warmupRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  warmupDot: { ...fonts.body, color: palette.primary, marginRight: spacing.sm, fontSize: 18, lineHeight: 22 },
  warmupText: { ...fonts.body, color: palette.textSecondary, flex: 1, lineHeight: 22 },
  warmupName: { color: palette.textPrimary, fontWeight: '600' },

  mealAdjustBanner: { backgroundColor: palette.bgElevated, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.cardGap, borderWidth: 1, borderColor: palette.warningSubtle },
  mealAdjustText: { ...fonts.body, color: palette.warning, textAlign: 'center' },
  mealRow: { flexDirection: 'row', alignItems: 'center' },
  mealInfo: { flex: 1, marginLeft: spacing.innerMd },
  mealType: { ...fonts.label, color: palette.textSecondary, textTransform: 'uppercase' },
  mealTitle: { ...fonts.h3, color: palette.textPrimary, marginTop: 2 },
  mealDesc: { ...fonts.body, color: palette.textSecondary, marginTop: 4 },

  // States
  completedContainer: { marginTop: spacing.sectionGap },
  completionCard: {
    backgroundColor: palette.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    marginBottom: spacing.lg,
  },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  completionIcon: { ...fonts.label, fontSize: 14, color: palette.primary, fontWeight: '800', letterSpacing: 2 },
  completionTitle: { ...fonts.h3, color: palette.textPrimary },
  completionSub: { ...fonts.body, color: palette.textSecondary, fontSize: 13, marginTop: 2 },

  insightBox: { backgroundColor: palette.bgCard, padding: 16, borderRadius: radius.md, marginTop: spacing.cardGap, flexDirection: 'column', alignItems: 'center', borderWidth: 1, borderColor: palette.borderSubtle, gap: 12 },
  insightIcon: { fontSize: 20 },
  insightText: { ...fonts.label, color: palette.textPrimary, textTransform: 'uppercase', fontSize: 11 },
  insightValue: { ...fonts.body, color: palette.textSecondary, flex: 1, fontSize: 13 },

  nextDateBox: { backgroundColor: palette.bgCard, padding: spacing.lg, borderRadius: radius.md, marginTop: spacing.cardGap, alignItems: 'center', borderWidth: 1, borderColor: palette.borderSubtle },
  nextDateLabel: { ...fonts.label, color: palette.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  nextDateValue: { ...fonts.h1, color: palette.success, fontSize: 32 },
  nextDatePreview: { ...fonts.body, color: palette.textSecondary, marginTop: spacing.sm },

  actionSection: { marginTop: spacing.sectionGap, paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: palette.borderSubtle },

  fbSection: { marginBottom: 32 },
  fbSectionTitle: { ...fonts.h3, color: palette.textPrimary, textAlign: 'center', marginBottom: 20 },
  fbOptionRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  fbOptionBtn: {
    flex: 1, backgroundColor: palette.bgCard, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  fbOptionLabel: { ...fonts.label, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  warningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: palette.borderSubtle, gap: 12 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: palette.borderSubtle, gap: 12 },
  warningContent: { flex: 1 },
  warningTitle: { ...fonts.h3, color: palette.primary },
  warningText: { ...fonts.body, color: palette.textSecondary, marginTop: 4, fontSize: 13 },
  infoTitle: { ...fonts.h3, color: palette.primary },
  infoText: { ...fonts.body, color: palette.textSecondary, marginTop: 4, fontSize: 13 },

  // Unused rating styles removed

  // Modal Bottom Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: palette.bgBase, borderTopLeftRadius: 32, borderTopRightRadius: 32, minHeight: '50%', maxHeight: '85%', padding: spacing.screenPadding, borderWidth: 1, borderColor: palette.borderLight },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.bgInner, alignSelf: 'center', marginBottom: spacing.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  sheetTitle: { ...fonts.h1, color: palette.textPrimary, flex: 1 },
  closeBtn: { fontSize: 24, color: palette.textSecondary },
  sheetScroll: { flexGrow: 1 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  muscleTag: { backgroundColor: palette.bgElevated, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: palette.borderLight },
  muscleTagText: { ...fonts.label, color: palette.textPrimary, fontWeight: '600', textTransform: 'uppercase' },
  stepsWrap: { gap: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepDot: { ...fonts.body, color: palette.primary, marginRight: spacing.sm, width: 24, fontSize: 18 },
  stepText: { ...fonts.body, color: palette.textSecondary, flex: 1, lineHeight: 22 },
  tipBox: { backgroundColor: palette.primarySoft, padding: spacing.md, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.sm, borderWidth: 1, borderColor: palette.primarySubtle },
  tipIcon: { fontSize: 20, marginRight: spacing.sm },
  tipText: { ...fonts.body, color: palette.primary, flex: 1, lineHeight: 22, fontWeight: '500' },

  // Start Workout Button
  startWorkoutWrap: { paddingVertical: spacing.xl },
  startWorkoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.primary, borderRadius: radius.md,
    paddingVertical: 18, gap: 10,
    ...shadows.button,
  },
  startWorkoutEmoji: { ...fonts.button, color: palette.white, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  startWorkoutText: { ...fonts.button, color: palette.white, fontSize: 18, letterSpacing: 0.5 },
});
