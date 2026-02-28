import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { GridDay } from '../services/consistencyEngine';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';

interface ConsistencyGridProps {
  history: GridDay[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 40; // 20 container padding × 2
const COLUMNS = 7;
const GAP = 6;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING - (COLUMNS - 1) * GAP) / COLUMNS);

/**
 * Premium fitness consistency grid.
 *
 * - 7 columns, flows left→right, top→bottom
 * - Day number inside each cell
 * - Today pulsing ring, completed = solid green, missed = yellow/red
 * - Day 1 always starts at position [row 1, col 1]
 */
export const ConsistencyGrid: React.FC<ConsistencyGridProps> = ({ history }) => {
  // Filter out days before program started
  const visibleDays = history.filter((d) => d.status !== 'before_program');

  if (visibleDays.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Journey</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏁</Text>
          <Text style={styles.emptyTitle}>Day 1 starts now</Text>
          <Text style={styles.emptyText}>Complete your workout to light up the grid!</Text>
        </View>
      </View>
    );
  }

  // Build rows of 7
  const rows: GridDay[][] = [];
  for (let i = 0; i < visibleDays.length; i += COLUMNS) {
    rows.push(visibleDays.slice(i, i + COLUMNS));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Journey</Text>

      {/* Legend */}
      <View style={styles.legendRow}>
        <LegendItem color="#22c55e" label="Done" />
        <LegendItem color="#facc15" label="Missed" />
        <LegendItem color="#ef4444" label="3+ Missed" />
        <LegendItem color={colors.primary} label="Today" ring />
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((cell, ci) => {
              const dayNum = ri * COLUMNS + ci + 1;
              const isToday = cell.status === 'today';
              const isCompleted = cell.status === 'completed';
              const isMissed = cell.status === 'missed';
              const isMissedLong = cell.status === 'missed_long';

              return (
                <View
                  key={cell.date}
                  style={[
                    styles.cell,
                    isCompleted && styles.cellCompleted,
                    isMissed && styles.cellMissed,
                    isMissedLong && styles.cellMissedLong,
                    isToday && styles.cellToday,
                  ]}
                >
                  {/* Day number */}
                  <Text
                    style={[
                      styles.cellNumber,
                      isCompleted && styles.cellNumberLight,
                      isMissedLong && styles.cellNumberLight,
                    ]}
                  >
                    {dayNum}
                  </Text>

                  {/* Completed checkmark */}
                  {isCompleted && <Text style={styles.cellCheck}>✓</Text>}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const LegendItem = ({
  color,
  label,
  ring,
}: {
  color: string;
  label: string;
  ring?: boolean;
}) => (
  <View style={styles.legendItem}>
    <View
      style={[
        styles.legendDot,
        ring
          ? { backgroundColor: 'transparent', borderWidth: 2, borderColor: color }
          : { backgroundColor: color },
      ]}
    />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  title: {
    ...typography.h2,
    fontSize: 18,
    color: colors.text,
    marginBottom: 14,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    ...typography.h2,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Grid
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cell states
  cellCompleted: {
    backgroundColor: '#22c55e',
  },
  cellMissed: {
    backgroundColor: '#fef08a', // yellow-200 softer
  },
  cellMissedLong: {
    backgroundColor: '#fca5a5', // red-300 softer
  },
  cellToday: {
    backgroundColor: '#dbeafe', // blue-100
    borderWidth: 2,
    borderColor: colors.primary,
  },

  // Cell content
  cellNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cellNumberLight: {
    color: '#FFFFFF',
  },
  cellCheck: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: -2,
  },
});
