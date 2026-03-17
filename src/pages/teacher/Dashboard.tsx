import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useMockStore } from '../../stores/mockStore'
import type { Session } from '../../lib/types'

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const { teacher, logout } = useAuthStore()
  const { getTeacherSessions } = useMockStore()
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    if (!teacher) return
    const teacherSessions = getTeacherSessions(teacher.id)
    setSessions(teacherSessions.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ))
  }, [teacher, getTeacherSessions])

  // mockStore 변경 감지를 위한 subscription
  useEffect(() => {
    const unsubscribe = useMockStore.subscribe(() => {
      if (!teacher) return
      const teacherSessions = useMockStore.getState().getTeacherSessions(teacher.id)
      setSessions(teacherSessions.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    })
    return unsubscribe
  }, [teacher])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const getStatusBadge = (status: Session['status']) => {
    const styles = {
      waiting: 'bg-cs-gold-soft text-cs-gold-text',
      active: 'bg-cs-mint-soft text-cs-mint-text',
      trading: 'bg-cs-up-soft text-cs-up-text',
      settling: 'bg-cs-down-soft text-cs-down',
      closed: 'bg-cs-muted text-cs-hint',
    }
    const labels = {
      waiting: '대기중',
      active: '진행중',
      trading: '거래중',
      settling: '정산중',
      closed: '종료',
    }
    return (
      <span className={`cs-tag ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const handleSessionClick = (session: Session) => {
    switch (session.status) {
      case 'waiting':
        navigate(`/teacher/session/${session.id}/wait`)
        break
      case 'active':
      case 'trading':
        navigate(`/teacher/session/${session.id}/live`)
        break
      case 'settling':
        navigate(`/teacher/session/${session.id}/settle`)
        break
      case 'closed':
        navigate(`/teacher/session/${session.id}/report`)
        break
    }
  }

  return (
    <div className="page-full">
      {/* Header */}
      <header className="cs-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="cs-logo-sm">CLASS·STOCK</span>
          <span style={{ fontSize: '14px', color: 'var(--color-cs-secondary)' }}>
            {teacher?.name} 선생님
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            fontSize: '14px',
            color: 'var(--color-cs-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 40px' }}>
        {/* Create Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <button
            onClick={() => navigate('/teacher/create')}
            className="cs-btn-primary"
            style={{ maxWidth: '480px', height: '52px' }}
          >
            + 새 수업 만들기
          </button>
        </div>

        {/* Session List */}
        <div style={{ marginBottom: '16px' }}>
          <p className="cs-section-label">수업 이력</p>
        </div>

        {sessions.length === 0 ? (
          <div className="cs-card" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-cs-hint)' }}>아직 진행한 수업이 없습니다</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className="cs-stat-card"
                style={{ textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-cs-primary)' }}>
                      {session.class_name} · {session.subject}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--color-cs-secondary)', marginTop: '4px' }}>
                      {session.unit_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-cs-hint)', marginTop: '8px' }}>
                      {new Date(session.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
