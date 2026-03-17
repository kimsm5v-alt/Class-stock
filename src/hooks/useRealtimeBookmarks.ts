import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Bookmark } from '../lib/types'

interface UseRealtimeBookmarksOptions {
  sessionId: string | undefined
  onInsert?: (bookmark: Bookmark) => void
  onDelete?: (oldBookmark: Bookmark) => void
}

export function useRealtimeBookmarks({ sessionId, onInsert, onDelete }: UseRealtimeBookmarksOptions) {
  const onInsertRef = useRef(onInsert)
  const onDeleteRef = useRef(onDelete)
  onInsertRef.current = onInsert
  onDeleteRef.current = onDelete

  useEffect(() => {
    if (!sessionId) return

    console.log('[Realtime] Subscribing to bookmarks:', sessionId)

    const channel = supabase
      .channel(`bookmarks:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookmarks',
        },
        (payload) => {
          onInsertRef.current?.(payload.new as Bookmark)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookmarks',
        },
        (payload) => {
          onDeleteRef.current?.(payload.old as Bookmark)
        }
      )
      .subscribe()

    return () => {
      console.log('[Realtime] Unsubscribing from bookmarks:', sessionId)
      channel.unsubscribe()
    }
  }, [sessionId]) // callbacks 제거 - ref 사용
}
