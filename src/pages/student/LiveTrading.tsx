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
  const { studentId } = useSessionStore()

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
  const totalAssets = balance + totalInvested
  const returnRate = ((totalAssets - 10000) / 10000) * 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cs-bg)' }}>
      <div className="cs-student-wrap">

        {/* Portfolio Header */}
        <div className="cs-portfolio">
          <div style={{ fontSize: '12px', color: 'var(--color-cs-secondary)', marginBottom: '4px' }}>
            나의 수업 포트폴리오
          </div>
          <div className="cs-portfolio-value">
            {totalAssets.toLocaleString()}
          </div>
          <div className={`cs-portfolio-change ${returnRate >= 0 ? 'up' : 'down'}`}>
            {returnRate >= 0 ? '▲' : '▼'} {returnRate >= 0 ? '+' : ''}{(totalAssets - 10000).toLocaleString()} ({returnRate >= 0 ? '+' : ''}{returnRate.toFixed(1)}%)
          </div>
        </div>

        {/* Trade Status Banner */}
        {isTrading && countdown !== null ? (
          <div className="cs-trade-open">
            거래 윈도우 오픈!
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 800,
              marginTop: '2px',
              letterSpacing: '-1px',
              color: 'var(--color-cs-up)',
            }}>
              {formatTime(countdown)}
            </span>
          </div>
        ) : (
          <div className="cs-trade-closed">
            거래가 열리면 매수/매도가 가능합니다
          </div>
        )}

        {/* Stock Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stocks.map((stock) => {
            const isHiddenUnrevealed = stock.is_hidden && !stock.is_revealed
            const isLocked = !stock.is_revealed && !stock.is_hidden

            // Hidden card (mystery)
            if (isHiddenUnrevealed) {
              return (
                <div key={stock.id} className="cs-stock-card mystery">
                  <button
                    className="star-btn"
                    onClick={() => handleToggleBookmark(stock)}
                    style={{
                      width: '32px', height: '32px', border: 'none', background: 'transparent',
                      fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', borderRadius: '8px', flexShrink: 0,
                    }}
                  >
                    {stock.isBookmarked ? '⭐' : '☆'}
                  </button>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-cs-gold-text)' }}>
                      ??? <span className="cs-tag cs-tag-hidden">HIDDEN</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-cs-gold-text)', opacity: 0.7 }}>
                      정체불명 · 대박 or 쪽박?
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      className="cs-btn-challenge"
                      onClick={() => {
                        setBuyModalStock(stock)
                        setBuyAmount(null)
                      }}
                      disabled={!isTrading || balance < 1000}
                      style={{ opacity: (!isTrading || balance < 1000) ? 0.5 : 1 }}
                    >
                      도전!
                    </button>
                  </div>
                </div>
              )
            }

            // Locked card (unrevealed, non-hidden)
            if (isLocked) {
              return (
                <div key={stock.id} className="cs-stock-card locked">
                  <button
                    style={{
                      width: '32px', height: '32px', border: 'none', background: 'transparent',
                      fontSize: '18px', opacity: 0.4, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', borderRadius: '8px', flexShrink: 0,
                    }}
                    disabled
                  >
                    🔒
                  </button>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-cs-hint)' }}>
                      #{stock.keyword}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-cs-secondary)' }}>
                      아직 미공개
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button className="cs-btn-disabled">대기</button>
                  </div>
                </div>
              )
            }

            // Normal / owned card
            const hasHolding = stock.holding && stock.holding.amount > 0
            return (
              <div key={stock.id} className={`cs-stock-card${hasHolding ? ' owned' : ''}`}>
                <button
                  onClick={() => handleToggleBookmark(stock)}
                  style={{
                    width: '32px', height: '32px', border: 'none', background: 'transparent',
                    fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', borderRadius: '8px', flexShrink: 0,
                  }}
                >
                  {stock.isBookmarked ? '⭐' : '☆'}
                </button>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    #{stock.keyword}
                    {hasHolding && (
                      <span className="cs-tag-hold">{stock.holding!.amount.toLocaleString()}pt</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-cs-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    매수율 —
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {hasHolding && (
                    <button
                      className="cs-btn-sell"
                      onClick={() => handleSell(stock)}
                      disabled={!isTrading}
                      style={{ opacity: !isTrading ? 0.5 : 1 }}
                    >
                      매도
                    </button>
                  )}
                  <button
                    className="cs-btn-buy"
                    onClick={() => {
                      setBuyModalStock(stock)
                      setBuyAmount(null)
                    }}
                    disabled={!isTrading || balance < 1000}
                    style={{ opacity: (!isTrading || balance < 1000) ? 0.5 : 1 }}
                  >
                    {hasHolding ? '추가매수' : '매수'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* Balance Bar (fixed bottom) */}
      <div className="cs-balance-bar">
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-cs-hint)' }}>투자 가능</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            {balance.toLocaleString()}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-cs-hint)', marginLeft: '2px' }}>pt</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-cs-hint)' }}>투자 완료</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--color-cs-up-text)' }}>
            {totalInvested.toLocaleString()}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-cs-hint)', marginLeft: '2px' }}>pt</span>
          </div>
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
              maxWidth: '420px',
              margin: '0 auto',
              background: 'var(--color-cs-surface)',
              borderRadius: '20px 20px 0 0',
              padding: '24px',
              animation: 'slideUp 0.2s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-cs-primary)', marginBottom: '4px' }}>
              {buyModalStock.is_hidden && !buyModalStock.is_revealed ? '??? 히든 종목' : `#${buyModalStock.keyword}`} 매수
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
