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

const STATE_CONFIG: Record<CardState, { bg: string; border: string }> = {
  default:   { bg: palette.bgCard, border: palette.borderSubtle },
  today:     { bg: palette.bgCard, border: 'rgba(255,59,59,0.20)' },
  completed: { bg: palette.bgCard, border: palette.successSubtle },
  locked:    { bg: palette.bgCard, border: palette.borderSubtle },
  adapted:   { bg: palette.bgCard, border: 'rgba(255,255,255,0.10)' },
};

export const PrimaryCard: React.FC<PrimaryCardProps> = ({ children, state = 'default', onPress, accentColor, style }) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const c = STATE_CONFIG[state];
  const isToday = state === 'today' || accentColor != null;

  const handlePressIn = () => {
    if (onPress) Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    if (onPress) Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const card = (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: c.bg, 
          borderColor: c.border,
          transform: [{ scale }] 
        },
        isToday && styles.accentBorder,
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
    padding: 20, // Specified 20px
    marginBottom: spacing.cardGap,
    borderWidth: 1,
  },
  accentBorder: {
    borderLeftWidth: 2,
    borderLeftColor: palette.primary,
  },
  locked: { opacity: 0.20 },
});
