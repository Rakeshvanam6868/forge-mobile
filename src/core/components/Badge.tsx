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
  warning: { bg: palette.warningSoft,  fg: palette.warning },
  danger:  { bg: 'rgba(239, 68, 68, 0.1)', fg: palette.danger },
  info:    { bg: 'rgba(59,130,246,0.1)', fg: palette.info },
  easy:    { bg: palette.successSoft,  fg: palette.success },
  normal:  { bg: 'rgba(59,130,246,0.1)', fg: palette.info },
  hard:    { bg: palette.warningSoft,  fg: palette.warning },
  deload:  { bg: 'rgba(139,92,246,0.1)', fg: '#8B5CF6' },
  neutral: { bg: palette.bgInner, fg: palette.textSecondary },
  dark:    { bg: palette.bgElevated, fg: palette.textPrimary },
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
