import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  CheckSquare, 
  Compass, 
  Shield, 
  Plus, 
  LogOut, 
  User as UserIcon,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: 'dashboard' | 'reflections' | 'insights' | 'actions' | 'settings' | 'workspace';
  onNavigate: (view: 'dashboard' | 'reflections' | 'insights' | 'actions' | 'settings') => void;
  onNewReflection: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onNewReflection }) => {
  const { user, signOut, isDemoUser } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#0f1115]/90 backdrop-blur-md border-b border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
              id="brand-logo-btn"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-lg leading-none">R</span>
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight text-white">
                  Reflect<span className="text-indigo-400">AI</span>
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                id="nav-dashboard-btn"
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>

              <button
                id="nav-reflections-btn"
                onClick={() => onNavigate('reflections')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'reflections'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Reflections
              </button>

              <button
                id="nav-insights-btn"
                onClick={() => onNavigate('insights')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'insights'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Insights
              </button>

              <button
                id="nav-actions-btn"
                onClick={() => onNavigate('actions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'actions'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Next Steps
              </button>

              <button
                id="nav-settings-btn"
                onClick={() => onNavigate('settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'settings'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Privacy & Security
              </button>
            </nav>
          </div>

          {/* Right Action & User Controls */}
          <div className="flex items-center gap-3">
            {/* New Reflection CTA */}
            <button
              id="new-reflection-header-btn"
              onClick={onNewReflection}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Reflection</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* User Profile / Status */}
            {user && (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-medium text-white max-w-[120px] truncate">{user.displayName || 'User'}</span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-500">
                    {isDemoUser ? 'Demo Mode' : 'Verified Auth'}
                  </span>
                </div>

                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs font-semibold">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4 text-slate-400" />}
                  </div>
                )}

                <button
                  id="header-signout-btn"
                  onClick={signOut}
                  title="Sign Out"
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-md transition-colors cursor-pointer"
                >
                  <span className="hidden sm:inline">Sign Out</span>
                  <LogOut className="w-3.5 h-3.5 sm:hidden" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sub Navigation */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`py-1 px-2 rounded-md ${currentView === 'dashboard' ? 'text-indigo-400 font-bold bg-slate-800' : 'text-slate-400'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate('reflections')}
            className={`py-1 px-2 rounded-md ${currentView === 'reflections' ? 'text-indigo-400 font-bold bg-slate-800' : 'text-slate-400'}`}
          >
            Reflections
          </button>
          <button
            onClick={() => onNavigate('insights')}
            className={`py-1 px-2 rounded-md ${currentView === 'insights' ? 'text-indigo-400 font-bold bg-slate-800' : 'text-slate-400'}`}
          >
            Insights
          </button>
          <button
            onClick={() => onNavigate('actions')}
            className={`py-1 px-2 rounded-md ${currentView === 'actions' ? 'text-indigo-400 font-bold bg-slate-800' : 'text-slate-400'}`}
          >
            Steps
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className={`py-1 px-2 rounded-md ${currentView === 'settings' ? 'text-indigo-400 font-bold bg-slate-800' : 'text-slate-400'}`}
          >
            Privacy
          </button>
        </div>
      </div>
    </header>
  );
};
