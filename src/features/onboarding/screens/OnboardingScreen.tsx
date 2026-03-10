import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { AuthButton } from '../../auth/components/AuthButton';
import { useUserProfile } from '../hooks/useUserProfile';
import { generateProgram } from '../../program/services/programGenerator';
import { useAuth } from '../../auth/hooks/useAuth';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

const GOALS = [
  { id: 'fat_loss', label: 'Weight Loss' },
  { id: 'muscle_gain', label: 'Muscle Gain' },
  { id: 'recomp', label: 'Body Recomposition' },
  { id: 'general_fitness', label: 'General Fitness' },
];

const LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const ENVIRONMENTS = [
  { id: 'home', label: 'Home' },
  { id: 'gym', label: 'Gym' },
];

const FREQUENCIES = [
  { id: '2-3', label: '2-3 days' },
  { id: '3-4', label: '3-4 days' },
  { id: '4-5', label: '4-5 days' },
  { id: '5+', label: '5+ days' },
];

const WORKOUT_TYPES = [
  { id: 'push', label: 'Push (Chest/Shoulders/Triceps)' },
  { id: 'pull', label: 'Pull (Back/Biceps)' },
  { id: 'legs', label: 'Legs / Lower Body' },
  { id: 'full', label: 'Full Body' },
  { id: 'none', label: 'Nothing recently' },
];

export const OnboardingScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { upsertProfile } = useUserProfile();

  const [step, setStep] = useState<1 | 2>(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 1
  const [goal, setGoal] = useState(GOALS[0].id);
  const [level, setLevel] = useState(LEVELS[0].id);
  const [environment, setEnvironment] = useState(ENVIRONMENTS[0].id);

  // Step 2
  const [frequency, setFrequency] = useState(FREQUENCIES[1].id);
  const [lastWorkout, setLastWorkout] = useState(WORKOUT_TYPES[4].id);

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const handleComplete = async () => {
    if (!user) return;
    try {
      setIsGenerating(true);

      // STEP 1: Create the user profile FIRST (required for FK constraint)
      // The `programs` table has a FK to `public.users`, so the row must exist.
      // Set onboarding_completed: false so if generation fails, user stays on onboarding.
      await upsertProfile.mutateAsync({
        goal: goal,
        level: level,
        environment: environment,
        diet_type: 'Any',
        weekly_frequency: frequency,
        last_workout_type: lastWorkout,
        onboarding_completed: false, // Will flip to true AFTER program succeeds
      });

      // STEP 2: Generate the adaptive program
      // Now the user row exists, so the FK constraint is satisfied
      const result = await generateProgram(user.id, goal, level, environment, 'Any');
      
      if (result?.program_id) {
        console.log('[Onboarding] Program created:', result.program_id);
      }

      // STEP 3: Mark onboarding as complete (triggers navigation to MainTabs)
      await upsertProfile.mutateAsync({
        onboarding_completed: true,
      });

      // STEP 4: Clear all caches so the app re-fetches the real program data
      await queryClient.invalidateQueries();

    } catch (error: any) {
      if (error) {
        console.error('[Onboarding] Plan generation failed:', error);
        Alert.alert(
          'Setup Incomplete',
          'There was a problem creating your plan. Please try again.'
        );
      }
      setIsGenerating(false);
    }
  };

  const renderSection = (
    stepNum: number,
    title: string,
    options: { id: string; label: string }[],
    selected: string,
    onSelect: (val: string) => void
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{stepNum}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.optionsGrid}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.optionCard, selected === opt.id && styles.optionCardSelected]}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.optionText, selected === opt.id && styles.optionTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isGenerating) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingTitle}>Building your program</Text>
          <Text style={styles.loadingText}>Connecting to adaptive engine…</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress Dots */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, step === 2 && styles.progressDotActive]} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>{step === 1 ? "Let's tailor your journey" : "Almost there"}</Text>
        <Text style={styles.subtitle}>
          {step === 1 
            ? "Tell us about your fitness goals and we'll create a personalized program."
            : "Help us schedule your plan and adapt to your current recovery state."}
        </Text>
      </View>

      {step === 1 ? (
        <>
          {renderSection(1, 'What is your primary goal?', GOALS, goal, setGoal)}
          {renderSection(2, 'What is your experience level?', LEVELS, level, setLevel)}
          {renderSection(3, 'Where will you workout?', ENVIRONMENTS, environment, setEnvironment)}
          
          <View style={styles.ctaContainer}>
            <AuthButton title="Next Step" onPress={handleNext} />
          </View>
        </>
      ) : (
        <>
          {renderSection(4, 'How many days per week can you realistically train?', FREQUENCIES, frequency, setFrequency)}
          {renderSection(5, 'What did you train last?', WORKOUT_TYPES, lastWorkout, setLastWorkout)}
          
          <View style={styles.ctaContainer}>
            <AuthButton title="Generate My Plan" onPress={handleComplete} />
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgBase },
  content: { padding: spacing.screenPadding, paddingTop: 60, paddingBottom: 40 },

  progressRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: palette.bgInner },
  progressDotActive: { backgroundColor: palette.primary },

  header: { marginBottom: spacing.xxl },
  title: { ...fonts.h1, color: palette.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...fonts.body, color: palette.textSecondary, lineHeight: 22 },

  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,59,59,0.2)' },
  stepBadgeText: { ...fonts.label, color: palette.primary },
  sectionTitle: { ...fonts.h3, color: palette.textPrimary },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  optionCard: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: radius.md, backgroundColor: palette.bgElevated,
    borderWidth: 1, borderColor: palette.borderLight,
  },
  optionCardSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  optionText: { ...fonts.body, color: palette.textSecondary },
  optionTextSelected: { color: palette.textPrimary, fontWeight: '700' },

  ctaContainer: { marginTop: spacing.xl },
  backButton: { marginTop: spacing.md, alignItems: 'center', padding: spacing.md },
  backText: { ...fonts.body, color: palette.textSecondary },

  loadingContainer: { flex: 1, backgroundColor: palette.bgBase, alignItems: 'center', justifyContent: 'center', padding: spacing.screenPadding },
  loadingCard: {
    backgroundColor: palette.bgCard, borderRadius: radius.xl, padding: spacing.xxl,
    alignItems: 'center', width: '100%', borderWidth: 1, borderColor: palette.borderSubtle,
    ...shadows.glow,
  },
  loadingTitle: { ...fonts.h2, color: palette.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
  loadingText: { ...fonts.body, color: palette.textSecondary, textAlign: 'center' },
});
