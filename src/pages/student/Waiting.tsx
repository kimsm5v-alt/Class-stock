import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMockStore } from '../../stores/mockStore'
import { useSessionStore } from '../../stores/sessionStore'
import type { Session } from '../../lib/types'

export default function StudentWaiting() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { studentId, studentNickname } = useSessionStore()
  const [session, setSession] = useState<Session | null>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [localNickname, setLocalNickname] = useState<string | null>(null)

  // studentId가 없으면 입장 페이지로 리다이렉트
  useEffect(() => {
    if (!studentId) {
      navigate('/join')
    }
  }, [studentId, navigate])

  // 닉네임 가져오기
  useEffect(() => {
    if (!studentId) return
    const student = useMockStore.getState().getStudent(studentId)
    if (student) {
      setLocalNickname(student.nickname)
    }
  }, [studentId])

  // 데이터 로드 및 동기화
  useEffect(() => {
    if (!id) return

    const syncData = () => {
      const mockStore = useMockStore.getState()
      const sessionData = mockStore.getSession(id)

      if (sessionData) {
        setSession(sessionData)
        if (sessionData.status !== 'waiting') {
          navigate(`/session/${id}/live`)
          return
        }
      }

      const students = mockStore.getSessionStudents(id)
      setStudentCount(students.length)
    }

    syncData()

    // mockStore 변경 감지
    const unsubscribe = useMockStore.subscribe(syncData)
    return unsubscribe
  }, [id, navigate])

  return (
    <div className="page-center">
      {/* Animated dots */}
      <div className="mb-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="cs-live-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      {/* Session Info */}
      <div className="text-center mb-8">
        <p className="text-lg font-medium text-cs-primary">
          {session?.class_name} · {session?.subject}
        </p>
        <p className="text-sm text-cs-secondary mt-1">{session?.unit_name}</p>
      </div>

      {/* Waiting Message */}
      <div className="cs-card text-center" style={{ maxWidth: '320px' }}>
        <p className="text-cs-primary font-medium mb-2">
          교사가 수업을 시작하면
        </p>
        <p className="text-cs-primary font-medium">
          자동으로 넘어갑니다
        </p>

        <div className="mt-6 pt-6 border-t border-cs-border">
          <p className="text-xs text-cs-hint mb-1">현재 접속</p>
          <p className="text-2xl font-bold text-cs-mint-text cs-mono">
            {studentCount}명
          </p>
        </div>
      </div>

      {/* Student nickname */}
      <div className="mt-8">
        <span className="cs-tag cs-tag-new">
          {localNickname || studentNickname || '로딩 중...'}
        </span>
      </div>

      {/* Points Info */}
      <p className="mt-4 text-xs text-cs-hint">
        시작 자본: <strong className="text-cs-primary">10,000pt</strong>
      </p>
    </div>
  )
}
