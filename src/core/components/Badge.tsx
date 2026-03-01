import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts, spacing, radius } from '../../core/theme/designTokens';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'easy' | 'normal' | 'hard' | 'deload' | 'neutral' | 'dark';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const V: Record<BadgeVariant, { bg: string; fg: string }> = {
  primary: { bg: palette.primarySoft,  fg: palette.primary },
  success: { bg: palette.successSoft,  fg: palette.success },
  warning: { bg: palette.warningSoft,  fg: '#B45309' },
  danger:  { bg: palette.dangerSoft,   fg: palette.danger },
  info:    { bg: 'rgba(59,130,246,0.07)', fg: palette.info },
  easy:    { bg: 'rgba(22,163,74,0.08)',  fg: '#16A34A' },
  normal:  { bg: 'rgba(37,99,235,0.07)',  fg: '#2563EB' },
  hard:    { bg: 'rgba(234,88,12,0.08)',  fg: '#EA580C' },
  deload:  { bg: 'rgba(139,92,246,0.08)', fg: '#7C3AED' },
  neutral: { bg: 'rgba(148,163,184,0.08)', fg: palette.textMuted },
  dark:    { bg: 'rgba(255,255,255,0.12)', fg: palette.textOnDark },
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary' }) => {
  const s = V[variant];
  return (
    <View style={[styles.container, { backgroundColor: s.bg }]}>
      <Text style={[styles.label, { color: s.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: { ...fonts.badge },
});
