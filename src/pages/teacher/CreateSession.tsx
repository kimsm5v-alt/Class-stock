import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useMockStore } from '../../stores/mockStore'

interface KeywordItem {
  keyword: string
  isHidden: boolean
}

export default function CreateSession() {
  const navigate = useNavigate()
  const { teacher } = useAuthStore()
  const { createSession } = useMockStore()
  const [className, setClassName] = useState('')
  const [subject, setSubject] = useState('')
  const [unitName, setUnitName] = useState('')
  const [keywords, setKeywords] = useState<KeywordItem[]>([
    { keyword: '', isHidden: false },
    { keyword: '', isHidden: false },
    { keyword: '', isHidden: false },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addKeyword = () => {
    if (keywords.length >= 7) return
    setKeywords([...keywords, { keyword: '', isHidden: false }])
  }

  const removeKeyword = (index: number) => {
    if (keywords.length <= 3) return
    setKeywords(keywords.filter((_, i) => i !== index))
  }

  const updateKeyword = (index: number, value: string) => {
    const updated = [...keywords]
    updated[index].keyword = value.slice(0, 20)
    setKeywords(updated)
  }

  const toggleHidden = (index: number) => {
    const hiddenCount = keywords.filter((k) => k.isHidden).length
    const updated = [...keywords]
    if (updated[index].isHidden) {
      updated[index].isHidden = false
    } else if (hiddenCount < 2) {
      updated[index].isHidden = true
    }
    setKeywords(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacher) return

    const validKeywords = keywords.filter((k) => k.keyword.trim())
    if (validKeywords.length < 3) {
      setError('최소 3개의 키워드를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Mock: 로컬 스토어에 세션 생성
      const session = createSession(
        teacher.id,
        className,
        subject,
        unitName,
        validKeywords.map(k => ({
          keyword: k.keyword.trim(),
          isHidden: k.isHidden,
        }))
      )

      navigate(`/teacher/session/${session.id}/wait`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
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
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-cs-primary)' }}>
            새 수업 만들기
          </h1>
        </div>
      </header>

      {/* Form */}
      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 20px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Basic Info */}
          <div className="cs-card">
            <p className="cs-section-label" style={{ marginBottom: '16px' }}>수업 정보</p>
            <div className="cs-form-group">
              <div>
                <label className="cs-label">학급명</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="예: 3학년 2반"
                  required
                  className="cs-input"
                />
              </div>
              <div>
                <label className="cs-label">과목</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="예: 과학"
                  required
                  className="cs-input"
                />
              </div>
              <div>
                <label className="cs-label">단원명</label>
                <input
                  type="text"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="예: 세포의 에너지"
                  required
                  className="cs-input"
                />
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="cs-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p className="cs-section-label" style={{ marginBottom: 0 }}>오늘의 종목 (키워드)</p>
              <span className="cs-mono" style={{ fontSize: '12px', color: 'var(--color-cs-hint)' }}>
                {keywords.filter((k) => k.keyword.trim()).length}/7
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {keywords.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={item.keyword}
                    onChange={(e) => updateKeyword(index, e.target.value)}
                    placeholder={`키워드 ${index + 1}`}
                    className="cs-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleHidden(index)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: item.isHidden ? '1px solid var(--color-cs-gold)' : '1px solid var(--color-cs-border)',
                      background: item.isHidden ? 'var(--color-cs-gold-soft)' : 'var(--color-cs-muted)',
                      color: item.isHidden ? 'var(--color-cs-gold-text)' : 'var(--color-cs-hint)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    🔒 {item.isHidden ? '히든' : ''}
                  </button>
                  {keywords.length > 3 && (
                    <button
                      type="button"
                      onClick={() => removeKeyword(index)}
                      style={{
                        fontSize: '14px',
                        color: 'var(--color-cs-hint)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {keywords.length < 7 && (
              <button
                type="button"
                onClick={addKeyword}
                className="cs-btn-surprise"
                style={{ marginTop: '16px' }}
              >
                + 키워드 추가
              </button>
            )}

            <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--color-cs-hint)' }}>
              💡 히든 종목은 수업 끝까지 ???로 표시됩니다 (최대 2개)
            </p>
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
            style={{ height: '52px', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? '생성 중...' : '수업 만들기'}
          </button>
        </form>
      </main>
    </div>
  )
}
