import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, Stock, Student, Holding, Bookmark } from '../lib/types'

interface SessionState {
  // Current session
  session: Session | null
  stocks: Stock[]
  students: Student[]
  holdings: Holding[]
  bookmarks: Bookmark[]

  // Student-specific
  studentId: string | null
  studentNickname: string | null

  // Actions
  setSession: (session: Session | null) => void
  setStocks: (stocks: Stock[]) => void
  updateStock: (stockId: string, updates: Partial<Stock>) => void
  setStudents: (students: Student[]) => void
  addStudent: (student: Student) => void
  setHoldings: (holdings: Holding[]) => void
  updateHolding: (holding: Holding) => void
  setBookmarks: (bookmarks: Bookmark[]) => void
  addBookmark: (bookmark: Bookmark) => void
  removeBookmark: (bookmarkId: string) => void

  // Student auth
  setStudentAuth: (id: string, nickname: string) => void
  clearStudentAuth: () => void

  // Reset
  reset: () => void
}

const initialState = {
  session: null,
  stocks: [],
  students: [],
  holdings: [],
  bookmarks: [],
  studentId: null,
  studentNickname: null,
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,

      setSession: (session) => set({ session }),

      setStocks: (stocks) => set({ stocks }),

      updateStock: (stockId, updates) => set((state) => ({
        stocks: state.stocks.map((s) =>
          s.id === stockId ? { ...s, ...updates } : s
        ),
      })),

      setStudents: (students) => set({ students }),

      addStudent: (student) => set((state) => ({
        students: [...state.students, student],
      })),

      setHoldings: (holdings) => set({ holdings }),

      updateHolding: (holding) => set((state) => {
        const exists = state.holdings.find((h) => h.id === holding.id)
        if (exists) {
          return {
            holdings: state.holdings.map((h) =>
              h.id === holding.id ? holding : h
            ),
          }
        }
        return { holdings: [...state.holdings, holding] }
      }),

      setBookmarks: (bookmarks) => set({ bookmarks }),

      addBookmark: (bookmark) => set((state) => ({
        bookmarks: [...state.bookmarks, bookmark],
      })),

      removeBookmark: (bookmarkId) => set((state) => ({
        bookmarks: state.bookmarks.filter((b) => b.id !== bookmarkId),
      })),

      setStudentAuth: (id, nickname) => set({ studentId: id, studentNickname: nickname }),

      clearStudentAuth: () => set({ studentId: null, studentNickname: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'session-storage',
      partialize: (state) => ({
        studentId: state.studentId,
        studentNickname: state.studentNickname,
      }),
    }
  )
)
