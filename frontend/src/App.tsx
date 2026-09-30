import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './pages/DashboardView';
import AskAiView from './pages/AskAiView';
import ReviewsView from './pages/ReviewsView';
import ThemesView from './pages/ThemesView';
import ActionBoardView from './pages/ActionBoardView';
import ReportsView from './pages/ReportsView';
import SettingsView from './pages/SettingsView';
import ProofModal from './components/ProofModal';
import LandingPage from './components/landing/LandingPage';

import type { PageId, ReviewItem, ActionTask } from './types/dashboard';
import type { ProofItem } from './types';
import { MOCK_TASKS } from './mock/dashboardData';
import { LayoutGrid, Globe } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<'app' | 'landing'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('repscan_view_mode');
      if (saved === 'app' || saved === 'landing') return saved;
    }
    return 'landing';
  });

  const handleSetViewMode = (mode: 'app' | 'landing') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('repscan_view_mode', mode);
    }
  };

  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [selectedReview, setSelectedReview] = useState<ReviewItem | ProofItem | null>(null);
  const [pendingAiQuery, setPendingAiQuery] = useState<string | undefined>(undefined);
  const [tasks, setTasks] = useState<ActionTask[]>(MOCK_TASKS);

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAskAiQuery = (query: string) => {
    setPendingAiQuery(query);
    setActivePage('ask-ai');
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: ActionTask['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const handleAddTask = (taskData: Omit<ActionTask, 'id' | 'createdAt'>) => {
    const newTask: ActionTask = {
      ...taskData,
      id: `task_${Date.now()}`,
      createdAt: 'Just now',
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleCreateTaskFromReview = (review: ReviewItem) => {
    const newTask: ActionTask = {
      id: `task_${Date.now()}`,
      title: `Resolve ${review.themes[0] || 'Feedback'} Issue reported by ${review.author}`,
      description: review.content,
      priority: review.rating <= 2 ? 'High' : 'Medium',
      status: 'open',
      assignee: 'Customer Experience Lead',
      linkedTheme: review.themes[0] || 'Customer Feedback',
      linkedReviewId: review.id,
      createdAt: 'Just now',
    };
    setTasks((prev) => [newTask, ...prev]);
    setActivePage('action-board');
  };

  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8] antialiased selection:bg-[#5e6ad2] selection:text-white">
      {/* Top Floating App/Landing View Switcher */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center bg-[#0f1011]/90 backdrop-blur-md border border-[#23252a] rounded-full p-1 shadow-2xl text-xs font-medium text-[#8a8f98]">
        <button
          type="button"
          onClick={() => handleSetViewMode('app')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
            viewMode === 'app'
              ? 'bg-[#18191a] text-[#f7f8f8] border border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              : 'hover:text-[#f7f8f8] text-[#8a8f98]'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-[#5e6ad2]" />
          <span>Dashboard App</span>
        </button>
        <button
          type="button"
          onClick={() => handleSetViewMode('landing')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
            viewMode === 'landing'
              ? 'bg-[#18191a] text-[#f7f8f8] border border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              : 'hover:text-[#f7f8f8] text-[#8a8f98]'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-[#8a8f98]" />
          <span>Landing Page</span>
        </button>
      </div>

      {viewMode === 'app' ? (
        /* ─────────────────────────────────────────────────────────────
           REPSCAN DASHBOARD EXPERIENCE (LINEAR DARK CANVAS APPLICATION)
           ───────────────────────────────────────────────────────────── */
        <div className="flex min-h-screen bg-[#010102]">
          {/* Left Navigation Sidebar */}
          <Sidebar activePage={activePage} onSelectPage={handleNavigate} />

          {/* Right Main Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#010102]">
            {/* Top Sticky Header */}
            <Header activePage={activePage} />

            {/* Dynamic View Router */}
            <main className="flex-1 pb-16 bg-[#010102]">
              {activePage === 'dashboard' && (
                <DashboardView
                  onNavigate={handleNavigate}
                  onAskAiQuery={handleAskAiQuery}
                />
              )}
              {activePage === 'ask-ai' && (
                <AskAiView
                  initialQuery={pendingAiQuery}
                  onOpenProof={(rev) => setSelectedReview(rev)}
                />
              )}
              {activePage === 'reviews' && (
                <ReviewsView
                  onOpenProof={(rev) => setSelectedReview(rev)}
                  onCreateTask={handleCreateTaskFromReview}
                />
              )}
              {activePage === 'themes' && (
                <ThemesView onOpenProof={(rev) => setSelectedReview(rev)} />
              )}
              {activePage === 'action-board' && (
                <ActionBoardView
                  tasks={tasks}
                  onUpdateStatus={handleUpdateTaskStatus}
                  onAddTask={handleAddTask}
                />
              )}
              {activePage === 'reports' && <ReportsView />}
              {activePage === 'settings' && <SettingsView />}
            </main>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           LANDING PAGE VIEW (PURE LINEAR.APP CRAFT AESTHETIC)
           ───────────────────────────────────────────────────────────── */
        <LandingPage
          onLaunchApp={() => handleSetViewMode('app')}
          onOpenProof={(proof) => setSelectedReview(proof)}
        />
      )}

      {/* Shared Grounded Proof Drawer Modal */}
      <ProofModal
        item={selectedReview}
        onClose={() => setSelectedReview(null)}
      />
    </div>
  );
}
