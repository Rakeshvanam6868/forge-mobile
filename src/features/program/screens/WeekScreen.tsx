import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useCurrentProgram } from '../hooks/useProgram';
import { useCurrentWeek } from '../hooks/useWeekPlan';
import { useProgramState } from '../../home/hooks/useProgramState';
import { Badge } from '../../../core/components/Badge';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GreetingHeader } from '../../../core/components/GreetingHeader';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { SCROLL_BOTTOM_PADDING } from '../../../core/theme/layout';

const FOCUS_ICONS: Record<string, string> = { strength: '💪', cardio: '🏃', mobility: '🧘', rest: '😴' };
const CATEGORY_ICONS: Record<string, string> = { protein: '🥩', carbs: '🍚', vegetables: '🥦', essentials: '🧴' };

export const WeekScreen = () => {
  const { data: program, isLoading: progLoading } = useCurrentProgram();
  const { state, isLoading: stateLoading } = useProgramState();
  const { programDay, currentWeekNumber, dayNumberInWeek } = state?.progress ?? { programDay: 1, currentWeekNumber: 1, dayNumberInWeek: 1 };
  const { data: weekData, isLoading: weekLoading } = useCurrentWeek(program?.id, currentWeekNumber);

  if (progLoading || stateLoading || weekLoading || !state) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }
  if (!weekData) {
    return <View style={[styles.screen, styles.center]}><Text style={styles.emptyText}>No program found.</Text></View>;
  }

  const groceryGroups: Record<string, string[]> = {};
  weekData.groceries.forEach((g) => {
    if (!groceryGroups[g.category]) groceryGroups[g.category] = [];
    groceryGroups[g.category].push(g.item_name);
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 👋 Greeting */}
      <GreetingHeader />

      <View style={styles.header}>
        <Text style={styles.caption}>WEEK {currentWeekNumber}</Text>
        <Text style={styles.title}>Your Weekly Plan</Text>
        <Text style={styles.meta}>Program Day {programDay} · Day {dayNumberInWeek} of 7</Text>
      </View>

      {/* ══════ TIMELINE ══════ */}
      <SectionBlock title="Daily Plan">
        {weekData.days.map((day, idx) => {
          const isToday = day.day_number === dayNumberInWeek;
          const isDone = day.day_number < dayNumberInWeek;
          const isFuture = !isToday && !isDone;
          const isLast = idx === weekData.days.length - 1;

          return (
            <View key={day.id} style={styles.tlItem}>
              <View style={styles.tlTrack}>
                <View style={[styles.tlDot, isDone && styles.dotDone, isToday && styles.dotToday, isFuture && styles.dotFuture]} />
                {!isLast && <View style={[styles.tlLine, isDone && styles.lineDone]} />}
              </View>
              <View style={[styles.dayCard, isDone && styles.dayDone, isToday && styles.dayToday, isFuture && styles.dayFuture]}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>Day {day.day_number}</Text>
                  {isToday && <Badge label="TODAY" variant="primary" />}
                  {isDone && <Badge label="DONE" variant="success" />}
                </View>
                <Text style={[styles.dayTitle, isFuture && styles.dayTitleFuture]} numberOfLines={2}>
                  {FOCUS_ICONS[day.focus_type] || '📋'}  {day.title}
                </Text>
                <Text style={styles.dayFocus}>{day.focus_type.toUpperCase()}</Text>
              </View>
            </View>
          );
        })}
      </SectionBlock>

      {/* ══════ GROCERY LIST ══════ */}
      <SectionBlock title="🛒 Grocery List">
        <View style={styles.groceryCard}>
          {Object.entries(groceryGroups).map(([category, items], idx) => (
            <View key={category} style={[styles.gSection, idx > 0 && styles.gDivider]}>
              <View style={styles.gCatRow}>
                <View style={styles.iconWrap}><Text style={styles.iconInner}>{CATEGORY_ICONS[category] || '📦'}</Text></View>
                <Text style={styles.gCatName}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
              </View>
              {items.map((item, i) => (
                <View key={i} style={styles.gItemRow}><Text style={styles.gItemName}>{item}</Text></View>
              ))}
            </View>
          ))}
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

  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: palette.iconTint,
    alignItems: 'center', justifyContent: 'center',
  },
  iconInner: { fontSize: 20 },

  groceryCard: {
    backgroundColor: palette.bgSecondary,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    ...shadows.level1,
  },
  gSection: { marginBottom: spacing.lg },
  gDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.borderSubtle, paddingTop: spacing.lg },
  gCatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.innerMd, marginBottom: spacing.innerSm },
  gCatName: { ...fonts.cardTitle, color: palette.textPrimary },
  gItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, paddingLeft: spacing['5xl'] },
  gItemName: { ...fonts.body, color: palette.textSecondary },
});
