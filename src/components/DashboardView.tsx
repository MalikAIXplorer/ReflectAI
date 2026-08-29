import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  CheckSquare, 
  Plus, 
  ArrowRight, 
  Smile, 
  Layers, 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  Circle,
  RefreshCw,
  Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getJournals, 
  getActionItems, 
  toggleActionItem, 
  createActionItem, 
  deleteActionItem 
} from '../lib/firestoreService';
import { generateWeeklySnapshot } from '../lib/api';
import type { JournalEntry, ActionItem } from '../types';

interface DashboardViewProps {
  onOpenJournal: (journal: JournalEntry) => void;
  onNewReflection: () => void;
  onViewAllHistory: () => void;
  onViewAllInsights: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenJournal,
  onNewReflection,
  onViewAllHistory,
  onViewAllInsights,
}) => {
  const { user, getIdToken } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [newActionText, setNewActionText] = useState('');
  const [weeklySynthesis, setWeeklySynthesis] = useState<string>('');
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const [jList, aList] = await Promise.all([
        getJournals(user.uid),
        getActionItems(user.uid),
      ]);
      setJournals(jList);
      setActions(aList);

      // Check for cached weekly snapshot or generate if empty
      const cachedSnapshot = localStorage.getItem(`reflectai_${user.uid}_snapshot`);
      if (cachedSnapshot) {
        setWeeklySynthesis(cachedSnapshot);
      } else if (jList.length > 0) {
        handleRefreshSnapshot(jList);
      } else {
        setWeeklySynthesis('Welcome to ReflectAI. Create your first reflection to receive personalized weekly insight snapshots.');
      }
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRefreshSnapshot = async (currentJournals = journals) => {
    if (!user || currentJournals.length === 0) return;
    setIsGeneratingSnapshot(true);
    try {
      const token = await getIdToken();
      const recentSummaries = currentJournals.slice(0, 5).map((j) => j.summary).filter(Boolean);
      
      // Calculate top themes
      const themeMap: Record<string, number> = {};
      const moodCounts: Record<string, number> = {};
      currentJournals.forEach((j) => {
        (j.themes || []).forEach((t) => {
          themeMap[t] = (themeMap[t] || 0) + 1;
        });
        if (j.mood) {
          moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1;
        }
      });

      const topThemes = Object.keys(themeMap)
        .sort((a, b) => themeMap[b] - themeMap[a])
        .slice(0, 4);

      const synthesis = await generateWeeklySnapshot({
        idToken: token,
        recentSummaries,
        topThemes,
        moodCounts,
      });

      setWeeklySynthesis(synthesis);
      localStorage.setItem(`reflectai_${user.uid}_snapshot`, synthesis);
    } catch (err) {
      console.error('[Dashboard] Snapshot synthesis failed:', err);
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  const handleToggleAction = async (action: ActionItem) => {
    if (!user) return;
    const newCompleted = !action.completed;
    setActions((prev) =>
      prev.map((a) => (a.id === action.id ? { ...a, completed: newCompleted } : a))
    );
    await toggleActionItem(user.uid, action.id, newCompleted);
  };

  const handleAddCustomAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim() || !user) return;
    const created = await createActionItem(user.uid, {
      text: newActionText.trim(),
      sourceJournalId: 'custom',
      sourceJournalTitle: 'Manual Next Step',
    });
    setActions((prev) => [created, ...prev]);
    setNewActionText('');
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!user) return;
    setActions((prev) => prev.filter((a) => a.id !== actionId));
    await deleteActionItem(user.uid, actionId);
  };

  // Aggregated Themes
  const themeCounts: Record<string, number> = {};
  journals.forEach((j) => {
    (j.themes || []).forEach((t) => {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    });
  });

  const sortedThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const completedCount = actions.filter((a) => a.completed).length;
  const pendingCount = actions.filter((a) => !a.completed).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Greeting and Quick CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Hello, {user?.displayName ? user.displayName.split(' ')[0] : 'Explorer'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Welcome back to your private Bento reflection workspace.
          </p>
        </div>

        <button
          id="dashboard-start-reflection-btn"
          onClick={onNewReflection}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Start New Reflection</span>
        </button>
      </div>

      {/* SECTION 1: Your Reflection Snapshot (Bento Header Card) */}
      <div className="bg-[#161920] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 text-left shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Your Reflection Snapshot
            </h2>
          </div>

          <button
            onClick={() => handleRefreshSnapshot()}
            disabled={isGeneratingSnapshot || journals.length === 0}
            title="Refresh Weekly Snapshot"
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSnapshot ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* 4 Stat Boxes (Bento grid stats) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <p className="text-2xl font-bold text-white">{journals.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Entries</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <p className="text-2xl font-bold text-indigo-400">{pendingCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Active Goals</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Done Steps</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <p className="text-base font-bold text-amber-400 truncate mt-1">
              {sortedThemes[0]?.[0] ? `#${sortedThemes[0][0]}` : 'Exploration'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Top Focus</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs text-slate-300 italic leading-relaxed max-w-3xl">
            "{weeklySynthesis}"
          </p>
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded border border-indigo-500/20 uppercase tracking-wider">
            AI Weekly Insight
          </span>
        </div>
      </div>

      {/* SECTION 2 & 3: Bento Grid (Recent Reflections + Next Steps + Themes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        
        {/* Left Column: Recent Reflections (Cols 7) */}
        <div className="lg:col-span-7 bg-[#161920] border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Recent History & Reflections
            </h3>
            {journals.length > 0 && (
              <button
                onClick={onViewAllHistory}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                View all ({journals.length})
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {journals.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-slate-900/40 rounded-xl border border-slate-800/60 p-6">
              <Compass className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-medium text-slate-300">No reflections logged yet</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Begin your private dialogue with Gemini to uncover clarity, brainstorm paths, and track personal growth.
              </p>
              <button
                onClick={onNewReflection}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Write First Entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {journals.slice(0, 4).map((j) => (
                <div
                  key={j.id}
                  onClick={() => onOpenJournal(j)}
                  className="p-3.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {j.title}
                    </h4>
                    {j.mood && (
                      <span className="shrink-0 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded text-[10px] font-semibold capitalize flex items-center gap-1">
                        <Smile className="w-2.5 h-2.5 text-indigo-400" />
                        {j.mood}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
                    {j.summary || j.lastMessageExcerpt || 'Open to continue this multi-turn reflection with Gemini.'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(j.updatedAt || j.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span>•</span>
                      <span>{j.messageCount || 0} messages</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {(j.themes || []).slice(0, 2).map((t, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Next Steps & Recurring Themes (Cols 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* My Next Steps Checklist (Bento Card) */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                Your Next Steps
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {completedCount}/{actions.length} Done
              </span>
            </div>

            {/* Add action input */}
            <form onSubmit={handleAddCustomAction} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a step (e.g., Update resume)..."
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newActionText.trim()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Add
              </button>
            </form>

            {/* List */}
            {actions.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center italic">
                No active tasks. Ask Gemini for an <strong>Action Plan</strong> in your reflections!
              </p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {actions.slice(0, 5).map((action) => (
                  <div
                    key={action.id}
                    className={`p-2.5 rounded-lg border flex items-start justify-between gap-2.5 text-xs transition-colors group ${
                      action.completed
                        ? 'bg-indigo-600/10 border-indigo-500/20'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleAction(action)}
                      className="mt-0.5 shrink-0 cursor-pointer"
                    >
                      {action.completed ? (
                        <div className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">✓</span>
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border-2 border-slate-600 flex items-center justify-center hover:border-indigo-400"></div>
                      )}
                    </button>

                    <span className={`flex-1 text-xs ${action.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {action.text}
                    </span>

                    <button
                      onClick={() => handleDeleteAction(action.id)}
                      className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => onOpenJournal(journals[0] || ({} as JournalEntry))}
              className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest cursor-pointer"
            >
              View All Tasks
            </button>
          </div>

          {/* Recurring Themes (Bento Card) */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Recurring Themes
              </h3>
              <button
                onClick={onViewAllInsights}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Insights
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {sortedThemes.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Themes will accumulate as you write reflections.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {sortedThemes.map(([theme, count], idx) => {
                  // Cycle theme pill styles to match Bento Design (Indigo, Emerald, Amber, Rose)
                  const colors = [
                    'bg-indigo-500/10 border-indigo-500/30 text-white text-indigo-400',
                    'bg-emerald-500/10 border-emerald-500/30 text-white text-emerald-400',
                    'bg-amber-500/10 border-amber-500/30 text-white text-amber-400',
                    'bg-rose-500/10 border-rose-500/30 text-white text-rose-400',
                  ];
                  const colorClass = colors[idx % colors.length];
                  return (
                    <div
                      key={idx}
                      className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${colorClass.split(' ').slice(0, 2).join(' ')}`}
                    >
                      <span className="text-[10px] font-bold text-white uppercase">{theme}</span>
                      <span className={`text-[10px] font-bold ${colorClass.split(' ')[3]}`}>
                        x{count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
