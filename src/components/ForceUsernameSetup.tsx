import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, User, Check } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, limit } from 'firebase/firestore';
import { syncUserProfile } from '../lib/profileSync';

interface ForceUsernameSetupProps {
  userId: string;
  onComplete: (username: string) => void;
}

export function ForceUsernameSetup({ userId, onComplete }: ForceUsernameSetupProps) {
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = async (nameToCheck: string) => {
    const clean = nameToCheck.toLowerCase().trim();
    if (!clean) return false;
    const regex = /^[a-zA-Z0-9_.]+$/;
    if (!regex.test(clean)) {
      setError('Username can only contain letters, numbers, underscores (_), and periods (.).');
      return false;
    }

    setChecking(true);
    setError(null);
    try {
      const q = query(collection(db, 'users'), where('username', '==', clean), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError('This username is already taken. Please try another one.');
        setUsernameChecked(false);
        return false;
      } else {
        setError(null);
        setUsernameChecked(true);
        return true;
      }
    } catch (err) {
      setError('Error checking username availability. Please try again.');
      return false;
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || checking) return;

    const clean = username.toLowerCase().trim();
    if (!clean) {
      setError('Please choose a username.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const isAvailable = await checkAvailability(clean);
      if (!isAvailable) {
        setIsSaving(false);
        return;
      }

      // Save username to Firestore
      await syncUserProfile(userId, { 
        username: clean,
        lastUsernameChange: new Date().toISOString()
      });

      onComplete(clean);
    } catch (err) {
      setError('Failed to save username. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060413] z-[99999] flex flex-col justify-center items-center px-4 py-12">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[40px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md shadow-3xl text-center relative overflow-hidden"
      >
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full text-xs font-bold text-purple-200">
            <Sparkles size={13} className="animate-pulse text-pink-400" />
            <span>USERNAME REQUIRED</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-200">
              Claim Your Username
            </h2>
            <p className="text-xs text-purple-200/70 leading-relaxed max-w-xs mx-auto">
              To support the new unique peer search and messaging update, please set your custom unique username.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Choose Username</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-gray-500 font-bold text-sm">@</span>
                <input 
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                    setUsername(val);
                    setUsernameChecked(false);
                    setError(null);
                  }}
                  placeholder="letters, numbers, _ , ."
                  className="w-full bg-black/40 border border-white/10 focus:border-pink-500 rounded-2xl pl-8 pr-28 py-3.5 text-sm focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  disabled={checking || !username.trim()}
                  onClick={() => checkAvailability(username)}
                  className="absolute right-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  {checking ? 'Checking...' : usernameChecked ? 'Available ✓' : 'Check'}
                </button>
              </div>
              {error && <p className="text-xs text-rose-400 font-medium mt-1">{error}</p>}
              {usernameChecked && !error && <p className="text-xs text-emerald-400 font-medium mt-1">Username is available!</p>}
            </div>

            <button
              type="submit"
              disabled={isSaving || checking || !username.trim() || error !== null}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl text-xs font-black uppercase tracking-wider hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-purple-500/20 text-white"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={14} className="stroke-[2.5]" />
                  <span>Set Username</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
