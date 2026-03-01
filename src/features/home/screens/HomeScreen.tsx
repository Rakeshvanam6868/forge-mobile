import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { AuthButton } from '../../auth/components/AuthButton';
import { authService } from '../../auth/services/authService';
import { useProgramState } from '../hooks/useProgramState';
import { StatCard } from '../../../core/components/StatCard';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GradientCard } from '../../../core/components/GradientCard';
import { GreetingHeader } from '../../../core/components/GreetingHeader';
import { WeeklyPerformance } from '../components/WeeklyPerformance';
import { ConsistencyGrid } from '../components/ConsistencyGrid';
import { RecoveryCard } from '../components/RecoveryCard';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { SCROLL_BOTTOM_PADDING } from '../../../core/theme/layout';

export const HomeScreen = () => {
  const { state, isLoading } = useProgramState();
  const handleLogout = async () => { try { await authService.signOut(); } catch (e) { console.error('Logout failed:', e); } };

  if (isLoading || !state) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 👋 Greeting */}
      <GreetingHeader />

      <RecoveryCard visible={state.missedYesterday} />

      {/* ══════ HERO STREAK (gradient) ══════ */}
      <GradientCard colors={['#1E293B', '#2D3A4F']}>
        <View style={styles.heroContent}>
          <Text style={styles.heroFlame}>🔥</Text>
          <Text style={styles.heroNum}>{state.streak}</Text>
          <Text style={styles.heroLabel}>Day Streak</Text>
          <Text style={styles.heroMeta}>Program Day {state.currentProgramDay} · Best: {state.longestStreak}</Text>
        </View>
      </GradientCard>

      {/* Stat tiles */}
      <View style={styles.statRow}>
        <StatCard value={`${state.completedThisWeek}/7`} label="This Week" mono />
        <StatCard value={`${state.completedThisMonth}/30`} label="This Month" mono />
        <StatCard value={String(state.longestStreak)} label="Best Streak" icon="🏆" />
      </View>

      <SectionBlock>
        <WeeklyPerformance completedThisWeek={state.completedThisWeek} completedThisMonth={state.completedThisMonth} currentStreak={state.streak} />
      </SectionBlock>

      <SectionBlock>
        <ConsistencyGrid history={state.grid} />
      </SectionBlock>

      <View style={styles.logoutWrap}><AuthButton title="Logout" onPress={handleLogout} variant="outline" /></View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgPrimary },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.screenPadding, paddingTop: 56, paddingBottom: SCROLL_BOTTOM_PADDING },

  heroContent: { alignItems: 'center' },
  heroFlame: { fontSize: 32, marginBottom: spacing.innerSm },
  heroNum: { ...fonts.heroNumber, color: palette.textOnDark },
  heroLabel: { ...fonts.sectionHeader, color: 'rgba(241,245,249,0.8)', marginTop: spacing.innerMd },
  heroMeta: { ...fonts.label, color: palette.textOnDarkMuted, marginTop: spacing.innerSm },

  statRow: { flexDirection: 'row', gap: spacing.innerMd },
  logoutWrap: { marginTop: spacing['4xl'] },
});
