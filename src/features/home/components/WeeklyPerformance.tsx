import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

interface WeeklyPerformanceProps {
  completedThisWeek: number;
  completedThisMonth: number;
  currentStreak: number;
}

export const WeeklyPerformance: React.FC<WeeklyPerformanceProps> = ({
  completedThisWeek, completedThisMonth, currentStreak,
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>Your Consistency</Text>
    <View style={styles.row}>
      <Stat value={`${completedThisWeek}/7`} label="This Week" />
      <View style={styles.divider} />
      <Stat value={`${completedThisMonth}/30`} label="This Month" />
      <View style={styles.divider} />
      <Stat value={`🔥 ${currentStreak}`} label="Streak" highlight />
    </View>
  </View>
);

const Stat = ({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) => (
  <View style={styles.stat}>
    <Text style={[styles.statVal, highlight && styles.statHL]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.bgCard,
    padding: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  title: { ...fonts.h3, color: palette.textPrimary, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 32, backgroundColor: palette.borderLight, marginHorizontal: spacing.innerMd },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { ...fonts.stat, color: palette.textPrimary },
  statHL: { color: palette.primary },
  statLabel: { ...fonts.label, color: palette.textSecondary, marginTop: spacing.xs, textTransform: 'uppercase' },
});
