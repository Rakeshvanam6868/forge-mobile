import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useCurrentProgram } from '../hooks/useProgram';
import { useCurrentWeek } from '../hooks/useWeekPlan';
import { useProgramState } from '../../home/hooks/useProgramState';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';

const FOCUS_ICONS: Record<string, string> = {
  strength: '💪',
  cardio: '🏃',
  mobility: '🧘',
  rest: '😴',
};

const CATEGORY_ICONS: Record<string, string> = {
  protein: '🥩',
  carbs: '🍚',
  vegetables: '🥦',
  essentials: '🧴',
};

export const WeekScreen = () => {
  const { data: program, isLoading: progLoading } = useCurrentProgram();
  const { state, isLoading: stateLoading } = useProgramState();

  // Pure progress from logs
  const { programDay, currentWeekNumber, dayNumberInWeek } = state?.progress ?? {
    programDay: 1,
    currentWeekNumber: 1,
    dayNumberInWeek: 1,
  };

  // Fetch ALL days for this week (no filtering by programDay)
  const { data: weekData, isLoading: weekLoading } = useCurrentWeek(program?.id, currentWeekNumber);

  if (progLoading || stateLoading || weekLoading || !state) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!weekData) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>No program found.</Text>
      </View>
    );
  }

  // Group groceries by category
  const groceryGroups: Record<string, string[]> = {};
  weekData.groceries.forEach((g) => {
    if (!groceryGroups[g.category]) groceryGroups[g.category] = [];
    groceryGroups[g.category].push(g.item_name);
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Week {currentWeekNumber}</Text>
        <Text style={styles.subtitle}>
          Program Day {programDay} · Day {dayNumberInWeek} of 7
        </Text>
      </View>

      {/* Day cards — show all 7 days for this week */}
      <Text style={styles.sectionTitle}>Daily Plan</Text>
      {weekData.days.map((day) => {
        const isToday = day.day_number === dayNumberInWeek;
        return (
          <View
            key={day.id}
            style={[styles.dayCard, isToday && styles.dayCardActive]}
          >
            <View style={styles.dayCardHeader}>
              <Text style={styles.dayNumber}>Day {day.day_number}</Text>
              {isToday && <Text style={styles.todayBadge}>TODAY</Text>}
            </View>
            <Text style={styles.dayTitle}>
              {FOCUS_ICONS[day.focus_type] || '📋'} {day.title}
            </Text>
            <Text style={styles.dayFocus}>{day.focus_type.toUpperCase()}</Text>
          </View>
        );
      })}

      {/* Grocery list by category */}
      <Text style={styles.sectionTitle}>🛒 Grocery List</Text>
      {Object.entries(groceryGroups).map(([category, items]) => (
        <View key={category} style={styles.grocerySection}>
          <Text style={styles.groceryCategory}>
            {CATEGORY_ICONS[category] || '📦'} {category.charAt(0).toUpperCase() + category.slice(1)}
          </Text>
          {items.map((item, i) => (
            <Text key={i} style={styles.groceryItem}>• {item}</Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { ...typography.h2, fontSize: 18, color: colors.text, marginTop: 24, marginBottom: 12 },
  emptyText: { ...typography.body, color: colors.textSecondary },
  dayCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  dayCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayNumber: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  todayBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dayTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  dayFocus: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  grocerySection: { marginBottom: 16 },
  groceryCategory: { ...typography.body, color: colors.text, fontWeight: '600', marginBottom: 6 },
  groceryItem: { ...typography.body, color: colors.textSecondary, marginLeft: 8, marginBottom: 2 },
});
