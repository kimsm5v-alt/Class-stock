import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMockStore } from '../../stores/mockStore'
import { useSessionStore } from '../../stores/sessionStore'
import type { Student } from '../../lib/types'

export default function JoinSession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setStudentAuth } = useSessionStore()
  const mockStore = useMockStore()

  const [step, setStep] = useState<'code' | 'nickname'>('code')
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionInfo, setSessionInfo] = useState<{
    class_name: string
    subject: string
    unit_name: string
  } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-fill code from URL
  useEffect(() => {
    const urlCode = searchParams.get('code')
    if (urlCode) {
      setCode(urlCode.toUpperCase())
      handleVerifyCode(urlCode.toUpperCase())
    }
  }, [searchParams])

  const handleVerifyCode = (inputCode?: string) => {
    const codeToVerify = (inputCode || code).toUpperCase()
    if (codeToVerify.length !== 6) {
      setError('6자리 코드를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    const session = mockStore.getSessionByJoinCode(codeToVerify)

    if (!session || !['waiting', 'active', 'trading'].includes(session.status)) {
      setError('수업을 찾을 수 없습니다')
      setLoading(false)
      return
    }

    setSessionId(session.id)
    setSessionInfo({
      class_name: session.class_name,
      subject: session.subject,
      unit_name: session.unit_name,
    })
    setStep('nickname')
    setLoading(false)
  }

  const handleJoin = () => {
    if (!sessionId) return
    if (nickname.length < 2 || nickname.length > 8) {
      setError('닉네임은 2~8자 사이여야 합니다')
      return
    }

    setLoading(true)
    setError('')

    // Create student (mockStore handles duplicate check)
    const result = mockStore.createStudent(sessionId, nickname)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    const student = result as Student

    // Save to store
    setStudentAuth(student.id, nickname)

    // Check session status and redirect
    const session = mockStore.getSession(sessionId)

    if (session?.status === 'waiting') {
      navigate(`/session/${sessionId}/waiting`)
    } else {
      navigate(`/session/${sessionId}/live`)
    }
  }

  return (
    <div className="page-center">
      {/* Back button */}
      <button
        onClick={() => step === 'nickname' ? setStep('code') : navigate('/')}
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
        ← {step === 'nickname' ? '코드 다시 입력' : '돌아가기'}
      </button>

      {/* Logo */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 className="cs-logo" style={{ fontSize: '28px' }}>CLASS·STOCK</h1>
        <p style={{ marginTop: '8px', color: 'var(--color-cs-secondary)', fontSize: '14px' }}>
          {step === 'code' ? '수업 코드 입력' : '닉네임 입력'}
        </p>
      </div>

      {/* Form */}
      <div className="cs-card-lg">
        {step === 'code' ? (
          <>
            <label className="cs-label" style={{ textAlign: 'center' }}>
              교사가 공유한 6자리 코드를 입력하세요
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="cs-input cs-mono"
              style={{ textAlign: 'center', fontSize: '24px', fontWeight: 700, letterSpacing: '4px' }}
              autoFocus
            />
            {error && (
              <p style={{
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--color-cs-up-text)',
                background: 'var(--color-cs-up-soft)',
                padding: '8px 12px',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                {error}
              </p>
            )}
            <button
              onClick={() => handleVerifyCode()}
              disabled={loading || code.length !== 6}
              className="cs-btn-primary"
              style={{ marginTop: '16px', opacity: loading || code.length !== 6 ? 0.5 : 1 }}
            >
              {loading ? '확인 중...' : '다음'}
            </button>
          </>
        ) : (
          <>
            {sessionInfo && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: 'var(--color-cs-muted)',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-cs-primary)' }}>
                  {sessionInfo.class_name} · {sessionInfo.subject}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-cs-hint)' }}>{sessionInfo.unit_name}</p>
              </div>
            )}
            <label className="cs-label">
              수업에서 사용할 닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 8))}
              placeholder="예: 뽀로로"
              className="cs-input"
              autoFocus
            />
            <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-cs-hint)' }}>
              2~8자, 다른 학생과 중복 불가
            </p>
            {error && (
              <p style={{
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--color-cs-up-text)',
                background: 'var(--color-cs-up-soft)',
                padding: '8px 12px',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                {error}
              </p>
            )}
            <button
              onClick={handleJoin}
              disabled={loading || nickname.length < 2}
              className="cs-btn-primary"
              style={{ marginTop: '16px', opacity: loading || nickname.length < 2 ? 0.5 : 1 }}
            >
              {loading ? '입장 중...' : '입장하기'}
            </button>
          </>
        )}
      </div>

      <p style={{ marginTop: '32px', fontSize: '12px', color: 'var(--color-cs-hint)' }}>
        10,000pt가 지급됩니다
      </p>
    </div>
  )
}
