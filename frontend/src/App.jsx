import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MusicProvider } from './context/MusicContext';
import Layout from './components/Layout';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const WeatherPage = lazy(() => import('./pages/WeatherPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FocusPage = lazy(() => import('./pages/FocusPage'));
const CodeAssistantPage = lazy(() => import('./pages/CodeAssistantPage'));
const AutopilotPage = lazy(() => import('./pages/AutopilotPage'));
const CodebasePage = lazy(() => import('./pages/CodebasePage'));
const FlowPage = lazy(() => import('./pages/FlowPage'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const BriefingPage = lazy(() => import('./pages/BriefingPage'));
const RoomsPage = lazy(() => import('./pages/RoomsPage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
import LoadingScreen from './components/LoadingScreen';

// Remember where a logged-out visitor was going (e.g. a /rooms?join=CODE invite) and return there after login
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const from = useLocation().state?.from;
  if (loading) return <LoadingScreen />;
  if (user)    return <Navigate to={from ? `${from.pathname}${from.search}` : '/'} replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <MusicProvider>
        <BrowserRouter>
          {/* Pages are code-split; Layout shows its own lighter fallback for in-app navigation */}
          <Suspense fallback={<LoadingScreen />}>
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
              <Route path="autopilot" element={<AutopilotPage />} />
              <Route path="codebase" element={<CodebasePage />} />
              <Route path="flow" element={<FlowPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="briefing" element={<BriefingPage />} />
              <Route path="rooms" element={<RoomsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </MusicProvider>
    </AuthProvider>
  );
}
