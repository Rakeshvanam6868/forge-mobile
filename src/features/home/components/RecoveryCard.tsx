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
        <Text style={styles.icon}>🔋</Text>
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: palette.warningSoft,
    padding: spacing.lg,
    borderRadius: radius.inner,
    marginBottom: spacing.cardGap,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.icon,
    backgroundColor: palette.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  content: { flex: 1, marginLeft: spacing.innerMd },
  title: { ...fonts.cardTitle, color: palette.white },
  text: { ...fonts.body, color: palette.textOnDark, marginTop: 2, opacity: 0.8 },
});
