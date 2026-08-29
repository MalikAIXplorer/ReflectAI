import React, { useState, useEffect } from 'react';
import { 
  Search, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  Trash2, 
  Filter, 
  Smile, 
  Plus, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getJournals, deleteJournal } from '../lib/firestoreService';
import { searchJournalsApi } from '../lib/api';
import type { JournalEntry } from '../types';

interface HistoryViewProps {
  onOpenJournal: (journal: JournalEntry) => void;
  onNewReflection: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onOpenJournal, onNewReflection }) => {
  const { user, getIdToken } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [filteredJournals, setFilteredJournals] = useState<JournalEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [journalToDelete, setJournalToDelete] = useState<JournalEntry | null>(null);

  useEffect(() => {
    if (user) {
      getJournals(user.uid).then((list) => {
        setJournals(list);
        setFilteredJournals(list);
      });
    }
  }, [user]);

  // Execute Search & Filtering
  const handleSearch = async (queryText: string) => {
    setSearchQuery(queryText);
    if (!queryText.trim()) {
      applyFilters(journals, selectedMood, selectedTheme);
      return;
    }

    setIsSearching(true);
    try {
      const token = await getIdToken();
      const results = await searchJournalsApi({
        idToken: token,
        query: queryText,
        journals,
      });
      applyFilters(results, selectedMood, selectedTheme);
    } catch (err) {
      console.error('[Search] Error:', err);
      applyFilters(journals, selectedMood, selectedTheme);
    } finally {
      setIsSearching(false);
    }
  };

  const applyFilters = (sourceList: JournalEntry[], mood: string, theme: string) => {
    let result = [...sourceList];
    if (mood !== 'all') {
      result = result.filter((j) => (j.mood || '').toLowerCase() === mood.toLowerCase());
    }
    if (theme !== 'all') {
      result = result.filter((j) => (j.themes || []).includes(theme));
    }
    setFilteredJournals(result);
  };

  const handleMoodFilter = (mood: string) => {
    setSelectedMood(mood);
    applyFilters(journals, mood, selectedTheme);
  };

  const handleThemeFilter = (theme: string) => {
    setSelectedTheme(theme);
    applyFilters(journals, selectedMood, theme);
  };

  const confirmDelete = async () => {
    if (!user || !journalToDelete) return;
    try {
      await deleteJournal(user.uid, journalToDelete.id);
      const remaining = journals.filter((j) => j.id !== journalToDelete.id);
      setJournals(remaining);
      applyFilters(remaining, selectedMood, selectedTheme);
      setJournalToDelete(null);
    } catch (err) {
      console.error('[Delete Journal] Error:', err);
    }
  };

  // Collect unique moods and themes
  const allMoods = Array.from(new Set(journals.map((j) => (j.mood || '').toLowerCase()).filter(Boolean)));
  const allThemes = Array.from(new Set(journals.flatMap((j) => j.themes || []).filter(Boolean)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Journal History & Search
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search your private reflections using natural language or filter by recurring themes and moods.
          </p>
        </div>

        <button
          onClick={onNewReflection}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Reflection</span>
        </button>
      </div>

      {/* Natural Language Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by topic, emotion, or question (e.g., 'When did I talk about interview anxiety?')..."
          className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-md"
        />
        {isSearching && (
          <div className="absolute right-4 top-3.5 text-xs text-indigo-400 flex items-center gap-1.5 animate-pulse font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Searching...</span>
          </div>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3 text-indigo-400" /> Filters:
        </span>

        {/* Mood Filter Pill */}
        <select
          value={selectedMood}
          onChange={(e) => handleMoodFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="all">All Moods</option>
          {allMoods.map((m) => (
            <option key={m} value={m} className="capitalize">
              {m}
            </option>
          ))}
        </select>

        {/* Theme Filter Pill */}
        <select
          value={selectedTheme}
          onChange={(e) => handleThemeFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="all">All Themes</option>
          {allThemes.map((t) => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>

        {(selectedMood !== 'all' || selectedTheme !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedMood('all');
              setSelectedTheme('all');
              setSearchQuery('');
              setFilteredJournals(journals);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Reflection Cards Grid */}
      {filteredJournals.length === 0 ? (
        <div className="p-12 bg-[#161920] border border-slate-800 rounded-2xl text-center space-y-3 shadow-md">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No reflections found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No journal entries match "${searchQuery}". Try broadening your search or clearing filters.`
              : 'You have not written any journal entries yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJournals.map((journal) => (
            <div
              key={journal.id}
              className="p-5 bg-[#161920] hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition-all shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3
                    onClick={() => onOpenJournal(journal)}
                    className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    {journal.title}
                  </h3>
                  {journal.mood && (
                    <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 capitalize flex items-center gap-1">
                      <Smile className="w-3 h-3" />
                      {journal.mood}
                    </span>
                  )}
                </div>

                <p
                  onClick={() => onOpenJournal(journal)}
                  className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4 cursor-pointer"
                >
                  {journal.summary || journal.lastMessageExcerpt || 'Click to view conversation and continue reflection with Gemini.'}
                </p>
              </div>

              <div>
                {/* Theme tags */}
                {journal.themes && journal.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {journal.themes.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-md text-[10px] font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[10px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(journal.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {journal.messageCount || 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenJournal(journal)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      Open & Reflect
                    </button>
                    <button
                      onClick={() => setJournalToDelete(journal)}
                      title="Delete Journal"
                      className="p-1 text-slate-600 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {journalToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161920] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Journal Entry?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete <strong className="text-white">"{journalToDelete.title}"</strong> and all its associated messages from Firestore? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setJournalToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-rose-600/20"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
