import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { AhaResult } from '../services/ahaEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════
// Timing Constants (exact ms control)
// ═══════════════════════════════════════════════
const TIMING = {
  // Phase 1: Screen transition
  SCREEN_FADE_IN: 200,

  // Phase 2: Thinking state
  THINKING_LINE_1_DELAY: 0,
  THINKING_LINE_2_DELAY: 500,
  THINKING_LINE_3_DELAY: 1000,
  THINKING_LINE_FADE: 200,
  THINKING_TOTAL: 1700,      // fade out starts after line 3 + small buffer

  // Phase 3: AHA reveal
  TITLE_FADE: 400,
  TYPEWRITER_SPEED: 30,      // ms per character
  TYPEWRITER_DELAY: 200,     // after title
  ROOT_CAUSE_FADE: 300,
  ROOT_CAUSE_DELAY: 200,     // after typewriter
  SHIFT_FADE: 300,
  SHIFT_DELAY: 200,
  CONNECTION_FADE: 300,
  CONNECTION_DELAY: 200,
  CTA_SLIDE: 300,
  CTA_DELAY: 200,
};

const THINKING_LINES = [
  { text: 'Analyzing your training pattern...', icon: '🧠' },
  { text: 'Understanding your consistency...', icon: '📊' },
  { text: 'Matching you with real user profiles...', icon: '🎯' },
];

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

interface Props {
  result: AhaResult;
  onContinue: () => void;
}

type Phase = 'thinking' | 'reveal';

