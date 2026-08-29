import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  ListChecks, 
  Compass, 
  Lightbulb, 
  Layers, 
  Tag, 
  Smile, 
  RefreshCw, 
  Plus, 
  Check, 
  Copy,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { callGeminiChat, generateTitle } from '../lib/api';
import { 
  createJournal, 
  updateJournal, 
  addJournalMessage, 
  getJournalMessages, 
  createActionItem 
} from '../lib/firestoreService';
import type { JournalEntry, JournalMessage, ReflectionMode } from '../types';

interface WorkspaceViewProps {
  initialJournal: JournalEntry | null;
  onBack: () => void;
  onActionAdded?: () => void;
}

const REFLECTION_MODES: { id: ReflectionMode; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'reflect', label: 'Reflect', icon: Compass, description: 'Compassionate inquiry & mirror' },
  { id: 'summarize', label: 'Summarize', icon: BookOpen, description: 'Crisp synthesis of core ideas' },
  { id: 'brainstorm', label: 'Brainstorm', icon: Lightbulb, description: 'Creative perspectives & angles' },
  { id: 'action_plan', label: 'Action Plan', icon: ListChecks, description: 'Practical, concrete next steps' },
  { id: 'find_patterns', label: 'Find Patterns', icon: Layers, description: 'Longitudinal themes & loop discovery' },
];

