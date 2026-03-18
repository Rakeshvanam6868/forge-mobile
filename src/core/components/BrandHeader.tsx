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
        colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
        style={styles.container}
      >
        <View style={styles.content}>
          <BrandIdentity size="small" showText={true} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BETA</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  container: {
    width: '100%',
    paddingTop: Platform.OS === 'android' ? 40 : 50,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  badge: {
    backgroundColor: 'rgba(255, 59, 59, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.25)',
  },
  badgeText: {
    ...fonts.labelXs,
    color: palette.primary,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
});
