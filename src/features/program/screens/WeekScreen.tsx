import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useProgramState } from '../../home/hooks/useProgramState';
import { useAdaptiveDay } from '../hooks/useAdaptiveDay';
import { Badge } from '../../../core/components/Badge';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GreetingHeader } from '../../../core/components/GreetingHeader';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { SCROLL_BOTTOM_PADDING } from '../../../core/theme/layout';

const FOCUS_ICONS: Record<string, string> = { strength: '💪', cardio: '🏃', mobility: '🧘', rest: '😴' };

export const WeekScreen = () => {
  const { state, isLoading: stateLoading } = useProgramState();
  const { adaptiveState, isLoading: adaptiveLoading } = useAdaptiveDay();

  if (stateLoading || adaptiveLoading || !state || !adaptiveState) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  // Build a rolling 7-day timeline (last 5 days + today + tomorrow placeholder)
  const recentLogs = state.allLogs.slice(0, 5).reverse();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 👋 Greeting */}
      <GreetingHeader />

      <View style={styles.header}>
        <Text style={styles.caption}>ADAPTIVE ENGINE</Text>
        <Text style={styles.title}>Continuity Timeline</Text>
        <Text style={styles.meta}>Your rolling training history and upcoming target.</Text>
      </View>

      {/* ══════ TIMELINE ══════ */}
      <SectionBlock title="Training Flow">
        
        {/* Render History */}
        {recentLogs.map((log, idx) => (
          <View key={log.id} style={styles.tlItem}>
            <View style={styles.tlTrack}>
              <View style={[styles.tlDot, styles.dotDone]} />
              <View style={[styles.tlLine, styles.lineDone]} />
            </View>
            <View style={[styles.dayCard, styles.dayDone]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{new Date(log.log_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                {log.status === 'completed' && <Badge label="COMPLETED" variant="success" />}
                {log.is_skipped && <Badge label="SKIPPED" variant="warning" />}
              </View>
              <Text style={styles.dayTitle} numberOfLines={1}>
                {log.difficulty === 'hard' ? 'Hard Effort' : log.difficulty === 'easy' ? 'Active Recovery' : 'Solid Session'}
              </Text>
            </View>
          </View>
        ))}

        {/* Render Today (Adaptive Target) */}
        <View style={styles.tlItem}>
          <View style={styles.tlTrack}>
            <View style={[styles.tlDot, styles.dotToday]} />
            <View style={[styles.tlLine]} />
          </View>
          <View style={[styles.dayCard, styles.dayToday]}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabelToday}>Today's Session</Text>
              <Badge label="TARGET" variant="primary" />
            </View>
            <Text style={styles.dayTitle} numberOfLines={2}>
              {FOCUS_ICONS[adaptiveState.workoutType] || '📋'}  {adaptiveState.dayDetail.title}
            </Text>
            <Text style={styles.dayFocus}>{adaptiveState.workoutType.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        {/* Render Future Projection */}
        <View style={styles.tlItem}>
          <View style={styles.tlTrack}>
            <View style={[styles.tlDot, styles.dotFuture]} />
          </View>
          <View style={[styles.dayCard, styles.dayFuture]}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>Upcoming</Text>
            </View>
            <Text style={styles.dayTitleFuture} numberOfLines={1}>
              Adaptive Intelligence Computing...
            </Text>
          </View>
        </View>

      </SectionBlock>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgPrimary },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.screenPadding, paddingTop: 56, paddingBottom: SCROLL_BOTTOM_PADDING },
  emptyText: { ...fonts.body, color: palette.textMuted },

  header: { marginBottom: spacing.innerSm },
  caption: { ...fonts.badge, color: palette.primary, marginBottom: spacing.xs },
  title: { ...fonts.screenTitle, color: palette.textPrimary },
  meta: { ...fonts.label, color: palette.textMuted, marginTop: spacing.innerSm },

  // Timeline
  tlItem: { flexDirection: 'row', minHeight: 92 },
  tlTrack: { width: 28, alignItems: 'center', paddingTop: 22 },
  tlDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.borderSubtle, zIndex: 1 },
  dotDone: { backgroundColor: palette.success },
  dotToday: { backgroundColor: palette.primary, width: 12, height: 12, borderRadius: 6 },
  dotFuture: { backgroundColor: 'rgba(148,163,184,0.2)' },
  tlLine: { width: 1.5, flex: 1, backgroundColor: 'rgba(148,163,184,0.15)', marginTop: -1 },
  lineDone: { backgroundColor: 'rgba(22,163,74,0.15)' },

  dayCard: {
    flex: 1, backgroundColor: palette.bgSecondary,
    borderRadius: radius.card, padding: spacing.cardPadding,
    marginBottom: spacing.cardGap, marginLeft: spacing.innerSm,
    ...shadows.level1,
  },
  dayDone: { backgroundColor: palette.successSoft },
  dayToday: { backgroundColor: palette.bgElevated, ...shadows.focus },
  dayFuture: { opacity: 0.45 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  dayLabel: { ...fonts.caption, color: palette.textMuted },
  dayLabelToday: { color: palette.primary },
  dayTitle: { ...fonts.cardTitle, color: palette.textPrimary, marginTop: spacing.xs },
  dayTitleFuture: { color: palette.textMuted },
  dayFocus: { ...fonts.caption, color: palette.textMuted, marginTop: 2, textTransform: 'uppercase' },
});
