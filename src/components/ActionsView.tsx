import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  BookOpen, 
  Calendar,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getActionItems, 
  toggleActionItem, 
  createActionItem, 
  deleteActionItem 
} from '../lib/firestoreService';
import type { ActionItem } from '../types';

interface ActionsViewProps {
  onOpenJournalById?: (journalId: string) => void;
}

export const ActionsView: React.FC<ActionsViewProps> = () => {
  const { user } = useAuth();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [newActionText, setNewActionText] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    if (user) {
      getActionItems(user.uid).then((list) => setActions(list));
    }
  }, [user]);

  const handleToggle = async (action: ActionItem) => {
    if (!user) return;
    const newStatus = !action.completed;
    setActions((prev) =>
      prev.map((a) => (a.id === action.id ? { ...a, completed: newStatus } : a))
    );
    await toggleActionItem(user.uid, action.id, newStatus);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim() || !user) return;
    const item = await createActionItem(user.uid, {
      text: newActionText.trim(),
      sourceJournalId: 'manual',
      sourceJournalTitle: 'Personal Next Step',
    });
    setActions((prev) => [item, ...prev]);
    setNewActionText('');
  };

  const handleDelete = async (actionId: string) => {
    if (!user) return;
    setActions((prev) => prev.filter((a) => a.id !== actionId));
    await deleteActionItem(user.uid, actionId);
  };

  const filteredActions = actions.filter((a) => {
    if (filter === 'pending') return !a.completed;
    if (filter === 'completed') return a.completed;
    return true;
  });

  const completedCount = actions.filter((a) => a.completed).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            My Next Steps
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Action items automatically distilled from your AI reflection sessions or added manually.
          </p>
        </div>

        <div className="text-xs font-bold px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
          {completedCount} of {actions.length} Completed
        </div>
      </div>

      {/* Add New Step Bar */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newActionText}
          onChange={(e) => setNewActionText(e.target.value)}
          placeholder="Add an actionable next step..."
          className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-md"
        />
        <button
          type="submit"
          disabled={!newActionText.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Step</span>
        </button>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pt-2 text-xs">
        <span className="text-slate-500 font-bold uppercase tracking-wider">Show:</span>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All ({actions.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filter === 'pending' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Pending ({actions.length - completedCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filter === 'completed' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Action Items List */}
      {filteredActions.length === 0 ? (
        <div className="p-12 bg-[#161920] border border-slate-800 rounded-2xl text-center space-y-3 shadow-md">
          <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No action items found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Ask Gemini to generate an <strong className="text-indigo-400">Action Plan</strong> during any reflection to automatically populate your next steps.
          </p>
        </div>
      ) : (
        <div className="bg-[#161920] border border-slate-800 rounded-2xl divide-y divide-slate-800/80 shadow-md overflow-hidden">
          {filteredActions.map((action) => (
            <div
              key={action.id}
              className="p-4 hover:bg-slate-900/60 transition-colors flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 flex-1">
                <button
                  onClick={() => handleToggle(action)}
                  className="mt-0.5 text-slate-500 hover:text-indigo-400 shrink-0 cursor-pointer"
                >
                  {action.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                  )}
                </button>

                <div className="space-y-1 flex-1">
                  <p className={`text-sm text-slate-200 leading-snug ${action.completed ? 'line-through text-slate-500' : ''}`}>
                    {action.text}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(action.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {action.sourceJournalTitle && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <BookOpen className="w-3 h-3" />
                        <span>Source: {action.sourceJournalTitle}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(action.id)}
                title="Delete Step"
                className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
