import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useEffect } from 'react'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) {
      navigate('/teacher/dashboard')
    }
  }, [user, navigate])

  return (
    <div className="page-center">
      <div className="cs-logo" style={{ marginBottom: '8px' }}>CLASS·STOCK</div>
      <p style={{ color: 'var(--color-cs-secondary)', fontSize: '16px', marginBottom: '32px' }}>
        수업이 곧 투자다
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <button
          className="cs-role-btn"
          onClick={() => navigate('/teacher/auth')}
        >
          <div className="title">교사로 시작</div>
          <div className="desc">수업 개설 및 관리</div>
        </button>
        <button
          className="cs-role-btn"
          onClick={() => navigate('/join')}
        >
          <div className="title">학생으로 참여</div>
          <div className="desc">수업 코드로 입장</div>
        </button>
      </div>

      <p style={{ color: 'var(--color-cs-hint)', fontSize: '13px', marginTop: '40px' }}>
        학습 게이미피케이션 플랫폼
      </p>
    </div>
  )
}
