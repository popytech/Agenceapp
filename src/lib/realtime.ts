import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Guard against supabase-js's topic-based channel dedup crashing on React
 * remounts.
 *
 * supabase.channel(topic) returns an EXISTING channel if one with the same
 * topic is still around, and removeChannel() is async (it awaits a network
 * unsubscribe before dropping the channel). So on a double-mount / navigation /
 * fast-refresh, the second effect gets handed back the first, still-subscribing
 * channel. Calling .on('postgres_changes' | 'presence') on a channel that is
 * already joining/joined throws:
 *
 *   "cannot add `postgres_changes` callbacks for <topic> after `subscribe()`."
 *
 * which bubbles up and crashes the whole page into the error boundary.
 *
 * `setup` (which should add the .on(...) bindings and call .subscribe()) only
 * runs when the returned channel is fresh. When a reused channel comes back it
 * already has its bindings, so we just hand it back. Callers remove it on
 * cleanup with supabase.removeChannel() exactly as before.
 */
export function safeChannel(
  name: string,
  setup: (channel: RealtimeChannel) => void,
  opts?: Parameters<typeof supabase.channel>[1],
): RealtimeChannel {
  const channel = opts ? supabase.channel(name, opts) : supabase.channel(name)
  if (channel.state === 'closed') {
    setup(channel)
  }
  return channel
}
