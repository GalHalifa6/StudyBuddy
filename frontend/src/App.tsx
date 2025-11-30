import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import ExpertDashboard from './pages/ExpertDashboard';
import ExpertsBrowse from './pages/ExpertsBrowse';
import SessionsBrowse from './pages/SessionsBrowse';
import SessionRoom from './pages/SessionRoom';
import MyQuestions from './pages/MyQuestions';
import PublicQA from './pages/PublicQA';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

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
              <Route path="/expert-dashboard" element={<ExpertDashboard />} />
              <Route path="/experts" element={<ExpertsBrowse />} />
              <Route path="/my-questions" element={<MyQuestions />} />
              <Route path="/qa" element={<PublicQA />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
