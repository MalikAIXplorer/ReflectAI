import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Compass, 
  ArrowRight, 
  CheckCircle2, 
  Cpu, 
  HeartHandshake,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingView: React.FC = () => {
  const { signInWithGoogle, loginAsDemoUser, error } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0f1115] text-slate-200">
      <div className="max-w-3xl w-full text-center space-y-8">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold tracking-wide shadow-md">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Strict User Data Isolation via Firebase Firestore & Cloud Run</span>
        </div>

        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15]">
            Reflect<span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 font-light max-w-xl mx-auto leading-relaxed">
            Your private AI reflection companion.
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Write uninhibited reflections, engage in multi-turn dialogues with Gemini, and transform inner thoughts into structured insights and clear action steps.
          </p>
        </div>

        {/* Error notification if any */}
        {error && (
          <div className="max-w-md mx-auto p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Notice</p>
              <p className="text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70"
          >
            {isSigningIn ? (
              <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.37 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Quick Demo Mode for preview convenience */}
          <button
            id="demo-signin-btn"
            onClick={loginAsDemoUser}
            className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore Demo Session</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Feature Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8 text-left">
          <div className="p-5 bg-[#161920] border border-slate-800 rounded-2xl shadow-md">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Strict User Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every journal, message, and action is scoped to your verified UID (<code className="text-[11px] bg-slate-900 px-1 py-0.5 rounded text-indigo-300 border border-slate-800">users/&#123;uid&#125;</code>) with Firestore security rules.
            </p>
          </div>

          <div className="p-5 bg-[#161920] border border-slate-800 rounded-2xl shadow-md">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">5 Reflection Modes</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Toggle seamlessly between Reflect, Summarize, Brainstorm, Action Plan, and Find Patterns with Gemini 2.5 Flash.
            </p>
          </div>

          <div className="p-5 bg-[#161920] border border-slate-800 rounded-2xl shadow-md">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Actionable Next Steps</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically captures high-leverage steps from your reflections and pins them to your personal Next Steps board.
            </p>
          </div>
        </div>

        {/* Security & Ideathon Evaluation Notice */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero hardcoded API secrets in frontend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span>Server-side token verification</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4 text-indigo-400" />
            <span>Empathetic, non-clinical tone</span>
          </div>
        </div>

      </div>
    </div>
  );
};
