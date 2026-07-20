import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Mic, 
  Camera, 
  Users, 
  Phone, 
  MessageSquare, 
  Bell, 
  Image as ImageIcon, 
  HardDrive, 
  MapPin, 
  Bluetooth, 
  Clock, 
  Activity, 
  Globe, 
  Wifi, 
  Zap, 
  Lock, 
  Check, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Cpu,
  Bookmark,
  Share2
} from 'lucide-react';
import { permissionManager } from '../lib/permissionManager';

interface PermissionOnboardingScreenProps {
  onComplete: (permissionsStatus: Record<string, boolean>) => void;
}

interface PermissionItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'core' | 'communication' | 'media' | 'system' | 'hardware';
  restricted?: boolean;
}

interface SupportServiceItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'Active' | 'System Ready' | 'Active Background';
}

const REQUIRED_PERMISSIONS: PermissionItem[] = [
  // Core / System
  { id: 'INTERNET', name: 'INTERNET', description: 'Enables real-time cloud data sync & Gemini Brain APIs', icon: Globe, category: 'core' },
  { id: 'ACCESS_NETWORK_STATE', name: 'ACCESS_NETWORK_STATE', description: 'Monitors internet connection health & offline queues', icon: Wifi, category: 'core' },
  { id: 'POST_NOTIFICATIONS', name: 'POST_NOTIFICATIONS', description: 'Sends study reminders, routine alerts, and live messages', icon: Bell, category: 'core' },
  { id: 'VIBRATE', name: 'VIBRATE', description: 'Provides tactile haptic feedback during voice and UI actions', icon: Zap, category: 'core' },
  { id: 'WAKE_LOCK', name: 'WAKE_LOCK', description: 'Keeps screen awake during active hands-free conversations', icon: Lock, category: 'core' },

  // Communication
  { id: 'RECORD_AUDIO', name: 'RECORD_AUDIO', description: 'Captures voice queries for Speech To Text & Wake Word detection', icon: Mic, category: 'communication' },
  { id: 'CALL_PHONE', name: 'CALL_PHONE', description: 'Allows placing phone calls using voice AI commands', icon: Phone, category: 'communication', restricted: true },
  { id: 'READ_CONTACTS', name: 'READ_CONTACTS', description: 'Identifies favourite contacts for quick voice call & messaging', icon: Users, category: 'communication' },
  { id: 'WRITE_CONTACTS', name: 'WRITE_CONTACTS', description: 'Saves new contacts directly via natural voice instructions', icon: Users, category: 'communication' },
  { id: 'READ_PHONE_NUMBERS', name: 'READ_PHONE_NUMBERS', description: 'Reads active phone configuration for account profile verification', icon: Phone, category: 'communication', restricted: true },
  { id: 'SEND_SMS', name: 'SEND_SMS', description: 'Sends text messages hands-free using Gemini voice logic', icon: MessageSquare, category: 'communication', restricted: true },
  { id: 'READ_SMS', name: 'READ_SMS', description: 'Reads incoming study updates, task lists, and verification text', icon: MessageSquare, category: 'communication', restricted: true },
  { id: 'RECEIVE_SMS', name: 'RECEIVE_SMS', description: 'Intercepts incoming messages to prompt you hands-free via AI', icon: MessageSquare, category: 'communication', restricted: true },

  // Media / Storage
  { id: 'CAMERA', name: 'CAMERA', description: 'Launches viewfinder for scanning books, study notes, or story images', icon: Camera, category: 'media' },
  { id: 'READ_MEDIA_IMAGES', name: 'READ_MEDIA_IMAGES', description: 'Displays saved photos in custom gallery and message attachments', icon: ImageIcon, category: 'media' },
  { id: 'READ_MEDIA_VIDEO', name: 'READ_MEDIA_VIDEO', description: 'Loads reference school and course videos directly in learning hub', icon: ImageIcon, category: 'media' },
  { id: 'READ_MEDIA_AUDIO', name: 'READ_MEDIA_AUDIO', description: 'Reads and manages vocal recordings and study podcasts', icon: ImageIcon, category: 'media' },
  { id: 'READ_EXTERNAL_STORAGE', name: 'READ_EXTERNAL_STORAGE', description: 'Reads PDF books, task files, and local documents securely', icon: HardDrive, category: 'media' },

  // Hardware Settings
  { id: 'ACCESS_FINE_LOCATION', name: 'ACCESS_FINE_LOCATION', description: 'Determines pinpoint GPS location for maps and route navigation', icon: MapPin, category: 'hardware' },
  { id: 'ACCESS_COARSE_LOCATION', name: 'ACCESS_COARSE_LOCATION', description: 'Loads localized weather, language presets, and region info', icon: MapPin, category: 'hardware' },
  { id: 'BLUETOOTH_CONNECT', name: 'BLUETOOTH_CONNECT', description: 'Interfaces with wireless headset/speaker for Text To Speech audio', icon: Bluetooth, category: 'hardware' },
  { id: 'BLUETOOTH_SCAN', name: 'BLUETOOTH_SCAN', description: 'Discovers bluetooth earphones, wearables, or smart peripherals', icon: Bluetooth, category: 'hardware' },
  { id: 'SCHEDULE_EXACT_ALARM', name: 'SCHEDULE_EXACT_ALARM', description: 'Triggers precise alarms and vibration updates for class schedules', icon: Clock, category: 'hardware' },
  { id: 'FOREGROUND_SERVICE', name: 'FOREGROUND_SERVICE', description: 'Runs a high-priority service to ensure always-listening wake word', icon: Activity, category: 'system' }
];

