import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AuthButton } from '../../auth/components/AuthButton';
import { useUserProfile } from '../hooks/useUserProfile';
import { generateProgram } from '../../program/services/programGenerator';
import { useAuth } from '../../auth/hooks/useAuth';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';

const GOALS = ['Weight Loss', 'Muscle Gain', 'General Fitness'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const ENVIRONMENTS = ['Home', 'Gym'];
const DIETS = ['Any', 'Vegan', 'Keto', 'Vegetarian'];

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
      
      // 1. Create Profile FIRST (Because Plans table has a foreign key to Users table)
      await createProfile.mutateAsync({
        goal,
        level,
        environment,
        diet_type: dietType,
        program_start_date: new Date().toISOString().split('T')[0],
      });

      // 2. Generate structured 4-week program
      await generateProgram(user.id, goal, level, environment, dietType);
      
      // Because we added queryClient.invalidateQueries(['todayPlan']) to the mutate onSuccess,
      // the HomeScreen will automatically render the generated plans as soon as it mounts.

    } catch (error: any) {
      Alert.alert('Error completing onboarding', error.message);
      setIsGenerating(false); // only reset on error, or it flashes before unmounting
    }
  };

  const renderSection = (title: string, options: string[], selected: string, onSelect: (val: string) => void) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optionsGrid}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.optionCard, selected === opt && styles.optionCardSelected]}
            onPress={() => onSelect(opt)}
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Building your 4-week program...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Let's tailor your journey</Text>
        <Text style={styles.subtitle}>Tell us about your fitness parameters to generate your plan.</Text>
      </View>

      {renderSection('What is your primary goal?', GOALS, goal, setGoal)}
      {renderSection('What is your experience level?', LEVELS, level, setLevel)}
      {renderSection('Where will you workout?', ENVIRONMENTS, environment, setEnvironment)}
      {renderSection('Do you have dietary preferences?', DIETS, dietType, setDietType)}

      <AuthButton 
        title="Generate My Plan" 
        onPress={handleComplete} 
        style={styles.btn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  btn: {
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  loadingText: {
    ...typography.h2,
    textAlign: 'center',
    marginTop: 16,
    color: colors.text,
  },
});
