import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { WorkspaceView } from './components/WorkspaceView';
import { HistoryView } from './components/HistoryView';
import { InsightsView } from './components/InsightsView';
import { ActionsView } from './components/ActionsView';
import { SettingsView } from './components/SettingsView';
import type { JournalEntry } from './types';

type MainView = 'dashboard' | 'reflections' | 'insights' | 'actions' | 'settings' | 'workspace';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<MainView>('dashboard');
  const [activeJournal, setActiveJournal] = useState<JournalEntry | null>(null);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
            <span className="font-bold text-base">R</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Securing ReflectAI session...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show polished landing page
  if (!user) {
    return <LandingView />;
  }

  const handleStartNewReflection = () => {
    setActiveJournal(null);
    setCurrentView('workspace');
  };

  const handleOpenJournal = (journal: JournalEntry) => {
    setActiveJournal(journal);
    setCurrentView('workspace');
  };

  const handleNavigate = (view: 'dashboard' | 'reflections' | 'insights' | 'actions' | 'settings') => {
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 flex flex-col font-sans">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onNewReflection={handleStartNewReflection}
      />

      <main className="flex-1 pb-12">
        {currentView === 'dashboard' && (
          <DashboardView
            onOpenJournal={handleOpenJournal}
            onNewReflection={handleStartNewReflection}
            onViewAllHistory={() => setCurrentView('reflections')}
            onViewAllInsights={() => setCurrentView('insights')}
          />
        )}

        {currentView === 'workspace' && (
          <WorkspaceView
            initialJournal={activeJournal}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'reflections' && (
          <HistoryView
            onOpenJournal={handleOpenJournal}
            onNewReflection={handleStartNewReflection}
          />
        )}

        {currentView === 'insights' && (
          <InsightsView
            onOpenReflection={handleOpenJournal}
          />
        )}

        {currentView === 'actions' && (
          <ActionsView />
        )}

        {currentView === 'settings' && (
          <SettingsView
            onDataWiped={() => setCurrentView('dashboard')}
          />
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 uppercase tracking-widest gap-2">
        <span>© 2024 ReflectAI Laboratory</span>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView('settings')} className="hover:text-slate-300 transition-colors cursor-pointer">Security Policy</button>
          <button onClick={() => setCurrentView('settings')} className="hover:text-slate-300 transition-colors cursor-pointer">Data Privacy</button>
          <span className="text-emerald-400 font-bold">• Cloud Synchronized</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
