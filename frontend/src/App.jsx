import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MusicProvider } from './context/MusicContext';
import Layout from './components/Layout';
import LoginPage    from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GithubPage   from './pages/GithubPage';
import WeatherPage  from './pages/WeatherPage';
import NewsPage     from './pages/NewsPage';
import InsightPage  from './pages/InsightPage';
import ActivityPage from './pages/ActivityPage';
import SettingsPage from './pages/SettingsPage';
import DeepWorkPage from './pages/DeepWorkPage';
import TasksPage    from './pages/TasksPage';
import CodeAssistantPage from './pages/CodeAssistantPage';
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
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index           element={<DashboardPage />} />
              <Route path="github"   element={<GithubPage />} />
              <Route path="weather"  element={<WeatherPage />} />
              <Route path="news"     element={<NewsPage />} />
              <Route path="focus"    element={<DeepWorkPage />} />
              <Route path="tasks"    element={<TasksPage />} />
              <Route path="assistant" element={<CodeAssistantPage />} />
              <Route path="insight"  element={<InsightPage />} />
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
