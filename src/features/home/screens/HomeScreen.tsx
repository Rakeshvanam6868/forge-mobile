import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { AuthButton } from '../../auth/components/AuthButton';
import { authService } from '../../auth/services/authService';
import { useProgramState } from '../hooks/useProgramState';
import { WeeklyPerformance } from '../components/WeeklyPerformance';
import { ConsistencyGrid } from '../components/ConsistencyGrid';
import { RecoveryCard } from '../components/RecoveryCard';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';

/**
 * Progress tab — ONLY depends on plan_logs.
 * Shows: streak, weekly/monthly stats, consistency grid.
 * NO dependency on programs table.
 */
export const HomeScreen = () => {
  const { state, isLoading } = useProgramState();

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading || !state) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Recovery card */}
      <RecoveryCard visible={state.missedYesterday} />

      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>
          Day {state.currentProgramDay} · 🔥 {state.streak} day streak · Best: {state.longestStreak}
        </Text>
      </View>

      {/* Stats */}
      <WeeklyPerformance
        completedThisWeek={state.completedThisWeek}
        completedThisMonth={state.completedThisMonth}
        currentStreak={state.streak}
      />

      {/* Grid */}
      <ConsistencyGrid history={state.grid} />

      <AuthButton
        title="Logout"
        onPress={handleLogout}
        variant="outline"
        style={styles.logoutBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  subtitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  logoutBtn: {
    marginTop: 40,
  },
});
