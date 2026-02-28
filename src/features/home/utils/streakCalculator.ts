import { toDateString } from '../../../core/utils/dateUtils';

export type DayCompletion = {
  date: string;
  completed: boolean;
};

export const calculateStreaks = (
  completedDaysMap: Record<string, boolean>,
  last30Days: string[]
) => {
  const today = toDateString(new Date());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempLongest = 0;
  
  // Connect longest streak logic
  for (const date of last30Days) {
    if (completedDaysMap[date]) {
      tempLongest++;
      longestStreak = Math.max(longestStreak, tempLongest);
    } else {
      tempLongest = 0;
    }
  }

  // Find today's index in the 30-day array (it should be the last item, but let's be safe)
  const todayIndex = last30Days.indexOf(today);
  
  if (todayIndex !== -1) {
    // Current streak: count backward from yesterday
    let i = todayIndex - 1;
    let ongoingStreak = 0;
    
    while (i >= 0 && completedDaysMap[last30Days[i]]) {
      ongoingStreak++;
      i--;
    }
    
    // If today is completed, current streak includes today
    if (completedDaysMap[today]) {
      currentStreak = ongoingStreak + 1;
    } else {
      // If today is NOT completed, today does not break the streak until the day ends.
      // E.g., if you haven't worked out yet today, your streak is still intact from yesterday.
      currentStreak = ongoingStreak;
    }
  }

  return {
    currentStreak,
    longestStreak
  };
};
