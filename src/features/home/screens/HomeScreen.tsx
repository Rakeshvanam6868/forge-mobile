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
import { useLayoutTokens } from '../../../core/theme/layout';
import { toDateString } from '../../../core/utils/dateUtils';
import { UserEvent } from '../../analytics/types/analytics';
import { getTodayState, buildConsistencyGrid } from '../../program/services/continuitySelectors';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';

export const HomeScreen = () => {
  const { state: programState, isLoading: isProgramLoading } = useProgramState();
  const { analytics, events, isLoading: isAnalyticsLoading } = useAnalytics();
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const { scrollBottomPadding } = useLayoutTokens();
  
  const handleLogout = async () => { try { await authService.signOut(); } catch (e) { console.error('Logout failed:', e); } };

  if (isProgramLoading || isAnalyticsLoading || isProfileLoading || !programState || !analytics || !events) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  const { todayState, nextDateStr, backendGrid, currentStreak } = useMemo(() => {
    const start = analytics.firstSeenDate || toDateString(new Date());
    const tState = getTodayState(start, toDateString(new Date()), profile?.weekly_frequency, events);
    const { nextTrainingDateStr, grid, currentStreak } = buildConsistencyGrid(start, toDateString(new Date()), profile?.weekly_frequency, events);
    
    // Format nextDateStr nicely
    const today = toDateString(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateString(tomorrow);
    
    let displayDate = nextTrainingDateStr;
    if (nextTrainingDateStr === today) displayDate = 'Today';
    else if (nextTrainingDateStr === tomorrowStr) displayDate = 'Tomorrow';
    else {
      displayDate = new Date(nextTrainingDateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' });
    }

    return { todayState: tState, nextDateStr: displayDate, backendGrid: grid, currentStreak };
  }, [events, analytics.firstSeenDate, profile?.weekly_frequency]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]} showsVerticalScrollIndicator={false}>
      {/* 👋 Greeting */}
      <GreetingHeader />

      <RecoveryCard 
        visible={todayState === 'RECOVERY'} 
        nextTrainingDateString={nextDateStr} 
      />

      {/* ══════ HERO STREAK (gradient) ══════ */}
      <GradientCard colors={['#1E293B', '#2D3A4F']}>
        <View style={styles.heroContent}>
          <Text style={styles.heroFlame}>🔥</Text>
          <Text style={styles.heroNum}>{currentStreak}</Text>
          <Text style={styles.heroLabel}>Day Streak</Text>
          <Text style={styles.heroMeta}>Adaptive Timeline</Text>
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
          currentStreak={currentStreak} 
        />
      </SectionBlock>

      <SectionBlock>
        <ConsistencyGrid history={backendGrid} />
      </SectionBlock>

      <View style={styles.logoutWrap}><AuthButton title="Logout" onPress={handleLogout} variant="outline" /></View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgPrimary },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.screenPadding, paddingTop: spacing['3xl'] },
  
  heroContent: { alignItems: 'center', paddingVertical: spacing.innerMd },
  heroFlame: { fontSize: 48, marginBottom: spacing.xs },
  heroNum: { ...fonts.heroNumber, color: palette.white, lineHeight: 72 },
  heroLabel: { ...fonts.sectionHeader, color: palette.textOnDark, marginTop: -4 },
  heroMeta: { ...fonts.caption, color: 'rgba(255,255,255,0.6)', marginTop: spacing.md },

  statRow: { flexDirection: 'row', gap: spacing.innerSm, marginTop: spacing.cardGap, marginBottom: spacing.sectionGap },
  
  logoutWrap: { marginTop: spacing['4xl'], marginBottom: spacing.xl },
});
