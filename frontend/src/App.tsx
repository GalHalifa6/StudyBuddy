import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import GoogleCallback from './pages/GoogleCallback';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminExpertVerification from './pages/AdminExpertVerification';
import ExpertDashboard from './pages/ExpertDashboard';
import ExpertsBrowse from './pages/ExpertHub';
import SessionsBrowse from './pages/SessionsBrowse';
import SessionRoom from './pages/SessionRoom';
import SessionRequests from './pages/SessionRequests';
import QuizOnboarding from './pages/QuizOnboarding';
import Help from './pages/Help';
import SendReport from './pages/SendReport';
import UpcomingEvents from './pages/UpcomingEvents';
import MyGroups from './pages/MyGroups';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/sessions" element={<SessionsBrowse />} />
              <Route path="/session/:sessionId" element={<SessionRoom />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/audit" element={<AdminAuditLogs />} />
              <Route path="/admin/experts" element={<AdminExpertVerification />} />
              <Route path="/expert-dashboard" element={<ExpertDashboard />} />
              <Route path="/experts" element={<ExpertsBrowse />} />
              <Route path="/session-requests" element={<SessionRequests />} />
              <Route path="/help" element={<Help />} />
              <Route path="/send-report" element={<SendReport />} />
              <Route path="/upcoming-events" element={<UpcomingEvents />} />
              <Route path="/my-groups" element={<MyGroups />} />
            </Route>

            <Route
              path="/quiz-onboarding"
              element={
                <ProtectedRoute>
                  <QuizOnboarding />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
