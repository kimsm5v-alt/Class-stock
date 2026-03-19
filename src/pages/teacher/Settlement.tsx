import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMockStore } from '../../stores/mockStore'
import { getMultiplier } from '../../lib/multiplier'
import type { Session, Stock, Student, Holding } from '../../lib/types'

interface StockWithStats extends Stock {
  buyCount: number
  buyRate: number
}

export default function Settlement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [stocks, setStocks] = useState<StockWithStats[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([])
  const [settling, setSettling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    const mockStore = useMockStore.getState()

    const sessionData = mockStore.getSession(id)
    if (sessionData) {
      setSession(sessionData)
      if (sessionData.status === 'closed') {
        navigate(`/teacher/session/${id}/report`)
        return
      }
    }

    const studentsData = mockStore.getSessionStudents(id)
    setStudents(studentsData)

    const stocksData = mockStore.getSessionStocks(id)
    const totalStudents = studentsData.length

    const allHoldings: Holding[] = []
    studentsData.forEach(student => {
      allHoldings.push(...mockStore.getStudentHoldings(student.id))
    })

    const stocksWithStats = stocksData.map(stock => {
      const stockHoldings = allHoldings.filter(h => h.stock_id === stock.id)
      const buyCount = stockHoldings.length
      const buyRate = totalStudents > 0 ? Math.round((buyCount / totalStudents) * 100) : 0

      return {
        ...stock,
        buyCount,
        buyRate,
      }
    })
    setStocks(stocksWithStats)
  }, [id, navigate])

  const toggleStock = (stockId: string) => {
    setSelectedStockIds(prev => {
      if (prev.includes(stockId)) {
        return prev.filter(id => id !== stockId)
      }
      if (prev.length >= 3) {
        return prev
      }
      return [...prev, stockId]
    })
  }

  const handleSettle = () => {
    if (selectedStockIds.length !== 3) {
      setError('핵심 키워드를 정확히 3개 선택해주세요')
      return
    }

    setSettling(true)
    setError('')

    try {
      useMockStore.getState().settleSession(id!, selectedStockIds)
      navigate(`/teacher/session/${id}/report`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '정산 중 오류가 발생했습니다')
      setSettling(false)
    }
  }

  const totalStudents = students.length

  return (
    <div className="page-full">
      {/* Header */}
      <header className="cs-navbar">
        <div style={{ maxWidth: '672px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-cs-primary)' }}>정산하기</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-cs-secondary)', marginTop: '4px' }}>
            {session?.class_name} · {session?.subject} · {session?.unit_name}
          </p>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '672px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Instructions */}
        <div style={{
          background: 'var(--color-cs-gold-soft)',
          border: '1px solid rgba(240, 160, 48, 0.2)',
          borderRadius: 'var(--radius-cs-md)',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ fontSize: '14px', color: 'var(--color-cs-gold-text)', fontWeight: 500 }}>
            💡 오늘 수업의 핵심 키워드 3개를 선택하세요
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-cs-gold-text)', opacity: 0.8, marginTop: '4px' }}>
            매수율에 따라 배율이 결정됩니다. 핵심: ×2~×4 / 비핵심: ×0.3~×0.7
          </p>
        </div>

        {/* Stock Selection */}
        <div className="cs-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-cs-secondary)' }}>종목 선택</h2>
            <span className="cs-mono" style={{
              fontSize: '14px',
              color: selectedStockIds.length === 3 ? 'var(--color-cs-mint-text)' : 'var(--color-cs-hint)',
            }}>
              {selectedStockIds.length}/3
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stocks.map((stock) => {
              const isSelected = selectedStockIds.includes(stock.id)
              const isDisabled = selectedStockIds.length >= 3 && !isSelected

              return (
                <button
                  key={stock.id}
                  onClick={() => toggleStock(stock.id)}
                  disabled={isDisabled}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-cs-sm)',
                    border: `1px solid ${isSelected ? 'var(--color-cs-up)' : 'var(--color-cs-border)'}`,
                    background: isSelected ? 'var(--color-cs-up-soft)' : isDisabled ? 'var(--color-cs-muted)' : 'white',
                    textAlign: 'left',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Checkbox */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `2px solid ${isSelected ? 'var(--color-cs-up)' : 'var(--color-cs-border)'}`,
                        background: isSelected ? 'var(--color-cs-up)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                      }}>
                        {isSelected && '✓'}
                      </div>

                      {/* Stock Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--color-cs-primary)' }}>
                          #{stock.keyword}
                        </span>
                        {stock.is_hidden && (
                          <span className="cs-tag cs-tag-hidden">HIDDEN</span>
                        )}
                      </div>
                    </div>

                    {/* Buy Rate + Expected Multiplier */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        <span className="cs-mono" style={{ fontSize: '14px', color: 'var(--color-cs-secondary)' }}>
                          매수율 {stock.buyRate}%
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-cs-hint)' }}>
                          ({stock.buyCount}/{totalStudents})
                        </span>
                      </div>
                      {isSelected && (
                        <div style={{
                          marginTop: '6px',
                          padding: '4px 10px',
                          background: 'var(--color-cs-up-soft)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: 'var(--color-cs-up-text)',
                        }}>
                          핵심 → ×{getMultiplier(true, stock.buyRate)} 적용
                        </div>
                      )}
                      {!isSelected && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-cs-hint)',
                          display: 'flex', gap: '6px', justifyContent: 'flex-end',
                        }}>
                          <span style={{ color: 'var(--color-cs-up-text)' }}>핵심 ×{getMultiplier(true, stock.buyRate)}</span>
                          <span>/</span>
                          <span style={{ color: 'var(--color-cs-down)' }}>비핵심 ×{getMultiplier(false, stock.buyRate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Summary */}
        {selectedStockIds.length > 0 && (
          <div className="cs-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-cs-secondary)', marginBottom: '12px' }}>
              선택된 핵심 키워드
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedStockIds.map(stockId => {
                const stock = stocks.find(s => s.id === stockId)
                if (!stock) return null
                return (
                  <span
                    key={stockId}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--color-cs-up-soft)',
                      color: 'var(--color-cs-up-text)',
                      borderRadius: 'var(--radius-cs-xs)',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    #{stock.keyword}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', marginLeft: '6px', opacity: 0.8 }}>
                      ×{getMultiplier(true, stock.buyRate)} (매수율 {stock.buyRate}%)
                    </span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--color-cs-up-soft)',
            border: '1px solid rgba(255, 99, 99, 0.2)',
            borderRadius: 'var(--radius-cs-md)',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--color-cs-up-text)' }}>{error}</p>
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleSettle}
          disabled={selectedStockIds.length !== 3 || settling}
          className="cs-btn-primary"
          style={{
            height: '56px',
            fontSize: '16px',
            background: 'linear-gradient(135deg, var(--color-cs-up), var(--color-cs-gold))',
            opacity: (selectedStockIds.length !== 3 || settling) ? 0.5 : 1,
          }}
        >
          {settling ? '정산 중...' : '정산 실행'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-cs-hint)', marginTop: '12px' }}>
          정산을 실행하면 학생들에게 결과가 공개됩니다
        </p>
      </main>
    </div>
  )
}
