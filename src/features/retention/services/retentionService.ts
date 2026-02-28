import { supabase } from '../../../core/supabase/client';
import { toDateString } from '../../../core/utils/dateUtils';

// ═══════════════════════════════════════════════
// Event Types
// ═══════════════════════════════════════════════

export type EventType =
  | 'APP_OPEN'
  | 'DAY_VIEWED'
  | 'DAY_COMPLETED'
  | 'STREAK_BROKEN'
  | 'PROGRAM_STARTED';

// ═══════════════════════════════════════════════
// Track Event — DB-level dedup via UNIQUE constraint
// Uses upsert with onConflict: one row per (user, event, date)
// Fire-and-forget — never blocks UI, silent on failure
// ═══════════════════════════════════════════════

export const trackEvent = async (
  userId: string,
  eventType: EventType,
  meta?: Record<string, unknown>
): Promise<void> => {
  try {
    const eventDate = toDateString(new Date());
    await supabase.from('user_events').upsert(
      {
        user_id: userId,
        event_type: eventType,
        event_date: eventDate,
        event_meta: meta ?? {},
      },
      { onConflict: 'user_id, event_type, event_date' }
    );
  } catch (e) {
    // Silent fail — events are non-critical analytics
    console.warn('[retention] event tracking failed:', e);
  }
};
