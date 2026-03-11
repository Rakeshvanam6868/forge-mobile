import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts, spacing, radius } from '../../../core/theme/designTokens';

interface Props {
  currentStreak: number;
  completedThisWeek: number;
  weeklyTarget?: number;
  todayCompleted?: boolean;
}

const MESSAGES = {
  streak: (n: number) => `You're on a ${n}-day streak. Keep the momentum going!`,
  weekProgress: (done: number, target: number) => `You've completed ${done} workouts this week. ${target - done > 0 ? `${target - done} more to hit your goal.` : 'Goal reached!'}`,
  comeBack: () => "Ready for today's session? Your body is recovered and waiting.",
  firstDay: () => "Every champion started with day one. Let's build your streak!",
  goalReached: () => "You hit your weekly goal! Keep pushing for extra gains. 🔥",
};

export const MotivationCard: React.FC<Props> = ({
  currentStreak,
  completedThisWeek,
  weeklyTarget = 4,
  todayCompleted = false,
}) => {
  const { message, icon } = useMemo(() => {
    // Don't show if today is already completed
    if (todayCompleted) return { message: '', icon: '' };

    // Priority-based message selection
    if (currentStreak >= 3) {
      return { message: MESSAGES.streak(currentStreak), icon: '🔥' };
    }
    if (completedThisWeek >= weeklyTarget) {
      return { message: MESSAGES.goalReached(), icon: '🏆' };
    }
    if (completedThisWeek > 0 && completedThisWeek < weeklyTarget) {
      return { message: MESSAGES.weekProgress(completedThisWeek, weeklyTarget), icon: '💪' };
    }
    if (currentStreak === 0 && completedThisWeek === 0) {
      return { message: MESSAGES.firstDay(), icon: '💪' };
    }
    return { message: MESSAGES.comeBack(), icon: '💪' };
  }, [currentStreak, completedThisWeek, weeklyTarget, todayCompleted]);

  if (!message || todayCompleted) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>DAILY MOTIVATION</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.cardGap,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.15)',
  },
  icon: { fontSize: 22 },
  textWrap: { flex: 1 },
  label: {
    ...fonts.label,
    color: palette.primary,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 4,
  },
  message: {
    ...fonts.body,
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
