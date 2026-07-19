import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Camera, Bell, Image as ImageIcon, HardDrive, ShieldAlert, Settings } from 'lucide-react';
import { permissionManager } from '../lib/permissionManager';

export function PermissionPromptUI() {
  const [request, setRequest] = useState<any>(null);
  const [deniedPermanently, setDeniedPermanently] = useState(false);

  useEffect(() => {
    permissionManager.setListener((req) => {
      setRequest(req);
      setDeniedPermanently(false);
    });
  }, []);

  const handleGrant = async () => {
    if (!request) return;
    
    try {
      if (request.type === 'notifications') {
        const p = await Notification.requestPermission();
        if (p === 'granted') {
          request.resolve(true);
        } else {
          setDeniedPermanently(true);
        }
      } else if (request.type === 'microphone') {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        request.resolve(true);
      } else if (request.type === 'camera') {
        await navigator.mediaDevices.getUserMedia({ video: true });
        request.resolve(true);
      } else {
        request.resolve(true);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setDeniedPermanently(true);
      } else {
        request.resolve(false);
      }
    }
  };

  const handleDeny = () => {
    if (!request) return;
    request.resolve(false);
  };

  if (!request) return null;

  const icons = {
    microphone: <Mic className="text-pink-400" size={32} />,
    camera: <Camera className="text-indigo-400" size={32} />,
    notifications: <Bell className="text-emerald-400" size={32} />,
    media: <ImageIcon className="text-amber-400" size={32} />,
    storage: <HardDrive className="text-blue-400" size={32} />
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-indigo-500" />
          
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-white/5 rounded-full animate-ping opacity-50" />
              {icons[request.type as keyof typeof icons] || <ShieldAlert size={32} className="text-gray-400" />}
            </div>
          </div>
          
          <h2 className="text-xl font-black text-white text-center mb-2">
            {deniedPermanently ? "Permission Denied" : request.title}
          </h2>
          
          <p className="text-sm text-gray-400 text-center mb-8">
            {deniedPermanently 
              ? "You have permanently denied this permission. Some features will be unavailable. Please open your browser/device settings to enable it."
              : request.reason}
          </p>
          
          <div className="flex flex-col gap-3">
            {!deniedPermanently ? (
              <>
                <button
                  onClick={handleGrant}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/25"
                >
                  Allow Access
                </button>
                <button
                  onClick={handleDeny}
                  className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold text-sm transition-all"
                >
                  Deny
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDeny}
                  className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold text-sm transition-all"
                >
                  Close
                </button>
                <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-1 mt-2">
                  <Settings size={12} /> Check site settings in URL bar
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
