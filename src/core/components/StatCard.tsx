import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts, spacing, radius, shadows } from '../../core/theme/designTokens';

interface StatCardProps {
  value: string;
  label: string;
  icon?: string;
  highlight?: boolean;
  mono?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label, icon, highlight, mono }) => (
  <View style={[styles.container, highlight && styles.highlight, highlight ? shadows.focus : shadows.level1]}>
    {icon ? (
      <View style={[styles.iconCircle, highlight && styles.iconCircleHL]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
    ) : null}
    <Text style={[styles.value, highlight && styles.valueHL, mono && styles.mono]}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bgSecondary,
    borderRadius: radius.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  highlight: { backgroundColor: palette.bgElevated },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.iconTint,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.innerSm,
  },
  iconCircleHL: { backgroundColor: palette.primarySoft },
  iconText: { fontSize: 18 },
  value: { ...fonts.statValue, color: palette.textPrimary },
  valueHL: { color: palette.primary },
  mono: { fontVariant: ['tabular-nums'] },
  label: { ...fonts.statLabel, color: palette.textMuted, marginTop: spacing.innerSm, textAlign: 'center' },
});
