import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Session, Stock, Student, Holding, Bookmark, Trade, Teacher,
  SessionStatus, BuyStockResponse, SellStockResponse, SettleSessionResponse
} from '../lib/types'
import { getMultiplier } from '../lib/multiplier'

// UUID 생성 헬퍼
const generateId = () => crypto.randomUUID()

// 6자리 입장코드 생성
const generateJoinCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

interface MockState {
  // 데이터
  teachers: Teacher[]
  sessions: Session[]
  stocks: Stock[]
  students: Student[]
  holdings: Holding[]
  bookmarks: Bookmark[]
  trades: Trade[]

  // 교사 액션
  createTeacher: (email: string, name: string) => Teacher
  getTeacher: (id: string) => Teacher | undefined
  getTeacherByEmail: (email: string) => Teacher | undefined

  // 세션 액션
  createSession: (teacherId: string, className: string, subject: string, unitName: string, keywords: { keyword: string; isHidden: boolean }[]) => Session
  getSession: (id: string) => Session | undefined
  getSessionByJoinCode: (code: string) => Session | undefined
  getTeacherSessions: (teacherId: string) => Session[]
  updateSessionStatus: (sessionId: string, status: SessionStatus, tradeEndAt?: string | null) => void

  // 종목 액션
  getSessionStocks: (sessionId: string) => Stock[]
  revealStock: (stockId: string) => void
  setCoreStocks: (sessionId: string, stockIds: string[]) => void

  // 학생 액션
  createStudent: (sessionId: string, nickname: string) => Student | { error: string }
  getStudent: (id: string) => Student | undefined
  getSessionStudents: (sessionId: string) => Student[]
  updateStudentBalance: (studentId: string, balance: number) => void

  // 찜하기 액션
  toggleBookmark: (studentId: string, stockId: string) => { added: boolean; bookmark?: Bookmark }
  getStudentBookmarks: (studentId: string) => Bookmark[]
  getStockBookmarks: (stockId: string) => Bookmark[]

  // 보유/거래 액션
  buyStock: (studentId: string, stockId: string, amount: number) => BuyStockResponse
  sellStock: (studentId: string, stockId: string) => SellStockResponse
  getStudentHoldings: (studentId: string) => Holding[]
  getStockHoldings: (stockId: string) => Holding[]

  // 정산
  settleSession: (sessionId: string, coreStockIds: string[]) => SettleSessionResponse

  // 리셋
  reset: () => void
}

const initialState = {
  teachers: [],
  sessions: [],
  stocks: [],
  students: [],
  holdings: [],
  bookmarks: [],
  trades: [],
}

// BroadcastChannel 탭 간 실시간 동기화
const channel = typeof window !== 'undefined'
  ? new BroadcastChannel('class-stock-sync')
  : null

let _isSyncUpdate = false

