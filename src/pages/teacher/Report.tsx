import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMockStore } from '../../stores/mockStore'
import type { Session, Stock, Student, Holding, Bookmark, Trade } from '../../lib/types'

interface StockWithStats extends Stock {
  bookmarkCount: number
  buyCount: number
  bookmarkRate: number
  buyRate: number
  totalInvested: number
}

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [stocks, setStocks] = useState<StockWithStats[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [trades, setTrades] = useState<Trade[]>([])

  useEffect(() => {
    if (!id) return
    const mockStore = useMockStore.getState()

    const sessionData = mockStore.getSession(id)
    if (sessionData) setSession(sessionData)

    const studentsData = mockStore.getSessionStudents(id)
    setStudents(studentsData)

    const stocksData = mockStore.getSessionStocks(id)
    const totalStudents = studentsData.length

    const allHoldings: Holding[] = []
    const allBookmarks: Bookmark[] = []
    const allTrades: Trade[] = mockStore.trades.filter(t =>
      stocksData.some(s => s.id === t.stock_id)
    )

    studentsData.forEach(student => {
      allHoldings.push(...mockStore.getStudentHoldings(student.id))
      allBookmarks.push(...mockStore.getStudentBookmarks(student.id))
    })

    setHoldings(allHoldings)
    setTrades(allTrades)

    const stocksWithStats = stocksData.map(stock => {
      const stockBookmarks = allBookmarks.filter(b => b.stock_id === stock.id)
      const stockHoldings = allHoldings.filter(h => h.stock_id === stock.id)

      return {
        ...stock,
        bookmarkCount: stockBookmarks.length,
        buyCount: stockHoldings.length,
        bookmarkRate: totalStudents > 0 ? Math.round((stockBookmarks.length / totalStudents) * 100) : 0,
        buyRate: totalStudents > 0 ? Math.round((stockHoldings.length / totalStudents) * 100) : 0,
        totalInvested: stockHoldings.reduce((sum, h) => sum + h.amount, 0),
      }
    })
    setStocks(stocksWithStats)
  }, [id])

  const totalStudents = students.length
  const participatedStudents = new Set(holdings.map(h => h.student_id)).size
  const participationRate = totalStudents > 0 ? Math.round((participatedStudents / totalStudents) * 100) : 0
  const totalTrades = trades.length
  const coreStocks = stocks.filter(s => s.is_core)

  // Calculate class average accuracy
  const studentAccuracies = students.map(student => {
    const studentHoldings = holdings.filter(h => h.student_id === student.id)
    const totalInvested = studentHoldings.reduce((sum, h) => sum + h.amount, 0)
    const coreInvested = studentHoldings
      .filter(h => coreStocks.some(s => s.id === h.stock_id))
      .reduce((sum, h) => sum + h.amount, 0)
    return totalInvested > 0 ? (coreInvested / totalInvested) * 100 : null
  }).filter(a => a !== null) as number[]

  const avgAccuracy = studentAccuracies.length > 0
    ? Math.round(studentAccuracies.reduce((sum, a) => sum + a, 0) / studentAccuracies.length)
    : 0

  // Investment pattern
  const totalInvestment = stocks.reduce((sum, s) => sum + s.totalInvested, 0)
  const investmentRatios = stocks.map(s => ({
    ...s,
    ratio: totalInvestment > 0 ? (s.totalInvested / totalInvestment) * 100 : 0,
  })).sort((a, b) => b.ratio - a.ratio)

  let patternLabel = '분산형'
  let patternDescription = '투자가 고르게 분산되었습니다.'

  if (investmentRatios[0]?.ratio >= 60) {
    patternLabel = '몰빵형'
    patternDescription = `학생들이 [#${investmentRatios[0].keyword}]에 집중 투자했습니다.`
  } else if (investmentRatios[0]?.ratio >= 30 && investmentRatios[1]?.ratio >= 30) {
    patternLabel = '양극화형'
    patternDescription = `[#${investmentRatios[0].keyword}]와 [#${investmentRatios[1].keyword}] 사이에서 의견이 갈렸습니다.`
  }

  const missedCoreStocks = coreStocks.filter(s => s.buyRate < 30)

  return (
    <div className="page-full">
      {/* Header */}
      <header className="cs-navbar" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/teacher/dashboard')}
              style={{ background: 'none', border: 'none', fontSize: '16px', color: 'var(--color-cs-secondary)', cursor: 'pointer' }}
            >
              ←
            </button>
            <div>
              <h1 style={{ fontWeight: 700, color: 'var(--color-cs-primary)' }}>학급 리포트</h1>
              <p style={{ fontSize: '12px', color: 'var(--color-cs-hint)' }}>
                {session?.class_name} · {session?.subject} · {session?.unit_name}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--color-cs-hint)' }}>
            <p>{new Date(session?.created_at || '').toLocaleDateString('ko-KR')}</p>
            <p>참여 {participatedStudents}/{totalStudents}명</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '896px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Section 1: Overview */}
        <section style={{ marginBottom: '32px' }}>
          <h2 className="cs-section-label" style={{ marginBottom: '16px' }}>수업 한 눈에</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="cs-stat-card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-cs-hint)', marginBottom: '8px' }}>학급 평균 정확률</p>
              <p style={{ fontSize: '36px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-cs-mint-text)' }}>
                {avgAccuracy}%
              </p>
            </div>
            <div className="cs-stat-card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-cs-hint)', marginBottom: '8px' }}>참여율</p>
              <p style={{ fontSize: '36px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-cs-primary)' }}>
                {participationRate}%
              </p>
            </div>
            <div className="cs-stat-card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-cs-hint)', marginBottom: '8px' }}>총 거래 건수</p>
              <p style={{ fontSize: '36px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-cs-primary)' }}>
                {totalTrades}
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Concept Analysis */}
        <section style={{ marginBottom: '32px' }}>
          <h2 className="cs-section-label" style={{ marginBottom: '16px' }}>개념별 분석 (인지-확신 갭)</h2>
          <div className="cs-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {stocks.map((stock) => {
                const gap = stock.bookmarkRate - stock.buyRate
                const hasGap = gap > 20

                return (
                  <div key={stock.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {stock.is_core && <span style={{ color: 'var(--color-cs-up)' }}>★</span>}
                        {stock.is_hidden && <span className="cs-tag cs-tag-hidden">🔒</span>}
                        <span style={{ fontWeight: 500, color: 'var(--color-cs-primary)' }}>#{stock.keyword}</span>
                        {hasGap && (
                          <span style={{
                            fontSize: '9px',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 6px',
                            background: 'var(--color-cs-gold-soft)',
                            color: 'var(--color-cs-gold-text)',
                            borderRadius: '4px',
                          }}>
                            ⚠️ 갭 발생
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-cs-hint)', width: '48px' }}>찜</span>
                        <div style={{ flex: 1, height: '20px', background: 'var(--color-cs-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${stock.bookmarkRate}%`, background: 'rgba(240, 160, 48, 0.6)', transition: 'width 0.7s' }} />
                        </div>
                        <span className="cs-mono" style={{ fontSize: '12px', color: 'var(--color-cs-secondary)', width: '40px', textAlign: 'right' }}>
                          {stock.bookmarkRate}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-cs-hint)', width: '48px' }}>매수</span>
                        <div style={{ flex: 1, height: '20px', background: 'var(--color-cs-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${stock.buyRate}%`,
                            background: stock.buyRate >= 70
                              ? 'linear-gradient(90deg, var(--color-cs-up), #FF8866)'
                              : stock.buyRate >= 30
                              ? 'linear-gradient(90deg, var(--color-cs-gold), #FFD060)'
                              : 'linear-gradient(90deg, #C8C8D0, #DADAE0)',
                            transition: 'width 0.7s',
                          }} />
                        </div>
                        <span className="cs-mono" style={{ fontSize: '12px', color: 'var(--color-cs-secondary)', width: '40px', textAlign: 'right' }}>
                          {stock.buyRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-cs-border)' }}>
              <p className="cs-section-label" style={{ marginBottom: '8px' }}>해석 가이드</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--color-cs-secondary)' }}>
                <p>• 찜↑ 매수↑: 잘 이해한 개념</p>
                <p>• 찜↑ 매수↓: 인지-확신 갭</p>
                <p>• 찜↓ 매수↓: 완전히 놓친 개념</p>
                <p>• 찜↓ 매수↑: 소수만 확신</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Investment Pattern */}
        <section style={{ marginBottom: '32px' }}>
          <h2 className="cs-section-label" style={{ marginBottom: '16px' }}>학급 투자 성향</h2>
          <div className="cs-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-cs-xs)',
                fontSize: '14px',
                fontWeight: 500,
                background: 'var(--color-cs-mint-soft)',
                color: 'var(--color-cs-mint-text)',
              }}>
                {patternLabel}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-cs-secondary)', marginBottom: '16px' }}>{patternDescription}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {investmentRatios.slice(0, 5).map((stock) => (
                <div key={stock.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--color-cs-primary)', width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    #{stock.keyword}
                  </span>
                  <div style={{ flex: 1, height: '16px', background: 'var(--color-cs-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${stock.ratio}%`, background: 'rgba(22, 163, 74, 0.7)' }} />
                  </div>
                  <span className="cs-mono" style={{ fontSize: '12px', color: 'var(--color-cs-secondary)', width: '48px', textAlign: 'right' }}>
                    {stock.ratio.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Missed Concepts */}
        <section style={{ marginBottom: '32px' }}>
          <h2 className="cs-section-label" style={{ marginBottom: '16px' }}>놓친 개념 알림</h2>
          {missedCoreStocks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {missedCoreStocks.map((stock) => (
                <div
                  key={stock.id}
                  style={{
                    background: 'var(--color-cs-up-soft)',
                    border: '1px solid rgba(255, 99, 99, 0.2)',
                    borderRadius: 'var(--radius-cs-md)',
                    padding: '16px',
                  }}
                >
                  <p style={{ fontSize: '14px', color: 'var(--color-cs-up-text)', fontWeight: 500, marginBottom: '4px' }}>
                    ⚠️ <strong>#{stock.keyword}</strong> — 핵심 개념이지만 매수율이 {stock.buyRate}%입니다.
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-cs-up-text)', opacity: 0.8 }}>
                    {stock.bookmarkRate > 30
                      ? `찜하기율 ${stock.bookmarkRate}% → 학생들이 중요성은 인식했지만 확신하지 못했습니다`
                      : `찜하기율 ${stock.bookmarkRate}% → 중요성 자체를 인식하지 못했습니다`
                    }
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background: 'var(--color-cs-mint-soft)',
              border: '1px solid rgba(52, 199, 89, 0.2)',
              borderRadius: 'var(--radius-cs-md)',
              padding: '16px',
            }}>
              <p style={{ fontSize: '14px', color: 'var(--color-cs-mint-text)', fontWeight: 500 }}>
                ✅ 핵심 개념이 모두 잘 전달되었습니다
              </p>
            </div>
          )}
        </section>

        {/* Back Button */}
        <button
          onClick={() => navigate('/teacher/dashboard')}
          className="cs-btn-secondary"
          style={{ height: '48px' }}
        >
          대시보드로 돌아가기
        </button>
      </main>
    </div>
  )
}
