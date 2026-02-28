import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';

interface RecoveryCardProps {
  visible: boolean;
}

export const RecoveryCard: React.FC<RecoveryCardProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Missed yesterday. ⚠️</Text>
      <Text style={styles.text}>
        Do a short session today to stay on track.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF2F2', // Light red
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA', // Border red
    marginBottom: 16,
  },
  title: {
    ...typography.h2,
    fontSize: 16,
    color: '#991B1B', // Dark red
    marginBottom: 4,
  },
  text: {
    ...typography.bodySmall,
    color: '#B91C1C', // Med red
  },
});
