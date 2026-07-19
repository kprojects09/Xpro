import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Palette, Image as ImageIcon, Sliders, 
  Construction, ArrowLeft, Send, CheckCircle2, ShieldAlert
} from 'lucide-react';

interface AIImageStudioProps {
  theme: any;
  addSystemLog: (log: string) => void;
  currentUser: any;
  setActiveTab?: (tab: string) => void;
}

export function AIImageStudio({ theme, addSystemLog, currentUser, setActiveTab }: AIImageStudioProps) {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0b0825]/90 border border-indigo-500/10 rounded-[32px] p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-[24px] bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Construction size={40} />
        </div>
        <h1 className="text-3xl font-black text-white">Coming Soon</h1>
        <p className="text-sm text-indigo-200/70">
          Image Studio is currently under development and will be available in a future update.
        </p>
      </div>
    </div>
  );
}
