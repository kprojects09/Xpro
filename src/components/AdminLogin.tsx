import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Shield, ArrowRight, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useLiveSettings } from '../lib/useLiveSettings';

export function AdminLogin({ onUnlock, onCancel }: { onUnlock: (user: any) => void, onCancel: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const { appSettings } = useLiveSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Basic check
      if (!email.includes('@')) throw new Error('Please enter a valid email address.');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Let's assume if they login here they are admin. Real security would check claims or doc in firestore.
      onUnlock(cred.user);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      setError('Please enter your email first to reset password.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Error sending reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-none border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 text-indigo-400">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{appSettings.appName}</h1>
          <p className="text-slate-400 text-sm mt-1">Admin Control Center</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2 items-start text-red-400 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {msg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-2 items-start text-emerald-400 text-sm">
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              <span>{msg}</span>
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@neostudy.ai"
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <button type="button" onClick={handleForgot} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">Forgot Password?</button>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">Remember Me</label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                Secure Login <ArrowRight size={18} />
              </>
            )}
          </button>
          
          <button 
            type="button" 
            onClick={onCancel}
            className="w-full mt-2 bg-transparent text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-medium transition-all active:scale-[0.98]"
          >
            Return to User Login
          </button>
        </form>
      </motion.div>
    </div>
  );
}
