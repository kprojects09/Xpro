import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Home, User, ImageIcon, MessageSquare, Phone, Video, Users, Heart, Bell, Settings, Crown, Cpu, LogOut, Shield } from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  isAuthorizedDev?: boolean;
  isAdminViewActive?: boolean;
  onToggleAdmin?: () => void;
}

export function NavigationDrawer({ 
  isOpen, 
  onClose, 
  onNavigate, 
  onLogout,
  isAuthorizedDev = false,
  isAdminViewActive = false,
  onToggleAdmin
}: NavigationDrawerProps) {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'stories', label: 'Stories', icon: ImageIcon },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'voice_calls', label: 'Voice Calls', icon: Phone },
    { id: 'video_calls', label: 'Video Calls', icon: Video },
    { id: 'followers', label: 'Followers', icon: Users },
    { id: 'following', label: 'Following', icon: Heart },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'membership', label: 'Membership', icon: Crown },
    { id: 'ai_studio', label: 'AI Studio (Coming Soon)', icon: Cpu },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed top-0 left-0 h-full w-72 bg-slate-900 border-r border-white/10 z-50 flex flex-col px-6 pb-6 pt-12 sm:pt-6 shadow-2xl safe-top safe-bottom"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-black text-xl text-white">Menu</span>
              <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-full text-white active:scale-90 transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 space-y-2 overflow-y-auto">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); onClose(); }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm font-bold"
                >
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
            </div>

            {isAuthorizedDev && onToggleAdmin && (
              <button 
                onClick={() => { onToggleAdmin(); onClose(); }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 transition-all text-sm font-bold mt-4 cursor-pointer"
              >
                <Shield size={20} />
                {isAdminViewActive ? "Switch to User Mode" : "Switch to Admin Mode"}
              </button>
            )}

            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-rose-500/10 text-rose-400 transition-all text-sm font-bold mt-2"
            >
              <LogOut size={20} />
              Logout
            </button>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
