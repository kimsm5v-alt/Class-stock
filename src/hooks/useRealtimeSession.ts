import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '../lib/types'

interface UseRealtimeSessionOptions {
  sessionId: string | undefined
  onUpdate?: (session: Session) => void
}

export function useRealtimeSession({ sessionId, onUpdate }: UseRealtimeSessionOptions) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!sessionId) return

    console.log('[Realtime] Subscribing to session:', sessionId)

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[Realtime] Session update received:', payload.new)
          onUpdateRef.current?.(payload.new as Session)
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status:', status, err || '')
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to session:', sessionId)
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error:', err)
        }
      })

    return () => {
      console.log('[Realtime] Unsubscribing from session:', sessionId)
      channel.unsubscribe()
    }
  }, [sessionId]) // onUpdate 제거 - ref 사용
}
