import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { AuthButton } from '../../auth/components/AuthButton';
import { authService } from '../../auth/services/authService';
import { useProgramState } from '../hooks/useProgramState';
import { useAnalytics } from '../../analytics/hooks/useAnalytics';
import { StatCard } from '../../../core/components/StatCard';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GradientCard } from '../../../core/components/GradientCard';
import { GreetingHeader } from '../../../core/components/GreetingHeader';
import { WeeklyPerformance } from '../components/WeeklyPerformance';
import { ConsistencyGrid } from '../components/ConsistencyGrid';
import { RecoveryCard } from '../components/RecoveryCard';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { SCROLL_BOTTOM_PADDING } from '../../../core/theme/layout';
import { toDateString } from '../../../core/utils/dateUtils';
import { GridDay } from '../services/consistencyEngine'; // Temporarily keeping the prop type
import { UserEvent } from '../../analytics/types/analytics';

// Inline Grid builder from user_events directly (replaces consistencyEngine legacy loop)
function buildGridFromEvents(events: UserEvent[], startDateStr: string): GridDay[] {
  const todayStr = toDateString(new Date());
  if (!startDateStr || events.length === 0) return [];
  
  const allDates: string[] = [];
  const cursor = new Date(startDateStr + 'T00:00:00');
  cursor.setHours(0, 0, 0, 0);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= todayDate.getTime()) {
    allDates.push(toDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const completedDates = new Set(events.filter(e => e.event_type === 'DAY_COMPLETED').map(e => e.event_date));
  
  // Note: Skipping was a legacy daily_logs feature. In user_events, skips might be STREAK_BROKEN
  // or just absent. For now, missed = absent.
  
  const grid: GridDay[] = allDates.map((date) => {
    if (date === todayStr) {
      if (completedDates.has(date)) return { date, status: 'completed' };
      return { date, status: 'today' };
    }
    
    if (completedDates.has(date)) return { date, status: 'completed' };
    return { date, status: 'missed' };
  });

  // Second pass: 3+ consecutive misses → red
  let i = 0;
  while (i < grid.length) {
    if (grid[i].status === 'missed') {
      let runStart = i;
      while (i < grid.length && grid[i].status === 'missed') {
        i++;
      }
      if (i - runStart >= 3) {
        for (let j = runStart; j < i; j++) {
          grid[j] = { ...grid[j], status: 'missed_long' };
        }
      }
    } else {
      i++;
    }
  }

  return grid;
}


export const HomeScreen = () => {
  const { state: programState, isLoading: isProgramLoading } = useProgramState();
  const { analytics, events, isLoading: isAnalyticsLoading } = useAnalytics();
  
  const handleLogout = async () => { try { await authService.signOut(); } catch (e) { console.error('Logout failed:', e); } };

  if (isProgramLoading || isAnalyticsLoading || !programState || !analytics || !events) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  const grid = useMemo(() => {
    const start = analytics.firstSeenDate || toDateString(new Date());
    return buildGridFromEvents(events, start);
  }, [events, analytics.firstSeenDate]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 👋 Greeting */}
      <GreetingHeader />

      <RecoveryCard visible={false} />

      {/* ══════ HERO STREAK (gradient) ══════ */}
      <GradientCard colors={['#1E293B', '#2D3A4F']}>
        <View style={styles.heroContent}>
          <Text style={styles.heroFlame}>🔥</Text>
          <Text style={styles.heroNum}>{analytics.streakIntelligence.currentStreak}</Text>
          <Text style={styles.heroLabel}>Day Streak</Text>
          <Text style={styles.heroMeta}>Adaptive Timeline · Best: {analytics.streakIntelligence.longestStreak}</Text>
        </View>
      </GradientCard>

      {/* Stat tiles */}
      <View style={styles.statRow}>
        <StatCard value={`${analytics.usage.activeDaysLast7}/7`} label="This Week" mono />
        <StatCard value={`${analytics.usage.activeDaysLast30}/30`} label="This Month" mono />
        <StatCard value={String(analytics.streakIntelligence.longestStreak)} label="Best Streak" icon="🏆" />
      </View>

      <SectionBlock>
        <WeeklyPerformance 
          completedThisWeek={analytics.usage.activeDaysLast7} 
          completedThisMonth={analytics.usage.activeDaysLast30} 
          currentStreak={analytics.streakIntelligence.currentStreak} 
        />
      </SectionBlock>

      <SectionBlock>
        <ConsistencyGrid history={grid} />
      </SectionBlock>

      <View style={styles.logoutWrap}><AuthButton title="Logout" onPress={handleLogout} variant="outline" /></View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgPrimary },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.screenPadding, paddingTop: spacing['3xl'], paddingBottom: SCROLL_BOTTOM_PADDING },
  
  heroContent: { alignItems: 'center', paddingVertical: spacing.innerMd },
  heroFlame: { fontSize: 48, marginBottom: spacing.xs },
  heroNum: { ...fonts.heroNumber, color: palette.white, lineHeight: 72 },
  heroLabel: { ...fonts.sectionHeader, color: palette.textOnDark, marginTop: -4 },
  heroMeta: { ...fonts.caption, color: 'rgba(255,255,255,0.6)', marginTop: spacing.md },

  statRow: { flexDirection: 'row', gap: spacing.innerSm, marginTop: spacing.cardGap, marginBottom: spacing.sectionGap },
  
  logoutWrap: { marginTop: spacing['4xl'], marginBottom: spacing.xl },
});
