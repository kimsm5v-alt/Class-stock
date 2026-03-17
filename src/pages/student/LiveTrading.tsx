import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMockStore } from '../../stores/mockStore'
import { useSessionStore } from '../../stores/sessionStore'
import type { Session, Stock, Holding } from '../../lib/types'

interface StockWithStatus extends Stock {
  holding: Holding | null
  isBookmarked: boolean
}

export default function LiveTrading() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { studentId, studentNickname } = useSessionStore()

  const [session, setSession] = useState<Session | null>(null)
  const [stocks, setStocks] = useState<StockWithStatus[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [balance, setBalance] = useState(10000)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Buy modal
  const [buyModalStock, setBuyModalStock] = useState<StockWithStatus | null>(null)
  const [buyAmount, setBuyAmount] = useState<number | null>(null)

  // 데이터 동기화
  const syncData = () => {
    if (!id || !studentId) return
    const mockStore = useMockStore.getState()

    const sessionData = mockStore.getSession(id)
    if (sessionData) {
      setSession(sessionData)
      if (sessionData.status === 'waiting') {
        navigate(`/session/${id}/waiting`)
        return
      }
      if (sessionData.status === 'closed') {
        navigate(`/session/${id}/result`)
        return
      }
    }

    const student = mockStore.getStudent(studentId)
    if (student) {
      setBalance(student.balance)
    }

    const stocksData = mockStore.getSessionStocks(id)
    const studentHoldings = mockStore.getStudentHoldings(studentId)
    const studentBookmarks = mockStore.getStudentBookmarks(studentId)

    setHoldings(studentHoldings)

    const stocksWithStatus: StockWithStatus[] = stocksData.map(stock => ({
      ...stock,
      holding: studentHoldings.find(h => h.stock_id === stock.id) || null,
      isBookmarked: studentBookmarks.some(b => b.stock_id === stock.id),
    }))
    setStocks(stocksWithStatus)
  }

  useEffect(() => {
    if (!studentId) {
      navigate('/join')
      return
    }

    syncData()
    const unsubscribe = useMockStore.subscribe(syncData)
    return unsubscribe
  }, [id, studentId, navigate])

  // Countdown timer
  useEffect(() => {
    if (session?.status !== 'trading' || !session.trade_end_at) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const endTime = new Date(session.trade_end_at!).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
      setCountdown(remaining)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [session?.status, session?.trade_end_at])

  const handleToggleBookmark = (stock: StockWithStatus) => {
    if (!studentId) return
    useMockStore.getState().toggleBookmark(studentId, stock.id)
  }

  const handleBuy = () => {
    if (!buyModalStock || !buyAmount || !studentId) return

    const validAmount = Math.floor(buyAmount / 1000) * 1000
    if (validAmount <= 0) {
      alert('매수 금액은 1000pt 이상이어야 합니다')
      return
    }

    const result = useMockStore.getState().buyStock(studentId, buyModalStock.id, validAmount)

    if (!result.success) {
      alert(`매수 실패: ${result.error}`)
    }

    setBuyModalStock(null)
    setBuyAmount(null)
  }

  const handleSell = (stock: StockWithStatus) => {
    if (!stock.holding || !studentId) return

    const result = useMockStore.getState().sellStock(studentId, stock.id)

    if (!result.success) {
      alert(`매도 실패: ${result.error}`)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isTrading = session?.status === 'trading'
  const totalInvested = holdings.reduce((sum, h) => sum + h.amount, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cs-bg)', paddingBottom: '100px' }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--color-cs-surface)',
        borderBottom: '1px solid var(--color-cs-border)',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-cs-primary)' }}>
              {session?.class_name} · {session?.subject}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-cs-hint)' }}>{session?.unit_name}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="cs-tag cs-tag-new">{studentNickname}</span>
          </div>
        </div>
      </header>

      {/* Trading Status Banner */}
      {isTrading && countdown !== null && (
        <div style={{
          background: 'linear-gradient(135deg, var(--color-cs-up), #FF8866)',
          padding: '16px',
          textAlign: 'center',
          color: 'white',
        }}>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>거래 마감까지</p>
          <p style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            {formatTime(countdown)}
          </p>
        </div>
      )}

      {!isTrading && (
        <div style={{
          background: 'var(--color-cs-muted)',
          padding: '16px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '14px', color: 'var(--color-cs-secondary)' }}>
            거래가 열리면 매수/매도가 가능합니다
          </p>
        </div>
      )}

      {/* Balance & Stats */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="cs-stat-card">
          <p style={{ fontSize: '11px', color: 'var(--color-cs-hint)', marginBottom: '4px' }}>보유 포인트</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-cs-primary)', fontFamily: 'var(--font-mono)' }}>
            {balance.toLocaleString()}pt
          </p>
        </div>
        <div className="cs-stat-card">
          <p style={{ fontSize: '11px', color: 'var(--color-cs-hint)', marginBottom: '4px' }}>투자 중</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-cs-mint-text)', fontFamily: 'var(--font-mono)' }}>
            {totalInvested.toLocaleString()}pt
          </p>
        </div>
      </div>

      {/* Stock List */}
      <div style={{ padding: '0 16px' }}>
        <p className="cs-section-label" style={{ marginBottom: '12px' }}>오늘의 종목</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stocks.map((stock) => (
            <div
              key={stock.id}
              style={{
                background: 'var(--color-cs-surface)',
                borderRadius: 'var(--radius-cs-md)',
                border: stock.is_hidden && !stock.is_revealed
                  ? '1px dashed var(--color-cs-gold)'
                  : '1px solid var(--color-cs-border)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {stock.is_hidden && !stock.is_revealed && (
                    <span className="cs-tag cs-tag-hidden">HIDDEN</span>
                  )}
                  <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-cs-primary)' }}>
                    {stock.is_revealed ? `#${stock.keyword}` : '???'}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleBookmark(stock)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    opacity: stock.isBookmarked ? 1 : 0.3,
                  }}
                >
                  {stock.isBookmarked ? '★' : '☆'}
                </button>
              </div>

              {/* Holding Info */}
              {stock.holding && (
                <div style={{
                  background: 'var(--color-cs-mint-soft)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px',
                }}>
                  <p style={{ fontSize: '12px', color: 'var(--color-cs-mint-text)' }}>
                    보유 중: <strong>{stock.holding.amount.toLocaleString()}pt</strong>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setBuyModalStock(stock)
                    setBuyAmount(null)
                  }}
                  disabled={!isTrading || !stock.is_revealed || balance < 1000}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--color-cs-up)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: (!isTrading || !stock.is_revealed || balance < 1000) ? 'not-allowed' : 'pointer',
                    opacity: (!isTrading || !stock.is_revealed || balance < 1000) ? 0.5 : 1,
                  }}
                >
                  매수하기
                </button>
                <button
                  onClick={() => handleSell(stock)}
                  disabled={!isTrading || !stock.holding}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-cs-down)',
                    background: 'transparent',
                    color: 'var(--color-cs-down)',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: (!isTrading || !stock.holding) ? 'not-allowed' : 'pointer',
                    opacity: (!isTrading || !stock.holding) ? 0.5 : 1,
                  }}
                >
                  전량 매도
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buy Modal */}
      {buyModalStock && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setBuyModalStock(null)}
        >
          <div
            style={{
              width: '100%',
              background: 'var(--color-cs-surface)',
              borderRadius: '20px 20px 0 0',
              padding: '24px',
              animation: 'slideUp 0.2s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-cs-primary)', marginBottom: '4px' }}>
              #{buyModalStock.keyword} 매수
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-cs-hint)', marginBottom: '20px' }}>
              보유 포인트: {balance.toLocaleString()}pt
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[1000, 2000, 3000, 5000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBuyAmount(amount)}
                  disabled={balance < amount}
                  style={{
                    padding: '14px 8px',
                    borderRadius: 'var(--radius-cs-xs)',
                    fontWeight: 600,
                    fontSize: '14px',
                    border: 'none',
                    cursor: balance < amount ? 'not-allowed' : 'pointer',
                    background: buyAmount === amount ? 'var(--color-cs-up)' : 'var(--color-cs-muted)',
                    color: buyAmount === amount ? '#fff' : 'var(--color-cs-primary)',
                    opacity: balance < amount ? 0.5 : 1,
                  }}
                >
                  {amount.toLocaleString()}pt
                </button>
              ))}
            </div>

            <button
              onClick={() => setBuyAmount(Math.floor(balance / 1000) * 1000)}
              disabled={balance < 1000}
              style={{
                width: '100%',
                padding: '14px',
                marginBottom: '16px',
                borderRadius: 'var(--radius-cs-xs)',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: balance < 1000 ? 'not-allowed' : 'pointer',
                background: buyAmount === Math.floor(balance / 1000) * 1000 ? 'var(--color-cs-up)' : 'var(--color-cs-muted)',
                color: buyAmount === Math.floor(balance / 1000) * 1000 ? '#fff' : 'var(--color-cs-primary)',
                opacity: balance < 1000 ? 0.5 : 1,
              }}
            >
              전액 ({(Math.floor(balance / 1000) * 1000).toLocaleString()}pt)
            </button>

            <p style={{ fontSize: '14px', color: 'var(--color-cs-hint)', textAlign: 'center', marginBottom: '16px' }}>
              {buyAmount ? `${buyAmount.toLocaleString()}pt 매수` : '금액을 선택하세요'}
            </p>

            <button
              onClick={handleBuy}
              disabled={!buyAmount}
              className="cs-btn-primary"
              style={{ opacity: !buyAmount ? 0.5 : 1 }}
            >
              매수 확정
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
