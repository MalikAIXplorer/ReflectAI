import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Sparkles, 
  Layers, 
  TrendingUp, 
  Smile, 
  Lightbulb, 
  Calendar,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getJournals } from '../lib/firestoreService';
import { generateWeeklySnapshot } from '../lib/api';
import type { JournalEntry } from '../types';

interface InsightsViewProps {
  onNewReflectionWithTheme?: (theme: string) => void;
  onOpenReflection?: (journal: JournalEntry) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ 
  onNewReflectionWithTheme, 
  onOpenReflection 
}) => {
  const { user, getIdToken } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [weeklyNarrative, setWeeklyNarrative] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      getJournals(user.uid).then((list) => {
        setJournals(list);
        const cached = localStorage.getItem(`reflectai_${user.uid}_snapshot`);
        if (cached) setWeeklyNarrative(cached);
      });
    }
  }, [user]);

  const handleRefreshNarrative = async () => {
    if (!user || journals.length === 0) return;
    setIsGenerating(true);
    try {
      const token = await getIdToken();
      const recentSummaries = journals.slice(0, 8).map((j) => j.summary).filter(Boolean);
      
      const themeMap: Record<string, number> = {};
      const moodCounts: Record<string, number> = {};
      journals.forEach((j) => {
        (j.themes || []).forEach((t) => {
          themeMap[t] = (themeMap[t] || 0) + 1;
        });
        if (j.mood) {
          moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1;
        }
      });

      const topThemes = Object.keys(themeMap)
        .sort((a, b) => themeMap[b] - themeMap[a])
        .slice(0, 5);

      const synthesis = await generateWeeklySnapshot({
        idToken: token,
        recentSummaries,
        topThemes,
        moodCounts,
      });

      setWeeklyNarrative(synthesis);
      localStorage.setItem(`reflectai_${user.uid}_snapshot`, synthesis);
    } catch (err) {
      console.error('[Insights] Narrative failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 1. Calculate Theme Frequencies
  const themeCounts: Record<string, number> = {};
  journals.forEach((j) => {
    (j.themes || []).forEach((t) => {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    });
  });

  const sortedThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1]);

  const maxThemeCount = sortedThemes.length > 0 ? sortedThemes[0][1] : 1;

  // 2. Mood Distributions
  const moodCounts: Record<string, number> = {};
  journals.forEach((j) => {
    if (j.mood) {
      const m = j.mood.toLowerCase();
      moodCounts[m] = (moodCounts[m] || 0) + 1;
    }
  });

  const sortedMoods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Insights & Recurring Patterns
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Longitudinal themes, shifts in focus, and emotional patterns extracted privately across your reflections.
          </p>
        </div>

        <button
          onClick={handleRefreshNarrative}
          disabled={isGenerating || journals.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>Regenerate Insights</span>
        </button>
      </div>

      {/* Hero Narrative Synthesis */}
      <div className="bg-[#161920] border border-slate-800 text-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-4 h-4" />
          <span>Longitudinal AI Synthesis</span>
        </div>

        <p className="text-lg sm:text-xl font-medium leading-relaxed text-slate-200 italic max-w-3xl mb-6">
          "{weeklyNarrative || 'Your reflections will be analyzed over time to discover recurring themes, shifts in perspective, and actionable growth opportunities.'}"
        </p>

        <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-3 flex items-center justify-between">
          <span>Synthesized from {journals.length} reflections in your private database</span>
          <span className="text-indigo-400 font-semibold">Objective • Non-clinical</span>
        </div>
      </div>

      {/* Pattern Cards & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Recurring Theme Frequency (Cols 7) */}
        <div className="lg:col-span-7 bg-[#161920] border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Recurring Theme Frequency
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies how frequently specific areas of interest or tension surface in your writings.
            </p>
          </div>

          {sortedThemes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No themes extracted yet. Write a few reflections to visualize recurring patterns.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedThemes.map(([theme, count], idx) => {
                const percentage = Math.round((count / maxThemeCount) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        #{theme}
                      </span>
                      <span className="text-slate-400 font-bold">
                        {count} {count === 1 ? 'reflection' : 'reflections'}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Observed Patterns & Mood Spectrum (Cols 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Observed Behavioral Patterns Card */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-indigo-400" />
              Observed Patterns
            </h3>

            {sortedThemes.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1 text-slate-300">
                  <p className="font-bold text-indigo-400">
                    Primary Focus: #{sortedThemes[0]?.[0]}
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    This theme has appeared in {sortedThemes[0]?.[1]} reflections. When this theme arises, you frequently explore decision-making and actionable next steps.
                  </p>
                </div>

                {sortedThemes[1] && (
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1 text-slate-300">
                    <p className="font-bold text-white">
                      Secondary Pattern: #{sortedThemes[1][0]}
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      Present in {sortedThemes[1][1]} reflections, often intersecting with your long-term planning.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Pattern insights will be generated automatically as you record reflections.
              </p>
            )}
          </div>

          {/* Emotional Mood Spectrum */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Smile className="w-4 h-4 text-emerald-400" />
              Emotional Tone Distribution
            </h3>

            {sortedMoods.length === 0 ? (
              <p className="text-xs text-slate-500">No mood records yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sortedMoods.map(([mood, count], idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold capitalize"
                  >
                    <span>{mood}</span>
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
