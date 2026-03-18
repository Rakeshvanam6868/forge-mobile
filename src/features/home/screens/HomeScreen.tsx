import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { AuthButton } from '../../auth/components/AuthButton';
import { authService } from '../../auth/services/authService';
import { useProgramState } from '../hooks/useProgramState';
import { useAnalytics } from '../../analytics/hooks/useAnalytics';
import { StatCard } from '../../../core/components/StatCard';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GradientCard } from '../../../core/components/GradientCard';
import { BrandHeader } from '../../../core/components/BrandHeader';
import { WeeklyPerformance } from '../components/WeeklyPerformance';
import { ConsistencyGrid } from '../components/ConsistencyGrid';
import { RecoveryCard } from '../components/RecoveryCard';
import { MotivationCard } from '../components/MotivationCard';
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

  const isTodayComplete = todayState === 'COMPLETED' || todayState === 'RECOVERY';

  return (
    <View style={styles.screen}>
      <View style={styles.floatingHeader}>
        <BrandHeader />
      </View>

      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding + 80 }]} showsVerticalScrollIndicator={false}>
        {/* Motivation Card — only if today's workout not yet done */}
      <MotivationCard
        currentStreak={currentStreak}
        completedThisWeek={analytics.usage.activeDaysLast7}
        todayCompleted={isTodayComplete}
      />

      <RecoveryCard 
        visible={todayState === 'RECOVERY'} 
        nextTrainingDateString={nextDateStr} 
      />

      {/* ══════ HERO STREAK ══════ */}
      <View style={styles.heroCard}>
        <View style={styles.heroContent}>
          <Text style={styles.heroFlame}>STREAK</Text>
          <Text style={styles.heroNum}>{currentStreak}</Text>
          <Text style={styles.heroLabel}>Day Streak</Text>
          <Text style={styles.heroMeta}>Adaptive Timeline</Text>
        </View>
      </View>

      {/* Stat tiles */}
      <View style={styles.statRow}>
        <StatCard value={`${analytics.usage.activeDaysLast7}/7`} label="This Week" mono />
        <StatCard value={`${analytics.usage.activeDaysLast30}/30`} label="This Month" mono />
        <StatCard value={String(analytics.streakIntelligence.longestStreak)} label="Best Streak" />
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgBase },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.screenPadding, paddingTop: 130 },
  mainContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  
  heroCard: {
    backgroundColor: palette.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    paddingVertical: spacing.xl,
  },
  heroContent: { alignItems: 'center', justifyContent: 'center' },
  heroFlame: { ...fonts.label, fontSize: 12, color: palette.primary, marginBottom: spacing.xs, letterSpacing: 2, fontWeight: '700' },
  heroNum: { ...fonts.h1, fontSize: 64, color: palette.primary, lineHeight: 72, textAlign: 'center' },
  heroLabel: { ...fonts.h3, color: palette.textPrimary, marginTop: -4, textAlign: 'center' },
  heroMeta: { ...fonts.label, color: palette.textMuted, marginTop: spacing.md, textTransform: 'uppercase' },

  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.cardGap, marginBottom: spacing.sectionGap },
  
  logoutWrap: { marginTop: spacing.xxl, marginBottom: 80 },
});
