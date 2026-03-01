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
    backgroundColor: palette.bgSecondary,
    padding: spacing.cardPadding,
    borderRadius: radius.card,
    ...shadows.level1,
  },
  title: { ...fonts.cardTitle, color: palette.textPrimary, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: palette.borderSubtle, marginHorizontal: spacing.innerMd },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { ...fonts.cardValue, color: palette.textPrimary },
  statHL: { color: palette.primary },
  statLabel: { ...fonts.caption, color: palette.textMuted, marginTop: spacing.innerSm, textAlign: 'center' },
});
