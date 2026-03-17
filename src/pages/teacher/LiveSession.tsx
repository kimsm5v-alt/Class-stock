import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMockStore } from '../../stores/mockStore'
import type { Session, Stock, Student, Bookmark, Holding } from '../../lib/types'

interface StockWithStats extends Stock {
  bookmarkCount: number
  buyCount: number
  totalInvested: number
}

// 입장코드 복사 컴포넌트
function JoinCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      onClick={handleCopy}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        background: 'var(--color-cs-muted)',
        borderRadius: 'var(--radius-cs-sm)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--color-cs-secondary)' }}>입장코드</span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--color-cs-primary)',
        letterSpacing: '2px',
      }}>
        {code}
      </span>
      <span style={{
        fontSize: '12px',
        color: copied ? 'var(--color-cs-mint-text)' : 'var(--color-cs-hint)',
        marginLeft: 'auto',
      }}>
        {copied ? '복사됨!' : '클릭하여 복사'}
      </span>
    </div>
  )
}

// 접속중인 학생 목록 컴포넌트
function ConnectedStudents({ students }: { students: Student[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div style={{
      background: 'var(--color-cs-surface)',
      border: '1px solid var(--color-cs-border)',
      borderRadius: 'var(--radius-cs-sm)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="cs-live-dot" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-cs-primary)' }}>
            접속중인 학생
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-cs-up)' }}>
            {students.length}명
          </span>
        </div>
        <span style={{
          fontSize: '12px',
          color: 'var(--color-cs-hint)',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px', maxHeight: '200px', overflowY: 'auto' }}>
          {students.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-cs-hint)', textAlign: 'center', padding: '12px 0' }}>
              아직 접속한 학생이 없습니다
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {students.map((student) => (
                <span
                  key={student.id}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--color-cs-muted)',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-cs-primary)',
                  }}
                >
                  {student.nickname}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LiveSession() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [stocks, setStocks] = useState<StockWithStats[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])

  const [tradeDuration, setTradeDuration] = useState(60)
  const [countdown, setCountdown] = useState<number | null>(null)
  const autoClosedRef = useRef(false)

  // 데이터 로드 및 상태 동기화
  const syncData = () => {
    if (!id) return
    const mockStore = useMockStore.getState()

    const sessionData = mockStore.getSession(id)
    if (sessionData) {
      setSession(sessionData)
      if (sessionData.status === 'waiting') {
        navigate(`/teacher/session/${id}/wait`)
        return
      }
      if (sessionData.status === 'settling' || sessionData.status === 'closed') {
        navigate(`/teacher/session/${id}/settle`)
        return
      }
    }

    const stocksData = mockStore.getSessionStocks(id)
    const studentsData = mockStore.getSessionStudents(id)

    const allBookmarks: Bookmark[] = []
    const allHoldings: Holding[] = []

    studentsData.forEach(student => {
      allBookmarks.push(...mockStore.getStudentBookmarks(student.id))
      allHoldings.push(...mockStore.getStudentHoldings(student.id))
    })

    setBookmarks(allBookmarks)
    setHoldings(allHoldings)
    setStudents(studentsData)

    const stocksWithStats: StockWithStats[] = stocksData.map(stock => {
      const stockBookmarks = allBookmarks.filter(b => b.stock_id === stock.id)
      const stockHoldings = allHoldings.filter(h => h.stock_id === stock.id)
      return {
        ...stock,
        bookmarkCount: stockBookmarks.length,
        buyCount: stockHoldings.length,
        totalInvested: stockHoldings.reduce((sum, h) => sum + h.amount, 0),
      }
    })
    setStocks(stocksWithStats)
  }

  useEffect(() => {
    syncData()
    const unsubscribe = useMockStore.subscribe(syncData)
    return unsubscribe
  }, [id, navigate])

  // Countdown timer
  useEffect(() => {
    if (session?.status !== 'trading' || !session.trade_end_at) {
      setCountdown(null)
      autoClosedRef.current = false
      return
    }

    const updateCountdown = () => {
      const endTime = new Date(session.trade_end_at!).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
      setCountdown(remaining)

      if (remaining <= 0 && !autoClosedRef.current && id) {
        autoClosedRef.current = true
        useMockStore.getState().updateSessionStatus(id, 'active', null)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [session?.status, session?.trade_end_at, id])

  const handleRevealStock = (stockId: string) => {
    useMockStore.getState().revealStock(stockId)
  }

  const handleOpenTrading = () => {
    if (!id) return
    const endAt = new Date(Date.now() + tradeDuration * 1000).toISOString()
    useMockStore.getState().updateSessionStatus(id, 'trading', endAt)
  }

  const handleCloseTrading = () => {
    if (!id) return
    useMockStore.getState().updateSessionStatus(id, 'active', null)
  }

  const handleExtendTrading = (extraSeconds: number) => {
    if (!session?.trade_end_at || !id) return
    const currentEndTime = new Date(session.trade_end_at).getTime()
    const newEndTime = new Date(currentEndTime + extraSeconds * 1000).toISOString()
    useMockStore.getState().updateSessionStatus(id, 'trading', newEndTime)
  }

  const handleEndSession = () => {
    if (!id) return
    useMockStore.getState().updateSessionStatus(id, 'settling')
    navigate(`/teacher/session/${id}/settle`)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getBarClass = (rate: number) => {
    if (rate >= 70) return 'cs-bar-hi'
    if (rate >= 30) return 'cs-bar-md'
    return 'cs-bar-lo'
  }

  const getPctClass = (rate: number) => {
    if (rate >= 70) return 'cs-pct-hi'
    if (rate >= 30) return 'cs-pct-md'
    return 'cs-pct-lo'
  }

  const totalStudents = students.length
  const isTrading = session?.status === 'trading'
  const isActive = session?.status === 'active'

  return (
    <div className="cs-teacher-layout">
      <aside className="cs-teacher-side">
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button
              onClick={() => navigate('/teacher/dashboard')}
              style={{ background: 'none', border: 'none', fontSize: '16px', color: 'var(--color-cs-secondary)', cursor: 'pointer' }}
            >
              ←
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-cs-primary)' }}>
              {session?.class_name || '수업'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-cs-secondary)' }}>
              {session?.subject || ''} · {session?.unit_name || ''}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cs-live-dot" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-cs-primary)' }}>{totalStudents}명</span>
            </div>
          </div>
        </div>

        {session?.join_code && <JoinCodeDisplay code={session.join_code} />}
        <ConnectedStudents students={students} />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <p className="cs-section-label">오늘의 종목</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stocks.map((stock) => (
              <div
                key={stock.id}
                className={`cs-stock-item ${stock.is_hidden ? 'mystery' : ''}`}
                style={stock.is_hidden ? { borderStyle: 'dashed', borderColor: 'rgba(240, 160, 48, 0.25)', background: 'var(--color-cs-gold-soft)' } : {}}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {stock.is_hidden && <span className="cs-tag cs-tag-hidden">HIDDEN</span>}
                    <span style={{ fontWeight: 600, color: 'var(--color-cs-primary)' }}>
                      {stock.is_revealed ? `#${stock.keyword}` : '???'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-cs-hint)' }}>
                    <span>☆ {stock.bookmarkCount}명</span>
                    <span>매수 {stock.buyCount}명</span>
                  </div>
                </div>
                {!stock.is_revealed ? (
                  <button
                    onClick={() => handleRevealStock(stock.id)}
                    disabled={!isActive && !isTrading}
                    className="cs-reveal-btn"
                    style={{ opacity: (!isActive && !isTrading) ? 0.5 : 1 }}
                  >
                    공개
                  </button>
                ) : (
                  <span className="cs-reveal-btn done">공개됨</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-cs-border)' }}>
          {isTrading ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--color-cs-hint)', marginBottom: '4px' }}>거래 종료까지</p>
                <p className="cs-timer">{countdown !== null ? formatTime(countdown) : '--:--'}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: 'var(--color-cs-hint)', marginBottom: '8px', textAlign: 'center' }}>시간 연장</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[15, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => handleExtendTrading(sec)}
                      style={{
                        flex: 1, padding: '10px 0',
                        border: '1px solid var(--color-cs-border2)',
                        borderRadius: 'var(--radius-cs-xs)',
                        background: 'var(--color-cs-surface)',
                        color: 'var(--color-cs-secondary)',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      +{sec === 60 ? '1분' : `${sec}초`}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCloseTrading} className="cs-btn-secondary">거래 마감</button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label className="cs-label">거래 시간</label>
                <select
                  value={tradeDuration}
                  onChange={(e) => setTradeDuration(Number(e.target.value))}
                  className="cs-input"
                  style={{ height: '44px' }}
                >
                  <option value={30}>30초</option>
                  <option value={60}>60초</option>
                  <option value={90}>90초</option>
                  <option value={120}>120초</option>
                </select>
              </div>
              <button
                onClick={handleOpenTrading}
                disabled={!isActive}
                className="cs-btn-primary"
                style={{ opacity: !isActive ? 0.5 : 1 }}
              >
                거래 오픈
              </button>
            </>
          )}
          <button
            onClick={handleEndSession}
            disabled={isTrading}
            className="cs-btn-secondary"
            style={{ marginTop: '12px', opacity: isTrading ? 0.5 : 1 }}
          >
            장 마감 → 정산
          </button>
        </div>
      </aside>

      <main className="cs-teacher-main">
        <div className={isTrading ? 'cs-trade-open' : 'cs-trade-closed'}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isTrading ? 'var(--color-cs-up)' : 'var(--color-cs-hint)' }} />
              <span style={{ fontWeight: 600 }}>{isTrading ? '거래 오픈 중' : '수업 진행 중'}</span>
            </div>
            {isTrading && countdown !== null && (
              <span style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-cs-up)' }}>
                {formatTime(countdown)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="cs-stat-card">
            <p className="cs-stat-label">총 거래 건수</p>
            <p className="cs-stat-value">{holdings.length}</p>
          </div>
          <div className="cs-stat-card">
            <p className="cs-stat-label">참여 학생</p>
            <p className="cs-stat-value">{new Set(holdings.map(h => h.student_id)).size}/{totalStudents}</p>
          </div>
          <div className="cs-stat-card">
            <p className="cs-stat-label">평균 투자</p>
            <p className="cs-stat-value">
              {totalStudents > 0 ? Math.round(holdings.reduce((sum, h) => sum + h.amount, 0) / totalStudents).toLocaleString() : 0}pt
            </p>
          </div>
        </div>

        <div className="cs-stat-card">
          <p className="cs-section-label" style={{ marginBottom: '16px' }}>종목별 매수율</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stocks.filter(s => s.is_revealed).sort((a, b) => b.buyCount - a.buyCount).map((stock) => {
              const buyRate = totalStudents > 0 ? Math.round((stock.buyCount / totalStudents) * 100) : 0
              return (
                <div key={stock.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-cs-primary)' }}>#{stock.keyword}</span>
                      {stock.is_hidden && <span className="cs-tag cs-tag-hidden">HIDDEN</span>}
                      {buyRate >= 70 && <span className="cs-tag cs-tag-hot">HOT</span>}
                    </div>
                    <span className={`cs-pct ${getPctClass(buyRate)}`}>{buyRate}%</span>
                  </div>
                  <div className="cs-bar-track">
                    <div className={`cs-bar-fill ${getBarClass(buyRate)}`} style={{ width: `${buyRate}%` }} />
                  </div>
                </div>
              )
            })}
            {stocks.filter(s => !s.is_revealed).length > 0 && (
              <p style={{ fontSize: '13px', color: 'var(--color-cs-hint)', textAlign: 'center', padding: '12px 0' }}>
                아직 공개되지 않은 종목이 {stocks.filter(s => !s.is_revealed).length}개 있습니다
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
