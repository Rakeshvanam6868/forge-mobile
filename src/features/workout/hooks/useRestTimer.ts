/**
 * useRestTimer — Timestamp-based rest countdown
 *
 * Uses timestamp-diff approach for accuracy across screen locks and
 * background states. The Zustand store persists restTimerEndTime as
 * an ISO string, so this hook just computes remaining seconds.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWorkoutSessionStore } from '../stores/workoutSessionStore';

export function useRestTimer() {
  const {
    restTimerActive,
    restTimerEndTime,
    restTimerTotal,
    skipRest,
  } = useWorkoutSessionStore();

  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute remaining seconds from the timestamp
  const computeRemaining = useCallback(() => {
    if (!restTimerEndTime) return 0;
    const diff = Math.max(0, Math.ceil((new Date(restTimerEndTime).getTime() - Date.now()) / 1000));
    return diff;
  }, [restTimerEndTime]);

  // Tick the timer
  useEffect(() => {
    if (!restTimerActive || !restTimerEndTime) {
      setSecondsRemaining(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial compute
    setSecondsRemaining(computeRemaining());

    // Tick every second
    intervalRef.current = setInterval(() => {
      const remaining = computeRemaining();
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        skipRest(); // Auto-dismiss when timer hits 0
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [restTimerActive, restTimerEndTime, computeRemaining, skipRest]);

  // Handle app coming back from background — recalculate immediately
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && restTimerActive) {
        const remaining = computeRemaining();
        setSecondsRemaining(remaining);
        if (remaining <= 0) {
          skipRest();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [restTimerActive, computeRemaining, skipRest]);

  // Format for display
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progress = restTimerTotal > 0 ? secondsRemaining / restTimerTotal : 0;

  return {
    isActive: restTimerActive,
    secondsRemaining,
    totalSeconds: restTimerTotal,
    display,
    progress, // 1 → 0 as timer counts down
    skip: skipRest,
  };
}
