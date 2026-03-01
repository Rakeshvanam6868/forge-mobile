import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AuthButton } from '../../auth/components/AuthButton';
import { useUserProfile } from '../hooks/useUserProfile';
import { generateProgram } from '../../program/services/programGenerator';
import { useAuth } from '../../auth/hooks/useAuth';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

const GOALS = ['Weight Loss', 'Muscle Gain', 'General Fitness'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const ENVIRONMENTS = ['Home', 'Gym'];
const DIETS = ['Any', 'Vegan', 'Keto', 'Vegetarian'];

const STEP_COUNT = 4;

export const OnboardingScreen = () => {
  const { user } = useAuth();
  const { createProfile } = useUserProfile();

  const [goal, setGoal] = useState(GOALS[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [environment, setEnvironment] = useState(ENVIRONMENTS[0]);
  const [dietType, setDietType] = useState(DIETS[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleComplete = async () => {
    if (!user) return;

    try {
      setIsGenerating(true);
      await createProfile.mutateAsync({
        goal,
        level,
        environment,
        diet_type: dietType,
        program_start_date: new Date().toISOString().split('T')[0],
      });
      await generateProgram(user.id, goal, level, environment, dietType);
    } catch (error: any) {
      Alert.alert('Error completing onboarding', error.message);
      setIsGenerating(false);
    }
  };

  const renderSection = (
    stepNum: number,
    title: string,
    options: string[],
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
            key={opt}
            style={[styles.optionCard, selected === opt && styles.optionCardSelected]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.8}
          >
            <Text style={[styles.optionText, selected === opt && styles.optionTextSelected]}>
              {opt}
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
          <Text style={styles.loadingText}>Creating a 4-week plan tailored to your goals…</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress Indicator */}
      <View style={styles.progressRow}>
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <View key={i} style={[styles.progressDot, styles.progressDotActive]} />
        ))}
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Let's tailor your journey</Text>
        <Text style={styles.subtitle}>
          Tell us about your fitness goals and we'll create a personalized program.
        </Text>
      </View>

      {renderSection(1, 'What is your primary goal?', GOALS, goal, setGoal)}
      {renderSection(2, 'What is your experience level?', LEVELS, level, setLevel)}
      {renderSection(3, 'Where will you workout?', ENVIRONMENTS, environment, setEnvironment)}
      {renderSection(4, 'Do you have dietary preferences?', DIETS, dietType, setDietType)}

      <View style={styles.ctaContainer}>
        <AuthButton title="Generate My Plan" onPress={handleComplete} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: spacing.screenPadding, paddingTop: 60, paddingBottom: 40 },

  // Progress
  progressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
  },
  progressDotActive: {
    backgroundColor: palette.primary,
  },

  // Header
  header: { marginBottom: spacing['3xl'] },
  title: { ...fonts.programDayTitle, color: palette.text, marginBottom: spacing.sm },
  subtitle: { ...fonts.body, color: palette.textSecondary, lineHeight: 22 },

  // Section
  section: { marginBottom: spacing['2xl'] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { ...fonts.caption, color: palette.primary, fontWeight: '700' },
  sectionTitle: { ...fonts.cardTitle, color: palette.text },

  // Options
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionCard: {
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  optionCardSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  optionText: { ...fonts.bodyMedium, color: palette.textSecondary },
  optionTextSelected: { color: palette.white },

  // CTA
  ctaContainer: { marginTop: spacing.lg, paddingTop: spacing.lg },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.background,
    padding: spacing.screenPadding,
  },
  loadingCard: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing['4xl'],
    alignItems: 'center',
    ...shadows.cardHover,
  },
  loadingTitle: { ...fonts.sectionHeader, color: palette.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  loadingText: { ...fonts.body, color: palette.textSecondary, textAlign: 'center' },
});
