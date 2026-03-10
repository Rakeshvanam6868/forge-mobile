import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { 
  useConsistencyMetrics, 
  useMuscleVolumeBalance, 
  useWeeklyVolume,
  usePersonalRecords
} from '../hooks/useProgressAnalytics';
import { VictoryBar, VictoryChart, VictoryTheme, VictoryAxis } from 'victory-native';

// Shared components from Home / Auth
import { GradientCard } from '../../../core/components/GradientCard';
import { ConsistencyGrid } from '../../home/components/ConsistencyGrid';
import { AuthButton } from '../../auth/components/AuthButton';
import { authService } from '../../auth/services/authService';

// Analytics data for consistency grid
import { useAnalytics } from '../../analytics/hooks/useAnalytics';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { buildConsistencyGrid } from '../../program/services/continuitySelectors';
import { toDateString } from '../../../core/utils/dateUtils';

export const ProgressScreen = () => {
  const { data: consistency, isLoading: loadingConsistency } = useConsistencyMetrics();
  const { data: muscleBalance, isLoading: loadingMuscle } = useMuscleVolumeBalance();
  const { data: weeklyVolume, isLoading: loadingWeekly } = useWeeklyVolume();
  const { data: personalRecords, isLoading: loadingPRs } = usePersonalRecords();
  const { analytics, events, isLoading: loadingAnalytics } = useAnalytics();
  const { profile, isLoading: loadingProfile } = useUserProfile();

  const [activeTab, setActiveTab] = useState<'overview' | 'muscles' | 'exercises'>('overview');

  const isLoading = loadingConsistency || loadingMuscle || loadingWeekly || loadingPRs || loadingAnalytics || loadingProfile;

  // Build consistency grid data (same logic as HomeScreen)
  const { backendGrid, currentStreak } = useMemo(() => {
    if (!analytics || !events) return { backendGrid: [], currentStreak: 0 };
    const start = analytics.firstSeenDate || toDateString(new Date());
    const { grid, currentStreak } = buildConsistencyGrid(start, toDateString(new Date()), profile?.weekly_frequency, events);
    return { backendGrid: grid, currentStreak };
  }, [events, analytics, profile?.weekly_frequency]);

  // Workout Frequency Insights
  const frequencyInsights = useMemo(() => {
    if (!consistency || consistency.total === 0) return null;
    const weeksActive = Math.max(1, Math.ceil(consistency.total / Math.max(1, consistency.thisWeek || 1)));
    const avgPerWeek = (consistency.total / Math.max(1, weeksActive)).toFixed(1);
    const badge = parseFloat(avgPerWeek) >= 3 ? { emoji: '🎯', label: 'Consistent' } : { emoji: '🚀', label: 'Getting Started' };
    return { avgPerWeek, bestWeek: consistency.thisWeek, badge };
  }, [consistency]);

  const handleLogout = async () => {
    try { await authService.signOut(); } catch (e) { console.error('Logout failed:', e); }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: 12, ...fonts.body, color: palette.textSecondary }}>Formatting Insights...</Text>
      </SafeAreaView>
    );
  }

  // 1. EMPTY STATE
  if (!consistency || consistency.total === 0) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={styles.emptyEmoji}>📉</Text>
        <Text style={styles.emptyTitle}>No progress data yet.</Text>
        <Text style={styles.emptyText}>Complete your first workout to start tracking your strength, volume, and consistency!</Text>
        <View style={styles.logoutWrap}><AuthButton title="Logout" onPress={handleLogout} variant="outline" /></View>
      </SafeAreaView>
    );
  }

  // Formatting for Victory Charts
  const weeklyVolumeData = (weeklyVolume || []).map(w => ({
    x: `W${w.week}`,
    y: Math.round(w.total_volume)
  }));

  const muscleData = (muscleBalance || []).map(m => ({
    x: m.muscle_group,
    y: Math.round(m.total_volume)
  }));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
      </View>

      {/* ══════ STREAK HERO ══════ */}
      <View style={styles.heroWrap}>
        <GradientCard colors={['#1E293B', '#2D3A4F']}>
          <View style={styles.heroContent}>
            <Text style={styles.heroFlame}>🔥</Text>
            <Text style={styles.heroNum}>{currentStreak}</Text>
            <Text style={styles.heroLabel}>Day Streak</Text>
          </View>
        </GradientCard>
      </View>

      {/* ══════ TABS ══════ */}
      <View style={styles.tabContainer}>
        {(['overview', 'muscles', 'exercises'] as const).map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {activeTab === 'overview' && (
          <>
            {/* Overview Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Current Streak</Text>
                <Text style={styles.statVal}>{consistency?.currentStreak} 🔥</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Workouts</Text>
                <Text style={styles.statVal}>{consistency?.total}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>This Week</Text>
                <Text style={styles.statVal}>{consistency?.thisWeek}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Longest Streak</Text>
                <Text style={styles.statVal}>{consistency?.longestStreak} 🏆</Text>
              </View>
            </View>

            {/* Weekly Volume Chart */}
            {weeklyVolumeData.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>Weekly Training Volume (kg)</Text>
                <View style={styles.chartWrapper}>
                  <VictoryChart theme={VictoryTheme.material} domainPadding={20} height={220} padding={{ top: 20, bottom: 40, left: 50, right: 20 }}>
                    <VictoryAxis style={{ tickLabels: { fontSize: 10, fill: palette.textSecondary } }} />
                    <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10, fill: palette.textSecondary } }} />
                    <VictoryBar 
                      data={weeklyVolumeData} 
                      style={{ data: { fill: palette.primary, width: 25, rx: 4 } }} 
                      animate={{ duration: 500, onLoad: { duration: 500 } }}
                    />
                  </VictoryChart>
                </View>
              </View>
            )}
          </>
        )}

        {activeTab === 'muscles' && (
          <>
            {/* Muscle Distribution Chart */}
            {muscleData.length > 0 ? (
              <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>Muscle Group Balance (Volume)</Text>
                <View style={styles.chartWrapper}>
                  <VictoryChart theme={VictoryTheme.material} domainPadding={30} height={280} padding={{ top: 20, bottom: 40, left: 80, right: 20 }}>
                    <VictoryAxis style={{ tickLabels: { fontSize: 10, fill: palette.textSecondary, fontWeight: 'bold' } }} />
                    <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10, fill: palette.textSecondary } }} />
                    <VictoryBar 
                      horizontal
                      data={muscleData} 
                      style={{ data: { fill: palette.info,   width: 20 } }} 
                      animate={{ duration: 500 }}
                    />
                  </VictoryChart>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyText}>No muscle group data yet.</Text>
            )}
          </>
        )}

        {activeTab === 'exercises' && (
          <View style={styles.prsContainer}>
            <Text style={styles.cardTitle}>Personal Records</Text>
            {personalRecords?.map(pr => (
              <View key={pr.exercise_id} style={styles.prCard}>
                <Text style={styles.prName}>{pr.exercise_name}</Text>
                <View style={styles.prRow}>
                  <Text style={styles.prStat}>Top Set: <Text style={styles.prVal}>{pr.max_weight > 0 ? `${pr.max_weight}kg` : `${pr.max_reps} reps`}</Text></Text>
                  <Text style={styles.prStat}>Max Volume: <Text style={styles.prVal}>{pr.max_volume}</Text></Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ══════ CONSISTENCY GRID (GitHub-style) ══════ */}
        <ConsistencyGrid history={backendGrid} />

        {/* ══════ NEW: WORKOUT FREQUENCY INSIGHTS ══════ */}
        {frequencyInsights && (
          <View style={styles.insightsCard}>
            <Text style={styles.cardTitle}>Workout Frequency</Text>
            <View style={styles.insightsRow}>
              <View style={styles.insightItem}>
                <Text style={styles.insightVal}>{frequencyInsights.avgPerWeek}</Text>
                <Text style={styles.insightLabel}>Avg / Week</Text>
              </View>
              <View style={styles.insightDivider} />
              <View style={styles.insightItem}>
                <Text style={styles.insightVal}>{frequencyInsights.bestWeek}</Text>
                <Text style={styles.insightLabel}>This Week</Text>
              </View>
              <View style={styles.insightDivider} />
              <View style={styles.insightItem}>
                <Text style={styles.insightBadgeEmoji}>{frequencyInsights.badge.emoji}</Text>
                <Text style={styles.insightLabel}>{frequencyInsights.badge.label}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════ LOGOUT ══════ */}
        <View style={styles.logoutWrap}>
          <AuthButton title="Logout" onPress={handleLogout} variant="outline" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bgPrimary },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { ...fonts.statValue, color: palette.textPrimary, marginBottom: 8 },
  emptyText: { ...fonts.body, color: palette.textSecondary, textAlign: 'center' },
  header: { padding: spacing.screenPadding, paddingBottom: 8 },
  headerTitle: { ...fonts.screenTitle, color: palette.textPrimary },

  // Hero streak
  heroWrap: { paddingHorizontal: spacing.screenPadding, marginBottom: 16 },
  heroContent: { alignItems: 'center', paddingVertical: spacing.innerMd },
  heroFlame: { fontSize: 40, marginBottom: spacing.xs },
  heroNum: { ...fonts.heroNumber, color: palette.white, lineHeight: 60 },
  heroLabel: { ...fonts.sectionHeader, color: palette.textOnDark, marginTop: -2 },

  // Tabs
  tabContainer: { flexDirection: 'row', paddingHorizontal: spacing.screenPadding, marginBottom: 16, gap: 8 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: palette.bgSecondary },
  tabBtnActive: { backgroundColor: palette.primary },
  tabText: { ...fonts.caption, fontWeight: '600', color: palette.textSecondary },
  tabTextActive: { color: palette.white },

  // Scroll content
  scrollContent: { padding: spacing.screenPadding, paddingBottom: 60, gap: spacing.sectionGap },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: palette.white, padding: 16, borderRadius: radius.md, ...shadows.card },
  statLabel: { ...fonts.caption, color: palette.textSecondary, marginBottom: 4 },
  statVal: { ...fonts.statValue, color: palette.textPrimary },

  // Charts
  chartCard: { backgroundColor: palette.white, borderRadius: radius.md, padding: 16, ...shadows.card },
  cardTitle: { ...fonts.cardTitle, color: palette.textPrimary, marginBottom: 8 },
  chartWrapper: { alignItems: 'center', justifyContent: 'center', marginHorizontal: -20 },

  // PRs
  prsContainer: { gap: 12 },
  prCard: { backgroundColor: palette.bgSecondary, padding: 16, borderRadius: radius.sm },
  prName: { ...fonts.cardTitle, color: palette.textPrimary, marginBottom: 8 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between' },
  prStat: { ...fonts.caption, color: palette.textSecondary },
  prVal: { fontWeight: '700', color: palette.textPrimary },

  // Frequency insights (NEW)
  insightsCard: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    ...shadows.card,
  },
  insightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  insightItem: { alignItems: 'center', flex: 1 },
  insightVal: { ...fonts.statValue, color: palette.primary },
  insightBadgeEmoji: { fontSize: 28, marginBottom: 2 },
  insightLabel: { ...fonts.caption, color: palette.textSecondary, marginTop: 4 },
  insightDivider: { width: 1, height: 40, backgroundColor: palette.borderSubtle },

  // Logout
  logoutWrap: { marginTop: spacing.lg, marginBottom: spacing.xl },
});
