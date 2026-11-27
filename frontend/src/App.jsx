import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MusicProvider } from './context/MusicContext';
import Layout from './components/Layout';
import LoginPage    from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WeatherPage  from './pages/WeatherPage';
import NewsPage     from './pages/NewsPage';
import ReportsPage  from './pages/ReportsPage';
import SecurityPage from './pages/SecurityPage';
import ActivityPage from './pages/ActivityPage';
import SettingsPage from './pages/SettingsPage';
import FocusPage    from './pages/FocusPage';
import CodeAssistantPage from './pages/CodeAssistantPage';
import PublicProfilePage from './pages/PublicProfilePage';
import LoadingScreen from './components/LoadingScreen';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user)    return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <MusicProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/u/:username" element={<PublicProfilePage />} /> {/* public, no login */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index           element={<DashboardPage />} />
              <Route path="weather"  element={<WeatherPage />} />
              <Route path="news"     element={<NewsPage />} />
              <Route path="focus"    element={<FocusPage />} />
              {/* Old URLs from v1 */}
              <Route path="github"   element={<Navigate to="/activity" replace />} />
              <Route path="music"    element={<Navigate to="/focus" replace />} />
              <Route path="tasks"    element={<Navigate to="/focus" replace />} />
              <Route path="assistant" element={<CodeAssistantPage />} />
              <Route path="reports"  element={<ReportsPage />} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="insight"  element={<Navigate to="/reports" replace />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </MusicProvider>
    </AuthProvider>
  );
}
