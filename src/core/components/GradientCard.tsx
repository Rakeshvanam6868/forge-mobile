import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, shadows, spacing } from '../../core/theme/designTokens';

interface GradientCardProps {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
}

/**
 * Hero gradient card — deep navy gradient (surface-3).
 * Use for streak hero, adaptive intelligence, consistency score.
 */
export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  colors = ['#1E293B', '#334155'] as const,
  style,
}) => (
  <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, style]}>
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.cardGap,
    ...shadows.level2,
  },
});
