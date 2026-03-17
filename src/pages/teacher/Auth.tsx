import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

type AuthMode = 'login' | 'signup'

export default function TeacherAuth() {
  const navigate = useNavigate()
  const { teacher, login } = useAuthStore()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (teacher) {
      navigate('/teacher/dashboard')
    }
  }, [teacher, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Mock login - 아무 이메일/비밀번호든 통과
      const result = login(email, password, mode === 'signup' ? name : undefined)

      if (result.success) {
        navigate('/teacher/dashboard')
      } else {
        setError(result.error || '로그인에 실패했습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          color: 'var(--color-cs-secondary)',
          fontSize: '14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        ← 돌아가기
      </button>

      {/* Logo */}
      <div className="cs-logo" style={{ fontSize: '40px', marginBottom: '12px' }}>CLASS·STOCK</div>
      <p style={{ color: 'var(--color-cs-secondary)', fontSize: '14px', marginBottom: '32px' }}>
        교사 {mode === 'login' ? '로그인' : '회원가입'}
      </p>

      {/* Mock notice */}
      <div style={{
        background: 'var(--color-cs-mint-soft)',
        color: 'var(--color-cs-mint-text)',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '13px',
        marginBottom: '16px',
        maxWidth: '320px',
        textAlign: 'center',
      }}>
        테스트 모드: 아무 이메일/비밀번호나 입력하세요
      </div>

      {/* Auth Card */}
      <div className="cs-card-lg">
        {/* Tabs */}
        <div className="cs-tabs">
          <button
            onClick={() => setMode('login')}
            className={`cs-tab ${mode === 'login' ? 'active' : ''}`}
          >
            로그인
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`cs-tab ${mode === 'signup' ? 'active' : ''}`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cs-form-group">
          {mode === 'signup' && (
            <div>
              <label className="cs-label">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                required
                className="cs-input"
              />
            </div>
          )}

          <div>
            <label className="cs-label">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.edu"
              required
              className="cs-input"
            />
          </div>

          <div>
            <label className="cs-label">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={1}
              className="cs-input"
            />
          </div>

          {error && (
            <p style={{
              fontSize: '14px',
              color: 'var(--color-cs-up-text)',
              background: 'var(--color-cs-up-soft)',
              padding: '12px 16px',
              borderRadius: '12px',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cs-btn-primary"
            style={{ marginTop: '8px', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  )
}
