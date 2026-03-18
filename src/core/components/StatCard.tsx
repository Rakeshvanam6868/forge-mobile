import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, fonts, spacing, radius, shadows } from '../../core/theme/designTokens';

interface StatCardProps {
  value: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  highlight?: boolean;
  mono?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label, icon, highlight, mono }) => (
  <View style={[styles.container, highlight && styles.highlight, highlight ? shadows.focus : shadows.level1]}>
    {icon ? (
      <View style={[styles.iconCircle, highlight && styles.iconCircleHL]}>
        <Ionicons name={icon} size={20} color={highlight ? palette.primary : palette.textPrimary} />
      </View>
    ) : null}
    <Text style={[styles.value, highlight && styles.valueHL, mono && styles.mono]}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bgCard,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  highlight: { borderColor: palette.primarySoft },
  iconCircle: {
    width: 40, height: 40, borderRadius: radius.inner,
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderColor: palette.borderLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.innerMd,
  },
  iconCircleHL: { borderColor: palette.primarySubtle },
  iconText: { fontSize: 18 },
  value: { ...fonts.stat, color: palette.textPrimary },
  valueHL: { color: palette.primary },
  mono: { fontVariant: ['tabular-nums'] },
  label: { ...fonts.labelXs, color: palette.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
});
