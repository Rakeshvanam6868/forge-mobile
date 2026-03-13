import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAnalytics } from '../hooks/useAnalytics';
import { Badge } from '../../../core/components/Badge';
import { StatCard } from '../../../core/components/StatCard';
import { PrimaryCard } from '../../../core/components/PrimaryCard';
import { SectionBlock } from '../../../core/components/SectionBlock';
import { GradientCard } from '../../../core/components/GradientCard';
import { BrandHeader } from '../../../core/components/BrandHeader';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { useLayoutTokens } from '../../../core/theme/layout';

const TREND_EMOJI: Record<string, string> = { up: '📈', down: '📉', stable: '➡️' };

export const AnalyticsScreen = () => {
  const { analytics, isLoading } = useAnalytics();
  const { scrollBottomPadding } = useLayoutTokens();

  if (isLoading || !analytics) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={palette.primary} /></View>;
  }

  const { retention, activation, funnel, dropOff, streakIntelligence: si, usage, sessionDepth, consistencyScore } = analytics;

    <View style={styles.screen}>
      <View style={styles.floatingHeader}>
        <BrandHeader />
      </View>

      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding + 80 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>

      {/* ══════ HERO: Consistency Score (gradient) ══════ */}
      {/* ══════ HERO: Consistency Score ══════ */}
      <View style={styles.heroCard}>
        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>Consistency Score</Text>
          <Text style={styles.heroScore}>{consistencyScore}</Text>
          <View style={styles.heroBadgeRow}>
            <Badge label={analytics.userType.toUpperCase()} variant="dark" />
            <Text style={styles.heroDate}>Since {analytics.firstSeenDate ?? '—'}</Text>
          </View>
        </View>
      </View>

      {/* Retention */}
      <SectionBlock title="Retention">
        <PrimaryCard>
          <View style={styles.retRow}>
            {(['d1', 'd3', 'd7', 'd14', 'd30'] as const).map((k) => (
              <View key={k} style={styles.retCell}>
                <Text style={styles.retLabel}>{k.toUpperCase()}</Text>
                <Text style={styles.retVal}>{retention[k] === null ? '—' : retention[k] ? 'DONE' : 'MISS'}</Text>
              </View>
            ))}
          </View>
        </PrimaryCard>
      </SectionBlock>

      <SectionBlock title="Activation">
        <PrimaryCard>
          <Row label="Activated" value={activation.isActivated ? 'YES' : 'NO'} />
          <Row label="Time to Activate" value={activation.activationTimeHours !== null ? `${activation.activationTimeHours}h` : '—'} />
        </PrimaryCard>
      </SectionBlock>

      <SectionBlock title="Engagement Funnel">
        <View style={styles.tileGrid}>
          <StatCard value={String(funnel.openDays)} label="Opened" mono />
          <StatCard value={String(funnel.viewedDays)} label="Viewed" mono />
        </View>
        <View style={styles.tileGrid}>
          <StatCard value={String(funnel.completedDays)} label="Completed" mono highlight />
          <StatCard value={pct(funnel.openToCompleteRate)} label="Open → Done" mono />
        </View>
        <PrimaryCard>
          <Row label="Open → View" value={pct(funnel.openToViewRate)} />
          <Row label="View → Complete" value={pct(funnel.viewToCompleteRate)} />
        </PrimaryCard>
      </SectionBlock>

      <SectionBlock title="Streak Intelligence">
        <View style={styles.tileGrid}>
          <StatCard value={String(si.currentStreak)} label="Current" highlight mono />
          <StatCard value={String(si.longestStreak)} label="Longest" icon="🏆" mono />
        </View>
        <View style={styles.tileGrid}>
          <StatCard value={String(si.averageStreakLength)} label="Average" mono />
          <StatCard value={String(si.streakRecoveryCount)} label="Recoveries" mono />
        </View>
        <PrimaryCard><Row label="Total Breaks" value={String(si.totalStreakBreaks)} /></PrimaryCard>
      </SectionBlock>

      <SectionBlock title="Usage Frequency">
        <View style={styles.tileGrid}>
          <StatCard value={`${usage.activeDaysLast7}/7`} label="Last 7d" mono />
          <StatCard value={`${usage.activeDaysLast30}/30`} label="Last 30d" mono />
        </View>
        <PrimaryCard><Row label="Trend" value={usage.usageTrend.toUpperCase()} /></PrimaryCard>
      </SectionBlock>

      <SectionBlock title="Session Depth">
        <PrimaryCard>
          <Row label="Completion/Active Day" value={pct(sessionDepth.completionPerActiveDay)} />
          <Row label="View-Only Days" value={String(sessionDepth.viewOnlyDays)} />
          <Row label="Open-Only Days" value={String(sessionDepth.openOnlyDays)} />
        </PrimaryCard>
      </SectionBlock>

      <SectionBlock title="Drop-Off">
        <PrimaryCard>
          {dropOff.dropOffDate ? (
            <><Row label="Drop-Off Date" value={dropOff.dropOffDate} /><Row label="Program Day" value={String(dropOff.dropOffProgramDay)} /><Row label="Days Ago" value={String(dropOff.daysSinceDropOff)} /></>
          ) : (
            <View style={styles.noDropOff}><Text style={styles.noDropOffText}>✅ No drop-off detected</Text></View>
          )}
        </PrimaryCard>
      </SectionBlock>
    </View>
  </ScrollView>
</View>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metricRow}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);
function pct(n: number): string { return `${Math.round(n * 100)}%`; }

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
  content: { paddingTop: 130 },
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
    paddingVertical: spacing.lg,
  },
  heroContent: { alignItems: 'center' },
  heroLabel: { ...fonts.label, color: palette.textSecondary, textTransform: 'uppercase' },
  heroScore: { ...fonts.stat, fontSize: 64, color: palette.primary, marginVertical: spacing.sm },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.innerMd, marginTop: spacing.md },
  heroDate: { ...fonts.label, color: palette.textMuted },

  retRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  retCell: { alignItems: 'center', flex: 1 },
  retLabel: { ...fonts.label, color: palette.textSecondary, marginBottom: spacing.sm, fontSize: 10 },
  retVal: { ...fonts.label, fontSize: 13, color: palette.textPrimary, fontWeight: '700' },

  tileGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },

  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.borderSubtle },
  metricLabel: { ...fonts.body, color: palette.textSecondary, fontSize: 13 },
  metricValue: { ...fonts.mono, fontSize: 13 },

  noDropOff: { alignItems: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: palette.bgCard, borderWidth: 1, borderColor: palette.borderSubtle },
  noDropOffText: { ...fonts.label, color: palette.primary, fontWeight: '700' },
});
