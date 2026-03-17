import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Pages
import Landing from './pages/Landing'
import TeacherAuth from './pages/teacher/Auth'
import TeacherDashboard from './pages/teacher/Dashboard'
import CreateSession from './pages/teacher/CreateSession'
import WaitingRoom from './pages/teacher/WaitingRoom'
import LiveSession from './pages/teacher/LiveSession'
import Settlement from './pages/teacher/Settlement'
import Report from './pages/teacher/Report'
import JoinSession from './pages/student/JoinSession'
import StudentWaiting from './pages/student/Waiting'
import LiveTrading from './pages/student/LiveTrading'
import StudentResult from './pages/student/Result'

// Protected Route for Teacher
function TeacherRoute({ children }: { children: React.ReactNode }) {
  const { teacher } = useAuthStore()

  if (teacher) {
    return <>{children}</>
  }

  return <Navigate to="/teacher/auth" replace />
}

function App() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<Landing />} />

      {/* Teacher Routes */}
      <Route path="/teacher/auth" element={<TeacherAuth />} />
      <Route
        path="/teacher/dashboard"
        element={
          <TeacherRoute>
            <TeacherDashboard />
          </TeacherRoute>
        }
      />
      <Route
        path="/teacher/create"
        element={
          <TeacherRoute>
            <CreateSession />
          </TeacherRoute>
        }
      />
      <Route
        path="/teacher/session/:id/wait"
        element={
          <TeacherRoute>
            <WaitingRoom />
          </TeacherRoute>
        }
      />
      <Route
        path="/teacher/session/:id/live"
        element={
          <TeacherRoute>
            <LiveSession />
          </TeacherRoute>
        }
      />
      <Route
        path="/teacher/session/:id/settle"
        element={
          <TeacherRoute>
            <Settlement />
          </TeacherRoute>
        }
      />
      <Route
        path="/teacher/session/:id/report"
        element={
          <TeacherRoute>
            <Report />
          </TeacherRoute>
        }
      />

      {/* Student Routes */}
      <Route path="/join" element={<JoinSession />} />
      <Route path="/session/:id/waiting" element={<StudentWaiting />} />
      <Route path="/session/:id/live" element={<LiveTrading />} />
      <Route path="/session/:id/result" element={<StudentResult />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
