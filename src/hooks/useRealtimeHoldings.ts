import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Holding } from '../lib/types'

interface UseRealtimeHoldingsOptions {
  sessionId: string | undefined
  onInsert?: (holding: Holding) => void
  onUpdate?: (holding: Holding) => void
  onDelete?: (oldHolding: Holding) => void
}

export function useRealtimeHoldings({ sessionId, onInsert, onUpdate, onDelete }: UseRealtimeHoldingsOptions) {
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  onInsertRef.current = onInsert
  onUpdateRef.current = onUpdate
  onDeleteRef.current = onDelete

  useEffect(() => {
    if (!sessionId) return

    console.log('[Realtime] Subscribing to holdings:', sessionId)

    const channel = supabase
      .channel(`holdings:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'holdings',
        },
        (payload) => {
          onInsertRef.current?.(payload.new as Holding)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'holdings',
        },
        (payload) => {
          onUpdateRef.current?.(payload.new as Holding)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'holdings',
        },
        (payload) => {
          onDeleteRef.current?.(payload.old as Holding)
        }
      )
      .subscribe()

    return () => {
      console.log('[Realtime] Unsubscribing from holdings:', sessionId)
      channel.unsubscribe()
    }
  }, [sessionId]) // callbacks 제거 - ref 사용
}
