import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calculator, Terminal as TerminalIcon, Folder, Camera as CameraIcon, 
  Cpu, Phone, MessageSquare, ShieldAlert, Wifi, Bluetooth, MapPin, 
  Volume2, Sun, Search, Send, CheckCircle, ExternalLink, RefreshCw, 
  Play, Pause, Trash2, Shield, Lock, Eye, EyeOff, Smartphone, Battery, HardDrive, WifiOff,
  AlarmClock, Calendar, ListTodo, VolumeX, BatteryCharging, Music, Globe, Activity, Bell, FileText, SkipForward, SkipBack
} from 'lucide-react';
import { Device } from '@capacitor/device';
import { Camera } from '@capacitor/camera';

interface DeviceUtilityOverlayProps {
  utility: {
    type: 'calculator' | 'terminal' | 'file_browser' | 'camera' | 'system_monitor' | 'call' | 'sms' | 'lock_screen' | 'flashlight' | 'wifi' | 'bluetooth' | 'whatsapp' | 'telegram' | 'chrome' | 'youtube' | 'gallery' | 'clock' | 'google_search' | 'location' | 'sound' | 'volume' | 'alarm' | 'reminder' | 'calendar' | 'media_playback' | 'battery' | 'storage' | 'internet_status' | null;
    args?: any;
  };
  onClose: () => void;
}

