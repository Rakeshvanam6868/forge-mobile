/**
 * Convert a Date object to a YYYY-MM-DD string using LOCAL timezone.
 * CRITICAL: Must use local time, not UTC, because the user's "today"
 * is determined by their local clock, not the UTC clock.
 */
export const toDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get the last N calendar dates as YYYY-MM-DD strings.
 * Returned in ascending order: oldest first → newest last.
 */
export const getLastNDays = (n: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(toDateString(d));
  }
  
  return dates;
};
