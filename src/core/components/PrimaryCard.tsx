import React from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, ViewStyle } from 'react-native';
import { palette, spacing, radius, shadows } from '../../core/theme/designTokens';

type CardState = 'default' | 'today' | 'completed' | 'locked' | 'adapted';

interface PrimaryCardProps {
  children: React.ReactNode;
  state?: CardState;
  onPress?: () => void;
  accentColor?: string;
  style?: ViewStyle;
}

const STATE_CONFIG: Record<CardState, { bg: string; shadow: ViewStyle }> = {
  default:   { bg: palette.bgSecondary, shadow: shadows.level1 },
  today:     { bg: palette.bgElevated,  shadow: shadows.focus },
  completed: { bg: palette.successLight, shadow: shadows.level1 },
  locked:    { bg: palette.bgPrimary,   shadow: shadows.level1 },
  adapted:   { bg: palette.bgSecondary, shadow: shadows.level2 },
};

export const PrimaryCard: React.FC<PrimaryCardProps> = ({ children, state = 'default', onPress, accentColor, style }) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const c = STATE_CONFIG[state];

  const handlePressIn = () => {
    if (onPress) Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    if (onPress) Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  const card = (
    <Animated.View
      style={[
        styles.container,
        c.shadow,
        { backgroundColor: c.bg, transform: [{ scale }] },
        accentColor != null && styles.accentBorder,
        accentColor != null && { borderLeftColor: accentColor },
        state === 'locked' && styles.locked,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {card}
      </TouchableOpacity>
    );
  }
  return card;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardGap,
  },
  accentBorder: {
    borderLeftWidth: 3,
  },
  locked: { opacity: 0.40 },
});
