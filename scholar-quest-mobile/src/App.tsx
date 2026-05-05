import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import TopAppBar from './components/TopAppBar';
import BottomNavBar from './components/BottomNavBar';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Route-level code splitting — each page is its own chunk so the initial
// paint only ships the route the student is actually on. Pre-split-out
// vendor chunks (react/motion/router) get cached on first visit.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Learn = lazy(() => import('./pages/Learn'));
const LearningPath = lazy(() => import('./pages/LearningPath'));
const Shop = lazy(() => import('./pages/Shop'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const MockTests = lazy(() => import('./pages/MockTests'));
const Focus = lazy(() => import('./pages/Focus'));
const LessonDetail = lazy(() => import('./pages/LessonDetail'));
const ClassDetail = lazy(() => import('./pages/ClassDetail'));
const CircleDetail = lazy(() => import('./pages/CircleDetail'));
const Homework = lazy(() => import('./pages/Homework'));

// AITutor pulls in the Gemini SDK (~150 KB). Lazy-load it so the initial
// bundle stays small; the chunk is fetched the first time the student opens
// the tutor.
const AITutor = lazy(() => import('./components/AITutor'));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  );
}
import { TutorProvider, useTutor } from './context/TutorContext';
import { GameProvider } from './context/GameContext';
import { LocaleProvider } from './context/LocaleContext';
import { AuthProvider } from './context/AuthContext';
import { StudentProvider } from './context/StudentContext';
import { PushProvider } from './context/PushContext';

function Layout({ children }: { children: ReactNode }) {
  const { context } = useTutor();
  return (
    <div className="min-h-screen bg-background selection:bg-primary/10 selection:text-primary pb-32">
      <TopAppBar />
      <main className="pt-24 px-6 max-w-5xl mx-auto">
        {children}
      </main>
      <BottomNavBar />
      <Suspense fallback={null}>
        <AITutor currentContext={context} />
      </Suspense>
    </div>
  );
}

function AppShell() {
  return (
    <StudentProvider>
      <PushProvider>
      <TutorProvider>
        <Layout>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/path" element={<LearningPath />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/mock-tests" element={<MockTests />} />
              <Route path="/focus" element={<Focus />} />
              <Route path="/learn/lesson/:id" element={<LessonDetail />} />
              <Route path="/schedule/class/:id" element={<ClassDetail />} />
              <Route path="/circles/:id" element={<CircleDetail />} />
              <Route path="/homework" element={<Homework />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </TutorProvider>
      </PushProvider>
    </StudentProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
      <GameProvider>
        {/* basename intentionally empty: Capacitor serves the APK from
            https://localhost/ root, and Vite ``base: './'`` makes
            ``import.meta.env.BASE_URL`` unstable across versions. Empty
            basename works on the APK AND on a plain web deploy. */}
        <Router basename="">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </GameProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
