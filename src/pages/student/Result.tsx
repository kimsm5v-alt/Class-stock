import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMockStore } from '../../stores/mockStore'
import { useSessionStore } from '../../stores/sessionStore'
import type { Session, Stock, Holding } from '../../lib/types'

interface StockResult extends Stock {
  holding: Holding | null
  settledAmount: number
}

export default function StudentResult() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { studentId, studentNickname, clearStudentAuth } = useSessionStore()

  const [session, setSession] = useState<Session | null>(null)
  const [finalBalance, setFinalBalance] = useState(10000)
  const [stocks, setStocks] = useState<StockResult[]>([])
  const [loading, setLoading] = useState(true)
  const [animationStep, setAnimationStep] = useState(0)

  useEffect(() => {
    if (!id || !studentId) {
      navigate('/join')
      return
    }

    const loadData = () => {
      const mockStore = useMockStore.getState()

      // Get session
      const sessionData = mockStore.getSession(id)
      if (sessionData) {
        setSession(sessionData)
        if (sessionData.status !== 'closed' && sessionData.status !== 'settling') {
          navigate(`/session/${id}/live`)
          return
        }
      }

      // Get student
      const studentData = mockStore.getStudent(studentId)
      if (studentData) {
        setFinalBalance(studentData.balance)
      }

      // Get stocks
      const stocksData = mockStore.getSessionStocks(id)

      // Get holdings
      const holdingsData = mockStore.getStudentHoldings(studentId)

      // Combine stocks with results
      const stockResults = stocksData.map(stock => {
        const holding = holdingsData.find(h => h.stock_id === stock.id) || null
        const investedAmount = holding?.amount || 0
        const settledAmount = stock.is_core
          ? investedAmount * 3
          : Math.floor(investedAmount * 0.5)

        return {
          ...stock,
          holding,
          settledAmount,
        }
      })
      setStocks(stockResults)
      setLoading(false)
    }

    loadData()

    // Subscribe to store changes
    const unsubscribe = useMockStore.subscribe(loadData)
    return unsubscribe
  }, [id, studentId, navigate])

  // Animation sequence
  useEffect(() => {
    if (loading || stocks.length === 0) return

    const timer = setInterval(() => {
      setAnimationStep(prev => {
        if (prev >= stocks.length + 1) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, 800)

    return () => clearInterval(timer)
  }, [loading, stocks.length])

  const handleExit = () => {
    clearStudentAuth()
    navigate('/join')
  }

  if (loading) {
    return (
      <div className="page-center">
        <p className="text-cs-secondary">결과 불러오는 중...</p>
      </div>
    )
  }

  const totalInvested = stocks.reduce((sum, s) => sum + (s.holding?.amount || 0), 0)
  const coreInvested = stocks
    .filter(s => s.is_core)
    .reduce((sum, s) => sum + (s.holding?.amount || 0), 0)
  const accuracy = totalInvested > 0
    ? Math.round((coreInvested / totalInvested) * 100)
    : 0
  const returnRate = ((finalBalance - 10000) / 10000) * 100
  const showFinalResult = animationStep > stocks.length

  return (
    <div className="page-full">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-cs-t1">정산 결과</h1>
          <p className="text-sm text-cs-t2 mt-1">
            {session?.class_name} · {session?.subject}
          </p>
        </div>

        {/* Final Result Card */}
        {showFinalResult && (
          <div className="bg-white rounded-[22px] shadow-cs-lg p-6 mb-6 text-center animate-fade-in">
            <p className="text-[10px] font-mono font-medium text-cs-hint uppercase tracking-widest mb-2">
              최종 수익률
            </p>
            <p className={`text-5xl font-display font-extrabold tracking-tight ${
              returnRate >= 0 ? 'text-cs-up' : 'text-cs-down'
            }`}>
              {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(1)}%
            </p>
            <p className="text-2xl font-display font-bold text-cs-t1 mt-2">
              {finalBalance.toLocaleString()}pt
            </p>

            <div className="mt-4 pt-4 border-t border-cs-border">
              <p className="text-xs text-cs-t3 mb-1">이해도 예측 정확률</p>
              <p className="text-xl font-bold text-cs-mint-text font-mono">
                {accuracy}%
              </p>
            </div>

            <p className="text-sm text-cs-t2 mt-4">
              <span className="font-medium">{studentNickname}</span>님의 결과
            </p>
          </div>
        )}

        {/* Stock Results */}
        <div className="flex flex-col gap-2">
          {stocks.map((stock, index) => {
            const isAnimated = animationStep > index
            const hasInvestment = stock.holding && stock.holding.amount > 0

            return (
              <div
                key={stock.id}
                className={`p-4 rounded-cs-sm border transition-all duration-500 ${
                  isAnimated
                    ? stock.is_core
                      ? 'border-cs-up/30 bg-gradient-to-br from-white to-cs-up-soft/30'
                      : 'border-cs-border bg-white'
                    : 'border-cs-border bg-cs-muted opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {stock.is_core && isAnimated && (
                      <span className="text-lg">★</span>
                    )}
                    {stock.is_hidden && (
                      <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 bg-cs-gold-soft text-cs-gold-text rounded">
                        🔒
                      </span>
                    )}
                    <span className="font-medium text-cs-t1">
                      #{stock.keyword}
                    </span>
                    {stock.is_core && isAnimated && (
                      <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 bg-cs-up-soft text-cs-up-text rounded">
                        핵심
                      </span>
                    )}
                  </div>

                  {isAnimated && hasInvestment && (
                    <div className="text-right">
                      <p className={`text-sm font-mono font-medium ${
                        stock.is_core ? 'text-cs-up-text' : 'text-cs-down'
                      }`}>
                        {stock.is_core ? '×3 폭등' : '×0.5 하락'}
                      </p>
                    </div>
                  )}
                </div>

                {hasInvestment && isAnimated && (
                  <div className="mt-2 pt-2 border-t border-cs-border/50 flex justify-between text-sm">
                    <span className="text-cs-t3">
                      투자: {stock.holding!.amount.toLocaleString()}pt
                    </span>
                    <span className={`font-medium ${
                      stock.is_core ? 'text-cs-up-text' : 'text-cs-down'
                    }`}>
                      → {stock.settledAmount.toLocaleString()}pt
                    </span>
                  </div>
                )}

                {!hasInvestment && isAnimated && (
                  <p className="mt-2 text-xs text-cs-t3">미투자</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Exit Button */}
        {showFinalResult && (
          <button
            onClick={handleExit}
            className="w-full mt-6 py-4 bg-cs-muted text-cs-t1 font-medium rounded-cs hover:bg-cs-hover transition-colors"
          >
            수업 나가기
          </button>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}
