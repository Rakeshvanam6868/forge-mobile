/**
 * useRestTimer — Timestamp-based rest countdown
 *
 * Uses timestamp-diff approach for accuracy across screen locks and background states.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWorkoutSessionStore } from '../stores/workoutSessionStore';

export function useRestTimer() {
  const { restTimerActive, restTimerEndTime, restTimerTotal, skipRest } = useWorkoutSessionStore();
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const computeRemaining = useCallback(() => {
    if (!restTimerEndTime) return 0;
    return Math.max(0, Math.ceil((new Date(restTimerEndTime).getTime() - Date.now()) / 1000));
  }, [restTimerEndTime]);

  useEffect(() => {
    if (!restTimerActive || !restTimerEndTime) {
      setSecondsRemaining(0);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    setSecondsRemaining(computeRemaining());
    intervalRef.current = setInterval(() => {
      const remaining = computeRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // Double pulse
        skipRest();
      }
    }, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [restTimerActive, restTimerEndTime, computeRemaining, skipRest]);

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && restTimerActive) {
        const remaining = computeRemaining();
        setSecondsRemaining(remaining);
        if (remaining <= 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // Double pulse
          skipRest();
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [restTimerActive, computeRemaining, skipRest]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progress = restTimerTotal > 0 ? secondsRemaining / restTimerTotal : 0;

  return { isActive: restTimerActive, secondsRemaining, totalSeconds: restTimerTotal, display, progress, skip: skipRest };
}
