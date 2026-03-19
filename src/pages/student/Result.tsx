import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMockStore } from '../../stores/mockStore'
import { useSessionStore } from '../../stores/sessionStore'
import { getMultiplier } from '../../lib/multiplier'
import type { Session, Stock, Holding } from '../../lib/types'

interface StockResult extends Stock {
  holding: Holding | null
  settledAmount: number
  buyRate: number
  multiplier: number
}

export default function StudentResult() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { studentId, clearStudentAuth } = useSessionStore()

  const [, setSession] = useState<Session | null>(null)
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

      const sessionData = mockStore.getSession(id)
      if (sessionData) {
        setSession(sessionData)
        if (sessionData.status !== 'closed' && sessionData.status !== 'settling') {
          navigate(`/session/${id}/live`)
          return
        }
      }

      const studentData = mockStore.getStudent(studentId)
      if (studentData) {
        setFinalBalance(studentData.balance)
      }

      const stocksData = mockStore.getSessionStocks(id)
      const holdingsData = mockStore.getStudentHoldings(studentId)
      const allStudents = mockStore.getSessionStudents(id)
      const totalStudents = allStudents.length

      // 종목별 매수율 계산
      const allHoldings: Holding[] = []
      for (const s of allStudents) {
        allHoldings.push(...mockStore.getStudentHoldings(s.id))
      }

      const stockResults = stocksData.map(stock => {
        const holding = holdingsData.find(h => h.stock_id === stock.id) || null
        const investedAmount = holding?.amount || 0
        const buyCount = allHoldings.filter(h => h.stock_id === stock.id).length
        const buyRate = totalStudents > 0 ? Math.round((buyCount / totalStudents) * 100) : 0
        const multiplier = getMultiplier(stock.is_core, buyRate)
        const settledAmount = Math.floor(investedAmount * multiplier)

        return {
          ...stock,
          holding,
          settledAmount,
          buyRate,
          multiplier,
        }
      })
      setStocks(stockResults)
      setLoading(false)
    }

    loadData()

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
        <p style={{ color: 'var(--color-cs-secondary)' }}>결과 불러오는 중...</p>
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
    <div style={{ minHeight: '100vh', background: 'var(--color-cs-bg)' }}>
      <div className="cs-student-wrap" style={{ paddingBottom: '40px' }}>

        {/* Portfolio - Final Result */}
        {showFinalResult && (
          <div className="cs-portfolio" style={{ padding: '36px 24px 30px', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-cs-secondary)', marginBottom: '4px' }}>
              최종 수업 결과
            </div>
            <div className="cs-portfolio-value" style={{ fontSize: '52px' }}>
              {finalBalance.toLocaleString()}
            </div>
            <div className={`cs-portfolio-change ${returnRate >= 0 ? 'up' : 'down'}`} style={{ fontSize: '16px' }}>
              {returnRate >= 0 ? '▲' : '▼'} {returnRate >= 0 ? '+' : ''}{(finalBalance - 10000).toLocaleString()} ({returnRate >= 0 ? '+' : ''}{returnRate.toFixed(1)}%)
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--color-cs-hint)' }}>
              이해도 예측 정확률{' '}
              <span style={{
                fontSize: '15px',
                color: 'var(--color-cs-mint-text)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}>
                {accuracy}%
              </span>
            </div>
          </div>
        )}

        {/* Section Label */}
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-cs-primary)', margin: '8px 0 8px' }}>
          종목별 결과
        </div>

        {/* Stock Result Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stocks.map((stock, index) => {
            const isAnimated = animationStep > index
            const hasInvestment = stock.holding && stock.holding.amount > 0
            const isHidden = stock.is_hidden

            // Hidden stock (mystery reveal)
            if (isHidden) {
              return (
                <div
                  key={stock.id}
                  className="cs-stock-card mystery"
                  style={{
                    opacity: isAnimated ? 1 : 0.5,
                    transition: 'all 0.5s',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px',
                      color: 'var(--color-cs-gold-text)',
                    }}>
                      🔓 #{stock.keyword}
                      <span className="cs-tag cs-tag-hidden" style={{ fontSize: '9px' }}>히든 공개!</span>
                      {stock.is_core && isAnimated && (
                        <span className="cs-tag cs-tag-hot" style={{ fontSize: '9px' }}>핵심</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-cs-secondary)', marginTop: '3px' }}>
                      {hasInvestment
                        ? `투자 ${stock.holding!.amount.toLocaleString()}pt`
                        : '미투자 — 아깝다!'}
                    </div>
                  </div>
                  {isAnimated && (
                    <div style={{ textAlign: 'right' }}>
                      {hasInvestment ? (
                        <>
                          <div style={{
                            fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700,
                            color: stock.is_core ? 'var(--color-cs-up-text)' : 'var(--color-cs-hint)',
                          }}>
                            {stock.settledAmount.toLocaleString()}pt
                          </div>
                          <div style={{
                            fontSize: '11px', fontFamily: 'var(--font-mono)',
                            color: stock.is_core ? 'var(--color-cs-up-text)' : 'var(--color-cs-down)',
                          }}>
                            {stock.is_core ? `×${stock.multiplier} 폭등 (매수율 ${stock.buyRate}%)` : `×${stock.multiplier} 폭락 (매수율 ${stock.buyRate}%)`}
                          </div>
                        </>
                      ) : (
                        <div style={{
                          fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600,
                          color: 'var(--color-cs-gold-text)',
                        }}>
                          {stock.is_core ? `×${stock.multiplier} 놓침 (매수율 ${stock.buyRate}%)` : '—'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            // Core stock (owned style)
            if (stock.is_core) {
              return (
                <div
                  key={stock.id}
                  className={`cs-stock-card${hasInvestment ? ' owned' : ''}`}
                  style={{
                    opacity: isAnimated ? 1 : 0.5,
                    transition: 'all 0.5s',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      {isAnimated && '★'} #{stock.keyword}
                      {isAnimated && (
                        <span className="cs-tag cs-tag-hot" style={{ fontSize: '9px' }}>핵심</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-cs-secondary)', marginTop: '3px' }}>
                      {hasInvestment
                        ? `투자 ${stock.holding!.amount.toLocaleString()}pt`
                        : '미투자'}
                    </div>
                  </div>
                  {isAnimated && hasInvestment && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700,
                        color: 'var(--color-cs-up-text)',
                      }}>
                        {stock.settledAmount.toLocaleString()}pt
                      </div>
                      <div style={{
                        fontSize: '11px', fontFamily: 'var(--font-mono)',
                        color: 'var(--color-cs-up-text)',
                      }}>
                        ×{stock.multiplier} 폭등 (매수율 {stock.buyRate}%)
                      </div>
                    </div>
                  )}
                  {isAnimated && !hasInvestment && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600,
                        color: 'var(--color-cs-hint)',
                      }}>
                        —
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // Non-core stock
            return (
              <div
                key={stock.id}
                className="cs-stock-card"
                style={{
                  opacity: isAnimated ? 0.7 : 0.5,
                  transition: 'all 0.5s',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px', fontWeight: 600,
                    color: 'var(--color-cs-secondary)',
                  }}>
                    #{stock.keyword}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-cs-hint)', marginTop: '3px' }}>
                    {hasInvestment
                      ? `투자 ${stock.holding!.amount.toLocaleString()}pt`
                      : '미투자'}
                  </div>
                </div>
                {isAnimated && hasInvestment && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600,
                      color: 'var(--color-cs-down)',
                    }}>
                      {stock.settledAmount.toLocaleString()}pt
                    </div>
                    <div style={{
                      fontSize: '11px', fontFamily: 'var(--font-mono)',
                      color: 'var(--color-cs-down)',
                    }}>
                      ×{stock.multiplier} 폭락 (매수율 {stock.buyRate}%)
                    </div>
                  </div>
                )}
                {isAnimated && !hasInvestment && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600,
                      color: 'var(--color-cs-hint)',
                    }}>
                      —
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Multiplier Guide Card */}
        {showFinalResult && (
          <div style={{
            marginTop: '20px',
            background: 'var(--color-cs-surface)',
            border: '1px solid var(--color-cs-border)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-cs-primary)', marginBottom: '12px' }}>
              📊 배율 안내 — 매수율이 높을수록 배율 변동!
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* 핵심 종목 */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-cs-up-text)', marginBottom: '6px' }}>
                  ★ 핵심 종목 — 다 같이 맞추면 보상↑
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {[
                    { range: '매수율 80%+', mult: '×4' },
                    { range: '매수율 60~80%', mult: '×3' },
                    { range: '매수율 40~60%', mult: '×2.5' },
                    { range: '매수율 ~40%', mult: '×2' },
                  ].map(({ range, mult }) => (
                    <div key={mult} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 10px',
                      background: 'var(--color-cs-up-soft)',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}>
                      <span style={{ color: 'var(--color-cs-secondary)' }}>{range}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-cs-up-text)' }}>{mult}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* 비핵심 종목 */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-cs-down)', marginBottom: '6px' }}>
                  비핵심 종목 — 다 같이 속으면 손실↑
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {[
                    { range: '매수율 80%+', mult: '×0.3' },
                    { range: '매수율 60~80%', mult: '×0.4' },
                    { range: '매수율 40~60%', mult: '×0.5' },
                    { range: '매수율 ~40%', mult: '×0.7' },
                  ].map(({ range, mult }) => (
                    <div key={mult} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 10px',
                      background: 'rgba(58,123,222,0.06)',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}>
                      <span style={{ color: 'var(--color-cs-secondary)' }}>{range}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-cs-down)' }}>{mult}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exit Button */}
        {showFinalResult && (
          <button
            onClick={handleExit}
            className="cs-btn-secondary"
            style={{ marginTop: '20px' }}
          >
            수업 나가기
          </button>
        )}

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
