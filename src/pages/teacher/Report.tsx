import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMockStore } from '../../stores/mockStore'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, ZAxis, LineChart, Line, PieChart, Pie,
} from 'recharts'
import { getMultiplier } from '../../lib/multiplier'
import type { Session, Stock, Student, Holding, Bookmark, Trade } from '../../lib/types'

interface StockWithStats extends Stock {
  bookmarkCount: number
  buyCount: number
  bookmarkRate: number
  buyRate: number
  totalInvested: number
}

type SortKey = 'return' | 'accuracy' | 'name'

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [stocks, setStocks] = useState<StockWithStats[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [activeTab, setActiveTab] = useState<'analysis' | 'students'>('analysis')
  const [sortKey, setSortKey] = useState<SortKey>('return')

  useEffect(() => {
    if (!id) return

    const loadData = () => {
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
    }

    loadData()
    const unsubscribe = useMockStore.subscribe(loadData)
    return unsubscribe
  }, [id])

  // ─── Derived data ───
  const totalStudents = students.length
  const participatedStudents = new Set(holdings.map(h => h.student_id)).size
  const participationRate = totalStudents > 0 ? Math.round((participatedStudents / totalStudents) * 100) : 0
  const totalTrades = trades.length
  const coreStocks = stocks.filter(s => s.is_core)

  // Class average accuracy
  const studentAccuracies = students.map(student => {
    const sh = holdings.filter(h => h.student_id === student.id)
    const totalInv = sh.reduce((sum, h) => sum + h.amount, 0)
    if (totalInv === 0) return null
    const coreInv = sh.filter(h => coreStocks.some(s => s.id === h.stock_id)).reduce((sum, h) => sum + h.amount, 0)
    return (coreInv / totalInv) * 100
  }).filter((a): a is number => a !== null)

  const avgAccuracy = studentAccuracies.length > 0
    ? Math.round(studentAccuracies.reduce((s, a) => s + a, 0) / studentAccuracies.length)
    : 0

  // Investment pattern
  const totalInvestment = stocks.reduce((s, st) => s + st.totalInvested, 0)
  const investmentRatios = stocks.map(s => ({
    ...s,
    ratio: totalInvestment > 0 ? (s.totalInvested / totalInvestment) * 100 : 0,
  })).sort((a, b) => b.ratio - a.ratio)

  let patternLabel = '분산형'
  let patternDescription = '투자가 고르게 분산되었습니다.'
  if (investmentRatios[0]?.ratio >= 60) {
    patternLabel = '몰빵형'
    patternDescription = `학생들이 #${investmentRatios[0].keyword}에 집중 투자했습니다.`
  } else if (investmentRatios[0]?.ratio >= 30 && investmentRatios[1]?.ratio >= 30) {
    patternLabel = '양극화형'
    patternDescription = `#${investmentRatios[0].keyword}와 #${investmentRatios[1].keyword} 사이에서 의견이 갈렸습니다.`
  }

  const missedCoreStocks = coreStocks.filter(s => s.buyRate < 30)

  // Consensus stock (highest buy rate)
  const consensusStock = [...stocks].sort((a, b) => b.buyRate - a.buyRate)[0]
  // Most controversial (closest to 50%)
  const controversialStock = [...stocks].filter(s => s.buyRate > 0).sort((a, b) => Math.abs(a.buyRate - 50) - Math.abs(b.buyRate - 50))[0]

  // Scatter data
  const scatterData = stocks.map(s => ({
    x: s.bookmarkRate, y: s.buyRate,
    z: Math.max(s.totalInvested / 500, 60),
    name: `#${s.keyword}`,
    type: s.is_core ? 'core' : s.is_hidden ? 'hidden' : 'normal',
    isCore: s.is_core,
    multiplier: getMultiplier(s.is_core, s.buyRate),
  }))

  const getScatterColor = (type: string) => {
    switch (type) { case 'core': return '#E03030'; case 'hidden': return '#C07800'; default: return '#888888' }
  }

  // Student results for tab 2
  const studentResults = students.map(student => {
    const sh = holdings.filter(h => h.student_id === student.id)
    const totalInv = sh.reduce((s, h) => s + h.amount, 0)
    const coreInv = sh.filter(h => coreStocks.some(s => s.id === h.stock_id)).reduce((s, h) => s + h.amount, 0)
    const accuracy = totalInv > 0 ? Math.round((coreInv / totalInv) * 100) : 0
    const returnRate = ((student.balance - 10000) / 10000) * 100
    return { ...student, totalInv, stockCount: sh.length, accuracy, returnRate }
  })

  const sortedStudents = [...studentResults].sort((a, b) => {
    if (sortKey === 'return') return b.returnRate - a.returnRate
    if (sortKey === 'accuracy') return b.accuracy - a.accuracy
    return a.nickname.localeCompare(b.nickname)
  })

  const avgReturn = studentResults.length > 0
    ? studentResults.reduce((s, r) => s + r.returnRate, 0) / studentResults.length : 0
  const nonParticipants = studentResults.filter(r => r.totalInv === 0).length

  // ─── Card style helper ───
  const card: React.CSSProperties = {
    background: 'var(--color-cs-surface)', border: '1px solid var(--color-cs-border)',
    borderRadius: '16px', boxShadow: 'var(--shadow-cs)', padding: '24px',
  }

  return (
    <div className="page-full">
      {/* Header */}
      <header className="cs-navbar" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => navigate('/teacher/dashboard')} style={{ background: 'none', border: 'none', fontSize: '16px', color: 'var(--color-cs-secondary)', cursor: 'pointer' }}>←</button>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--color-cs-hint)', marginBottom: '2px' }}>수업 리포트</p>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-cs-primary)' }}>
                {session?.class_name} · {session?.subject} · {session?.unit_name}
              </h1>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '13px', color: 'var(--color-cs-secondary)' }}>
            <p>{new Date(session?.created_at || '').toLocaleDateString('ko-KR')}</p>
            <p>참여 {participatedStudents}/{totalStudents}명</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px' }}>

        {/* Tabs */}
        <div className="cs-tabs" style={{ marginBottom: '24px' }}>
          <button className={`cs-tab ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>수업 분석</button>
          <button className={`cs-tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>학생별 결과</button>
        </div>

        {activeTab === 'analysis' ? (
          <>
            {/* ── Row 1: Stats (full width) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
              <div className="cs-stat-card" style={{ textAlign: 'center' }}>
                <p className="cs-stat-label">학급 평균 정확률</p>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1, color: 'var(--color-cs-up-text)' }}>{avgAccuracy}%</p>
                <p className="cs-stat-hint">핵심 종목 투자 비율 평균</p>
              </div>
              <div className="cs-stat-card" style={{ textAlign: 'center' }}>
                <p className="cs-stat-label">참여율</p>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1, color: 'var(--color-cs-mint-text)' }}>{participationRate}%</p>
                <p className="cs-stat-hint">{totalStudents}명 중 {participatedStudents}명 거래</p>
              </div>
              <div className="cs-stat-card" style={{ textAlign: 'center' }}>
                <p className="cs-stat-label">총 거래 건수</p>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1, color: 'var(--color-cs-primary)' }}>{totalTrades}</p>
                <p className="cs-stat-hint">이번 수업 누적</p>
              </div>
            </div>

            {/* ── Row 2: Gap chart | Quadrant (2-col) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Left: 인지-확신 갭 이중바 */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-cs-primary)' }}>인지-확신 갭</span>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#F0A030', display: 'inline-block' }} /><span style={{ color: '#C07800' }}>찜</span></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#FF4747', display: 'inline-block' }} /><span style={{ color: '#E03030' }}>매수</span></span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stocks.map(stock => {
                    const gap = stock.bookmarkRate - stock.buyRate
                    const hasGap = gap > 15
                    return (
                      <div key={stock.id}>
                        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: stock.is_hidden ? 'var(--color-cs-gold-text)' : 'var(--color-cs-primary)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <span>{stock.is_core ? '★ ' : ''}{stock.is_hidden ? '🔒 ' : ''}#{stock.keyword}</span>
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: stock.is_core ? 'var(--color-cs-up-text)' : 'var(--color-cs-down)', padding: '1px 6px', background: stock.is_core ? 'var(--color-cs-up-soft)' : 'rgba(58,123,222,0.06)', borderRadius: '4px' }}>
                            ×{getMultiplier(stock.is_core, stock.buyRate)}
                          </span>
                          {hasGap && <span style={{ fontSize: '9px', padding: '2px 6px', background: 'var(--color-cs-up-soft)', color: 'var(--color-cs-up-text)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>⚠️ 갭 {gap}%</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <div style={{ flex: 1, height: '24px', background: 'rgba(240,160,48,0.1)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ height: '100%', width: `${stock.bookmarkRate}%`, background: '#F0A030', borderRadius: '6px', transition: 'width 0.7s' }} />
                            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', padding: '2px 8px', borderRadius: '10px', fontFamily: "'DM Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#C07800' }}>{stock.bookmarkRate}%</span>
                          </div>
                          <div style={{ width: '1px', height: '18px', background: 'var(--color-cs-border2)' }} />
                          <div style={{ flex: 1, height: '24px', background: 'rgba(255,71,71,0.1)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ height: '100%', width: `${stock.buyRate}%`, background: '#FF4747', borderRadius: '6px', transition: 'width 0.7s' }} />
                            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', padding: '2px 8px', borderRadius: '10px', fontFamily: "'DM Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#E03030' }}>{stock.buyRate}%</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right: 사분면 매트릭스 */}
              <div style={card}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-cs-primary)', marginBottom: '4px' }}>개념 이해도 매트릭스</h2>
                <p style={{ fontSize: '11px', color: 'var(--color-cs-secondary)', marginBottom: '10px' }}>찜하기율(인지) × 매수율(확신)</p>
                <div style={{ position: 'relative', width: '100%', height: 280 }}>
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
                    <span style={{ position: 'absolute', top: '6%', right: '6%', fontSize: 10, fontWeight: 500, color: 'rgba(13,138,94,0.6)' }}>잘 이해</span>
                    <span style={{ position: 'absolute', top: '6%', left: '10%', fontSize: 10, fontWeight: 500, color: 'rgba(192,120,0,0.6)' }}>인지-확신 갭</span>
                    <span style={{ position: 'absolute', bottom: '20%', left: '10%', fontSize: 10, fontWeight: 500, color: 'rgba(163,45,45,0.6)' }}>놓친 개념</span>
                    <span style={{ position: 'absolute', bottom: '20%', right: '6%', fontSize: 10, fontWeight: 500, color: 'rgba(24,95,165,0.6)' }}>소수만 확신</span>
                  </div>
                  <ResponsiveContainer>
                    <ScatterChart margin={{ top: 20, right: 16, bottom: 24, left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis type="number" dataKey="x" domain={[0, 100]} tickFormatter={v => `${v}%`} label={{ value: '찜하기율', position: 'bottom', offset: 0, style: { fontSize: 11, fill: '#6E6E82' } }} tick={{ fontSize: 10, fill: '#A0A0B2' }} />
                      <YAxis type="number" dataKey="y" domain={[0, 100]} tickFormatter={v => `${v}%`} label={{ value: '매수율', angle: -90, position: 'insideLeft', offset: -8, style: { fontSize: 11, fill: '#6E6E82' } }} tick={{ fontSize: 10, fill: '#A0A0B2' }} width={36} />
                      <ZAxis type="number" dataKey="z" range={[150, 600]} />
                      <ReferenceLine x={50} stroke="rgba(0,0,0,0.08)" strokeDasharray="6 4" />
                      <ReferenceLine y={50} stroke="rgba(0,0,0,0.08)" strokeDasharray="6 4" />
                      <Tooltip content={({ active, payload }) => { if (!active || !payload?.length) return null; const d = payload[0].payload; return (<div style={{ background: '#fff', padding: '6px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '11px' }}><p style={{ fontWeight: 600 }}>{d.name} <span style={{ color: d.isCore ? '#E03030' : '#3A7BDE', fontFamily: "'DM Mono', monospace" }}>×{d.multiplier}</span></p><p>찜 {d.x}% / 매수 {d.y}%</p></div>) }} />
                      <Scatter data={scatterData} shape={(props: any) => { const { cx, cy, payload: d, index } = props; const color = getScatterColor(d.type); const r = Math.max(d.z / 10, 7); let lo = r + 12; for (let j = 0; j < index; j++) { const o = scatterData[j]; if (Math.abs(d.x - o.x) < 12 && Math.abs(d.y - o.y) < 12) { lo = -(r + 12); break } } return (<g><circle cx={cx} cy={cy} r={r} fill={color + '30'} stroke={color} strokeWidth={2} /><text x={cx} y={lo > 0 ? cy - lo : cy - lo} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1A1A2E" dominantBaseline={lo > 0 ? 'auto' : 'hanging'}>{d.name}</text></g>) }}>
                        {scatterData.map((e, i) => <Cell key={i} fill={getScatterColor(e.type) + '40'} stroke={getScatterColor(e.type)} strokeWidth={2} />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--color-cs-secondary)', marginTop: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#E03030', display: 'inline-block' }} />핵심</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#C07800', display: 'inline-block' }} />히든</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#888', display: 'inline-block' }} />일반</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(240,160,48,0.06)', borderRadius: '6px', fontSize: '10px' }}><span style={{ fontWeight: 600, color: 'var(--color-cs-gold-text)' }}>좌상 — 인지-확신 갭</span><div style={{ color: 'var(--color-cs-secondary)', marginTop: '2px' }}>다시 설명 필요</div></div>
                  <div style={{ padding: '8px 10px', background: 'rgba(26,176,122,0.06)', borderRadius: '6px', fontSize: '10px' }}><span style={{ fontWeight: 600, color: 'var(--color-cs-mint-text)' }}>우상 — 잘 이해</span><div style={{ color: 'var(--color-cs-secondary)', marginTop: '2px' }}>빠르게 복습만</div></div>
                  <div style={{ padding: '8px 10px', background: 'rgba(255,71,71,0.06)', borderRadius: '6px', fontSize: '10px' }}><span style={{ fontWeight: 600, color: 'var(--color-cs-up-text)' }}>좌하 — 완전히 놓침</span><div style={{ color: 'var(--color-cs-secondary)', marginTop: '2px' }}>처음부터 다시</div></div>
                  <div style={{ padding: '8px 10px', background: 'rgba(58,123,222,0.06)', borderRadius: '6px', fontSize: '10px' }}><span style={{ fontWeight: 600, color: 'var(--color-cs-down)' }}>우하 — 소수만 확신</span><div style={{ color: 'var(--color-cs-secondary)', marginTop: '2px' }}>또래 교수법</div></div>
                </div>
              </div>
            </div>

            {/* ── Row 3: 놓친 개념 알림 (full width) ── */}
            <div style={{ marginBottom: '20px' }}>
              {missedCoreStocks.length > 0 ? (
                <div style={{ padding: '18px 20px', background: 'var(--color-cs-up-soft)', border: '1px solid rgba(255,71,71,0.12)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-cs-up-text)', marginBottom: '4px' }}>다음 수업에서 짚어야 할 개념</div>
                    {missedCoreStocks.map(stock => (
                      <div key={stock.id} style={{ fontSize: '13px', color: 'var(--color-cs-primary)', lineHeight: 1.6 }}>
                        <b style={{ color: 'var(--color-cs-up-text)' }}>#{stock.keyword}</b> <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>×{getMultiplier(true, stock.buyRate)}</span> — 핵심 개념이지만 매수율 {stock.buyRate}%.
                        {stock.bookmarkRate > 30
                          ? ` 찜 ${stock.bookmarkRate}%로 중요성은 인식했지만 확신 부족. `
                          : ` 찜 ${stock.bookmarkRate}%로 인식 자체가 부족. `}
                        <b>다른 방식으로 다시 설명이 필요합니다.</b>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '18px', background: 'var(--color-cs-mint-soft)', border: '1px solid rgba(26,176,122,0.12)', borderRadius: '12px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--color-cs-mint-text)', fontWeight: 500 }}>✅ 핵심 개념이 모두 잘 전달되었습니다</p>
                </div>
              )}
            </div>

            {/* ── Row 4: 학생 행동 분석 | 매수 타이밍 (2-col) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Left: 학생 행동 분석 (table) */}
              <div style={card}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--color-cs-primary)' }}>학생 행동 분석</h2>
                {/* Header */}
                <div style={{ fontSize: '10px', color: 'var(--color-cs-hint)', display: 'grid', gridTemplateColumns: '1fr 55px 55px 55px', gap: '4px', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid var(--color-cs-border)' }}>
                  <span>종목</span><span style={{ textAlign: 'center' }}>매도율</span><span style={{ textAlign: 'center' }}>추가매수</span><span style={{ textAlign: 'center' }}>찜→매수</span>
                </div>
                {/* Rows */}
                {stocks.filter(s => s.is_revealed).map(stock => {
                  const buyTr = trades.filter(t => t.stock_id === stock.id && t.type === 'buy')
                  const sellTr = trades.filter(t => t.stock_id === stock.id && t.type === 'sell')
                  const buyIds = new Set(buyTr.map(t => t.student_id))
                  const sellIds = new Set(sellTr.map(t => t.student_id))
                  const buyerCount = buyIds.size
                  const sellRate = buyerCount > 0 ? Math.round(([...sellIds].filter(s => buyIds.has(s)).length / buyerCount) * 100) : 0
                  const repeatRate = buyerCount > 0 ? Math.round(([...buyIds].filter(sid => buyTr.filter(t => t.student_id === sid).length >= 2).length / buyerCount) * 100) : 0
                  const bkIds = new Set(useMockStore.getState().bookmarks.filter(b => b.stock_id === stock.id).map(b => b.student_id))
                  const convRate = bkIds.size > 0 ? Math.round(([...bkIds].filter(s => buyIds.has(s)).length / bkIds.size) * 100) : 0

                  return (
                    <div key={stock.id} style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 55px 55px 55px', gap: '4px', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--color-cs-border)' }}>
                      <span style={{ fontWeight: 500 }}>#{stock.keyword}</span>
                      <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: sellRate >= 30 ? 'var(--color-cs-up-text)' : 'var(--color-cs-primary)', fontWeight: sellRate >= 30 ? 600 : 400 }}>{sellRate}%</span>
                      <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: repeatRate >= 30 ? 'var(--color-cs-mint-text)' : 'var(--color-cs-primary)', fontWeight: repeatRate >= 30 ? 600 : 400 }}>{repeatRate}%</span>
                      <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{convRate}%</span>
                    </div>
                  )
                })}
                {/* Insight */}
                {(() => {
                  const highSell = stocks.filter(s => s.is_revealed).find(s => {
                    const bt = trades.filter(t => t.stock_id === s.id && t.type === 'buy')
                    const st = trades.filter(t => t.stock_id === s.id && t.type === 'sell')
                    const bi = new Set(bt.map(t => t.student_id))
                    const si = new Set(st.map(t => t.student_id))
                    return bi.size > 0 && Math.round(([...si].filter(x => bi.has(x)).length / bi.size) * 100) >= 30
                  })
                  const highRepeat = stocks.filter(s => s.is_revealed).find(s => {
                    const bt = trades.filter(t => t.stock_id === s.id && t.type === 'buy')
                    const bi = new Set(bt.map(t => t.student_id))
                    return bi.size > 0 && Math.round(([...bi].filter(sid => bt.filter(t => t.student_id === sid).length >= 2).length / bi.size) * 100) >= 30
                  })
                  if (!highSell && !highRepeat) return null
                  return (
                    <div style={{ marginTop: '10px', padding: '10px', background: 'var(--color-cs-gold-soft)', borderRadius: '8px', fontSize: '11px', color: 'var(--color-cs-primary)', lineHeight: 1.4 }}>
                      💡 {highSell && <><b style={{ color: 'var(--color-cs-up-text)' }}>#{highSell.keyword}</b> 매도율 높음 — 확신 번복. </>}
                      {highRepeat && <><b style={{ color: 'var(--color-cs-mint-text)' }}>#{highRepeat.keyword}</b> 추가매수 높음 — 효과적.</>}
                    </div>
                  )
                })()}
              </div>

              {/* Right: 매수 타이밍 */}
              <div style={card}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--color-cs-primary)' }}>매수 타이밍 분석</h2>
                <p style={{ fontSize: '11px', color: 'var(--color-cs-secondary)', marginBottom: '14px' }}>거래 윈도우 내 매수 시점 분포</p>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '10px', color: 'var(--color-cs-hint)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#1AB07A', display: 'inline-block' }} />0~10s 즉시</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#F0A030', display: 'inline-block' }} />10~30s 중간</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#FF4747', display: 'inline-block' }} />30s~ 마감직전</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stocks.filter(s => s.is_revealed).map(stock => {
                    const buys = trades.filter(t => t.stock_id === stock.id && t.type === 'buy')
                    if (buys.length === 0) return null
                    const ts = buys.map(t => new Date(t.created_at).getTime()).sort((a, b) => a - b)
                    const ws = ts[0]
                    let e = 0, m = 0, l = 0
                    ts.forEach(t => { const s = (t - ws) / 1000; if (s <= 10) e++; else if (s <= 30) m++; else l++ })
                    const tot = buys.length
                    const ep = Math.round((e / tot) * 100), mp = Math.round((m / tot) * 100), lp = 100 - ep - mp
                    return (
                      <div key={stock.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-cs-primary)', width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{stock.keyword}</span>
                        <div style={{ flex: 1, display: 'flex', height: '22px', borderRadius: '6px', overflow: 'hidden' }}>
                          {ep > 0 && <div style={{ width: `${ep}%`, background: '#1AB07A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 600 }}>{ep > 15 ? `${ep}%` : ''}</div>}
                          {mp > 0 && <div style={{ width: `${mp}%`, background: '#F0A030', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A3800', fontSize: '9px', fontWeight: 600 }}>{mp > 15 ? `${mp}%` : ''}</div>}
                          {lp > 0 && <div style={{ width: `${lp}%`, background: '#FF4747', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 600 }}>{lp > 15 ? `${lp}%` : ''}</div>}
                        </div>
                      </div>
                    )
                  }).filter(Boolean)}
                </div>
                {(() => {
                  const buys = trades.filter(t => t.type === 'buy')
                  let best = '', bestPct = 0
                  stocks.filter(s => s.is_revealed).forEach(s => {
                    const sb = buys.filter(t => t.stock_id === s.id); if (!sb.length) return
                    const ts = sb.map(t => new Date(t.created_at).getTime()).sort((a, b) => a - b)
                    const ep = Math.round((ts.filter(t => (t - ts[0]) / 1000 <= 10).length / sb.length) * 100)
                    if (ep > bestPct) { bestPct = ep; best = s.keyword }
                  })
                  if (!best) return null
                  return (
                    <div className="cs-insight" style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '16px' }}>💡</span>
                      <span style={{ fontSize: '12px', color: 'var(--color-cs-primary)', lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--color-cs-gold-text)' }}>#{best}</strong>는 즉시 매수 <strong>{bestPct}%</strong>로 확신 높음
                      </span>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* ── Row 5: 학급 투자 성향 | 학생 분포 도넛 (2-col) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Left: 학급 투자 성향 */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-cs-primary)' }}>학급 투자 성향</span>
                  <span style={{ background: 'var(--color-cs-up-soft)', color: 'var(--color-cs-up-text)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{patternLabel}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* 만장일치 종목 */}
                  {consensusStock && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--color-cs-mint-soft)', borderRadius: '8px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-cs-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, color: '#fff' }}>✅</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: 'var(--color-cs-secondary)' }}>만장일치 종목</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-cs-mint-text)' }}>#{consensusStock.keyword}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-cs-mint-text)', textAlign: 'right', fontWeight: 600, lineHeight: 1.4 }}>{consensusStock.buyRate}%가<br />동일 판단</div>
                    </div>
                  )}

                  {/* 가장 논쟁적인 종목 */}
                  {controversialStock && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--color-cs-up-soft)', borderRadius: '8px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-cs-up)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, color: '#fff' }}>🔥</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: 'var(--color-cs-secondary)' }}>가장 논쟁적인 종목</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-cs-up-text)' }}>#{controversialStock.keyword}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-cs-up-text)', textAlign: 'right', fontWeight: 600, lineHeight: 1.4 }}>매수 {controversialStock.buyRate}%<br />미매수 {100 - controversialStock.buyRate}%</div>
                    </div>
                  )}

                  {/* 총평 */}
                  <div style={{ padding: '10px', background: 'var(--color-cs-muted)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-cs-primary)', lineHeight: 1.5 }}>
                    {patternDescription}
                  </div>
                </div>
              </div>

              {/* Right: 학생 분포 도넛 */}
              <div style={card}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--color-cs-primary)' }}>학생 분포 분석</h2>
                {(() => {
                  const sp = students.map(st => {
                    const sh = holdings.filter(h => h.student_id === st.id)
                    const ti = sh.reduce((s, h) => s + h.amount, 0)
                    const sc = sh.length
                    const mr = ti > 0 ? Math.max(...sh.map(h => h.amount / ti)) * 100 : 0
                    const rr = ((st.balance - 10000) / 10000) * 100
                    return { ti, sc, mr, rr }
                  })
                  const inv = sp.filter(p => p.ti > 0)
                  const cc = inv.filter(p => p.mr >= 50).length
                  const dc = inv.filter(p => p.sc >= 3).length
                  const cp = inv.length > 0 ? Math.round((cc / inv.length) * 100) : 0
                  const dp = inv.length > 0 ? Math.round((dc / inv.length) * 100) : 0
                  const op = Math.max(0, 100 - cp - dp)
                  const concData = [{ name: '몰빵', value: cp || 1, fill: '#FF4747' }, { name: '중간', value: op || 1, fill: '#DADAE0' }, { name: '분산', value: dp || 1, fill: '#1AB07A' }]

                  const hr = sp.filter(p => p.rr >= 50).length
                  const mr2 = sp.filter(p => p.rr >= 0 && p.rr < 50).length
                  const lr = sp.filter(p => p.rr < 0).length
                  const ts = sp.length
                  const hp = ts > 0 ? Math.round((hr / ts) * 100) : 0
                  const mp = ts > 0 ? Math.round((mr2 / ts) * 100) : 0
                  const lp = ts > 0 ? Math.round((lr / ts) * 100) : 0
                  const retData = [{ name: '상위', value: hp || 1, fill: '#FF4747' }, { name: '중위', value: mp || 1, fill: '#F0A030' }, { name: '하위', value: lp || 1, fill: '#C8C8D0' }]

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-cs-primary)', marginBottom: '4px' }}>포트폴리오 집중도</div>
                        <div style={{ position: 'relative', height: 160 }}>
                          <ResponsiveContainer><PieChart><Pie data={concData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" stroke="none">{concData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie></PieChart></ResponsiveContainer>
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '18px', fontWeight: 700, color: '#1AB07A', lineHeight: 1 }}>{dp}%</div>
                            <div style={{ fontSize: '9px', color: 'var(--color-cs-hint)', marginTop: '1px' }}>분산 투자</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '9px', color: 'var(--color-cs-secondary)' }}>
                          <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 1, background: '#FF4747', marginRight: 2 }} />몰빵 {cc}</span>
                          <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 1, background: '#1AB07A', marginRight: 2 }} />분산 {dc}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-cs-primary)', marginBottom: '4px' }}>수익률 분포</div>
                        <div style={{ position: 'relative', height: 160 }}>
                          <ResponsiveContainer><PieChart><Pie data={retData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" stroke="none">{retData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie></PieChart></ResponsiveContainer>
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--color-cs-primary)', lineHeight: 1 }}>{ts}명</div>
                            <div style={{ fontSize: '9px', color: 'var(--color-cs-hint)', marginTop: '1px' }}>전체 학생</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '9px', color: 'var(--color-cs-secondary)' }}>
                          <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 1, background: '#FF4747', marginRight: 2 }} />+50%↑ {hr}</span>
                          <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 1, background: '#F0A030', marginRight: 2 }} />0~50% {mr2}</span>
                          <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 1, background: '#C8C8D0', marginRight: 2 }} />- {lr}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* ── Row 6: 수업 추이 (full width) ── */}
            <div style={{ ...card, marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--color-cs-primary)' }}>수업 추이</h2>
              {(() => {
                const td = [
                  { date: '3/10', accuracy: 55, participation: 85 },
                  { date: '3/12', accuracy: 42, participation: 88 },
                  { date: '3/14', accuracy: 65, participation: 90 },
                  { date: '3/15', accuracy: 52, participation: 87 },
                  { date: '오늘', accuracy: avgAccuracy, participation: participationRate },
                ]
                const accDiff = avgAccuracy - td[3].accuracy
                const partDiff = participationRate - td[3].participation
                return (
                  <>
                    <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', fontSize: '11px', color: 'var(--color-cs-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4747', display: 'inline-block' }} />정확률</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1AB07A', display: 'inline-block' }} />참여율</span>
                    </div>
                    <div style={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer>
                        <LineChart data={td} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A0A0B2' }} />
                          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#A0A0B2' }} width={36} />
                          <Tooltip content={({ active, payload, label }) => { if (!active || !payload?.length) return null; return (<div style={{ background: '#fff', padding: '6px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '11px' }}><p style={{ fontWeight: 600, marginBottom: '2px' }}>{label}</p>{payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}%</p>)}</div>) }} />
                          <Line type="monotone" dataKey="accuracy" name="정확률" stroke="#FF4747" strokeWidth={2}
                            dot={(p: any) => { const { cx = 0, cy = 0, index = 0 } = p; const isT = index === td.length - 1; return <circle key={index} cx={cx} cy={cy} r={isT ? 6 : 4} fill={isT ? '#FF4747' : '#fff'} stroke="#FF4747" strokeWidth={2} /> }}
                            label={(p: any) => { const { x = 0, y = 0, value = 0, index = 0 } = p; return <text key={index} x={x} y={y - 12} textAnchor="middle" fontSize={10} fontWeight={600} fill="#E03030">{value}%</text> }}
                          />
                          <Line type="monotone" dataKey="participation" name="참여율" stroke="#1AB07A" strokeWidth={2}
                            dot={(p: any) => { const { cx = 0, cy = 0, index = 0 } = p; const isT = index === td.length - 1; return <circle key={index} cx={cx} cy={cy} r={isT ? 6 : 4} fill={isT ? '#1AB07A' : '#fff'} stroke="#1AB07A" strokeWidth={2} /> }}
                            label={(p: any) => { const { x = 0, y = 0, value = 0, index = 0 } = p; return <text key={index} x={x} y={y + 18} textAnchor="middle" fontSize={10} fontWeight={600} fill="#0D8A5E">{value}%</text> }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--color-cs-primary)' }}>정확률: 지난 수업 대비 <b style={{ color: accDiff >= 0 ? 'var(--color-cs-up-text)' : 'var(--color-cs-down)' }}>{accDiff >= 0 ? '+' : ''}{accDiff}%p {accDiff >= 0 ? '▲' : '▼'}</b></div>
                      <div style={{ fontSize: '13px', color: 'var(--color-cs-primary)' }}>참여율: 지난 수업 대비 <b style={{ color: partDiff >= 0 ? 'var(--color-cs-mint-text)' : 'var(--color-cs-down)' }}>{partDiff >= 0 ? '+' : ''}{partDiff}%p {partDiff >= 0 ? '▲' : '▼'}</b></div>
                    </div>
                  </>
                )
              })()}
            </div>
          </>
        ) : (
          /* ═══ Tab 2: 학생별 결과 ═══ */
          <>
            {/* Sort toggles */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {([['return', '수익률순'], ['accuracy', '정확률순'], ['name', '이름순']] as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortKey(key)}
                  style={{
                    padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: sortKey === key ? 700 : 500,
                    background: sortKey === key ? 'var(--color-cs-primary)' : 'var(--color-cs-muted)',
                    color: sortKey === key ? '#fff' : 'var(--color-cs-secondary)',
                    transition: 'all 0.2s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Student table */}
            <div style={{ ...card, padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-cs-muted)', borderBottom: '1px solid var(--color-cs-border)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-cs-secondary)', fontSize: '12px' }}>#</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-cs-secondary)', fontSize: '12px' }}>닉네임</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-cs-secondary)', fontSize: '12px' }}>수익률</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-cs-secondary)', fontSize: '12px' }}>정확률</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-cs-secondary)', fontSize: '12px' }}>종목 수</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-cs-secondary)', fontSize: '12px' }}>투자 금액</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((s, i) => {
                    const isTop = sortKey === 'return' && i === 0 && s.totalInv > 0
                    const noInv = s.totalInv === 0
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--color-cs-border)', background: isTop ? 'rgba(255,71,71,0.03)' : 'transparent' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--color-cs-hint)' }}>{isTop ? '🏆' : i + 1}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: noInv ? 'var(--color-cs-hint)' : 'var(--color-cs-primary)' }}>{s.nickname}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: "'Outfit',sans-serif", fontWeight: 700, color: noInv ? 'var(--color-cs-hint)' : s.returnRate >= 0 ? 'var(--color-cs-up-text)' : 'var(--color-cs-down)' }}>
                          {noInv ? '—' : `${s.returnRate >= 0 ? '+' : ''}${s.returnRate.toFixed(1)}%`}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: noInv ? 'var(--color-cs-hint)' : 'var(--color-cs-primary)' }}>
                          {noInv ? '—' : `${s.accuracy}%`}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: noInv ? 'var(--color-cs-hint)' : 'var(--color-cs-primary)' }}>
                          {noInv ? '—' : s.stockCount}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: noInv ? 'var(--color-cs-hint)' : 'var(--color-cs-primary)' }}>
                          {noInv ? '미참여' : `${s.totalInv.toLocaleString()}pt`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div className="cs-stat-card" style={{ textAlign: 'center' }}>
                <p className="cs-stat-label">평균 수익률</p>
                <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: '28px', fontWeight: 700, color: avgReturn >= 0 ? 'var(--color-cs-up-text)' : 'var(--color-cs-down)' }}>
                  {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
                </p>
              </div>
              <div className="cs-stat-card" style={{ textAlign: 'center' }}>
                <p className="cs-stat-label">평균 정확률</p>
                <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: '28px', fontWeight: 700, color: 'var(--color-cs-mint-text)' }}>{avgAccuracy}%</p>
              </div>
              <div className="cs-stat-card" style={{ textAlign: 'center' }}>
                <p className="cs-stat-label">미참여 학생</p>
                <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: '28px', fontWeight: 700, color: nonParticipants > 0 ? 'var(--color-cs-gold-text)' : 'var(--color-cs-primary)' }}>{nonParticipants}명</p>
              </div>
            </div>
          </>
        )}

        {/* Back Button */}
        <button onClick={() => navigate('/teacher/dashboard')} className="cs-btn-secondary" style={{ height: '48px', marginTop: '24px' }}>
          대시보드로 돌아가기
        </button>
      </main>
    </div>
  )
}
