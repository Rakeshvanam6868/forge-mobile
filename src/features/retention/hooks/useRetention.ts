import { useEffect, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { trackEvent, EventType } from '../services/retentionService';

/**
 * useRetention — tracks APP_OPEN once per day.
 *
 * Dedup is handled at DB level via UNIQUE(user_id, event_type, event_date).
 * trackEvent uses upsert, so calling it multiple times is safe (idempotent).
 * Fire-and-forget. Never blocks UI.
 */
export const useRetention = () => {
  const { user } = useAuth();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!user?.id || hasTracked.current) return;
    hasTracked.current = true;
    // Upsert is idempotent — DB UNIQUE handles dedup
    trackEvent(user.id, 'APP_OPEN');
  }, [user?.id]);

  const logEvent = (eventType: EventType, meta?: Record<string, unknown>) => {
    if (user?.id) {
      // All events deduped at DB level — safe to call multiple times
      trackEvent(user.id, eventType, meta);
    }
  };

  return { logEvent };
};
