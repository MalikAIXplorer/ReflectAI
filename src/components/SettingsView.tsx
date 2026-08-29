import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Trash2, 
  LogOut, 
  User as UserIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Database,
  Server,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deleteAllUserData } from '../lib/firestoreService';

interface SettingsViewProps {
  onDataWiped: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onDataWiped }) => {
  const { user, signOut, isDemoUser } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDeleteAll = async () => {
    if (!user || confirmInput !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await deleteAllUserData(user.uid);
      setDeleteSuccess(true);
      setTimeout(() => {
        setShowDeleteModal(false);
        setConfirmInput('');
        setDeleteSuccess(false);
        onDataWiped();
      }, 1500);
    } catch (err) {
      console.error('[Settings] Data wipe error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Privacy & Account Architecture
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Review your authenticated identity, Firestore data isolation rules, and privacy controls.
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-indigo-400" />
          Authenticated Profile
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full border border-slate-700 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-lg">
                {user?.displayName ? user.displayName[0] : 'U'}
              </div>
            )}
            <div>
              <p className="font-bold text-white text-sm">{user?.displayName || 'Authenticated User'}</p>
              <p className="text-xs text-slate-400">{user?.email || 'N/A'}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                UID: {user?.uid || 'Unknown'}
              </p>
            </div>
          </div>

          <button
            onClick={signOut}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Technical Architecture & Data Isolation Inspector */}
      <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Security Directives & User Data Isolation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Owner-Bound Rules</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Firestore Security Rules enforce <code className="text-[10px] bg-slate-900 text-indigo-300 border border-slate-800 px-1 py-0.5 rounded">request.auth.uid == userId</code> on all paths. Cross-user access is rejected at the database level.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>Verified ID Tokens</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Express/Cloud Run endpoints verify Firebase Bearer tokens server-side. The UID is derived exclusively from verified JWT claims.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Zero-Hardcoding</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              No Gemini keys or database credentials exist in frontend code. Operational keys reside in Secret Manager / environment variables.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone: Data Wipe */}
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Danger Zone: Permanent Data Erasure</span>
        </div>

        <p className="text-xs text-rose-300/80 leading-relaxed">
          Permanently delete all your private reflections, conversations, action items, and longitudinal insights from Firestore. This action is irreversible.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete All My Reflection Data</span>
        </button>
      </div>

      {/* Modal for Deletion Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161920] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                Confirm Complete Data Wipe
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This will delete all documents stored under <code className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-rose-300 font-mono">users/{user?.uid}</code> including all journals, messages, actions, and snapshots.
              </p>
            </div>

            {deleteSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All user documents have been permanently removed.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-semibold">
                  Type <strong className="text-rose-400">DELETE</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                />

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setConfirmInput('');
                    }}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    disabled={confirmInput !== 'DELETE' || isDeleting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 cursor-pointer"
                  >
                    {isDeleting ? 'Deleting...' : 'Permanently Wipe Data'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
