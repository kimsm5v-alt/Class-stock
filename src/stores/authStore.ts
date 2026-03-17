import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Teacher } from '../lib/types'
import { useMockStore } from './mockStore'

interface AuthState {
  teacher: Teacher | null
  isLoading: boolean
  setTeacher: (teacher: Teacher | null) => void
  setLoading: (loading: boolean) => void
  login: (email: string, password: string, name?: string) => { success: boolean; error?: string }
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      teacher: null,
      isLoading: false,

      setTeacher: (teacher) => set({ teacher }),
      setLoading: (isLoading) => set({ isLoading }),

      login: (email, _password, name) => {
        // Mock login - 아무 이메일/비밀번호든 통과
        const mockStore = useMockStore.getState()

        // 기존 교사 찾기
        let teacher = mockStore.getTeacherByEmail(email)

        if (!teacher) {
          // 새 교사 생성
          const teacherName = name || email.split('@')[0]
          teacher = mockStore.createTeacher(email, teacherName)
        }

        set({ teacher, isLoading: false })
        return { success: true }
      },

      logout: () => set({ teacher: null, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ teacher: state.teacher }),
    }
  )
)
