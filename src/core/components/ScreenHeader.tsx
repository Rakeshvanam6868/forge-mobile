import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { palette, fonts, spacing } from '../../core/theme/designTokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    label: string;
    onPress: () => void;
  };
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, rightAction }) => (
  <View style={styles.container}>
    <View style={styles.textGroup}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {rightAction ? (
      <TouchableOpacity onPress={rightAction.onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.action}>{rightAction.label}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing['2xl'],
  },
  textGroup: { flex: 1 },
  title: { ...fonts.screenTitle, color: palette.text },
  subtitle: { ...fonts.body, color: palette.textSecondary, marginTop: spacing.xs },
  action: { ...fonts.bodyMedium, color: palette.primary },
});