export const useMockStore = create<MockState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 교사 액션
      createTeacher: (email, name) => {
        const teacher: Teacher = {
          id: generateId(),
          email,
          name,
          created_at: new Date().toISOString(),
        }
        set((state) => ({ teachers: [...state.teachers, teacher] }))
        return teacher
      },

      getTeacher: (id) => get().teachers.find((t) => t.id === id),

      getTeacherByEmail: (email) => get().teachers.find((t) => t.email === email),

      // 세션 액션
      createSession: (teacherId, className, subject, unitName, keywords) => {
        const sessionId = generateId()
        const session: Session = {
          id: sessionId,
          teacher_id: teacherId,
          class_name: className,
          subject,
          unit_name: unitName,
          join_code: generateJoinCode(),
          status: 'waiting',
          trade_end_at: null,
          created_at: new Date().toISOString(),
        }

        const newStocks: Stock[] = keywords.map((kw, index) => ({
          id: generateId(),
          session_id: sessionId,
          keyword: kw.keyword,
          is_hidden: kw.isHidden,
          is_revealed: false,
          is_core: false,
          display_order: index,
          created_at: new Date().toISOString(),
        }))

        set((state) => ({
          sessions: [...state.sessions, session],
          stocks: [...state.stocks, ...newStocks],
        }))

        return session
      },

      getSession: (id) => get().sessions.find((s) => s.id === id),

      getSessionByJoinCode: (code) =>
        get().sessions.find((s) => s.join_code === code.toUpperCase() && s.status !== 'closed'),

      getTeacherSessions: (teacherId) =>
        get().sessions.filter((s) => s.teacher_id === teacherId),

      updateSessionStatus: (sessionId, status, tradeEndAt) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, status, trade_end_at: tradeEndAt !== undefined ? tradeEndAt : s.trade_end_at }
              : s
          ),
        }))
      },

      // 종목 액션
      getSessionStocks: (sessionId) =>
        get().stocks
          .filter((s) => s.session_id === sessionId)
          .sort((a, b) => a.display_order - b.display_order),

      revealStock: (stockId) => {
        set((state) => ({
          stocks: state.stocks.map((s) =>
            s.id === stockId ? { ...s, is_revealed: true } : s
          ),
        }))
      },

      setCoreStocks: (sessionId, stockIds) => {
        set((state) => ({
          stocks: state.stocks.map((s) =>
            s.session_id === sessionId
              ? { ...s, is_core: stockIds.includes(s.id) }
              : s
          ),
        }))
      },

      // 학생 액션
      createStudent: (sessionId, nickname) => {
        const existing = get().students.find(
          (s) => s.session_id === sessionId && s.nickname === nickname
        )
        if (existing) {
          return { error: '이미 사용 중인 닉네임입니다' }
        }

        const student: Student = {
          id: generateId(),
          session_id: sessionId,
          nickname,
          balance: 10000,
          created_at: new Date().toISOString(),
        }
        set((state) => ({ students: [...state.students, student] }))
        return student
      },

      getStudent: (id) => get().students.find((s) => s.id === id),

      getSessionStudents: (sessionId) =>
        get().students.filter((s) => s.session_id === sessionId),

      updateStudentBalance: (studentId, balance) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId ? { ...s, balance } : s
          ),
        }))
      },

      // 찜하기 액션
      toggleBookmark: (studentId, stockId) => {
        const existing = get().bookmarks.find(
          (b) => b.student_id === studentId && b.stock_id === stockId
        )

        if (existing) {
          set((state) => ({
            bookmarks: state.bookmarks.filter((b) => b.id !== existing.id),
          }))
          return { added: false }
        }

        const bookmark: Bookmark = {
          id: generateId(),
          student_id: studentId,
          stock_id: stockId,
          created_at: new Date().toISOString(),
        }
        set((state) => ({ bookmarks: [...state.bookmarks, bookmark] }))
        return { added: true, bookmark }
      },

      getStudentBookmarks: (studentId) =>
        get().bookmarks.filter((b) => b.student_id === studentId),

      getStockBookmarks: (stockId) =>
        get().bookmarks.filter((b) => b.stock_id === stockId),

      // 보유/거래 액션
      buyStock: (studentId, stockId, amount) => {
        const student = get().getStudent(studentId)
        if (!student) return { success: false, error: 'Student not found' }

        const stock = get().stocks.find((s) => s.id === stockId)
        if (!stock) return { success: false, error: 'Stock not found' }

        const session = get().getSession(stock.session_id)
        if (!session || session.status !== 'trading') {
          return { success: false, error: 'Trading is not open' }
        }

        if (student.balance < amount) {
          return { success: false, error: 'Insufficient balance' }
        }

        if (amount <= 0 || amount % 1000 !== 0) {
          return { success: false, error: 'Invalid amount' }
        }

        const newBalance = student.balance - amount
        get().updateStudentBalance(studentId, newBalance)

        // 보유 현황 업데이트
        const existingHolding = get().holdings.find(
          (h) => h.student_id === studentId && h.stock_id === stockId
        )

        if (existingHolding) {
          set((state) => ({
            holdings: state.holdings.map((h) =>
              h.id === existingHolding.id
                ? { ...h, amount: h.amount + amount }
                : h
            ),
          }))
        } else {
          const holding: Holding = {
            id: generateId(),
            student_id: studentId,
            stock_id: stockId,
            amount,
          }
          set((state) => ({ holdings: [...state.holdings, holding] }))
        }

        // 거래 기록
        const trade: Trade = {
          id: generateId(),
          student_id: studentId,
          stock_id: stockId,
          type: 'buy',
          amount,
          created_at: new Date().toISOString(),
        }
        set((state) => ({ trades: [...state.trades, trade] }))

        return { success: true, new_balance: newBalance }
      },

      sellStock: (studentId, stockId) => {
        const student = get().getStudent(studentId)
        if (!student) return { success: false, error: 'Student not found' }

        const stock = get().stocks.find((s) => s.id === stockId)
        if (!stock) return { success: false, error: 'Stock not found' }

        const session = get().getSession(stock.session_id)
        if (!session || session.status !== 'trading') {
          return { success: false, error: 'Trading is not open' }
        }

        const holding = get().holdings.find(
          (h) => h.student_id === studentId && h.stock_id === stockId
        )
        if (!holding || holding.amount === 0) {
          return { success: false, error: 'No holdings to sell' }
        }

        const soldAmount = holding.amount
        const newBalance = student.balance + soldAmount
        get().updateStudentBalance(studentId, newBalance)

        // 보유 삭제
        set((state) => ({
          holdings: state.holdings.filter((h) => h.id !== holding.id),
        }))

        // 거래 기록
        const trade: Trade = {
          id: generateId(),
          student_id: studentId,
          stock_id: stockId,
          type: 'sell',
          amount: soldAmount,
          created_at: new Date().toISOString(),
        }
        set((state) => ({ trades: [...state.trades, trade] }))

        return { success: true, new_balance: newBalance, sold_amount: soldAmount }
      },

      getStudentHoldings: (studentId) =>
        get().holdings.filter((h) => h.student_id === studentId),

      getStockHoldings: (stockId) =>
        get().holdings.filter((h) => h.stock_id === stockId),

      // 정산 — 매수율 연동 배율
      settleSession: (sessionId, coreStockIds) => {
        // 핵심 종목 설정
        get().setCoreStocks(sessionId, coreStockIds)

        const students = get().getSessionStudents(sessionId)
        const stocks = get().getSessionStocks(sessionId)
        const totalStudents = students.length
        const studentResults: SettleSessionResponse['student_results'] = []

        // 종목별 매수율 계산
        const allHoldings: Holding[] = []
        for (const student of students) {
          allHoldings.push(...get().getStudentHoldings(student.id))
        }
        const stockBuyRates = new Map<string, number>()
        for (const stock of stocks) {
          const buyCount = allHoldings.filter(h => h.stock_id === stock.id).length
          const buyRate = totalStudents > 0 ? Math.round((buyCount / totalStudents) * 100) : 0
          stockBuyRates.set(stock.id, buyRate)
        }

        for (const student of students) {
          const studentHoldings = get().getStudentHoldings(student.id)
          let settledTotal = 0
          let totalInvested = 0
          let coreInvested = 0

          for (const holding of studentHoldings) {
            const stock = stocks.find((s) => s.id === holding.stock_id)
            if (!stock) continue

            totalInvested += holding.amount
            const isCore = coreStockIds.includes(stock.id)
            const buyRate = stockBuyRates.get(stock.id) ?? 0
            const multiplier = getMultiplier(isCore, buyRate)

            if (isCore) {
              coreInvested += holding.amount
              settledTotal += Math.floor(holding.amount * multiplier)
            } else {
              settledTotal += Math.floor(holding.amount * multiplier)
            }
          }

          const finalBalance = student.balance + settledTotal
          get().updateStudentBalance(student.id, finalBalance)

          const accuracy = totalInvested > 0
            ? Math.round((coreInvested / totalInvested) * 100 * 10) / 10
            : 0

          studentResults!.push({
            student_id: student.id,
            nickname: student.nickname,
            final_balance: finalBalance,
            accuracy,
          })
        }

        // 세션 상태 변경
        get().updateSessionStatus(sessionId, 'closed')

        return { success: true, student_results: studentResults }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'mock-store',
    }
  )
)

// BroadcastChannel 탭 간 실시간 동기화 설정
if (channel) {
  // 상태 변경 시 다른 탭에 브로드캐스트
  const dataKeys = ['teachers', 'sessions', 'stocks', 'students', 'holdings', 'bookmarks', 'trades'] as const
  useMockStore.subscribe((state) => {
    if (_isSyncUpdate) return
    const data: Record<string, unknown> = {}
    for (const key of dataKeys) {
      data[key] = state[key]
    }
    channel.postMessage({ type: 'STATE_UPDATE', data })
  })

  // 다른 탭에서 메시지 수신 시 상태 반영
  channel.onmessage = (event) => {
    if (event.data?.type === 'STATE_UPDATE') {
      _isSyncUpdate = true
      useMockStore.setState(event.data.data, false)
      _isSyncUpdate = false
    }
  }
}