const SUPPORT_SERVICES: SupportServiceItem[] = [
  { id: 'accessibility', name: 'Accessibility Service', description: 'Reads current activity text, layouts, and visible buttons', icon: Cpu, status: 'System Ready' },
  { id: 'notification_listener', name: 'Notification Listener', description: 'Relays device-wide notifications directly to the AI core', icon: Bell, status: 'Active Background' },
  { id: 'speech_recognition', name: 'Speech Recognition', description: 'Local speech-to-text decoder for lightning-fast voice inputs', icon: Mic, status: 'System Ready' },
  { id: 'text_to_speech', name: 'Text To Speech', description: 'High fidelity natural language narrator engine', icon: RefreshCw, status: 'Active' },
  { id: 'media_session', name: 'Media Session', description: 'Direct audio player coordination with physical headphone buttons', icon: Bookmark, status: 'Active' },
  { id: 'foreground_service', name: 'Foreground Service', description: 'Persistent overlay and ambient notification bar integration', icon: Activity, status: 'Active Background' },
  { id: 'workmanager', name: 'WorkManager', description: 'Schedules background garbage collection and database syncs', icon: HardDrive, status: 'System Ready' },
  { id: 'deep_links', name: 'Deep Links', description: 'Launches direct pages when clicked from external push notifications', icon: Share2, status: 'System Ready' },
  { id: 'app_shortcuts', name: 'App Shortcuts', description: 'Long-press home screen commands for voice search and routines', icon: Sparkles, status: 'System Ready' }
];

