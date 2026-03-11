import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

const GENERATION_STEPS = [
  { label: 'Analyzing your training experience', icon: '🧠' },
  { label: 'Choosing optimal workout split', icon: '📋' },
  { label: 'Matching exercises to your equipment', icon: '🏋️' },
  { label: 'Balancing muscle groups', icon: '⚖️' },
  { label: 'Finalizing your training program', icon: '✅' },
];

const STEP_DURATION = 700; // ms per step

interface Props {
  /** Called when animation sequence finishes */
  onAnimationComplete?: () => void;
}

export const PlanGenerationSteps: React.FC<Props> = ({ onAnimationComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const fadeAnims = useRef(GENERATION_STEPS.map(() => new Animated.Value(0))).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkAnims = useRef(GENERATION_STEPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animateSteps = async () => {
      for (let i = 0; i < GENERATION_STEPS.length; i++) {
        setActiveStep(i);

        // Fade in step
        Animated.timing(fadeAnims[i], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();

        // Animate progress bar
        Animated.timing(progressAnim, {
          toValue: (i + 1) / GENERATION_STEPS.length,
          duration: STEP_DURATION - 200,
          useNativeDriver: false,
        }).start();

        // Wait for step duration
        await new Promise(resolve => setTimeout(resolve, STEP_DURATION));

        // Animate check mark
        Animated.timing(checkAnims[i], {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }

      // Small delay after the last step then signal completion
      await new Promise(resolve => setTimeout(resolve, 400));
      onAnimationComplete?.();
    };

    animateSteps();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>⚡</Text>
          <Text style={styles.headerTitle}>Building Your Program</Text>
          <Text style={styles.headerSub}>
            Personalizing your training plan...
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        {/* Steps */}
        <View style={styles.stepList}>
          {GENERATION_STEPS.map((step, index) => {
            const isActive = index === activeStep;
            const isDone = index < activeStep;

            return (
              <Animated.View
                key={index}
                style={[
                  styles.stepRow,
                  { opacity: fadeAnims[index] },
                  isActive && styles.stepRowActive,
                ]}
              >
                <View style={[
                  styles.stepDot,
                  isDone && styles.stepDotDone,
                  isActive && styles.stepDotActive,
                ]}>
                  <Animated.Text style={[
                    styles.stepDotText,
                    { opacity: isDone ? checkAnims[index] : 1 },
                  ]}>
                    {isDone ? '✓' : step.icon}
                  </Animated.Text>
                </View>

                <Text style={[
                  styles.stepLabel,
                  isDone && styles.stepLabelDone,
                  isActive && styles.stepLabelActive,
                ]}>
                  {step.label}
                </Text>

                {isActive && (
                  <View style={styles.pulseIndicator}>
                    <View style={styles.pulseDot} />
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenPadding,
  },
  card: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    width: '100%',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    ...shadows.glow,
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIcon: { fontSize: 36, marginBottom: spacing.md },
  headerTitle: {
    ...fonts.h2,
    color: palette.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  headerSub: {
    ...fonts.body,
    color: palette.textSecondary,
    textAlign: 'center',
  },

  progressTrack: {
    height: 4,
    backgroundColor: palette.bgInner,
    borderRadius: 2,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
    borderRadius: 2,
  },

  stepList: {
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  stepRowActive: {
    backgroundColor: 'rgba(255, 59, 59, 0.05)',
  },

  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  stepDotActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  stepDotDone: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  stepDotText: {
    fontSize: 14,
    color: palette.textPrimary,
  },

  stepLabel: {
    ...fonts.body,
    color: palette.textSecondary,
    flex: 1,
  },
  stepLabelActive: {
    color: palette.textPrimary,
    fontWeight: '600',
  },
  stepLabelDone: {
    color: palette.textMuted,
  },

  pulseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.primary,
  },
});
