import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts, spacing, radius } from '../../../core/theme/designTokens';

interface RecoveryCardProps {
  visible: boolean;
}

export const RecoveryCard: React.FC<RecoveryCardProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Missed yesterday</Text>
        <Text style={styles.text}>Do a short session today to stay on track.</Text>
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
    backgroundColor: palette.iconTintWarm,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  content: { flex: 1, marginLeft: spacing.innerMd },
  title: { ...fonts.cardTitle, color: '#92400E' },
  text: { ...fonts.body, color: '#A16207', marginTop: 2 },
});
