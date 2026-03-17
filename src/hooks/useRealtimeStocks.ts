import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Stock } from '../lib/types'

interface UseRealtimeStocksOptions {
  sessionId: string | undefined
  onUpdate?: (stock: Stock) => void
}

export function useRealtimeStocks({ sessionId, onUpdate }: UseRealtimeStocksOptions) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!sessionId) return

    console.log('[Realtime] Subscribing to stocks:', sessionId)

    const channel = supabase
      .channel(`stocks:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stocks',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onUpdateRef.current?.(payload.new as Stock)
        }
      )
      .subscribe()

    return () => {
      console.log('[Realtime] Unsubscribing from stocks:', sessionId)
      channel.unsubscribe()
    }
  }, [sessionId]) // onUpdate 제거 - ref 사용
}
