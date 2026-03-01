import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { GridDay } from '../services/consistencyEngine';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

interface ConsistencyGridProps {
  history: GridDay[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = spacing.screenPadding * 2 + spacing.cardPadding * 2;
const COLUMNS = 7;
const GAP = 5;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING - (COLUMNS - 1) * GAP) / COLUMNS);

export const ConsistencyGrid: React.FC<ConsistencyGridProps> = ({ history }) => {
  const visible = history.filter((d) => d.status !== 'before_program');

  if (visible.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Journey</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏁</Text>
          <Text style={styles.emptyTitle}>Day 1 starts now</Text>
          <Text style={styles.emptyText}>Complete your workout to light up the grid!</Text>
        </View>
      </View>
    );
  }

  const rows: GridDay[][] = [];
  for (let i = 0; i < visible.length; i += COLUMNS) rows.push(visible.slice(i, i + COLUMNS));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Journey</Text>
      <View style={styles.legendRow}>
        <Dot color={palette.success} label="Done" />
        <Dot color={palette.warning} label="Missed" />
        <Dot color={palette.danger} label="3+ Missed" />
        <Dot color={palette.primary} label="Today" ring />
      </View>
      <View style={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((cell, ci) => {
              const dayNum = ri * COLUMNS + ci + 1;
              const done = cell.status === 'completed';
              const missed = cell.status === 'missed';
              const missedLong = cell.status === 'missed_long';
              const today = cell.status === 'today';
              return (
                <View key={cell.date} style={[
                  styles.cell,
                  done && styles.cellDone,
                  missed && styles.cellMissed,
                  missedLong && styles.cellMissedLong,
                  today && styles.cellToday,
                ]}>
                  <Text style={[styles.cellNum, (done || missedLong) && styles.cellNumHL]}>{dayNum}</Text>
                  {done && <Text style={styles.cellCheck}>✓</Text>}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const Dot = ({ color, label, ring }: { color: string; label: string; ring?: boolean }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, ring ? { borderWidth: 2, borderColor: color } : { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.bgSecondary,
    padding: spacing.cardPadding,
    borderRadius: radius.card,
    ...shadows.level1,
  },
  title: { ...fonts.cardTitle, color: palette.textPrimary, marginBottom: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 36, marginBottom: spacing.innerSm },
  emptyTitle: { ...fonts.cardTitle, color: palette.textPrimary, marginBottom: spacing.xs },
  emptyText: { ...fonts.body, color: palette.textMuted, textAlign: 'center' },
  legendRow: { flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.innerMd, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'transparent' },
  legendText: { ...fonts.caption, color: palette.textMuted },
  grid: { gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE, borderRadius: 12,
    backgroundColor: palette.bgPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  cellDone: { backgroundColor: palette.successSoft },
  cellMissed: { backgroundColor: palette.warningSoft },
  cellMissedLong: { backgroundColor: palette.dangerSoft },
  cellToday: { backgroundColor: palette.bgElevated, borderWidth: 2, borderColor: palette.primary },
  cellNum: { fontSize: 11, fontWeight: '500', color: palette.textMuted },
  cellNumHL: { color: palette.success, fontWeight: '600' },
  cellCheck: { fontSize: 8, color: palette.success, fontWeight: '700', marginTop: -2 },
});
