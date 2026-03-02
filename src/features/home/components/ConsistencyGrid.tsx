import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { ConsistencyGridDay } from '../../program/services/continuitySelectors';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

interface ConsistencyGridProps {
  history: ConsistencyGridDay[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = spacing.screenPadding * 2 + spacing.cardPadding * 2;
const COLUMNS = 7;
const GAP = 5;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING - (COLUMNS - 1) * GAP) / COLUMNS);

export const ConsistencyGrid: React.FC<ConsistencyGridProps> = ({ history }) => {
  const visible = history;

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

  const rows: ConsistencyGridDay[][] = [];
  for (let i = 0; i < visible.length; i += COLUMNS) rows.push(visible.slice(i, i + COLUMNS));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Journey</Text>
      <View style={styles.legendRow}>
        <Dot color={palette.success} label="Done" />
        <Dot color={palette.warning} label="Missed" />
        <Dot color={palette.borderSubtle} label="Rest" />
        <Dot color={palette.primary} label="Today" ring />
      </View>
      <View style={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((cell, ci) => {
              const dayNum = ri * COLUMNS + ci + 1;
              const done = cell.state === 'COMPLETED';
              const missed = cell.state === 'MISSED';
              const rest = cell.state === 'REST';
              const today = cell.state === 'TODAY';
              return (
                <View key={cell.date} style={[
                  styles.cell,
                  done && styles.cellDone,
                  missed && styles.cellMissed,
                  rest && styles.cellRest,
                  today && styles.cellToday,
                ]}>
                  <Text style={[styles.cellNum, done && styles.cellNumHL, missed && styles.cellNumMissed]}>{dayNum}</Text>
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
  cellRest: { backgroundColor: palette.bgPrimary, opacity: 0.8 },
  cellToday: { backgroundColor: palette.bgElevated, borderWidth: 2, borderColor: palette.primary },
  cellNum: { fontSize: 11, fontWeight: '500', color: palette.textMuted },
  cellNumHL: { color: palette.success, fontWeight: '600' },
  cellNumMissed: { color: palette.warning, fontWeight: '600' },
  cellCheck: { fontSize: 8, color: palette.success, fontWeight: '700', marginTop: -2 },
});
