import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';

interface WeeklyPerformanceProps {
  completedThisWeek: number;
  completedThisMonth: number;
  currentStreak: number;
}

export const WeeklyPerformance: React.FC<WeeklyPerformanceProps> = ({
  completedThisWeek,
  completedThisMonth,
  currentStreak,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Consistency</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{completedThisWeek}/7</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{completedThisMonth}/30</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.statValue}>🔥 {currentStreak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  title: {
    ...typography.h2,
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
