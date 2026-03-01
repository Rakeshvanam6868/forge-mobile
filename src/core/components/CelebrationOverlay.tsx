import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { palette, fonts, spacing, radius } from '../../core/theme/designTokens';

const { width: SCREEN_W } = Dimensions.get('window');

const CONFETTI_COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const PARTICLE_COUNT = 24;

interface CelebrationOverlayProps {
  visible: boolean;
  streak: number;
  message?: string;
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  startX: number;
}

/**
 * Full-screen celebration overlay with confetti + streak display.
 * Pure Animated API — no lottie needed.
 */
export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  visible,
  streak,
  message = 'Day Complete!',
}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 6,
      startX: SCREEN_W * 0.2 + Math.random() * SCREEN_W * 0.6,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Hero bounce in
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();

    // Badge fade in after delay
    Animated.timing(badgeOpacity, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Confetti burst
    const anims = particles.map((p) => {
      const dx = (Math.random() - 0.5) * SCREEN_W * 0.8;
      const dy = -(150 + Math.random() * 250);
      const toY = 400 + Math.random() * 200;

      return Animated.sequence([
        Animated.delay(Math.random() * 200),
        Animated.parallel([
          Animated.timing(p.x, { toValue: dx, duration: 1200, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(p.y, { toValue: dy, duration: 400, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: toY, duration: 800, useNativeDriver: true }),
          ]),
          Animated.timing(p.rotation, { toValue: 360 * (Math.random() > 0.5 ? 1 : -1), duration: 1200, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
      ]);
    });

    Animated.stagger(30, anims).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Confetti particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              left: p.startX,
              top: '40%',
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      {/* Celebration badge */}
      <Animated.View style={[styles.badge, { transform: [{ scale }], opacity: badgeOpacity }]}>
        <Text style={styles.checkEmoji}>✅</Text>
        <Text style={styles.badgeTitle}>{message}</Text>
        <Text style={styles.streakBig}>🔥 {streak}</Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  particle: {
    position: 'absolute',
  },
  badge: {
    backgroundColor: palette.white,
    borderRadius: radius.card,
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing['4xl'],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  checkEmoji: { fontSize: 40, marginBottom: spacing.innerSm },
  badgeTitle: { ...fonts.sectionHeader, color: palette.textPrimary },
  streakBig: { ...fonts.heroNumber, color: palette.primary, marginTop: spacing.lg },
  streakLabel: { ...fonts.caption, color: palette.textMuted, marginTop: spacing.xs },
});
