import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAnalytics } from '../hooks/useAnalytics';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { RetentionMetrics } from '../types/analytics';

const COHORT_EMOJI: Record<string, string> = {
  new: '🌱', exploring: '🔍', committed: '🔥', at_risk: '⚠️', churned: '💀',
};

const TREND_EMOJI: Record<string, string> = { up: '📈', down: '📉', stable: '➡️' };

export const AnalyticsScreen = () => {
  const { analytics, isLoading } = useAnalytics();

  if (isLoading || !analytics) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { retention, activation, funnel, dropOff, streakIntelligence: si, usage, sessionDepth, consistencyScore } = analytics;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>📊 Analytics (Dev)</Text>

      {/* User State */}
      <Section title="User State">
        <Row label="First Seen" value={analytics.firstSeenDate ?? '—'} />
        <Row label="User Type" value={`${COHORT_EMOJI[analytics.userType]} ${analytics.userType.toUpperCase()}`} />
        <Row label="Consistency Score" value={`${consistencyScore}/100`} highlight />
      </Section>

      {/* Retention */}
      <Section title="Retention">
        <View style={styles.retentionGrid}>
          {(['d1', 'd3', 'd7', 'd14', 'd30'] as const).map((key) => (
            <View key={key} style={styles.retentionCell}>
              <Text style={styles.retentionLabel}>{key.toUpperCase()}</Text>
              <Text style={[
                styles.retentionValue,
                retention[key] === true && styles.retentionPass,
                retention[key] === false && styles.retentionFail,
              ]}>
                {retention[key] === null ? '—' : retention[key] ? '✅' : '❌'}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      {/* Activation */}
      <Section title="Activation">
        <Row label="Activated" value={activation.isActivated ? '✅ Yes' : '❌ No'} />
        <Row label="Time to Activate" value={activation.activationTimeHours !== null ? `${activation.activationTimeHours}h` : '—'} />
      </Section>

      {/* Funnel */}
      <Section title="Engagement Funnel">
        <Row label="Open Days" value={String(funnel.openDays)} />
        <Row label="Viewed Days" value={String(funnel.viewedDays)} />
        <Row label="Completed Days" value={String(funnel.completedDays)} />
        <View style={styles.divider} />
        <Row label="Open → View" value={pct(funnel.openToViewRate)} />
        <Row label="View → Complete" value={pct(funnel.viewToCompleteRate)} />
        <Row label="Open → Complete" value={pct(funnel.openToCompleteRate)} />
      </Section>

      {/* Streak Intelligence */}
      <Section title="Streak Intelligence">
        <Row label="Current Streak" value={`${si.currentStreak} days`} highlight />
        <Row label="Longest Streak" value={`${si.longestStreak} days`} />
        <Row label="Average Streak" value={`${si.averageStreakLength} days`} />
        <Row label="Total Breaks" value={String(si.totalStreakBreaks)} />
        <Row label="Recoveries (≤48h)" value={String(si.streakRecoveryCount)} />
      </Section>

      {/* Usage */}
      <Section title="Usage Frequency">
        <Row label="Last 7 Days" value={`${usage.activeDaysLast7}/7`} />
        <Row label="Last 30 Days" value={`${usage.activeDaysLast30}/30`} />
        <Row label="Trend" value={`${TREND_EMOJI[usage.usageTrend]} ${usage.usageTrend}`} />
      </Section>

      {/* Session Depth */}
      <Section title="Session Depth">
        <Row label="Completion/Active Day" value={pct(sessionDepth.completionPerActiveDay)} />
        <Row label="View-Only Days" value={String(sessionDepth.viewOnlyDays)} />
        <Row label="Open-Only Days" value={String(sessionDepth.openOnlyDays)} />
      </Section>

      {/* Drop-Off */}
      <Section title="Drop-Off Detection">
        {dropOff.dropOffDate ? (
          <>
            <Row label="Drop-Off Date" value={dropOff.dropOffDate} />
            <Row label="Program Day" value={String(dropOff.dropOffProgramDay)} />
            <Row label="Days Ago" value={String(dropOff.daysSinceDropOff)} />
          </>
        ) : (
          <Text style={styles.noDropOff}>✅ No drop-off detected</Text>
        )}
      </Section>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, highlight && styles.rowHighlight]}>{value}</Text>
  </View>
);

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// ═══════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  screenTitle: { ...typography.h1, color: colors.text, marginBottom: 24 },

  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { ...typography.h2, fontSize: 16, color: colors.primary, marginBottom: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { ...typography.body, color: colors.text, fontWeight: '600' },
  rowHighlight: { color: colors.primary, fontWeight: '800' },

  retentionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  retentionCell: { alignItems: 'center', flex: 1 },
  retentionLabel: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '700', marginBottom: 4 },
  retentionValue: { fontSize: 18 },
  retentionPass: { color: '#22C55E' },
  retentionFail: { color: '#EF4444' },

  noDropOff: { ...typography.body, color: '#22C55E', textAlign: 'center', paddingVertical: 8 },
});
