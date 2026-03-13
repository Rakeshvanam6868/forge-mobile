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
    // Current streak logic:
    // If today is completed → streak = yesterday's streak + 1
    // If today is NOT completed → streak = yesterday's streak (streak is still alive until day ends)
    
    let ongoingStreak = 0;
    let i = todayIndex - (completedDaysMap[today] ? 0 : 1);
    
    while (i >= 0 && completedDaysMap[last30Days[i]]) {
      ongoingStreak++;
      i--;
    }
    currentStreak = ongoingStreak;
  }

  return {
    currentStreak,
    longestStreak
  };
};
