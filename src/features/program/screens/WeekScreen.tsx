import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useProgramState } from '../../home/hooks/useProgramState';
import { Badge } from '../../../core/components/Badge';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GreetingHeader } from '../../../core/components/GreetingHeader';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { useLayoutTokens } from '../../../core/theme/layout';

const FOCUS_ICONS: Record<string, string> = { strength: '💪', cardio: '🏃', mobility: '🧘', rest: '😴' };

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
  screen: { flex: 1, backgroundColor: palette.bgPrimary },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.screenPadding, paddingTop: 56 },
  
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
  dotMissed: { backgroundColor: palette.danger },
  tlLine: { width: 1.5, flex: 1, backgroundColor: 'rgba(148,163,184,0.15)', marginTop: -1 },
  lineDone: { backgroundColor: 'rgba(22,163,74,0.15)' },
  lineMissed: { backgroundColor: 'rgba(239,68,68,0.15)' },

  dayCard: {
    flex: 1, backgroundColor: palette.bgSecondary,
    borderRadius: radius.card, padding: spacing.cardPadding,
    marginBottom: spacing.cardGap, marginLeft: spacing.innerSm,
    ...shadows.level1,
  },
  dayDone: { backgroundColor: palette.successSoft },
  dayToday: { backgroundColor: palette.bgElevated, ...shadows.focus },
  dayFuture: { opacity: 0.45 },
  dayMissed: { backgroundColor: palette.dangerSoft },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  dayLabel: { ...fonts.caption, color: palette.textMuted },
  dayLabelToday: { color: palette.primary },
  dayTitle: { ...fonts.cardTitle, color: palette.textPrimary, marginTop: spacing.xs },
  dayTitleFuture: { color: palette.textMuted },
  dayFocus: { ...fonts.caption, color: palette.textMuted, marginTop: 2, textTransform: 'uppercase' },
});
