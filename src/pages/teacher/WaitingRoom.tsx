import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useMockStore } from '../../stores/mockStore'
import type { Session, Student, Stock } from '../../lib/types'

export default function WaitingRoom() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getSession, getSessionStudents, getSessionStocks, updateSessionStatus } = useMockStore()
  const [session, setSession] = useState<Session | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])

  const joinUrl = `${window.location.origin}/join?code=${session?.join_code}`

  useEffect(() => {
    if (!id) return

    const sessionData = getSession(id)
    if (sessionData) {
      setSession(sessionData)
      if (sessionData.status !== 'waiting') {
        navigate(`/teacher/session/${id}/live`)
        return
      }
    }

    setStocks(getSessionStocks(id))
    setStudents(getSessionStudents(id))
  }, [id, navigate, getSession, getSessionStocks, getSessionStudents])

  // mockStore 변경 감지 (학생 입장 시 실시간 반영)
  useEffect(() => {
    if (!id) return

    const unsubscribe = useMockStore.subscribe(() => {
      const sessionData = useMockStore.getState().getSession(id)
      if (sessionData) {
        setSession(sessionData)
        if (sessionData.status !== 'waiting') {
          navigate(`/teacher/session/${id}/live`)
          return
        }
      }
      setStudents(useMockStore.getState().getSessionStudents(id))
    })

    return unsubscribe
  }, [id, navigate])

  const handleStartSession = () => {
    if (!id) return
    updateSessionStatus(id, 'active')
    navigate(`/teacher/session/${id}/live`)
  }

  return (
    <div className="page-full">
      {/* Header */}
      <header className="cs-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/teacher/dashboard')}
            style={{
              fontSize: '16px',
              color: 'var(--color-cs-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{ fontWeight: 700, color: 'var(--color-cs-primary)' }}>수업 대기실</h1>
            <p style={{ fontSize: '12px', color: 'var(--color-cs-hint)' }}>
              {session?.class_name} · {session?.subject} · {session?.unit_name}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="cs-live-dot" />
          <span style={{ fontSize: '14px', color: 'var(--color-cs-secondary)' }}>
            접속: <strong style={{ color: 'var(--color-cs-primary)' }}>{students.length}명</strong>
          </span>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* QR & Code */}
          <div className="cs-card" style={{ textAlign: 'center' }}>
            <h2 className="cs-section-label" style={{ marginBottom: '24px' }}>수업 코드</h2>

            {/* QR Code */}
            <div style={{
              display: 'inline-block',
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid var(--color-cs-border)',
            }}>
              <QRCodeSVG value={joinUrl} size={180} />
            </div>

            {/* Join Code */}
            <div style={{ marginTop: '24px' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-cs-hint)', marginBottom: '8px' }}>또는 코드 입력</p>
              <div className="cs-mono" style={{
                fontSize: '36px',
                fontWeight: 700,
                letterSpacing: '4px',
                color: 'var(--color-cs-primary)',
              }}>
                {session?.join_code}
              </div>
            </div>

            {/* URL */}
            <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--color-cs-hint)', wordBreak: 'break-all' }}>
              {joinUrl}
            </p>
          </div>

          {/* Students & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Session Info */}
            <div className="cs-stat-card">
              <h3 className="cs-section-label" style={{ marginBottom: '12px' }}>오늘의 종목</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {stocks.map((stock) => (
                  <span
                    key={stock.id}
                    className={stock.is_hidden ? 'cs-tag cs-tag-hidden' : 'cs-tag'}
                    style={!stock.is_hidden ? { background: 'var(--color-cs-muted)', color: 'var(--color-cs-primary)' } : {}}
                  >
                    {stock.is_hidden ? '🔒 ???' : `#${stock.keyword}`}
                  </span>
                ))}
              </div>
            </div>

            {/* Students */}
            <div className="cs-stat-card" style={{ flex: 1 }}>
              <h3 className="cs-section-label" style={{ marginBottom: '12px' }}>
                접속 학생 ({students.length}명)
              </h3>
              {students.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--color-cs-hint)', textAlign: 'center', padding: '32px 0' }}>
                  학생이 접속하면 여기에 표시됩니다
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '192px', overflowY: 'auto' }}>
                  {students.map((student) => (
                    <span
                      key={student.id}
                      className="cs-tag cs-tag-new"
                    >
                      {student.nickname}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
          <button
            onClick={handleStartSession}
            disabled={students.length === 0}
            className="cs-btn-primary"
            style={{
              maxWidth: '480px',
              height: '60px',
              fontSize: '18px',
              opacity: students.length === 0 ? 0.5 : 1,
            }}
          >
            장 개시 (수업 시작)
          </button>
        </div>
        {students.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-cs-hint)', marginTop: '8px' }}>
            최소 1명의 학생이 접속해야 시작할 수 있습니다
          </p>
        )}
      </main>
    </div>
  )
}
