import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useProgramState } from '../../home/hooks/useProgramState';
import { Badge } from '../../../core/components/Badge';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GreetingHeader } from '../../../core/components/GreetingHeader';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { useLayoutTokens } from '../../../core/theme/layout';

const FOCUS_ICONS: Record<string, string> = { strength: '💪', cardio: '💪', mobility: '💪', rest: 'REST' };

export const WeekScreen = () => {
  const { state: programState, isLoading } = useProgramState();
  const { scrollBottomPadding } = useLayoutTokens();

  if (isLoading || !programState) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  // Pure UI mapping: Read directly from derived timeline
  const timeline = programState.timeline;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <GreetingHeader />

      <View style={styles.header}>
        <Text style={styles.caption}>PROGRAM SEQUENCE</Text>
        <Text style={styles.title}>Continuity Timeline</Text>
        <Text style={styles.meta}>Your rolling training history and upcoming target.</Text>
      </View>

      <SectionBlock title="Training Flow">
        
        {timeline.map((item, idx) => {
          const isDone = item.state === 'COMPLETED';
          const isTarget = item.state === 'TARGET';
          const isFuture = item.state === 'UPCOMING';
          const isMissed = item.state === 'MISSED';
          const isLast = idx === timeline.length - 1;

          return (
            <View key={`${item.id}-${idx}`} style={styles.tlItem}>
              <View style={styles.tlTrack}>
                <View style={[styles.tlDot, isDone && styles.dotDone, isTarget && styles.dotToday, isFuture && styles.dotFuture, isMissed && styles.dotMissed]} />
                {!isLast && <View style={[styles.tlLine, isDone && styles.lineDone, isMissed && styles.lineMissed]} />}
              </View>
              <View style={[styles.dayCard, isDone && styles.dayDone, isTarget && styles.dayToday, isFuture && styles.dayFuture, isMissed && styles.dayMissed]}>
                <View style={styles.dayHeader}>
                  {isDone || isMissed ? (
                    <Text style={styles.dayLabel}>
                       {item.dateStr ? new Date(item.dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : `Day ${item.dayNumber}`}
                    </Text>
                  ) : (
                    <Text style={[styles.dayLabel, isTarget && styles.dayLabelToday]}>Day {item.dayNumber}</Text>
                  )}
                  {isDone && <Badge label="COMPLETED" variant="success" />}
                  {isTarget && <Badge label="TARGET" variant="primary" />}
                  {isMissed && <Badge label="MISSED" variant="danger" />}
                </View>
                
                <Text style={[styles.dayTitle, isFuture && styles.dayTitleFuture]} numberOfLines={2}>
                  {FOCUS_ICONS[item.focusType] || '📋'}  {item.title}
                </Text>

                <Text style={styles.dayFocus}>
                  {isDone && item.difficulty 
                    ? `Effort: ${item.difficulty.toUpperCase()}`
                    : item.focusType.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          );
        })}

      </SectionBlock>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.screenPadding, paddingTop: 40 },
  
  header: { marginBottom: spacing.xxl },
  caption: { ...fonts.label, color: palette.primary, marginBottom: spacing.xs, textTransform: 'uppercase' },
  title: { ...fonts.h1, color: palette.textPrimary },
  meta: { ...fonts.body, color: palette.textSecondary, marginTop: spacing.xs },

  // Timeline
  tlItem: { flexDirection: 'row', minHeight: 92 },
  tlTrack: { width: 28, alignItems: 'center', paddingTop: 26 },
  tlDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.bgInner, zIndex: 1, borderWidth: 1, borderColor: palette.borderLight },
  dotDone: { backgroundColor: palette.success, borderColor: palette.successSubtle },
  dotToday: { backgroundColor: palette.primary, width: 12, height: 12, borderRadius: 6, borderColor: palette.primaryGlow, borderWidth: 2 },
  dotFuture: { backgroundColor: palette.bgInner, opacity: 0.5 },
  dotMissed: { backgroundColor: palette.danger, borderColor: palette.dangerSubtle },
  tlLine: { width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: -2 },
  lineDone: { backgroundColor: 'rgba(34, 197, 94, 0.3)' },
  lineMissed: { backgroundColor: 'rgba(239, 68, 68, 0.3)' },

  dayCard: {
    flex: 1, backgroundColor: '#141414',
    borderRadius: radius.lg, padding: 16,
    marginBottom: spacing.cardGap, marginLeft: spacing.md,
    borderWidth: 1, borderColor: palette.borderSubtle,
  },
  dayDone: { borderColor: palette.successSubtle },
  dayToday: { borderColor: palette.primary, backgroundColor: palette.bgElevated, ...shadows.glow },
  dayFuture: { opacity: 0.4 },
  dayMissed: { borderColor: palette.dangerSubtle },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  dayLabel: { ...fonts.label, color: palette.textSecondary, textTransform: 'uppercase', fontSize: 10 },
  dayLabelToday: { color: palette.primary, fontWeight: '700' },
  dayTitle: { ...fonts.h3, color: palette.textPrimary, marginTop: 4 },
  dayTitleFuture: { color: palette.textSecondary },
  dayFocus: { ...fonts.label, color: palette.textMuted, marginTop: 6, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.5 },
});
