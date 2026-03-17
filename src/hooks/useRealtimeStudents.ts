import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Student } from '../lib/types'

interface UseRealtimeStudentsOptions {
  sessionId: string | undefined
  onInsert?: (student: Student) => void
  onUpdate?: (student: Student) => void
}

export function useRealtimeStudents({ sessionId, onInsert, onUpdate }: UseRealtimeStudentsOptions) {
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  onInsertRef.current = onInsert
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!sessionId) return

    console.log('[Realtime] Subscribing to students:', sessionId)

    const channel = supabase
      .channel(`students:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'students',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onInsertRef.current?.(payload.new as Student)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onUpdateRef.current?.(payload.new as Student)
        }
      )
      .subscribe()

    return () => {
      console.log('[Realtime] Unsubscribing from students:', sessionId)
      channel.unsubscribe()
    }
  }, [sessionId]) // callbacks 제거 - ref 사용
}