export const AhaMomentScreen: React.FC<Props> = ({ result, onContinue }) => {
  const [phase, setPhase] = useState<Phase>('thinking');

  // ─── Thinking State Animations ───
  const screenFade = useRef(new Animated.Value(0)).current;
  const thinkingFade = useRef(new Animated.Value(1)).current;
  const thinkingLines = useRef(THINKING_LINES.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(12),
  }))).current;

  // ─── Reveal Animations ───
  const revealFade = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.95)).current;
  const mirrorOpacity = useRef(new Animated.Value(0)).current;
  const rootOpacity = useRef(new Animated.Value(0)).current;
  const shiftOpacity = useRef(new Animated.Value(0)).current;
  const connectionOpacity = useRef(new Animated.Value(0)).current;
  const connectionScale = useRef(new Animated.Value(0.98)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaTranslateY = useRef(new Animated.Value(24)).current;

  // ─── Typewriter ───
  const [mirrorText, setMirrorText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(false);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Typewriter effect
  const typewrite = useCallback((text: string): Promise<void> => {
    return new Promise(resolve => {
      setCursorVisible(true);
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setMirrorText(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setCursorVisible(false);
          resolve();
        }
      }, TIMING.TYPEWRITER_SPEED);
    });
  }, []);

  // Animate a single value in
  const fadeIn = (anim: Animated.Value, duration: number) =>
    Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true });

  const scaleIn = (anim: Animated.Value, to: number, duration: number) =>
    Animated.timing(anim, { toValue: to, duration, useNativeDriver: true });

  const slideUp = (anim: Animated.Value, duration: number) =>
    Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true });

  // ═══════════════════════════════════════════════
  // Phase 1: Thinking State
  // ═══════════════════════════════════════════════
  useEffect(() => {
    const runThinking = async () => {
      // Fade in screen
      Animated.timing(screenFade, {
        toValue: 1,
        duration: TIMING.SCREEN_FADE_IN,
        useNativeDriver: true,
      }).start();

      await sleep(TIMING.SCREEN_FADE_IN);

      // Show thinking lines sequentially
      for (let i = 0; i < THINKING_LINES.length; i++) {
        if (i > 0) await sleep(500 - TIMING.THINKING_LINE_FADE); // gap between lines
        Animated.parallel([
          Animated.timing(thinkingLines[i].opacity, {
            toValue: 1,
            duration: TIMING.THINKING_LINE_FADE,
            useNativeDriver: true,
          }),
          Animated.timing(thinkingLines[i].translateY, {
            toValue: 0,
            duration: TIMING.THINKING_LINE_FADE,
            useNativeDriver: true,
          }),
        ]).start();
        await sleep(TIMING.THINKING_LINE_FADE);
      }

      // Hold for a beat
      await sleep(500);

      // Fade out thinking state
      Animated.timing(thinkingFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      await sleep(300);

      // ═══════════════════════════════════════════════
      // Phase 2: AHA Reveal (Staggered)
      // ═══════════════════════════════════════════════
      setPhase('reveal');

      // Fade in reveal container
      Animated.timing(revealFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      await sleep(200);

      // 4.1 — Archetype Title (fade + scale 0.95→1, 400ms)
      Animated.parallel([
        fadeIn(titleOpacity, TIMING.TITLE_FADE),
        scaleIn(titleScale, 1, TIMING.TITLE_FADE),
      ]).start();

      await sleep(TIMING.TITLE_FADE + TIMING.TYPEWRITER_DELAY);

      // 4.2 — Mirror (typewriter at 30ms/char)
      Animated.timing(mirrorOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      await typewrite(result.mirror);

      await sleep(TIMING.ROOT_CAUSE_DELAY);

      // 4.3 — Root Cause (fade 300ms)
      fadeIn(rootOpacity, TIMING.ROOT_CAUSE_FADE).start();

      await sleep(TIMING.ROOT_CAUSE_FADE + TIMING.SHIFT_DELAY);

      // 4.4 — Shift (fade 300ms)
      fadeIn(shiftOpacity, TIMING.SHIFT_FADE).start();

      await sleep(TIMING.SHIFT_FADE + TIMING.CONNECTION_DELAY);

      // 4.5 — Connection Line (fade + slight scale)
      Animated.parallel([
        fadeIn(connectionOpacity, TIMING.CONNECTION_FADE),
        scaleIn(connectionScale, 1, TIMING.CONNECTION_FADE),
      ]).start();

      await sleep(TIMING.CONNECTION_FADE + TIMING.CTA_DELAY);

      // 4.6 — CTA (slide up + fade)
      Animated.parallel([
        fadeIn(ctaOpacity, TIMING.CTA_SLIDE),
        slideUp(ctaTranslateY, TIMING.CTA_SLIDE),
      ]).start();
    };

    runThinking();
  }, []);

  // ═══════════════════════════════════════════════
  // Render: Thinking State
  // ═══════════════════════════════════════════════
  const renderThinking = () => (
    <Animated.View style={[styles.thinkingContainer, { opacity: thinkingFade }]}>
      <View style={styles.thinkingCard}>
        <Text style={styles.thinkingEmoji}>⚡</Text>
        <Text style={styles.thinkingTitle}>Understanding You</Text>

        <View style={styles.thinkingLines}>
          {THINKING_LINES.map((line, i) => (
            <Animated.View
              key={i}
              style={[
                styles.thinkingLineRow,
                {
                  opacity: thinkingLines[i].opacity,
                  transform: [{ translateY: thinkingLines[i].translateY }],
                },
              ]}
            >
              <Text style={styles.thinkingLineIcon}>{line.icon}</Text>
              <Text style={styles.thinkingLineText}>{line.text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  // ═══════════════════════════════════════════════
  // Render: AHA Reveal
  // ═══════════════════════════════════════════════
  const renderReveal = () => (
    <Animated.View style={[styles.revealContainer, { opacity: revealFade }]}>
      <ScrollView
        style={styles.revealScroll}
        contentContainerStyle={styles.revealContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 4.1 — Archetype Title */}
        <Animated.View style={[
          styles.titleBlock,
          { opacity: titleOpacity, transform: [{ scale: titleScale }] },
        ]}>
          <Text style={styles.titleEmoji}>{result.emoji}</Text>
          <Text style={styles.titleLabel}>You are</Text>
          <Text style={styles.titleName}>{result.archetypeName}</Text>
        </Animated.View>

        {/* 4.2 — Mirror (Typewriter) */}
        <Animated.View style={[styles.mirrorCard, { opacity: mirrorOpacity }]}>
          <View style={styles.mirrorAccent} />
          <Text style={styles.mirrorText}>
            {mirrorText}
            {cursorVisible && <Text style={styles.cursor}>|</Text>}
          </Text>
        </Animated.View>

        {/* 4.3 — Root Cause */}
        <Animated.View style={[styles.rootBlock, { opacity: rootOpacity }]}>
          <Text style={styles.rootText}>{result.rootCause}</Text>
          <Text style={styles.progressLine}>
            This is why your progress feels{' '}
            <Text style={styles.accentText}>{result.progressFeeling}</Text>.
          </Text>
        </Animated.View>

        {/* 4.4 — Shift */}
        <Animated.View style={[styles.shiftCard, { opacity: shiftOpacity }]}>
          <Text style={styles.fixableText}>But this is fixable.</Text>
          <Text style={styles.shiftText}>{result.shift}</Text>
        </Animated.View>

        {/* 4.5 — Connection Line */}
        <Animated.View style={[
          styles.connectionBlock,
          { opacity: connectionOpacity, transform: [{ scale: connectionScale }] },
        ]}>
          <Text style={styles.connectionText}>
            We built your plan to fix <Text style={styles.connectionHighlight}>THIS</Text> pattern.
          </Text>
        </Animated.View>

        {/* Personal Tags */}
        <Animated.View style={[styles.tagsSection, { opacity: connectionOpacity }]}>
          <Text style={styles.tagsTitle}>YOUR PLAN IS BUILT ON</Text>
          {result.personalTags.map((tag, i) => (
            <View key={i} style={styles.tagRow}>
              <View style={styles.tagDot} />
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </Animated.View>

        {/* 4.6 — CTA */}
        <Animated.View style={[
          styles.ctaBlock,
          { opacity: ctaOpacity, transform: [{ translateY: ctaTranslateY }] },
        ]}>
          <TouchableOpacity style={styles.ctaButton} onPress={onContinue} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Build My Plan →</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );

  // ═══════════════════════════════════════════════
  // Root Render
  // ═══════════════════════════════════════════════
  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      {phase === 'thinking' && renderThinking()}
      {phase === 'reveal' && renderReveal()}
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bgBase,
  },

  // ─── Thinking State ───
  thinkingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenPadding,
  },
  thinkingCard: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    ...shadows.glow,
  },
  thinkingEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  thinkingTitle: {
    ...fonts.h2,
    color: palette.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  thinkingLines: {
    width: '100%',
    gap: spacing.md,
  },
  thinkingLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
  },
  thinkingLineIcon: {
    fontSize: 18,
  },
  thinkingLineText: {
    ...fonts.body,
    color: palette.textSecondary,
    fontSize: 14,
  },

  // ─── Reveal ───
  revealContainer: {
    flex: 1,
  },
  revealScroll: {
    flex: 1,
  },
  revealContent: {
    padding: spacing.screenPadding,
    paddingTop: 72,
    paddingBottom: 48,
  },

  // ─── Title Block ───
  titleBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  titleEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  titleLabel: {
    ...fonts.label,
    color: palette.textMuted,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    fontSize: 11,
  },
  titleName: {
    ...fonts.h1,
    color: palette.primary,
    textAlign: 'center',
    fontSize: 26,
    letterSpacing: -0.5,
  },

  // ─── Mirror Card ───
  mirrorCard: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    flexDirection: 'row',
    minHeight: 80,
    ...shadows.card,
  },
  mirrorAccent: {
    width: 3,
    backgroundColor: palette.primary,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  mirrorText: {
    ...fonts.body,
    color: palette.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },
  cursor: {
    color: palette.primary,
    fontWeight: '300',
  },

  // ─── Root Cause ───
  rootBlock: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  rootText: {
    ...fonts.body,
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  progressLine: {
    ...fonts.body,
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  accentText: {
    color: palette.primary,
    fontWeight: '700',
  },

  // ─── Shift Card ───
  shiftCard: {
    backgroundColor: 'rgba(255, 59, 59, 0.04)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.12)',
  },
  fixableText: {
    ...fonts.h3,
    color: palette.textPrimary,
    marginBottom: spacing.sm,
    fontSize: 17,
  },
  shiftText: {
    ...fonts.body,
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },

  // ─── Connection Line ───
  connectionBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
  },
  connectionText: {
    ...fonts.body,
    color: palette.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  connectionHighlight: {
    color: palette.primary,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ─── Personal Tags ───
  tagsSection: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.xs,
  },
  tagsTitle: {
    ...fonts.labelXs,
    color: palette.textMuted,
    marginBottom: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.primary,
    marginTop: 7,
  },
  tagText: {
    ...fonts.body,
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  // ─── CTA ───
  ctaBlock: {
    marginTop: spacing.md,
  },
  ctaButton: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadows.button,
  },
  ctaText: {
    ...fonts.button,
    color: palette.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
