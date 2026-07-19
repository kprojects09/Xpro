import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLiveSettings } from '../lib/useLiveSettings';

interface OnboardingWelcomeScreenProps {
  fullName: string;
  avatarIndex: number;
  onContinue: () => void;
}

export function OnboardingWelcomeScreen({
  fullName,
  avatarIndex,
  onContinue
}: OnboardingWelcomeScreenProps) {
  const { appSettings } = useLiveSettings();
  
  const avatars = [
    '🎓', '🌟', '🔬', '🚀', '🧠', '✏️', '💻', '💡'
  ];

  const chosenAvatar = avatars[avatarIndex] || '🎓';

  useEffect(() => {
    // Fire a burst of confetti upon loading
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#a855f7', '#ec4899', '#3b82f6']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#a855f7', '#ec4899', '#3b82f6']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const triggerClickConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#ec4899', '#3b82f6']
    });
  };

  return (
    <div className="min-h-screen bg-[#060413] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[20px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[20px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[20px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="w-full max-w-lg z-10 p-8 md:p-12 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-none shadow-3xl text-center relative overflow-hidden"
      >
        {/* Top floating sparkles */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-purple-500/20 blur-[20px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-pink-500/20 blur-[20px] rounded-full pointer-events-none" />

        <div className="space-y-8 relative z-10">
          
          {/* Animated Sparkle Tag */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 rounded-full text-xs font-bold text-purple-200"
          >
            <Sparkles size={13} className="animate-pulse text-pink-400" />
            <span>CALIBRATION COMPLETE</span>
          </motion.div>

          {/* Premium Profile Image Animation */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
              className="relative"
            >
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 blur-md opacity-70 animate-pulse" />
              <div className="w-28 h-28 rounded-full bg-slate-900 border-2 border-white/25 flex items-center justify-center text-6xl relative shadow-2xl">
                {chosenAvatar}
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: 0, duration: 2 }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-md"
                >
                  ✓
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Welcome Text Section */}
          <div className="space-y-3">
            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-200"
            >
              Welcome, {fullName}! 👋
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-base text-purple-200/90 font-medium leading-relaxed max-w-sm mx-auto"
            >
              Welcome to {appSettings.appName}.<br /> {appSettings.welcomeMessage}
            </motion.p>
          </div>

          {/* Continue button */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="pt-4"
          >
            <button
              id="welcome-continue-btn"
              onClick={() => {
                triggerClickConfetti();
                setTimeout(onContinue, 1000);
              }}
              className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:brightness-110 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-purple-500/20"
            >
              <span>Begin Journey</span>
              <ArrowRight size={14} className="stroke-[2.5]" />
            </button>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