export function DeviceUtilityOverlay({ utility, onClose }: DeviceUtilityOverlayProps) {
  const [calcInput, setCalcInput] = useState('0');
  const [calcPrev, setCalcPrev] = useState<string | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  
  // Terminal
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Sweety OS [Version 3.9]',
    '(c) 2026 Sweety Corporation. All rights reserved.',
    'Initializing secure core module...',
    'Kernel components mapped. Memory space: 4.2 GB safe.',
    'System standby: ready for instruction.'
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const termEndRef = useRef<HTMLDivElement>(null);

  // File browser
  const [currentFolder, setCurrentFolder] = useState<'root' | 'downloads' | 'gallery'>('root');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Camera
  const [snappedPhotos, setSnappedPhotos] = useState<string[]>([]);
  const [cameraFlash, setCameraFlash] = useState(false);

  // System Monitor
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean | null>(null);
  const [devicePlatform, setDevicePlatform] = useState<string>('Web Browser');
  const [cpuUsage, setCpuUsage] = useState<number>(45);

  // Calls
  const [callDuration, setCallDuration] = useState(0);
  const [callActive, setCallActive] = useState(true);

  // SMS
  const [smsReplies, setSmsReplies] = useState<{sender: 'user' | 'me', text: string, time: string}[]>([]);
  const [smsInput, setSmsInput] = useState('');

  // Lock screen
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);

  // Settings Toggles
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(70);

  // Flashlight
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [flashlightIntensity, setFlashlightIntensity] = useState(100);

  // Browser/Search
  const [searchQuery, setSearchQuery] = useState(utility.args?.messageContent || utility.args?.query || '');

  // Alarms
  const [alarms, setAlarms] = useState([
    { id: '1', time: '06:30 AM', label: 'Morning Exercise', active: true, repeat: 'Mon, Tue, Wed, Thu, Fri' },
    { id: '2', time: '08:00 AM', label: 'Study Routine Alert', active: true, repeat: 'Everyday' },
    { id: '3', time: '10:00 PM', label: 'Sleep Tracker Prep', active: false, repeat: 'Sat, Sun' }
  ]);
  const [newAlarmTime, setNewAlarmTime] = useState('07:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('');

  // Reminders
  const [reminders, setReminders] = useState([
    { id: '1', text: 'Revise coordinate geometry syllabus', done: false, priority: 'high' },
    { id: '2', text: 'Call math professor for feedback', done: true, priority: 'medium' },
    { id: '3', text: 'Submit physics lab manual report', done: false, priority: 'high' }
  ]);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderPriority, setNewReminderPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Calendar Events
  const [calendarEvents, setCalendarEvents] = useState([
    { id: '1', title: 'Calculus Advanced Webinar', date: '2026-07-21', time: '10:00 AM', desc: 'Cover limits, integrals & dynamic curves.' },
    { id: '2', title: 'Sweety System Maintenance Check', date: '2026-07-22', time: '02:00 PM', desc: 'Routine background sync diagnostics.' },
    { id: '3', title: 'Chemistry Semester Practical', date: '2026-07-24', time: '11:30 AM', desc: 'At laboratory hall B.' }
  ]);
  const [newCalTitle, setNewCalTitle] = useState('');
  const [newCalDate, setNewCalDate] = useState('2026-07-20');
  const [newCalTime, setNewCalTime] = useState('09:00');
  const [newCalDesc, setNewCalDesc] = useState('');

  // Media Playback
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(34); // percent
  const [mediaTrack, setMediaTrack] = useState({
    title: 'Study Lofi Chill Beats (Episode 42)',
    artist: 'Sweety Soundscapes',
    album: 'Sweety Chill Study Sessions',
    duration: '3:45',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80'
  });

  useEffect(() => {
    // Scroll terminal to end
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  useEffect(() => {
    // Fetch device info
    const fetchDeviceInfo = async () => {
      try {
        const battery = await Device.getBatteryInfo();
        setBatteryLevel(Math.round(((battery as any).batteryLevel || (battery as any).level || 0.89) * 100));
        setIsCharging((battery as any).isCharging || false);

        const info = await Device.getInfo();
        setDevicePlatform(`${info.platform} (${info.operatingSystem})`);
      } catch (e) {
        // Fallback for web
        setBatteryLevel(89);
        setIsCharging(true);
        setDevicePlatform('Web Container Mode');
      }
    };
    fetchDeviceInfo();

    // Simulated CPU usage fluctuation
    const interval = setInterval(() => {
      setCpuUsage(prev => {
        const delta = Math.floor(Math.random() * 15) - 7;
        const next = prev + delta;
        return Math.max(10, Math.min(95, next));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Auto-redirect for WhatsApp and Telegram - making it even more direct
  useEffect(() => {
    if (utility && (utility.type === 'whatsapp' || utility.type === 'telegram') && searchQuery) {
      const redirectTimer = setTimeout(() => {
        const baseUrl = utility.type === 'whatsapp' 
          ? `https://wa.me/?text=${encodeURIComponent(searchQuery)}`
          : `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(searchQuery)}`;
        
        // Use location.assign for a more direct navigation which is less likely to be blocked than a popup
        window.location.assign(baseUrl);
        
        // Small delay before closing to ensure the page doesn't unmount before the redirect starts
        setTimeout(onClose, 800);
      }, 300); // Faster redirect
      return () => clearTimeout(redirectTimer);
    }
  }, [utility?.type, searchQuery, onClose]);

  useEffect(() => {
    if (utility?.args?.messageContent || utility?.args?.query) {
      setSearchQuery(utility.args.messageContent || utility.args.query || '');
    }
  }, [utility]);

  // Timer for Call duration
  useEffect(() => {
    if (utility.type === 'call' && callActive) {
      const timer = setInterval(() => {
        setCallDuration(p => p + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [utility.type, callActive]);

  // Handle calculator keys
  const handleCalcKey = (key: string) => {
    if ('0123456789.'.includes(key)) {
      if (calcInput === '0' && key !== '.') {
        setCalcInput(key);
      } else {
        if (key === '.' && calcInput.includes('.')) return;
        setCalcInput(prev => prev + key);
      }
    } else if (key === 'AC') {
      setCalcInput('0');
      setCalcPrev(null);
      setCalcOp(null);
    } else if ('+-*/'.includes(key)) {
      setCalcPrev(calcInput);
      setCalcOp(key);
      setCalcInput('0');
    } else if (key === '=') {
      if (calcPrev && calcOp) {
        const a = parseFloat(calcPrev);
        const b = parseFloat(calcInput);
        let ans = 0;
        if (calcOp === '+') ans = a + b;
        else if (calcOp === '-') ans = a - b;
        else if (calcOp === '*') ans = a * b;
        else if (calcOp === '/') ans = b !== 0 ? a / b : 0;
        
        setCalcInput(String(Number(ans.toFixed(8))));
        setCalcPrev(null);
        setCalcOp(null);
      }
    }
  };

  // Handle terminal commands
  const handleTerminalCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim().toLowerCase();
    const newLogs = [...terminalLogs, `guest@sweety:~ $ ${terminalInput}`];
    
    if (cmd === 'clear') {
      setTerminalLogs([]);
      setTerminalInput('');
      return;
    } else if (cmd === 'help') {
      newLogs.push(
        'Supported Commands:',
        '  help       - Display available shell operations',
        '  sysinfo    - Run deep kernel configuration check',
        '  battery    - Diagnostics of accumulator power cell',
        '  clear      - Clear monitor matrix buffer',
        '  lock       - Secure system memory bounds'
      );
    } else if (cmd === 'sysinfo') {
      newLogs.push(
        `System Host: ${devicePlatform}`,
        `Processor: Core 8x Multi-threaded SoC`,
        `Memory Status: Safe (Allocated: 2.1 GB, Total: 8.0 GB)`,
        `Device Status: ACTIVE / ENCRYPTED`
      );
    } else if (cmd === 'battery') {
      newLogs.push(
        `Accumulator Cell charge level: ${batteryLevel}%`,
        `Current state: ${isCharging ? 'CHARGING (AC SOURCE)' : 'DISCHARGING (ON BATTERY)'}`
      );
    } else if (cmd === 'lock') {
      setTerminalInput('');
      setTerminalLogs(newLogs);
      setPinInput('');
      setPinError(false);
      // Change utility to lock screen
      utility.type = 'lock_screen';
      return;
    } else {
      newLogs.push(`sweety-sh: command not found: ${terminalInput}`);
    }

    setTerminalLogs(newLogs);
    setTerminalInput('');
  };

  // Lock screen handle pin input
  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      
      if (nextPin === '1234') {
        // Success
        setTimeout(() => {
          onClose();
        }, 500);
      } else if (nextPin.length === 4) {
        // Error
        setTimeout(() => {
          setPinError(true);
          setPinInput('');
          setTimeout(() => setPinError(false), 1000);
        }, 300);
      }
    }
  };

  // Simulated biometric scan
  const triggerBiometric = () => {
    setBiometricScanning(true);
    setTimeout(() => {
      setBiometricScanning(false);
      onClose(); // Unlocks
    }, 2000);
  };

  // Camera snap photo
  const snapPhoto = async () => {
    setCameraFlash(true);
    setTimeout(() => setCameraFlash(false), 200);
    
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Create dynamic canvas stream mockup or actual picture
        const fakePhotoUrl = `https://images.unsplash.com/photo-${1600000000000 + Math.floor(Math.random() * 1000000000)}?auto=format&fit=crop&w=400&q=80`;
        setSnappedPhotos(p => [fakePhotoUrl, ...p]);
      }
    } catch (e) {
      console.warn("Could not capture actual camera image:", e);
    }
  };

  const formattedCallTime = () => {
    const min = Math.floor(callDuration / 60);
    const sec = callDuration % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (!utility.type) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="w-full max-w-lg bg-slate-950/80 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                {utility.type === 'calculator' && <Calculator size={18} />}
                {utility.type === 'terminal' && <TerminalIcon size={18} />}
                {utility.type === 'file_browser' && <Folder size={18} />}
                {utility.type === 'camera' && <CameraIcon size={18} />}
                {utility.type === 'system_monitor' && <Cpu size={18} />}
                {utility.type === 'call' && <Phone size={18} />}
                {utility.type === 'sms' && <MessageSquare size={18} />}
                {utility.type === 'lock_screen' && <Lock size={18} />}
                {['wifi', 'bluetooth', 'location', 'sound', 'volume', 'internet_status'].includes(utility.type) && <Wifi size={18} />}
                {utility.type === 'flashlight' && <Sun size={18} />}
                {['whatsapp', 'telegram', 'chrome', 'youtube', 'gallery', 'clock', 'google_search'].includes(utility.type) && <Smartphone size={18} />}
                {utility.type === 'alarm' && <AlarmClock size={18} />}
                {utility.type === 'reminder' && <ListTodo size={18} />}
                {utility.type === 'calendar' && <Calendar size={18} />}
                {utility.type === 'media_playback' && <Music size={18} />}
                {utility.type === 'battery' && <BatteryCharging size={18} />}
                {utility.type === 'storage' && <HardDrive size={18} />}
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {utility.type === 'calculator' && 'Sweety Calculator'}
                  {utility.type === 'terminal' && 'Sweety Core Terminal'}
                  {utility.type === 'file_browser' && 'Sweety File Browser'}
                  {utility.type === 'camera' && 'Sweety Camera App'}
                  {utility.type === 'system_monitor' && 'Sweety System Diagnostics'}
                  {utility.type === 'call' && 'Outbound Audio Call'}
                  {utility.type === 'sms' && 'Secure Message dispatch'}
                  {utility.type === 'lock_screen' && 'Sweety Guard Lock'}
                  {utility.type === 'flashlight' && 'Hardware Flashlight'}
                  {utility.type === 'wifi' && 'WiFi Signal Sync'}
                  {utility.type === 'bluetooth' && 'Bluetooth Link Layer'}
                  {utility.type === 'location' && 'GPS Geolocation'}
                  {utility.type === 'sound' && 'Volume Controller'}
                  {utility.type === 'volume' && 'Volume Controller'}
                  {utility.type === 'whatsapp' && 'WhatsApp Linker'}
                  {utility.type === 'telegram' && 'Telegram Dispatcher'}
                  {utility.type === 'chrome' && 'Chrome Browser Link'}
                  {utility.type === 'youtube' && 'YouTube Media Portal'}
                  {utility.type === 'gallery' && 'Device Photo Album'}
                  {utility.type === 'clock' && 'World Clock Engine'}
                  {utility.type === 'google_search' && 'Google Query Search'}
                  {utility.type === 'alarm' && 'Sweety Alarm Clock'}
                  {utility.type === 'reminder' && 'Task Reminders'}
                  {utility.type === 'calendar' && 'Academic Calendar'}
                  {utility.type === 'media_playback' && 'Sweety Media Player'}
                  {utility.type === 'battery' && 'Battery Intelligence'}
                  {utility.type === 'storage' && 'Device Storage Hub'}
                  {utility.type === 'internet_status' && 'Connectivity & Network'}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">SWEETY OS v3.9 SECURE ACCESS</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full text-gray-300 hover:text-white transition-all active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
            
            {/* 1. CALCULATOR */}
            {utility.type === 'calculator' && (
              <div className="flex flex-col gap-4 max-w-[280px] mx-auto py-4">
                <div className="bg-black/50 border border-white/10 p-5 rounded-2xl text-right overflow-hidden shadow-inner">
                  {calcPrev && <div className="text-xs text-gray-400 font-mono mb-1">{calcPrev} {calcOp}</div>}
                  <div className="text-3xl font-black text-white font-mono tracking-tight truncate">{calcInput}</div>
                </div>
                <div className="grid grid-cols-4 gap-2.5 font-mono">
                  {['AC', 'C', '%', '/'].map(k => (
                    <button
                      key={k}
                      onClick={() => handleCalcKey(k === 'C' ? 'AC' : k)}
                      className="py-3.5 bg-white/5 hover:bg-white/10 text-pink-400 font-black rounded-xl border border-white/5 active:scale-95 transition-all text-sm"
                    >
                      {k}
                    </button>
                  ))}
                  {['7', '8', '9', '*'].map(k => (
                    <button
                      key={k}
                      onClick={() => handleCalcKey(k)}
                      className={`py-3.5 rounded-xl font-black border border-white/5 active:scale-95 transition-all text-sm ${k === '*' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      {k}
                    </button>
                  ))}
                  {['4', '5', '6', '-'].map(k => (
                    <button
                      key={k}
                      onClick={() => handleCalcKey(k)}
                      className={`py-3.5 rounded-xl font-black border border-white/5 active:scale-95 transition-all text-sm ${k === '-' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      {k}
                    </button>
                  ))}
                  {['1', '2', '3', '+'].map(k => (
                    <button
                      key={k}
                      onClick={() => handleCalcKey(k)}
                      className={`py-3.5 rounded-xl font-black border border-white/5 active:scale-95 transition-all text-sm ${k === '+' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      {k}
                    </button>
                  ))}
                  <button
                    onClick={() => handleCalcKey('0')}
                    className="col-span-2 py-3.5 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl border border-white/5 active:scale-95 transition-all text-sm"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleCalcKey('.')}
                    className="py-3.5 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl border border-white/5 active:scale-95 transition-all text-sm"
                  >
                    .
                  </button>
                  <button
                    onClick={() => handleCalcKey('=')}
                    className="py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-black rounded-xl active:scale-95 transition-all text-sm shadow-md shadow-indigo-500/25"
                  >
                    =
                  </button>
                </div>
              </div>
            )}

            {/* 2. TERMINAL */}
            {utility.type === 'terminal' && (
              <div className="flex flex-col h-[350px] bg-black/90 border border-white/10 rounded-2xl overflow-hidden font-mono text-xs">
                <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/10 bg-white/5 text-gray-400 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="ml-2 text-[10px] uppercase tracking-wider">guest@sweety_os:~</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 select-text selection:bg-pink-500 selection:text-white">
                  {terminalLogs.map((log, i) => (
                    <div key={i} className={log.startsWith('guest@') ? 'text-indigo-400' : log.startsWith('  ') ? 'text-gray-400 pl-2' : 'text-emerald-400'}>
                      {log}
                    </div>
                  ))}
                  <div ref={termEndRef} />
                </div>
                <form onSubmit={handleTerminalCommand} className="flex border-t border-white/10 shrink-0">
                  <span className="pl-4 py-3 bg-black text-indigo-400 select-none">guest@sweety:~ $</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    className="flex-1 py-3 px-2 bg-black text-white focus:outline-none caret-pink-500"
                    placeholder="Type help or sysinfo..."
                    autoFocus
                  />
                </form>
              </div>
            )}

            {/* 3. FILE BROWSER */}
            {utility.type === 'file_browser' && (
              <div className="flex flex-col gap-4 font-sans">
                {/* Navigation paths */}
                <div className="flex gap-2 items-center text-xs text-gray-400 border border-white/5 bg-white/5 p-3 rounded-xl">
                  <span className="text-pink-400 cursor-pointer font-bold" onClick={() => setCurrentFolder('root')}>Root</span>
                  <span>/</span>
                  {currentFolder !== 'root' && (
                    <span className="text-indigo-400 capitalize">{currentFolder}</span>
                  )}
                </div>

                {currentFolder === 'root' && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setCurrentFolder('downloads')}
                      className="p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex flex-col items-center gap-3 transition-all text-center active:scale-95 group"
                    >
                      <Folder className="text-pink-400 group-hover:scale-105 transition-transform" size={40} />
                      <div>
                        <div className="text-sm font-black text-white">Downloads</div>
                        <div className="text-[10px] text-gray-400 mt-1">4 items · 24 MB</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setCurrentFolder('gallery')}
                      className="p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex flex-col items-center gap-3 transition-all text-center active:scale-95 group"
                    >
                      <Folder className="text-indigo-400 group-hover:scale-105 transition-transform" size={40} />
                      <div>
                        <div className="text-sm font-black text-white">Gallery</div>
                        <div className="text-[10px] text-gray-400 mt-1">6 images · 42 MB</div>
                      </div>
                    </button>
                  </div>
                )}

                {currentFolder === 'downloads' && (
                  <div className="space-y-2">
                    {[
                      { name: 'Routine_Schedule.pdf', size: '1.2 MB', date: 'Yesterday' },
                      { name: 'Semester_Syllabus.docx', size: '2.4 MB', date: 'July 18' },
                      { name: 'Sweety_API_Blueprint.json', size: '4 KB', date: 'July 15' },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <Folder size={18} className="text-pink-400" />
                          <div>
                            <div className="text-xs font-bold text-white">{f.name}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{f.size} · {f.date}</div>
                          </div>
                        </div>
                        <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => setCurrentFolder('root')} 
                      className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 font-bold hover:bg-white/10 mt-2"
                    >
                      Go Back
                    </button>
                  </div>
                )}

                {currentFolder === 'gallery' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80',
                        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80',
                        'https://images.unsplash.com/photo-1516116211223-5c359a36298a?auto=format&fit=crop&w=300&q=80',
                        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80',
                        'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=300&q=80',
                        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=300&q=80'
                      ].map((img, i) => (
                        <div 
                          key={i} 
                          onClick={() => setLightboxImg(img)}
                          className="aspect-square bg-slate-900 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors relative group"
                        >
                          <img src={img} alt="album" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye size={16} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setCurrentFolder('root')} 
                      className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 font-bold hover:bg-white/10"
                    >
                      Go Back
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 4. CAMERA */}
            {utility.type === 'camera' && (
              <div className="flex flex-col gap-4 font-sans">
                <div className="relative aspect-video rounded-3xl bg-slate-950 border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                  <div className="absolute top-4 left-4 flex gap-2 z-10 text-[10px] font-mono bg-black/60 px-3 py-1.5 rounded-full border border-white/10 text-emerald-400 items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    SWEETY LIVE FHD VIEW
                  </div>
                  
                  {/* Grid overlay */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  <AnimatePresence>
                    {cameraFlash && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white z-20"
                      />
                    )}
                  </AnimatePresence>

                  <img 
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80" 
                    className="w-full h-full object-cover filter brightness-90 saturate-[1.1]" 
                    alt="Camera placeholder"
                  />

                  {/* Shutter bar */}
                  <div className="absolute bottom-5 left-0 w-full flex justify-center items-center gap-6 px-10 z-10">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white border border-white/10 cursor-pointer hover:bg-black/80">
                      <RefreshCw size={18} />
                    </div>
                    <button 
                      onClick={snapPhoto}
                      className="w-16 h-16 rounded-full bg-white p-1.5 shadow-2xl active:scale-90 transition-all cursor-pointer border-4 border-slate-900"
                    >
                      <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold hover:bg-indigo-500 transition-colors">
                        <CameraIcon size={24} />
                      </div>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white border border-white/10 cursor-pointer hover:bg-black/80">
                      <Volume2 size={18} />
                    </div>
                  </div>
                </div>

                {/* Snapped roll */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest pl-1">Photos Snapped Today ({snappedPhotos.length})</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {snappedPhotos.length === 0 && (
                      <div className="text-xs text-gray-500 py-3 pl-1">No captured frames yet. Tap Shutter to record.</div>
                    )}
                    {snappedPhotos.map((url, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setLightboxImg(url)}
                        className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 cursor-pointer hover:border-indigo-500 relative transition-all"
                      >
                        <img src={url} alt="snap" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. SYSTEM MONITOR */}
            {utility.type === 'system_monitor' && (
              <div className="flex flex-col gap-4 font-sans">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex justify-between items-center mb-1 text-xs text-gray-400">
                      <span>Accumulator Info</span>
                      <Battery size={14} className="text-emerald-400" />
                    </div>
                    <div className="text-2xl font-black text-white">{batteryLevel}%</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isCharging ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                      {isCharging ? 'AC Powered (Charging)' : 'On Battery (Discharging)'}
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex justify-between items-center mb-1 text-xs text-gray-400">
                      <span>Operating System</span>
                      <Smartphone size={14} className="text-indigo-400" />
                    </div>
                    <div className="text-sm font-black text-white truncate mt-1">{devicePlatform}</div>
                    <div className="text-[10px] text-gray-400 mt-2">SWEETY KERNEL v3.7</div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Core Processor Load</span>
                      <span className="font-mono text-indigo-400 font-bold">{cpuUsage}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-pink-500 to-indigo-500" 
                        animate={{ width: `${cpuUsage}%` }}
                        transition={{ ease: "easeInOut", duration: 0.5 }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Memory Space allocated</span>
                      <span className="font-mono text-pink-400 font-bold">54% (4.2 GB / 8.0 GB)</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full w-[54%] bg-gradient-to-r from-indigo-500 to-pink-500" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Storage Distribution</span>
                      <span className="font-mono text-amber-400 font-bold">32% (41 GB / 128 GB)</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full w-[32%] bg-amber-500/80" />
                    </div>
                  </div>
                </div>

                {/* Simulated Waveform chart */}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Holographic Telemetry Feed</div>
                  <div className="h-16 flex items-end gap-1.5 overflow-hidden px-2 relative border-b border-indigo-500/10">
                    <div className="absolute inset-x-0 top-1/2 h-[1px] bg-indigo-500/15" />
                    {Array.from({ length: 28 }).map((_, i) => {
                      const h = Math.max(10, Math.floor(Math.sin((i + cpuUsage/5) * 0.4) * 40) + 40);
                      return (
                        <div 
                          key={i} 
                          className="flex-1 bg-indigo-500/20 hover:bg-pink-500/40 rounded-t-sm transition-all duration-300"
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 6. CALLS */}
            {utility.type === 'call' && (
              <div className="flex flex-col items-center py-6 text-center font-sans">
                <div className="w-24 h-24 rounded-full bg-white/5 border border-indigo-500/20 flex items-center justify-center text-indigo-400 relative mb-6">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping opacity-60" />
                  <Phone size={44} className="animate-pulse" />
                </div>
                
                <h3 className="text-lg font-black text-white">{utility.args?.contactName || 'Sweety Private Line'}</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">{utility.args?.phoneNumber || '+91 98765 43210'}</p>
                
                <div className="mt-4 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-mono font-bold tracking-widest animate-pulse">
                  {callActive ? 'CONNECTED - SECURE LINK' : 'DIALING VOICE LINK'}
                </div>

                <div className="text-3xl font-black text-white font-mono mt-8 mb-12">
                  {formattedCallTime()}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setCallActive(!callActive)}
                    className={`p-4 rounded-full border transition-all active:scale-95 ${callActive ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'}`}
                  >
                    {callActive ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button 
                    onClick={onClose}
                    className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full flex items-center gap-2 shadow-lg shadow-red-500/30 active:scale-95 transition-all text-xs"
                  >
                    <X size={16} /> HANG UP CALL
                  </button>
                </div>
              </div>
            )}

            {/* 7. SMS / MESSAGING */}
            {utility.type === 'sms' && (
              <div className="flex flex-col h-[380px] font-sans">
                {/* Contact bar */}
                <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                      {(utility.args?.contactName || 'K')[0]}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">{utility.args?.contactName || 'Krishanu Majee'}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{utility.args?.phoneNumber || '+91 98765 43210'}</div>
                    </div>
                  </div>
                  <div className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono px-2 py-1 rounded-full">LTE DISPATCH</div>
                </div>

                {/* Messages panel */}
                <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-black/40 rounded-2xl border border-white/5 select-text mb-4">
                  <div className="flex flex-col gap-1 max-w-[85%] self-start">
                    <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-xs text-gray-300 leading-relaxed rounded-tl-none">
                      {utility.args?.messageContent || 'Hi, this is a secure text dispatcher from your AI Companion.'}
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono pl-1">Sent · Today 11:20 AM</span>
                  </div>

                  {smsReplies.map((r, i) => (
                    <div key={i} className={`flex flex-col gap-1 max-w-[85%] ${r.sender === 'me' ? 'ml-auto items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${r.sender === 'me' ? 'bg-gradient-to-r from-pink-500 to-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/5 text-gray-300 rounded-tl-none'}`}>
                        {r.text}
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono pr-1">{r.time}</span>
                    </div>
                  ))}
                </div>

                {/* Reply composer */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!smsInput.trim()) return;
                    setSmsReplies(prev => [...prev, {
                      sender: 'me',
                      text: smsInput.trim(),
                      time: 'Just now'
                    }]);
                    setSmsInput('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={smsInput}
                    onChange={(e) => setSmsInput(e.target.value)}
                    className="flex-1 py-3 px-4 bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl text-xs text-white focus:outline-none"
                    placeholder="Type quick text message..."
                  />
                  <button 
                    type="submit"
                    className="p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all active:scale-95"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* 8. LOCK SCREEN */}
            {utility.type === 'lock_screen' && (
              <div className="flex flex-col items-center py-4 font-sans">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-pink-400 mb-3 mx-auto">
                    <Lock size={22} className={pinError ? 'animate-bounce text-red-400' : ''} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Sweety Guard Lock</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Default access code: <span className="font-mono font-bold text-indigo-400">1234</span></p>
                </div>

                {/* PIN Code display dots */}
                <div className="flex gap-3 justify-center mb-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3.5 h-3.5 rounded-full border border-white/20 transition-all duration-200 ${pinError ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/50 animate-pulse' : i < pinInput.length ? 'bg-pink-500 border-pink-500 shadow-lg shadow-pink-500/50' : 'bg-white/5'}`}
                    />
                  ))}
                </div>

                {/* Numeric Dial keys */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] font-mono text-center mb-6">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                    <button
                      key={n}
                      onClick={() => handlePinDigit(n)}
                      className="w-14 h-14 rounded-full bg-white/5 border border-white/5 text-lg font-bold text-white flex items-center justify-center mx-auto hover:bg-white/10 active:scale-90 transition-all"
                    >
                      {n}
                    </button>
                  ))}
                  <button 
                    onClick={() => setPinInput('')}
                    className="w-14 h-14 rounded-full bg-white/5 border border-white/5 text-xs font-bold text-gray-400 flex items-center justify-center mx-auto hover:bg-white/10 active:scale-90 transition-all"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handlePinDigit('0')}
                    className="w-14 h-14 rounded-full bg-white/5 border border-white/5 text-lg font-bold text-white flex items-center justify-center mx-auto hover:bg-white/10 active:scale-90 transition-all"
                  >
                    0
                  </button>
                  <button 
                    onClick={triggerBiometric}
                    className="w-14 h-14 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-black text-pink-400 flex items-center justify-center mx-auto hover:bg-pink-500/20 active:scale-90 transition-all relative overflow-hidden"
                  >
                    {biometricScanning ? (
                      <div className="absolute inset-y-0 w-full bg-pink-500/20 animate-pulse" />
                    ) : 'Touch'}
                  </button>
                </div>
              </div>
            )}

            {/* 9. WIFI, BLUETOOTH, GPS RADAR */}
            {['wifi', 'bluetooth', 'location', 'sound', 'volume'].includes(utility.type) && (
              <div className="flex flex-col gap-6 font-sans">
                {/* Visual radar animation */}
                <div className="w-40 h-40 rounded-full border border-indigo-500/10 flex items-center justify-center mx-auto relative overflow-hidden bg-[#0a081e]/30">
                  <div className="absolute inset-0 border border-indigo-500/5 rounded-full scale-75 animate-ping opacity-30" />
                  <div className="absolute inset-0 border border-indigo-500/5 rounded-full scale-50 animate-ping opacity-40" />
                  <div className="absolute w-2 h-40 bg-gradient-to-t from-indigo-500/0 via-indigo-500/20 to-indigo-500/0 rotate-45 animate-[spin_5s_linear_infinite]" />
                  
                  {utility.type === 'wifi' && (
                    <Wifi size={40} className={wifiEnabled ? 'text-indigo-400 animate-pulse' : 'text-gray-600'} />
                  )}
                  {utility.type === 'bluetooth' && (
                    <Bluetooth size={40} className={bluetoothEnabled ? 'text-pink-400 animate-pulse' : 'text-gray-600'} />
                  )}
                  {utility.type === 'location' && (
                    <MapPin size={40} className={locationEnabled ? 'text-emerald-400 animate-bounce' : 'text-gray-600'} />
                  )}
                  {['sound', 'volume'].includes(utility.type) && (
                    <Volume2 size={40} className="text-pink-400 animate-pulse" />
                  )}
                </div>

                {/* Status Toggles */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div>
                      <div className="text-xs font-black text-white">Wireless Connection (WiFi)</div>
                      <div className="text-[10px] text-gray-400 mt-1">{wifiEnabled ? 'Connected to "Sweety-Super-LTE"' : 'WiFi transceiver disconnected'}</div>
                    </div>
                    <button 
                      onClick={() => setWifiEnabled(!wifiEnabled)}
                      className={`w-11 h-6 rounded-full p-1 transition-colors ${wifiEnabled ? 'bg-indigo-600' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${wifiEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div>
                      <div className="text-xs font-black text-white">Bluetooth Link (BLE)</div>
                      <div className="text-[10px] text-gray-400 mt-1">{bluetoothEnabled ? 'Searching for sweet wearables...' : 'Bluetooth adapter inactive'}</div>
                    </div>
                    <button 
                      onClick={() => setBluetoothEnabled(!bluetoothEnabled)}
                      className={`w-11 h-6 rounded-full p-1 transition-colors ${bluetoothEnabled ? 'bg-pink-600' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${bluetoothEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div>
                      <div className="text-xs font-black text-white">GPS Geolocation Matrix</div>
                      <div className="text-[10px] text-gray-400 mt-1">{locationEnabled ? 'Position lock coordinates active' : 'GPS transponder offline'}</div>
                    </div>
                    <button 
                      onClick={() => setLocationEnabled(!locationEnabled)}
                      className={`w-11 h-6 rounded-full p-1 transition-colors ${locationEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${locationEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-gray-400">System Sound Level</span>
                      <span className="text-pink-400 font-mono">{soundVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={soundVolume}
                      onChange={(e) => setSoundVolume(Number(e.target.value))}
                      className="w-full accent-pink-500 bg-white/10 rounded-lg appearance-none h-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 10. FLASHLIGHT */}
            {utility.type === 'flashlight' && (
              <div className="flex flex-col items-center py-6 gap-6 font-sans">
                <div className="relative">
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 border ${flashlightOn ? 'bg-amber-400/10 border-amber-400/40 shadow-[0_0_50px_rgba(251,191,36,0.3)]' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                    <Sun size={48} className={flashlightOn ? 'text-amber-400 animate-pulse' : 'text-gray-500'} />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-sm font-black text-white">{flashlightOn ? 'FLASHLIGHT EMITTING' : 'FLASHLIGHT OFFLINE'}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Simulated LED light node level: {flashlightIntensity}%</p>
                </div>

                <div className="w-full max-w-[240px] space-y-4">
                  <button 
                    onClick={() => setFlashlightOn(!flashlightOn)}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all active:scale-95 border ${flashlightOn ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'}`}
                  >
                    {flashlightOn ? 'SHUT DOWN EMISSION' : 'ACTIVATE FLASHLIGHT'}
                  </button>

                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] mb-1 font-bold text-gray-400">
                      <span>Light Density</span>
                      <span className="font-mono text-amber-400">{flashlightIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={flashlightIntensity}
                      onChange={(e) => setFlashlightIntensity(Number(e.target.value))}
                      disabled={!flashlightOn}
                      className="w-full accent-amber-400 bg-white/10 rounded-lg appearance-none h-1.5 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 11. WORLD CLOCK */}
            {utility.type === 'clock' && (
              <div className="flex flex-col items-center py-6 gap-6 font-sans">
                <div className="text-4xl font-black font-mono tracking-tight text-white flex items-center gap-1.5">
                  {new Date().toLocaleTimeString()}
                </div>
                <div className="text-xs text-gray-400 text-center uppercase tracking-widest">
                  {new Date().toDateString()}
                </div>
                
                <div className="w-full border-t border-white/5 pt-4 space-y-2.5">
                  {[
                    { city: 'Kolkata, India', tz: 'GMT+5:30', diff: 'Local Time' },
                    { city: 'London, UK', tz: 'GMT+1:00', diff: '-4.5 Hours' },
                    { city: 'San Francisco, USA', tz: 'GMT-7:00', diff: '-12.5 Hours' }
                  ].map((c, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl">
                      <div>
                        <div className="text-xs font-bold text-white">{c.city}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{c.tz}</div>
                      </div>
                      <div className="text-xs font-mono font-bold text-indigo-400">{c.diff}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 12. WHATSAPP & TELEGRAM DISPATCH INTENTS */}
            {['whatsapp', 'telegram'].includes(utility.type) && (
              <div className="flex flex-col items-center text-center py-6 gap-4 font-sans">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                    <MessageSquare size={38} className="animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#0a0a0c] flex items-center justify-center">
                    <RefreshCw size={12} className="text-white animate-spin" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white capitalize">{utility.type} External Portal</h3>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Redirecting to App...
                  </div>
                </div>

                <p className="text-xs text-gray-400 max-w-sm leading-relaxed px-4">
                  Sweety is routing your command message to {utility.type === 'whatsapp' ? 'WhatsApp' : 'Telegram'} chat interface. Please wait a moment.
                </p>

                {searchQuery && (
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-left w-full mt-2">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Message Content</div>
                    <div className="text-xs text-white leading-relaxed line-clamp-3 italic opacity-70">"{searchQuery}"</div>
                  </div>
                )}

                <div className="w-full mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const baseUrl = utility.type === 'whatsapp' 
                        ? `https://wa.me/?text=${encodeURIComponent(searchQuery)}`
                        : `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(searchQuery)}`;
                      window.open(baseUrl, '_blank');
                      onClose();
                    }}
                    className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    Open Manually <ExternalLink size={14} />
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold text-[11px] transition-all"
                  >
                    Cancel Dispatch
                  </button>
                </div>
              </div>
            )}

            {/* 13. CHROME & GOOGLE SEARCH & YOUTUBE */}
            {['chrome', 'youtube', 'google_search'].includes(utility.type) && (
              <div className="flex flex-col gap-4 font-sans">
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-3 items-center gap-3">
                  <Search className="text-gray-400 shrink-0" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white focus:outline-none focus:ring-0"
                    placeholder={utility.type === 'youtube' ? 'Search YouTube videos...' : 'Type web URL or query search...'}
                  />
                  <button 
                    onClick={() => {
                      let url = '';
                      if (utility.type === 'youtube') {
                        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
                      } else if (utility.type === 'google_search') {
                        url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                      } else {
                        url = searchQuery.includes('.') ? (searchQuery.startsWith('http') ? searchQuery : `https://${searchQuery}`) : `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                      }
                      window.open(url, '_blank');
                    }}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
                  >
                    <Send size={12} />
                  </button>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center text-xs text-gray-400 space-y-3 py-6">
                  <Cpu size={24} className="mx-auto text-indigo-400 animate-pulse" />
                  <p>
                    {utility.type === 'youtube' && 'Sweety AI is ready to pull media records matching your search target.'}
                    {utility.type === 'google_search' && 'Google query indexes will fetch matching web materials.'}
                    {utility.type === 'chrome' && 'Standard HTTP Chrome sandboxing ready for destination.'}
                  </p>
                  
                  <button
                    onClick={() => {
                      let url = '';
                      if (utility.type === 'youtube') {
                        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery || 'coding tutorials')}`;
                      } else if (utility.type === 'google_search') {
                        url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery || 'latest tech news')}`;
                      } else {
                        url = `https://www.google.com/${searchQuery ? `search?q=${encodeURIComponent(searchQuery)}` : ''}`;
                      }
                      window.open(url, '_blank');
                    }}
                    className="mx-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider"
                  >
                    Launch Web Frame <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* 14. ALARMS */}
            {utility.type === 'alarm' && (
              <div className="flex flex-col gap-4 font-sans">
                {/* Add alarm form */}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Set New Alarm</div>
                  <div className="flex gap-2.5">
                    <input 
                      type="time" 
                      value={newAlarmTime} 
                      onChange={(e) => setNewAlarmTime(e.target.value)} 
                      className="py-2.5 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <input 
                      type="text" 
                      placeholder="Alarm Label (e.g. Maths Class)" 
                      value={newAlarmLabel} 
                      onChange={(e) => setNewAlarmLabel(e.target.value)} 
                      className="flex-1 py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      onClick={() => {
                        if (!newAlarmTime) return;
                        // Format to AM/PM
                        const [h, m] = newAlarmTime.split(':');
                        const hourNum = parseInt(h);
                        const ampm = hourNum >= 12 ? 'PM' : 'AM';
                        const displayHour = hourNum % 12 || 12;
                        const formattedTime = `${String(displayHour).padStart(2, '0')}:${m} ${ampm}`;
                        setAlarms(prev => [...prev, {
                          id: String(Date.now()),
                          time: formattedTime,
                          label: newAlarmLabel || 'Alarm',
                          active: true,
                          repeat: 'Everyday'
                        }]);
                        setNewAlarmLabel('');
                      }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Alarm list */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Active Alarms</div>
                  {alarms.map((al) => (
                    <div key={al.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <AlarmClock size={20} className={al.active ? 'text-indigo-400 animate-pulse' : 'text-gray-500'} />
                        <div>
                          <div className="text-xl font-black font-mono text-white">{al.time}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{al.label} · <span className="text-[10px] text-gray-500">{al.repeat}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setAlarms(prev => prev.map(a => a.id === al.id ? { ...a, active: !a.active } : a));
                          }}
                          className={`w-11 h-6 rounded-full p-1 transition-colors ${al.active ? 'bg-indigo-600' : 'bg-white/10'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${al.active ? 'translate-x-5' : ''}`} />
                        </button>
                        <button 
                          onClick={() => {
                            setAlarms(prev => prev.filter(a => a.id !== al.id));
                          }}
                          className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 15. REMINDERS */}
            {utility.type === 'reminder' && (
              <div className="flex flex-col gap-4 font-sans">
                {/* Add reminder form */}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">New Task Reminder</div>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text" 
                      placeholder="What would you like to be reminded of?" 
                      value={newReminderText} 
                      onChange={(e) => setNewReminderText(e.target.value)} 
                      className="w-full py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex gap-1.5 items-center">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Priority:</span>
                        {(['low', 'medium', 'high'] as const).map(pr => (
                          <button
                            key={pr}
                            onClick={() => setNewReminderPriority(pr)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black capitalize transition-all border ${newReminderPriority === pr ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                          >
                            {pr}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => {
                          if (!newReminderText.trim()) return;
                          setReminders(prev => [...prev, {
                            id: String(Date.now()),
                            text: newReminderText.trim(),
                            done: false,
                            priority: newReminderPriority
                          }]);
                          setNewReminderText('');
                        }}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reminders List */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">List of Reminders</div>
                  {reminders.map((rem) => (
                    <div key={rem.id} className="flex justify-between items-center p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3 flex-1 mr-2">
                        <button 
                          onClick={() => {
                            setReminders(prev => prev.map(r => r.id === rem.id ? { ...r, done: !r.done } : r));
                          }}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${rem.done ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-white/20 text-transparent hover:border-indigo-400'}`}
                        >
                          <CheckCircle size={12} className={rem.done ? 'opacity-100' : 'opacity-0'} />
                        </button>
                        <div className="flex-1">
                          <div className={`text-xs font-bold transition-all ${rem.done ? 'line-through text-gray-500' : 'text-white'}`}>
                            {rem.text}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${rem.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : rem.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                              {rem.priority} priority
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setReminders(prev => prev.filter(r => r.id !== rem.id));
                        }}
                        className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 16. CALENDAR */}
            {utility.type === 'calendar' && (
              <div className="flex flex-col gap-4 font-sans">
                {/* Add event form */}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Schedule Event</div>
                  <div className="space-y-2.5">
                    <input 
                      type="text" 
                      placeholder="Event Title (e.g., Mathematics Exam Prep)" 
                      value={newCalTitle} 
                      onChange={(e) => setNewCalTitle(e.target.value)} 
                      className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={newCalDate} 
                        onChange={(e) => setNewCalDate(e.target.value)} 
                        className="py-2 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <input 
                        type="time" 
                        value={newCalTime} 
                        onChange={(e) => setNewCalTime(e.target.value)} 
                        className="py-2 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Brief Description or Venue" 
                      value={newCalDesc} 
                      onChange={(e) => setNewCalDesc(e.target.value)} 
                      className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      onClick={() => {
                        if (!newCalTitle.trim()) return;
                        // Format time to AM/PM
                        const [h, m] = newCalTime.split(':');
                        const hourNum = parseInt(h);
                        const ampm = hourNum >= 12 ? 'PM' : 'AM';
                        const displayHour = hourNum % 12 || 12;
                        const formattedTime = `${String(displayHour).padStart(2, '0')}:${m} ${ampm}`;

                        setCalendarEvents(prev => [...prev, {
                          id: String(Date.now()),
                          title: newCalTitle.trim(),
                          date: newCalDate,
                          time: formattedTime,
                          desc: newCalDesc || 'No additional notes.'
                        }]);
                        setNewCalTitle('');
                        setNewCalDesc('');
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Save Calendar Event
                    </button>
                  </div>
                </div>

                {/* Events list */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Scheduled Events</div>
                  {calendarEvents.map((ev) => (
                    <div key={ev.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-start gap-3">
                          <Calendar size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-black text-white">{ev.title}</div>
                            <div className="text-[10px] text-gray-400 mt-1 font-mono">{ev.date} · {ev.time}</div>
                            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">{ev.desc}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setCalendarEvents(prev => prev.filter(e => e.id !== ev.id));
                          }}
                          className="p-1 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 17. MEDIA PLAYBACK */}
            {utility.type === 'media_playback' && (
              <div className="flex flex-col items-center py-4 gap-6 font-sans">
                {/* Vinyl/Cover Art Disc */}
                <div className="relative">
                  <div className={`w-36 h-36 rounded-full overflow-hidden border-4 border-slate-900 shadow-2xl relative flex items-center justify-center bg-black ${mediaPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}>
                    <img src={mediaTrack.cover} className="w-full h-full object-cover opacity-80" alt="album cover" />
                    {/* Vinyl Center Hole */}
                    <div className="absolute w-8 h-8 rounded-full bg-slate-950 border-4 border-slate-900 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white/80" />
                    </div>
                  </div>
                  {/* Floating music notes */}
                  {mediaPlaying && (
                    <div className="absolute -top-2 -right-2 text-indigo-400 animate-bounce">
                      <Music size={20} />
                    </div>
                  )}
                </div>

                {/* Track Metadata */}
                <div className="text-center px-4">
                  <h3 className="text-sm font-black text-white truncate max-w-xs">{mediaTrack.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-bold">{mediaTrack.artist}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase tracking-wider">{mediaTrack.album}</p>
                </div>

                {/* Timeline Slider */}
                <div className="w-full px-4">
                  <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-1 font-bold">
                    <span>0:54</span>
                    <span>{mediaTrack.duration}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mediaProgress}
                    onChange={(e) => setMediaProgress(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-white/10 rounded-lg appearance-none h-1"
                  />
                </div>

                {/* Audio Controls */}
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => {
                      setMediaTrack({
                        title: 'Sweety Lofi Coding Beats (Vol 3)',
                        artist: 'Synthesized Calm',
                        album: 'Workspace Focus Matrix',
                        duration: '4:12',
                        cover: 'https://images.unsplash.com/photo-1516116211223-5c359a36298a?auto=format&fit=crop&w=300&q=80'
                      });
                      setMediaProgress(0);
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full border border-white/5 transition-all active:scale-95"
                  >
                    <SkipBack size={16} />
                  </button>

                  <button 
                    onClick={() => setMediaPlaying(!mediaPlaying)}
                    className="p-5 bg-gradient-to-tr from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white rounded-full transition-all active:scale-90 shadow-lg shadow-indigo-500/20"
                  >
                    {mediaPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>

                  <button 
                    onClick={() => {
                      setMediaTrack({
                        title: 'Calm Down Academic Waves',
                        artist: 'Mindfulness Acoustic',
                        album: 'Alpha Rhythm Synthesizers',
                        duration: '5:20',
                        cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80'
                      });
                      setMediaProgress(0);
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full border border-white/5 transition-all active:scale-95"
                  >
                    <SkipForward size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* 18. BATTERY INFO */}
            {utility.type === 'battery' && (
              <div className="flex flex-col gap-5 font-sans py-2">
                <div className="flex justify-center items-center gap-6 p-5 bg-white/5 border border-white/5 rounded-3xl relative overflow-hidden">
                  {/* Radial indicator or big ring */}
                  <div className="w-24 h-24 rounded-full border-4 border-indigo-500/10 flex flex-col items-center justify-center relative bg-indigo-950/20 shadow-inner">
                    <div className="absolute inset-2 border-2 border-dashed border-pink-500/20 rounded-full animate-[spin_20s_linear_infinite]" />
                    <div className="text-2xl font-black text-white font-mono">{batteryLevel}%</div>
                    <div className="text-[8px] text-gray-400 uppercase tracking-widest font-bold">Capacity</div>
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                      <BatteryCharging size={16} className="text-emerald-400 animate-pulse" />
                      {isCharging ? 'CHARGING VIA AC SOURCE' : 'DISCHARGING - RUNNING ON ACCUMULATOR'}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Sweety smart diagnostics are optimizing battery health.
                    </p>
                    <div className="text-[10px] text-indigo-400 font-bold font-mono">Voltage: 3.82V · Current: 420mA</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-bold">Health Condition</div>
                    <div className="text-sm font-black text-emerald-400">98% Excellent</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">High degradation safety bounds.</div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-bold">Temperature</div>
                    <div className="text-sm font-black text-white font-mono">31.4 °C</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Optimal system cooling active.</div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-white">Power Optimization Level</div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-400">Background AI sleep throttling</span>
                    <span className="font-mono text-indigo-400 font-bold">Enabled</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-400">Safe Core CPU throttling (power save)</span>
                    <span className="font-mono text-gray-500 font-bold">Disabled</span>
                  </div>
                </div>
              </div>
            )}

            {/* 19. STORAGE INFO */}
            {utility.type === 'storage' && (
              <div className="flex flex-col gap-4 font-sans">
                <div className="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <div className="flex items-center gap-2 text-white">
                      <HardDrive size={16} className="text-indigo-400" />
                      <span>Sweety Disk Storage Unit</span>
                    </div>
                    <span className="font-mono text-pink-400">32% Used</span>
                  </div>

                  {/* Main storage progress bar */}
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5 flex">
                    <div className="h-full w-[12%] bg-pink-500 rounded-full" title="System (16 GB)" />
                    <div className="h-full w-[9%] bg-indigo-500 rounded-full ml-0.5" title="Apps (12 GB)" />
                    <div className="h-full w-[7%] bg-amber-500 rounded-full ml-0.5" title="Media (9 GB)" />
                    <div className="h-full w-[4%] bg-emerald-500 rounded-full ml-0.5" title="Documents (4 GB)" />
                  </div>

                  <div className="flex justify-between text-[11px] text-gray-400 font-bold">
                    <span>41 GB Used</span>
                    <span>87 GB Available (Total 128 GB)</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Storage Breakdown</div>
                  {[
                    { label: 'System Kernel Core', size: '16.0 GB', color: 'bg-pink-500', desc: 'Operating system firmware logs' },
                    { label: 'Installed Applications', size: '12.4 GB', color: 'bg-indigo-500', desc: 'Calculator, terminal, chrome, etc.' },
                    { label: 'Media Files (Gallery)', size: '9.1 GB', color: 'bg-amber-500', desc: 'Album pictures and camera captures' },
                    { label: 'Academic Syllabus & Docs', size: '4.2 GB', color: 'bg-emerald-500', desc: 'PDF, JSON metadata records' }
                  ].map((st, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${st.color}`} />
                        <div>
                          <div className="text-xs font-bold text-white">{st.label}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{st.desc}</div>
                        </div>
                      </div>
                      <div className="text-xs font-mono font-bold text-white">{st.size}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 20. INTERNET STATUS */}
            {utility.type === 'internet_status' && (
              <div className="flex flex-col gap-5 font-sans py-2">
                <div className="flex justify-center items-center gap-6 p-5 bg-white/5 border border-white/5 rounded-3xl relative overflow-hidden">
                  {/* Glowing Radar */}
                  <div className="w-20 h-20 rounded-full border border-emerald-500/20 flex items-center justify-center relative bg-emerald-950/10">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping opacity-30" />
                    <Wifi size={32} className="text-emerald-400 animate-pulse" />
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      System Online
                    </div>
                    <div className="text-sm font-black text-white truncate">Wifi-Sweety-LTE-Secure</div>
                    <div className="text-[10px] text-gray-400 leading-relaxed font-mono">Signal: Excellent (-48 dBm)</div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3 font-mono text-xs">
                  <div className="text-xs font-black font-sans text-gray-400 uppercase tracking-wider mb-1">Network Diagnostic parameters</div>
                  
                  <div className="flex justify-between items-center text-[11px] border-b border-white/5 pb-2">
                    <span className="text-gray-400">Connection Standard</span>
                    <span className="text-indigo-400 font-bold">WiFi 6 (IEEE 802.11ax)</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] border-b border-white/5 pb-2">
                    <span className="text-gray-400">Link Bandwidth Latency</span>
                    <span className="text-emerald-400 font-bold">14 ms (Stable)</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] border-b border-white/5 pb-2">
                    <span className="text-gray-400">Download Speed</span>
                    <span className="text-pink-400 font-bold">85.4 Mbps</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] border-b border-white/5 pb-2">
                    <span className="text-gray-400">Local IPv4 Gateway</span>
                    <span className="text-white">192.168.1.42</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-400">Public Address IP</span>
                    <span className="text-white">203.0.113.88</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-gray-400 font-bold bg-white/5 p-2.5 rounded-xl border border-white/5">
                  VPN ENCRYPTION TUNNEL: <span className="text-emerald-400">SECURED</span>
                </div>
              </div>
            )}

          </div>

          {/* Footer controls */}
          <div className="p-4 border-t border-white/5 bg-slate-950 flex justify-between items-center font-mono text-[10px] text-gray-500">
            <span>SECURE SYSTEM MODULE</span>
            <span>STATUS: ACTIVE ONLINE</span>
          </div>
        </motion.div>

        {/* Lightbox for Gallery/Photos */}
        <AnimatePresence>
          {lightboxImg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxImg(null)}
              className="fixed inset-0 z-[200000] bg-black/95 flex flex-col items-center justify-center p-4 cursor-pointer"
            >
              <div className="absolute top-6 right-6 text-white bg-white/5 p-2 rounded-full border border-white/10 hover:bg-white/10">
                <X size={20} />
              </div>
              <motion.img 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={lightboxImg} 
                className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/10 shadow-2xl" 
                alt="lightbox" 
              />
              <div className="mt-4 text-xs text-gray-400 font-bold uppercase tracking-widest bg-black/50 px-4 py-2 rounded-full border border-white/5 select-none">
                Captured Frame View
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
