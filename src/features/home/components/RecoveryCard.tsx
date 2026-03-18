import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts, spacing, radius } from '../../../core/theme/designTokens';

interface RecoveryCardProps {
  visible: boolean;
  nextTrainingDateString?: string;
}

export const RecoveryCard: React.FC<RecoveryCardProps> = ({ visible, nextTrainingDateString = 'Tomorrow' }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>💪</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Recovery Day</Text>
        <Text style={styles.text}>Next session: {nextTrainingDateString}. Try some light mobility work today.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.cardGap,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: palette.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  icon: { fontSize: 18 },
  content: { flex: 1 },
  title: { ...fonts.h3, color: palette.primary },
  text: { ...fonts.body, color: palette.textSecondary, marginTop: 4, fontSize: 13 },
});
