import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, fonts, spacing, shadows } from '../../core/theme/designTokens';
import { BrandIdentity } from './BrandIdentity';

/**
 * Premium Branded Header — glassmorphic floating effect with BrandIdentity.
 */
export const BrandHeader: React.FC = () => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['rgba(20, 20, 20, 0.85)', 'rgba(10, 10, 10, 0.95)']}
        style={styles.container}
      >
        <View style={styles.content}>
          <BrandIdentity size="small" />
          <View style={styles.divider} />
          <Text style={styles.dateText}>{today}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    ...shadows.level2,
    ...Platform.select({
      android: { elevation: 8 },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  dateText: {
    ...fonts.label,
    color: palette.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
