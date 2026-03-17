import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { palette, fonts } from '../theme/designTokens';

interface BrandIdentityProps {
  size?: 'small' | 'medium' | 'large';
  vertical?: boolean;
  style?: ViewStyle;
}

/**
 * Reusable Brand Identity (Logo + Brand Name)
 */
export const BrandIdentity: React.FC<BrandIdentityProps> = ({ size = 'small', vertical = false, style }) => {
  const logoSize = size === 'large' ? 80 : size === 'medium' ? 50 : 32;
  const fontSize = size === 'large' ? 32 : size === 'medium' ? 24 : 18;

  return (
    <View style={[styles.container, vertical && styles.vertical, style]}>
      <Image 
        source={require('../../../assets/Trainzy-noBG.png')} 
        style={{ width: logoSize, height: logoSize, marginRight: vertical ? 0 : 12, marginBottom: vertical ? 12 : 0 }}
        resizeMode="contain"
      />
      <Text style={[styles.brandText, { fontSize }]}>Trainzy</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vertical: {
    flexDirection: 'column',
  },
  brandText: {
    ...fonts.h3,
    color: palette.textPrimary,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
