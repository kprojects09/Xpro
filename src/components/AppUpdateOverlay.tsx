import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, AlertTriangle, X, Smartphone } from 'lucide-react';

interface AppUpdateOverlayProps {
  update: {
    versionName: string;
    versionCode: number;
    releaseNotes: string;
    updateType: 'optional' | 'force';
    apkUrl: string;
    fileSize: number;
  };
  onClose: () => void;
}

export function AppUpdateOverlay({ update, onClose }: AppUpdateOverlayProps) {
  const isForce = update.updateType === 'force';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={!isForce ? onClose : undefined}
      />
      
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
      >
        {/* Glow Effects */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${isForce ? 'bg-rose-500' : 'bg-indigo-500'}`} />
        <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${isForce ? 'bg-amber-500' : 'bg-pink-500'}`} />

        <div className="relative flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl ${isForce ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white'}`}>
            <Smartphone size={40} />
          </div>

          <h2 className="text-2xl font-black mb-2">Update Available!</h2>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-bold text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
              v{update.versionName}
            </span>
            {isForce && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <AlertTriangle size={10} /> Mandatory
              </span>
            )}
          </div>

          <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 mb-8 text-left">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Release Notes</h4>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-6">
              {update.releaseNotes || 'Bug fixes and performance improvements to make your Sweety experience even better!'}
            </p>
            <div className="mt-4 pt-4 border-t border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Size: {(update.fileSize / (1024 * 1024)).toFixed(2)} MB
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <a
              href={update.apkUrl}
              target="_blank"
              rel="noreferrer"
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${
                isForce 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20'
              }`}
            >
              <Download size={18} /> Download & Install
            </a>
            
            {!isForce && (
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-black text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Maybe Later
              </button>
            )}
          </div>

          {isForce && (
            <p className="mt-6 text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={12} className="text-rose-500" />
              This update is required to continue
            </p>
          )}
        </div>

        {!isForce && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-all text-gray-500 hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </motion.div>
    </div>
  );
}