const THOUGHT_STARTERS = [
  "I've been feeling uncertain about my career direction lately.",
  "Help me understand what I'm feeling right now.",
  "Turn my recent challenges into a structured action plan.",
  "I'm feeling overwhelmed with multiple commitments."
];

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ 
  initialJournal, 
  onBack, 
  onActionAdded 
}) => {
  const { user, getIdToken } = useAuth();
  const [journal, setJournal] = useState<JournalEntry | null>(initialJournal);
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>('reflect');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [addedActionIndex, setAddedActionIndex] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Load existing messages if editing an existing journal
  useEffect(() => {
    if (initialJournal && user) {
      setJournal(initialJournal);
      getJournalMessages(user.uid, initialJournal.id).then((msgs) => {
        setMessages(msgs);
      });
    }
  }, [initialJournal, user]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || !user || isLoading) return;

    setErrorBanner(null);
    setInputMessage('');
    setIsLoading(true);

    let activeJournal = journal;

    try {
      const token = await getIdToken();

      // 1. If no journal exists yet, create one
      if (!activeJournal) {
        // Auto-generate title in background
        const autoTitle = await generateTitle(textToSend, token);
        const newEntry = await createJournal(user.uid, {
          title: autoTitle || 'Personal Reflection',
          summary: 'In progress reflection...',
          mood: 'reflective',
          themes: ['Personal Growth'],
          actionItems: [],
          messageCount: 0,
        });
        activeJournal = newEntry;
        setJournal(newEntry);
      }

      // 2. Persist User Message
      const userMsg = await addJournalMessage(user.uid, activeJournal.id, {
        role: 'user',
        content: textToSend.trim(),
        mode: selectedMode,
      });

      setMessages((prev) => [...prev, userMsg]);

      // 3. Call Gemini AI with multi-turn context
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const aiResponse = await callGeminiChat({
        idToken: token,
        journalTitle: activeJournal.title,
        userMessage: textToSend.trim(),
        mode: selectedMode,
        conversationHistory,
        previousSummary: activeJournal.summary,
        existingThemes: activeJournal.themes,
      });

      // 4. Persist Gemini Assistant Message
      const assistantMsg = await addJournalMessage(user.uid, activeJournal.id, {
        role: 'assistant',
        content: aiResponse.reply,
        mode: selectedMode,
      });

      setMessages((prev) => [...prev, assistantMsg]);

      // 5. Update Journal metadata (summary, mood, themes, action items)
      const mergedThemes = Array.from(
        new Set([...(activeJournal.themes || []), ...(aiResponse.themes || [])])
      );
      const mergedActions = Array.from(
        new Set([...(activeJournal.actionItems || []), ...(aiResponse.actionItems || [])])
      );

      const updatedFields: Partial<JournalEntry> = {
        summary: aiResponse.summary || activeJournal.summary,
        mood: aiResponse.mood || activeJournal.mood,
        themes: mergedThemes,
        actionItems: mergedActions,
        messageCount: (activeJournal.messageCount || 0) + 2,
        lastMessageExcerpt: aiResponse.reply.slice(0, 140),
      };

      await updateJournal(user.uid, activeJournal.id, updatedFields);
      setJournal((prev) => (prev ? { ...prev, ...updatedFields } : null));

    } catch (err: any) {
      console.error('[Workspace] Error sending message:', err);
      setErrorBanner(err.message || 'Failed to receive reflection response. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSaveActionToNextSteps = async (actionText: string) => {
    if (!user || !journal) return;
    try {
      await createActionItem(user.uid, {
        text: actionText,
        sourceJournalId: journal.id,
        sourceJournalTitle: journal.title,
      });
      setAddedActionIndex((prev) => ({ ...prev, [actionText]: true }));
      if (onActionAdded) onActionAdded();
    } catch (err) {
      console.error('[Action Save] Error:', err);
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            id="workspace-back-btn"
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {journal ? journal.title : 'New Reflection'}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{journal ? new Date(journal.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Drafting now'}</span>
              <span>•</span>
              <span className="text-indigo-400 font-semibold capitalize">{journal?.mood || 'Reflective'}</span>
            </p>
          </div>
        </div>

        {/* Reflection Mode Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-full text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Active: <strong className="text-white">{REFLECTION_MODES.find(m => m.id === selectedMode)?.label}</strong></span>
        </div>
      </div>

      {/* Main Workspace 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Conversational Reflection Workspace (Cols 8) */}
        <div className="lg:col-span-8 flex flex-col bg-[#161920] border border-slate-800 rounded-2xl shadow-md min-h-[580px] max-h-[780px] flex-1 overflow-hidden">
          
          {/* Reflection Mode Switcher Tabs */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 shrink-0">Mode:</span>
            {REFLECTION_MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  id={`mode-btn-${m.id}`}
                  onClick={() => setSelectedMode(m.id)}
                  title={m.description}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500'
                      : 'bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
            
            {/* Empty State with Thought Starters */}
            {messages.length === 0 && (
              <div className="py-10 text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-md">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    What is on your mind today?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Write freely. ReflectAI will listen, reflect on your thoughts, and help organize your feelings into actionable clarity.
                  </p>
                </div>

                <div className="pt-2 text-left space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Thought Starters:
                  </p>
                  {THOUGHT_STARTERS.map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(starter)}
                      className="w-full text-left p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 text-xs text-slate-300 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <span className="line-clamp-1">{starter}</span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Conversation */}
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 text-left ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-md shadow-indigo-600/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-md relative group ${
                    isUser
                      ? 'bg-slate-800 border border-slate-700 text-slate-100'
                      : 'bg-indigo-600/10 border border-indigo-500/30 text-slate-200'
                  }`}>
                    {/* Role & Mode Badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] opacity-80">
                      <span className={`font-bold ${isUser ? 'text-slate-300' : 'text-indigo-300'}`}>
                        {isUser ? 'You' : 'ReflectAI'}
                      </span>
                      {msg.mode && (
                        <span className="uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                          {msg.mode}
                        </span>
                      )}
                    </div>

                    {/* Message Body */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {/* Copy Button on Hover */}
                    <button
                      onClick={() => handleCopyText(msg.content, index)}
                      title="Copy response"
                      className="absolute top-2 right-2 p-1 rounded bg-black/20 hover:bg-black/40 text-current opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs"
                    >
                      {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>

                  {isUser && user?.photoURL && (
                    <img 
                      src={user.photoURL} 
                      alt="User" 
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full border border-slate-700 object-cover mt-1 shrink-0" 
                    />
                  )}
                </div>
              );
            })}

            {/* Loading / Thinking Indicator */}
            {isLoading && (
              <div className="flex gap-3 text-left justify-start">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 animate-pulse shadow-md shadow-indigo-600/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-4 text-slate-300 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-indigo-300 font-semibold ml-1">Reflecting with Gemini...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error notice if API call failed */}
          {errorBanner && (
            <div className="mx-4 mb-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{errorBanner}</span>
              </div>
              <button 
                onClick={() => setErrorBanner(null)} 
                className="text-rose-400 hover:text-rose-200 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Message Input Box */}
          <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center"
            >
              <textarea
                ref={inputRef}
                id="workspace-message-input"
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Type your reflection... (Press Enter to send in ${selectedMode} mode)`}
                className="w-full pl-4 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              />
              <button
                type="submit"
                id="workspace-send-btn"
                disabled={!inputMessage.trim() || isLoading}
                className="absolute right-2.5 bottom-2.5 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

        {/* Right: Live Structured Extraction & Next Steps Panel (Cols 4) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Summary Card */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-4 shadow-md text-left">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Session Essence
              </h4>
              {journal?.mood && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 capitalize">
                  <Smile className="w-3 h-3" />
                  {journal.mood}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              {journal?.summary || 'As you reflect, ReflectAI continuously distills your thoughts and identifies patterns in real time.'}
            </p>
          </div>

          {/* Identified Themes Card */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-4 shadow-md text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Identified Themes
            </h4>
            {journal?.themes && journal.themes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {journal.themes.map((theme, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs font-semibold"
                  >
                    #{theme}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Themes will appear as you converse with Gemini.</p>
            )}
          </div>

          {/* Action Items Extracted Card */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-4 shadow-md text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Extracted Action Items
            </h4>

            {journal?.actionItems && journal.actionItems.length > 0 ? (
              <div className="space-y-2">
                {journal.actionItems.map((action, i) => {
                  const isAdded = addedActionIndex[action];
                  return (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-200 leading-snug">{action}</span>
                      <button
                        onClick={() => handleSaveActionToNextSteps(action)}
                        disabled={isAdded}
                        className={`p-1.5 rounded-md shrink-0 transition-colors cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold'
                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
                        }`}
                        title={isAdded ? 'Added to your Next Steps' : 'Add to your Next Steps board'}
                      >
                        {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Switch to <strong>Action Plan</strong> mode or ask Gemini to extract concrete next steps from your reflection.
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