export function PermissionOnboardingScreen({ onComplete }: PermissionOnboardingScreenProps) {
  const [grantedStates, setGrantedStates] = useState<Record<string, boolean>>(() => {
    const states: Record<string, boolean> = {};
    REQUIRED_PERMISSIONS.forEach(p => {
      // Internet, Access Network State, Vibrate, and Wake Lock are always auto-granted on launch!
      if (['INTERNET', 'ACCESS_NETWORK_STATE', 'VIBRATE', 'WAKE_LOCK'].includes(p.id)) {
        states[p.id] = true;
      } else {
        states[p.id] = false;
      }
    });
    return states;
  });

  const [activeTab, setActiveTab] = useState<'permissions' | 'services'>('permissions');
  const [isRequesting, setIsRequesting] = useState(false);
  const [currentRequestIndex, setCurrentRequestIndex] = useState<number | null>(null);

  const handleTogglePermission = (id: string) => {
    // Prevent toggling auto-granted ones
    if (['INTERNET', 'ACCESS_NETWORK_STATE', 'VIBRATE', 'WAKE_LOCK'].includes(id)) return;
    setGrantedStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleGrantAll = async () => {
    setIsRequesting(true);
    
    // Auto-grant non-restricted permissions, prompt for main interactive ones using permission manager
    const mainRequests = [
      { id: 'RECORD_AUDIO', type: 'microphone', title: 'Microphone Access', reason: 'Sweety needs microphone access to understand your hands-free voice commands.' },
      { id: 'CAMERA', type: 'camera', title: 'Camera Access', reason: 'Sweety needs camera access to capture worksheets and scan study notes.' },
      { id: 'POST_NOTIFICATIONS', type: 'notifications', title: 'Push Notifications', reason: 'Sweety needs to send you alerts for study routines and calls.' },
      { id: 'READ_EXTERNAL_STORAGE', type: 'storage', title: 'External Storage Access', reason: 'Sweety needs storage access to read study notes, text files, and reference books.' },
      { id: 'READ_MEDIA_IMAGES', type: 'media', title: 'Photos and Media Access', reason: 'Sweety needs access to your gallery for photo attachments and stories.' }
    ];

    const newStates = { ...grantedStates };

    for (let i = 0; i < mainRequests.length; i++) {
      const req = mainRequests[i];
      setCurrentRequestIndex(i);
      try {
        const result = await permissionManager.requestPermission(
          req.type as any,
          req.title,
          req.reason
        );
        newStates[req.id] = result;
        // Also auto-grant related permissions in the same category if successful
        if (result) {
          if (req.id === 'READ_EXTERNAL_STORAGE') {
            newStates['READ_MEDIA_VIDEO'] = true;
            newStates['READ_MEDIA_AUDIO'] = true;
          }
          if (req.id === 'RECORD_AUDIO') {
            newStates['FOREGROUND_SERVICE'] = true;
          }
        }
      } catch (err) {
        console.error(`Error requesting ${req.id}:`, err);
      }
    }

    // Auto-grant remainder of non-restricted, show guide for restricted ones
    REQUIRED_PERMISSIONS.forEach(p => {
      if (!p.restricted && !['RECORD_AUDIO', 'CAMERA', 'POST_NOTIFICATIONS', 'READ_EXTERNAL_STORAGE', 'READ_MEDIA_IMAGES'].includes(p.id)) {
        newStates[p.id] = true;
      }
    });

    setGrantedStates(newStates);
    setIsRequesting(false);
    setCurrentRequestIndex(null);

    // Briefly switch tab to services to show system components
    setActiveTab('services');
  };

  const handleFinish = () => {
    // Save to localStorage so it is remembered
    localStorage.setItem('sweety_permissions_granted', 'true');
    onComplete(grantedStates);
  };

  const categories = {
    core: { label: 'Core / System', color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5' },
    communication: { label: 'Communication & AI', color: 'text-pink-400 border-pink-500/20 bg-pink-500/5' },
    media: { label: 'Media & Storage', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
    hardware: { label: 'Hardware Settings', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
    system: { label: 'System Services', color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' }
  };

  const activeGroupedPermissions = Object.keys(categories).reduce((acc, cat) => {
    acc[cat as keyof typeof categories] = REQUIRED_PERMISSIONS.filter(p => p.category === cat);
    return acc;
  }, {} as Record<keyof typeof categories, PermissionItem[]>);

  const totalGranted = Object.values(grantedStates).filter(Boolean).length;
  const progressPercent = Math.round((totalGranted / REQUIRED_PERMISSIONS.length) * 100);

  return (
    <div className="min-h-screen bg-[#060413] text-white flex flex-col items-center justify-start px-4 py-8 md:py-12 relative overflow-y-auto">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[40px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />

      <div className="w-full max-w-2xl z-10 space-y-6">
        
        {/* Top Branding Header */}
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-pink-400"
          >
            <ShieldCheck size={12} className="animate-pulse" />
            <span>Sweety Core Security Shield</span>
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-200">
            Android Permissions Setup
          </h1>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            To provide hands-free voice calling, automatic screen understanding, offline routing, and study sync, please configure the required parameters.
          </p>
        </div>

        {/* Progress HUD */}
        <motion.div 
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl"
        >
          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-pink-500 via-indigo-500 to-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          
          <div className="space-y-1 text-center md:text-left">
            <div className="text-sm font-black text-white flex items-center justify-center md:justify-start gap-1.5">
              <span>Setup Status:</span>
              <span className="text-emerald-400 font-extrabold">{totalGranted} of {REQUIRED_PERMISSIONS.length} Ready</span>
            </div>
            <p className="text-[10px] text-gray-400">
              Auto-authorization mode takes effect for system services post consent.
            </p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleGrantAll}
              disabled={isRequesting}
              className={`px-5 py-2.5 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${isRequesting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRequesting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Requesting #{currentRequestIndex !== null ? currentRequestIndex + 1 : ''}...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Grant Standard Permissions</span>
                </>
              )}
            </button>
            
            {progressPercent >= 50 && (
              <button 
                onClick={handleFinish}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'permissions' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            Required Android Permissions ({REQUIRED_PERMISSIONS.length})
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'services' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            System Support & Services ({SUPPORT_SERVICES.length})
          </button>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === 'permissions' ? (
            <motion.div 
              key="permissions-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {Object.entries(categories).map(([catKey, catValue]) => {
                const list = activeGroupedPermissions[catKey as keyof typeof categories] || [];
                if (list.length === 0) return null;

                return (
                  <div key={catKey} className="space-y-3 bg-white/5 border border-white/5 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <div className={`text-xs font-black uppercase tracking-wider ${catValue.color} px-2.5 py-1 rounded-lg border`}>
                        {catValue.label}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {list.map(p => {
                        const Icon = p.icon;
                        const isGranted = grantedStates[p.id];
                        const isAuto = ['INTERNET', 'ACCESS_NETWORK_STATE', 'VIBRATE', 'WAKE_LOCK'].includes(p.id);

                        return (
                          <div 
                            key={p.id}
                            onClick={() => handleTogglePermission(p.id)}
                            className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${isGranted ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                          >
                            <div className={`p-2 rounded-xl mt-0.5 ${isGranted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                              <Icon size={16} />
                            </div>
                            
                            <div className="flex-1 min-w-0 space-y-0.5 text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-white font-mono break-all leading-tight">{p.id}</span>
                                {isAuto && (
                                  <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-black uppercase">AUTO</span>
                                )}
                                {p.restricted && (
                                  <span className="text-[8px] bg-pink-500/25 text-pink-300 px-1.5 py-0.5 rounded font-black uppercase" title="Requires explicit user/system prompt confirm. AI will guide you to settings.">RESTRICTED</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 leading-normal line-clamp-2">{p.description}</p>
                            </div>

                            <div className="flex items-center h-full pt-1">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isGranted ? 'bg-emerald-500 border-emerald-500 text-slate-900' : 'border-white/20 bg-transparent'}`}>
                                {isGranted && <Check size={11} className="stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div 
              key="services-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={16} />
                <div className="space-y-1 text-left">
                  <div className="text-xs font-bold text-amber-300">Background Automation Services</div>
                  <p className="text-[10px] text-amber-200/80 leading-normal">
                    These background support classes allow Sweety to run continuously, intercept incoming alerts, analyze your visible screens, and execute shortcuts automatically without user re-authentication.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUPPORT_SERVICES.map(s => {
                  const Icon = s.icon;
                  return (
                    <div 
                      key={s.id}
                      className="flex items-start gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:border-white/10 transition-all"
                    >
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl mt-0.5">
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white">{s.name}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : s.status === 'Active Background' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-white/10 text-gray-300'}`}>
                            {s.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-normal">{s.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-center">
                <button 
                  onClick={handleFinish}
                  className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95"
                >
                  <span>Finalize & Launch Sweety</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
