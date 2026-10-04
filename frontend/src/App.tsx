import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './pages/DashboardView';
import AskAiView from './pages/AskAiView';
import ReviewsView from './pages/ReviewsView';
import ThemesView from './pages/ThemesView';
import ReportsView from './pages/ReportsView';
import CompetitorsView from './pages/CompetitorsView';
import SettingsView from './pages/SettingsView';
import AuthView from './pages/AuthView';
import ProofModal from './components/ProofModal';
import CreateBusinessModal from './components/CreateBusinessModal';
import LandingPage from './components/landing/LandingPage';

import type { PageId, ReviewItem } from './types/dashboard';
import type { ProofItem } from './types';
import { Loader2 } from 'lucide-react';
import { useBusiness } from './context/BusinessContext';

/**
 * Dashboard Shell Layout with Persistent Sidebar & Header
 */
function DashboardLayout({
  onOpenCreateBusiness,
}: {
  onOpenCreateBusiness: () => void;
}) {
  const { isAuthenticated, isAuthLoaded, isLoading } = useBusiness();
  const location = useLocation();
  const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  // Map current URL pathname to PageId for Header title & metadata
  const getActivePage = (pathname: string): PageId => {
    if (pathname.includes('/ask-ai')) return 'ask-ai';
    if (pathname.includes('/reviews')) return 'reviews';
    if (pathname.includes('/themes')) return 'themes';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/competitors')) return 'competitors';
    if (pathname.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const activePage = getActivePage(location.pathname);

  // Auth loading state
  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#010102] space-y-4">
        <Loader2 className="w-8 h-8 text-[#5e6ad2] animate-spin" />
        <p className="text-xs text-[#8a8f98] font-mono">Authenticating credentials...</p>
      </div>
    );
  }

  // If live Clerk authentication is active and user is not signed in, redirect to sign-in
  if (hasClerkKey && !isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  // Telemetry loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#010102] space-y-3">
        <Loader2 className="w-6 h-6 text-[#5e6ad2] animate-spin" />
        <p className="text-xs text-[#8a8f98]">Loading live telemetry...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#010102] text-[#f7f8f8]">
      {/* Left Navigation Sidebar */}
      <Sidebar />

      {/* Right Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#010102]">
        {/* Top Sticky Header */}
        <Header
          activePage={activePage}
          onOpenCreateBusiness={onOpenCreateBusiness}
        />

        {/* Dynamic Nested View Router */}
        <main className={`flex-1 bg-[#010102] ${activePage === 'ask-ai' ? 'flex flex-col min-h-0 overflow-hidden pb-0' : 'pb-16'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { isAuthenticated } = useBusiness();

  const [selectedReview, setSelectedReview] = useState<ReviewItem | ProofItem | null>(null);
  const [pendingAiQuery, setPendingAiQuery] = useState<string | undefined>(undefined);
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);

  const handleAskAiQuery = (query: string) => {
    setPendingAiQuery(query);
    navigate('/dashboard/ask-ai');
  };

  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8] antialiased selection:bg-[#5e6ad2] selection:text-white">
      <Routes>
        {/* Landing Page Route */}
        <Route
          path="/"
          element={
            <LandingPage
              onLaunchApp={(target) => {
                if (target === 'sign-up') {
                  navigate(isAuthenticated ? '/dashboard' : '/sign-up');
                } else if (target === 'sign-in') {
                  navigate(isAuthenticated ? '/dashboard' : '/sign-in');
                } else {
                  navigate('/dashboard');
                }
              }}
              onOpenProof={(proof) => setSelectedReview(proof)}
            />
          }
        />

        {/* Dedicated Sign In Page */}
        <Route
          path="/sign-in"
          element={
            <AuthView
              initialMode="sign-in"
              onNavigateHome={() => navigate('/')}
              onAuthSuccess={() => navigate('/dashboard')}
            />
          }
        />
        <Route path="/login" element={<Navigate to="/sign-in" replace />} />

        {/* Dedicated Sign Up Page */}
        <Route
          path="/sign-up"
          element={
            <AuthView
              initialMode="sign-up"
              onNavigateHome={() => navigate('/')}
              onAuthSuccess={() => navigate('/dashboard')}
            />
          }
        />
        <Route path="/register" element={<Navigate to="/sign-up" replace />} />

        {/* Backwards-compatible aliases */}
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
        <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />

        {/* Production Dashboard App Shell & Nested Routes */}
        <Route
          path="/dashboard"
          element={
            <DashboardLayout
              onOpenCreateBusiness={() => setIsCreateBusinessOpen(true)}
            />
          }
        >
          <Route
            index
            element={
              <DashboardView
                onNavigate={(page) =>
                  navigate(page === 'dashboard' ? '/dashboard' : `/dashboard/${page}`)
                }
                onAskAiQuery={handleAskAiQuery}
              />
            }
          />
          <Route
            path="ask-ai"
            element={
              <AskAiView
                initialQuery={pendingAiQuery}
              />
            }
          />
          <Route
            path="reviews"
            element={<ReviewsView onOpenProof={(rev) => setSelectedReview(rev)} />}
          />
          <Route
            path="themes"
            element={<ThemesView onOpenProof={(rev) => setSelectedReview(rev)} />}
          />
          <Route path="reports" element={<ReportsView />} />
          <Route path="competitors" element={<CompetitorsView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Shared Grounded Proof Drawer Modal */}
      <ProofModal
        item={selectedReview}
        onClose={() => setSelectedReview(null)}
      />

      {/* Create Business Modal */}
      <CreateBusinessModal
        isOpen={isCreateBusinessOpen}
        onClose={() => setIsCreateBusinessOpen(false)}
      />
    </div>
  );
}
