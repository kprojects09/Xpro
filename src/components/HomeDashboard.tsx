import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { 
  BookOpen, Flame, CheckCircle, Clock, Play, GraduationCap, FileText, 
  Award, TrendingUp, Calendar, ChevronRight, Activity, Sparkles, BookMarked,
  Volume2, Shield, User, ArrowRight, Video, Calculator, BrainCircuit, Palette, CheckCircle2, AlertCircle, Bookmark, Megaphone, Menu,
  Smartphone, Battery, Wifi, HardDrive, AlarmClock, Music, Camera, FolderOpen
} from 'lucide-react';
import { Routine, AppLanguage } from '../types';
import { useLiveSettings } from '../lib/useLiveSettings';

interface HomeDashboardProps {
  currentUser: any;
  setActiveTab: (tab: 'home' | 'learn' | 'chat' | 'voice' | 'profile' | 'image_studio' | 'routine') => void;
  isVoiceActive: boolean;
  toggleSweety: () => void;
  routines: Routine[];
  language: AppLanguage;
  handleToggleCompleted: (routine: Routine) => Promise<void>;
  toggleDrawer: () => void;
  isAuthorizedDev?: boolean;
  isAdminViewActive?: boolean;
  onToggleAdmin?: () => void;
  setDeviceUtility?: (utility: { type: any; args?: any }) => void;
}

const DASH_TRANSLATIONS = {
  English: {
    greetingMorning: "Good Morning",
    greetingAfternoon: "Good Afternoon",
    greetingEvening: "Good Evening",
    subGreeting: "Your limitation—it's only your imagination. Today is another chance to master your fields with your real-time AI study partner.",
    activeCopilot: "Premium Study Mentor Active",
    streakLabel: "Study Streak",
    streakDays: "Days",
    progressLabel: "Study Progress",
    goalReached: "Goal Reached",
    pacingText: "Great pacing! Finish today's checklist to hit 100%.",
    todaysStudy: "Today's Study Dashboard",
    totalRoutines: "Total Today",
    completed: "Completed",
    pending: "Pending",
    missed: "Missed",
    noRoutinesToday: "No routines scheduled for today. Ready to plan some?",
    openPlanner: "Open Study Routine Planner",
    curriculumTools: "Curriculum & Quick Tools",
    studySubjects: "Study Subjects",
    exploreLearn: "Explore Learn",
    subjectsDesc: "Physics, Math, Chemistry & more.",
    aiChat: "Study AI Chat",
    openChat: "Open Chat",
    chatDesc: "PDF summarizer & text workspace.",
    pomodoro: "Pomodoro Timer",
    launchClock: "Launch Clock",
    pomodoroDesc: "Focus blocks with relaxing synth.",
    voicePartner: "AI Voice Partner",
    startCall: "Start Call",
    voiceDesc: "Real-time voice chatting with Sweety.",
    imageStudio: "AI Image Studio",
    openStudio: "Open Studio",
    imageDesc: "Design lo-fi rooms & chemistry sheets.",
    weeklyAnalytics: "Weekly Performance Analytics",
    limitHours: "6h limit",
    strongestSub: "Strongest Subject",
    weakestSub: "Weakest Subject",
    upcomingExams: "Upcoming Exams",
    inDays: "In",
    daysText: "Days",
    csBoardExam: "Computer Science Board Exam",
    csDesc: "Recursion & Data Structures.",
    mathTest: "Mathematics Semester Test",
    mathDesc: "Calculus and Trig integrations."
  },
  Bengali: {
    greetingMorning: "শুভ সকাল",
    greetingAfternoon: "শুভ অপরাহ্ন",
    greetingEvening: "শুভ সন্ধ্যা",
    subGreeting: "আপনার সীমাবদ্ধতা কেবল আপনার কল্পনায়। আপনার রিয়েল-টাইম এআই স্টাডি পার্টনারের সাথে আজ নতুন কিছু শেখার সুযোগ নিন।",
    activeCopilot: "প্রিমিয়াম স্টাডি কো-পাইলট সচল রয়েছে",
    streakLabel: "টানা পড়ার রেকর্ড",
    streakDays: "দিন",
    progressLabel: "আজকের অগ্রগতি",
    goalReached: "লক্ষ্য অর্জিত",
    pacingText: "দারুণ গতি! ১০০% সম্পূর্ণ করতে আজকের রুটিন সম্পন্ন করুন।",
    todaysStudy: "আজকের পড়াশোনা ড্যাশবোর্ড",
    totalRoutines: "আজকের মোট",
    completed: "সম্পন্ন",
    pending: "চলমান",
    missed: "মিসড",
    noRoutinesToday: "আজ কোনো রুটিন শিডিউল করা নেই। তৈরি করতে চান?",
    openPlanner: "রুটিন প্ল্যানার খুলুন",
    curriculumTools: "কারিকুলাম ও কুইক টুলস",
    studySubjects: "পড়াশোনার বিষয়",
    exploreLearn: "এক্সপ্লোর লার্ন",
    subjectsDesc: "পদার্থবিজ্ঞান, গণিত, রসায়ন ও অন্যান্য।",
    aiChat: "স্টাডি এআই চ্যাট",
    openChat: "চ্যাট খুলুন",
    chatDesc: "পিডিএফ সারসংক্ষেপ এবং লেখার ওয়ার্কস্পেস।",
    pomodoro: "পোমোডোরো টাইমার",
    launchClock: "ক্লক চালু করুন",
    pomodoroDesc: "রিলাক্সিং সিন্থ মিউজিক সহ ফোকাস ব্লক।",
    voicePartner: "এআই ভয়েস পার্টনার",
    startCall: "কল শুরু করুন",
    voiceDesc: "সুইটির সাথে রিয়েল-টাইম ভয়েস চ্যাটিং।",
    imageStudio: "এআই ইমেজ স্টুডিও",
    openStudio: "স্টুডিও খুলুন",
    imageDesc: "লো-ফাই রুম এবং রসায়নের শিট ডিজাইন করুন।",
    weeklyAnalytics: "সাপ্তাহিক পারফরম্যান্স অ্যানালিটিক্স",
    limitHours: "৬ ঘণ্টা সীমা",
    strongestSub: "সবচেয়ে শক্তিশালী বিষয়",
    weakestSub: "দুর্বলতম বিষয়",
    upcomingExams: "আসন্ন পরীক্ষা",
    inDays: "",
    daysText: "দিন পর",
    csBoardExam: "কম্পিউটার সায়েন্স বোর্ড পরীক্ষা",
    csDesc: "রিকার্সন এবং ডাটা স্ট্রাকচার।",
    mathTest: "গণিত সেমিস্টার টেস্ট",
    mathDesc: "ক্যালকুলাস ও ত্রিকোণমিতি ইন্টিগ্রেশন।"
  },
  Hindi: {
    greetingMorning: "सुप्रभात",
    greetingAfternoon: "शुभ दोपहर",
    greetingEvening: "शुभ संध्या",
    subGreeting: "आपकी सीमाएं केवल आपकी कल्पना में हैं। अपने रीयल-टाइम एआई अध्ययन साथी के साथ आज कुछ नया सीखें।",
    activeCopilot: "प्रीमियम अध्ययन को-पायलट सक्रिय है",
    streakLabel: "पढ़ाई का क्रम",
    streakDays: "दिन",
    progressLabel: "अध्ययन प्रगति",
    goalReached: "लक्ष्य पूरा",
    pacingText: "शानदार गति! १००% तक पहुंचने के लिए आज की सूची पूरी करें।",
    todaysStudy: "आज का अध्ययन डैशबोर्ड",
    totalRoutines: "आज का कुल",
    completed: "पूरा हुआ",
    pending: "लंबित",
    missed: "छूट गया",
    noRoutinesToday: "आज के लिए कोई दिनचर्या निर्धारित नहीं है। एक नई दिनचर्या बनाएं?",
    openPlanner: "दिनचर्या योजनाकार खोलें",
    curriculumTools: "पाठ्यक्रम और त्वरित उपकरण",
    studySubjects: "अध्ययन विषय",
    exploreLearn: "अध्ययन का अन्वेषण करें",
    subjectsDesc: "भौतिकी, गणित, रसायन विज्ञान और अधिक।",
    aiChat: "एआई अध्ययन चैट",
    openChat: "चैट खोलें",
    chatDesc: "पीडीएफ सारांश और टेक्स्ट वर्कस्पेस।",
    pomodoro: "पोमोडोरो टाइमर",
    launchClock: "घड़ी शुरू करें",
    pomodoroDesc: "आरामदायक सिंथ संगीत के साथ ध्यान केंद्रित करें।",
    voicePartner: "एआई वॉयस साथी",
    startCall: "कॉल शुरू करें",
    voiceDesc: "स्वीटी के साथ रीयल-टाइम वॉयस चैटिंग।",
    imageStudio: "एआई इमेज स्टूडियो",
    openStudio: "स्टूडियो खोलें",
    imageDesc: "लो-फाई कमरे और रसायन विज्ञान शीट डिजाइन करें।",
    weeklyAnalytics: "साप्ताहिक प्रदर्शन विश्लेषण",
    limitHours: "6 घंटे की सीमा",
    strongestSub: "सबसे मजबूत विषय",
    weakestSub: "सबसे कमजोर विषय",
    upcomingExams: "आगामी परीक्षाएं",
    inDays: "में",
    daysText: "दिन",
    csBoardExam: "कंप्यूटर विज्ञान बोर्ड परीक्षा",
    csDesc: "रिकर्सन और डेटा संरचनाएं।",
    mathTest: "गणित सेमेस्टर परीक्षा",
    mathDesc: "कैलकुलस और त्रिकोणमिति एकीकरण।"
  }
};

export function HomeDashboard({
  currentUser, 
  setActiveTab, 
  isVoiceActive,
  toggleSweety,
  routines,
  language,
  handleToggleCompleted,
  toggleDrawer,
  isAuthorizedDev = false,
  isAdminViewActive = false,
  onToggleAdmin,
  setDeviceUtility
}: HomeDashboardProps) {
  const { appSettings } = useLiveSettings();
  const dt = DASH_TRANSLATIONS[language] || DASH_TRANSLATIONS.English;
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(3));
    const unsub = onSnapshot(q, snap => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => { console.warn("Announcements sync delayed:", err); });
    return () => unsub();
  }, []);

  // --- Dynamic Stats Computations ---
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRoutines = routines.filter(r => r.date === todayStr);
  const completedToday = todayRoutines.filter(r => r.completed);
  const missedToday = todayRoutines.filter(r => r.missed);
  const pendingToday = todayRoutines.filter(r => !r.completed && !r.missed);
  
  const dailyGoalPercent = todayRoutines.length > 0 
    ? Math.round((completedToday.length / todayRoutines.length) * 100) 
    : 0;

  // Compute Dynamic Streak
  const computeStreak = () => {
    const completedDates = Array.from(new Set(
      routines.filter(r => r.completed).map(r => r.date)
    )).sort((a, b) => b.localeCompare(a));

    if (completedDates.length === 0) return 0;

    let streakCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    if (!completedDates.includes(todayString) && !completedDates.includes(yesterdayString)) {
      return 0;
    }

    let currentCheck = completedDates.includes(todayString) ? today : yesterday;
    
    while (streakCount < 1000) {
      const currentStr = currentCheck.toISOString().split('T')[0];
      if (completedDates.includes(currentStr)) {
        streakCount++;
        currentCheck.setDate(currentCheck.getDate() - 1);
      } else {
        break;
      }
    }
    return streakCount;
  };

  const streak = computeStreak();

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return dt.greetingMorning;
    if (hour < 17) return dt.greetingAfternoon;
    return dt.greetingEvening;
  };

  const username = currentUser?.email ? currentUser.email.split('@')[0] : 'Krish';
  const displayUsername = username.charAt(0).toUpperCase() + username.slice(1);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-32 text-white">
      
      <div className="flex items-center justify-between">
        <button 
          onClick={toggleDrawer}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <Menu size={24} />
        </button>

        {isAuthorizedDev && onToggleAdmin && (
          <button 
            onClick={onToggleAdmin}
            className="flex items-center gap-2 px-4 py-2.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-lg"
          >
            <Shield size={16} />
            Switch to Admin Panel
          </button>
        )}
      </div>

      {/* 1. Header Greeting Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-purple-900/45 via-indigo-950/45 to-pink-900/35 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 blur-[20px] rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/10 blur-[20px] rounded-full -ml-16 -mb-16 pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-pink-400 font-semibold tracking-wider text-sm uppercase">
            <Sparkles size={16} className="animate-pulse" />
            <span>{dt.activeCopilot}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-200">
            {getGreeting()}, {displayUsername}!
          </h2>
          <p className="text-gray-300 font-medium max-w-xl leading-relaxed">
            "{dt.subGreeting}"
          </p>
        </div>

        {/* Quick Streak Widget */}
        <div className="flex gap-4 relative z-10">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-none shadow-xl">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Flame size={24} className="animate-bounce" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono">{streak} {dt.streakDays}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{dt.streakLabel}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Announcements Block */}
      <AnimatePresence>
        {announcements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {announcements.map((ann, i) => (
              <motion.div 
                key={ann.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 items-start shadow-xl"
              >
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-full mt-1">
                  <Megaphone size={16} />
                </div>
                <div>
                  <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">Live Announcement</h4>
                  <p className="text-sm text-gray-200 leading-relaxed">{ann.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Audio/Voice Assistant Quick Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-3xl bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/10 border border-pink-500/25 shadow-xl relative overflow-hidden backdrop-blur-none flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-indigo-500/5 animate-pulse pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-pink-500/30">
              <Volume2 size={22} className={isVoiceActive ? "animate-ping" : ""} />
            </div>
            {isVoiceActive && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              Voice Assistant
              <span className="text-[10px] bg-pink-500/25 text-pink-300 font-semibold px-2 py-0.5 rounded-full border border-pink-500/30 uppercase tracking-widest font-mono">
                {isVoiceActive ? 'CONNECTED' : 'IDLE'}
              </span>
            </h3>
            <p className="text-xs text-gray-300">
              {isVoiceActive ? "Listening dynamically. Speak to ask questions, solve math, or quiz yourself!" : "Tap to join the real-time voice study session. Supports romanized Bengali & instant analysis!"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 relative z-10 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('voice')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 active:scale-95 border border-white/20 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-2xl transition-all cursor-pointer"
          >
            Open Screen
          </button>
          <button 
            onClick={() => {
              if (!isVoiceActive) {
                setActiveTab('voice');
                toggleSweety();
              } else {
                toggleSweety();
              }
            }}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider py-2.5 px-6 rounded-2xl transition-all active:scale-95 cursor-pointer shadow-lg ${
              isVoiceActive 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 border border-rose-400/30' 
                : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white shadow-pink-500/20'
            }`}
          >
            {isVoiceActive ? '[ DISCONNECT ]' : '[ START VOICE SESSION ]'}
          </button>
        </div>
      </motion.div>

      {/* 3. Metrics & Progress Row (Today's Study section) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Progress Tracker Ring Card */}
        <motion.div 
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-none shadow-xl flex flex-col items-center justify-between text-center gap-4"
        >
          <div className="w-full flex items-center justify-between border-b border-white/5 pb-2 text-left">
            <span className="font-bold text-sm tracking-wide uppercase text-indigo-300">{dt.progressLabel}</span>
            <TrendingUp size={16} className="text-indigo-400" />
          </div>

          {/* Interactive Progress Circle */}
          <div className="relative w-36 h-36 flex items-center justify-center my-2">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="58" className="stroke-white/5 stroke-[8] fill-none" />
              <circle 
                cx="72" 
                cy="72" 
                r="58" 
                className="stroke-indigo-500 stroke-[8] fill-none transition-all duration-1000 ease-out" 
                strokeDasharray={2 * Math.PI * 58}
                strokeDashoffset={2 * Math.PI * 58 * (1 - dailyGoalPercent / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold font-mono">{dailyGoalPercent}%</span>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{dt.goalReached}</span>
            </div>
          </div>

          <div className="text-xs text-gray-300 font-medium">
            {dt.pacingText}
          </div>
        </motion.div>

        {/* Dynamic Study Routines Checklist */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-none shadow-xl flex flex-col justify-between gap-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
            <span className="font-bold text-sm tracking-wide uppercase text-pink-300">{dt.todaysStudy}</span>
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[9px] text-gray-400 font-bold uppercase font-mono bg-white/5 px-2 py-0.5 rounded">
                {dt.totalRoutines}: {todayRoutines.length}
              </span>
              <span className="text-[9px] text-emerald-400 font-bold uppercase font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                {dt.completed}: {completedToday.length}
              </span>
              {missedToday.length > 0 && (
                <span className="text-[9px] text-rose-400 font-bold uppercase font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10">
                  {dt.missed}: {missedToday.length}
                </span>
              )}
            </div>
          </div>

          {/* Routines loop for today */}
          <div className="space-y-2.5 my-2 max-h-[160px] overflow-y-auto pr-1">
            {todayRoutines.length === 0 ? (
              <div className="py-8 text-center text-gray-400 flex flex-col items-center gap-2">
                <Bookmark size={28} className="text-pink-400/40" />
                <span className="text-xs font-semibold">{dt.noRoutinesToday}</span>
              </div>
            ) : (
              todayRoutines.map(routine => {
                const isComp = routine.completed;
                const isMissed = routine.missed;
                return (
                  <div 
                    key={routine.id}
                    onClick={() => handleToggleCompleted(routine)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isComp 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-gray-400 line-through' 
                        : isMissed
                          ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isComp ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/30'
                      }`}>
                        {isComp && <CheckCircle2 size={14} className="stroke-[3]" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">{routine.title}</span>
                        <span className="text-[9px] opacity-65 font-mono">{routine.subject} • {routine.startTime} - {routine.endTime}</span>
                      </div>
                    </div>
                    {isMissed && !isComp && (
                      <span className="text-[8px] bg-rose-500/20 text-rose-400 font-bold uppercase px-1.5 py-0.5 rounded">
                        {dt.missed}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Shortcut Button to Routine Page */}
          <button 
            onClick={() => setActiveTab('routine')}
            className="w-full text-center border border-pink-500/20 hover:border-pink-500/40 hover:bg-pink-500/5 transition-all text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl cursor-pointer text-pink-300"
          >
            {dt.openPlanner}
          </button>
        </motion.div>
      </div>

      {/* 4. Bento Grid: Subjects & Quick Tools */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold uppercase tracking-wider text-purple-300">{dt.curriculumTools}</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          
          {/* Subjects Card */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => setActiveTab('learn')}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/35 transition-all shadow-lg flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit">
              <BookOpen size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm">{dt.studySubjects}</h4>
              <p className="text-[10px] text-gray-400 mt-1">{dt.subjectsDesc}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-purple-300 font-bold uppercase mt-2">
              <span>{dt.exploreLearn}</span>
              <ChevronRight size={12} />
            </div>
          </motion.div>

          {/* Chat GPT Card */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => setActiveTab('chat')}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/35 transition-all shadow-lg flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl w-fit">
              <BrainCircuit size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm">{dt.aiChat}</h4>
              <p className="text-[10px] text-gray-400 mt-1">{dt.chatDesc}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-pink-300 font-bold uppercase mt-2">
              <span>{dt.openChat}</span>
              <ChevronRight size={12} />
            </div>
          </motion.div>

          {/* Study Timer Card */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => setActiveTab('learn')}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/35 transition-all shadow-lg flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm">{dt.pomodoro}</h4>
              <p className="text-[10px] text-gray-400 mt-1">{dt.pomodoroDesc}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-indigo-300 font-bold uppercase mt-2">
              <span>{dt.launchClock}</span>
              <ChevronRight size={12} />
            </div>
          </motion.div>

          {/* AI Voice Partner Card */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => setActiveTab('voice')}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/35 transition-all shadow-lg flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl w-fit">
              <Volume2 size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm">{dt.voicePartner}</h4>
              <p className="text-[10px] text-gray-400 mt-1">{dt.voiceDesc.replace('Sweety', appSettings.aiAssistantName || 'Sweety')}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-pink-300 font-bold uppercase mt-2">
              <span>{dt.startCall}</span>
              <ChevronRight size={12} />
            </div>
          </motion.div>

          {/* AI Image Studio Card */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => setActiveTab('image_studio')}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/35 transition-all shadow-lg flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="p-3 bg-gradient-to-tr from-indigo-500/15 to-pink-500/15 text-pink-400 rounded-xl w-fit">
              <Palette size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm">{dt.imageStudio}</h4>
              <p className="text-[10px] text-gray-400 mt-1">{dt.imageDesc}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-pink-300 font-bold uppercase mt-2">
              <span>{dt.openStudio}</span>
              <ChevronRight size={12} />
            </div>
          </motion.div>

        </div>
      </div>

      {/* Sweety Phone Control & Assistant Hub */}
      {setDeviceUtility && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
              <Smartphone size={20} className="text-pink-400" />
              <span>Phone Control & Assistant Utilities</span>
            </h3>
            <span className="text-[10px] font-mono font-bold uppercase text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
              Active Control Centre
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { type: 'alarm', label: 'Alarms', icon: AlarmClock, color: 'text-pink-400 bg-pink-500/10', desc: 'Set & manage active sleep alarms' },
              { type: 'reminder', label: 'Reminders', icon: CheckCircle, color: 'text-indigo-400 bg-indigo-500/10', desc: 'Create priority lists & reminders' },
              { type: 'calendar', label: 'Academic Events', icon: Calendar, color: 'text-purple-400 bg-purple-500/10', desc: 'Schedule curriculum & school tasks' },
              { type: 'media_playback', label: 'Lofi Player', icon: Music, color: 'text-amber-400 bg-amber-500/10', desc: 'Vinyl study streams with Sweety' },
              { type: 'battery', label: 'Battery Health', icon: Battery, color: 'text-emerald-400 bg-emerald-500/10', desc: 'Voltage & optimization logs' },
              { type: 'storage', label: 'Storage', icon: HardDrive, color: 'text-blue-400 bg-blue-500/10', desc: 'FHD internal & metadata disks' },
              { type: 'internet_status', label: 'Internet Standard', icon: Wifi, color: 'text-teal-400 bg-teal-500/10', desc: 'Safe VPN connection & latency' },
              { type: 'calculator', label: 'Scientific Calc', icon: Calculator, color: 'text-cyan-400 bg-cyan-500/10', desc: 'Resolve math formulas instantly' },
              { type: 'camera', label: 'Camera Roll', icon: Camera, color: 'text-rose-400 bg-rose-500/10', desc: 'Capture snaps & toggle flash options' },
              { type: 'gallery', label: 'FHD Gallery', icon: FolderOpen, color: 'text-yellow-400 bg-yellow-500/10', desc: 'Review captures in beautiful lightbox' }
            ].map((ut, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.03, y: -4 }}
                onClick={() => setDeviceUtility({ type: ut.type })}
                className="p-4.5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all shadow-lg flex flex-col justify-between gap-3 cursor-pointer group"
              >
                <div className={`p-2.5 rounded-xl w-fit ${ut.color} group-hover:scale-110 transition-transform`}>
                  <ut.icon size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white tracking-wide group-hover:text-indigo-300 transition-colors">{ut.label}</h4>
                  <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{ut.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-indigo-300 font-bold uppercase tracking-wider">
                  <span>Launch Tool</span>
                  <ChevronRight size={10} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Mock Tests, Exams & Performance Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Performance Analytics Column */}
        <div className="md:col-span-2 rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-none shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="font-bold text-sm tracking-wide uppercase text-indigo-300">{dt.weeklyAnalytics}</span>
            <Activity size={16} className="text-indigo-400 animate-pulse" />
          </div>

          {/* Clean Mock SVG Bar Graph showing study hours */}
          <div className="relative h-44 flex items-end justify-between gap-2.5 pt-4">
            <div className="absolute top-0 left-0 text-[10px] text-gray-500 font-semibold font-mono">{dt.limitHours}</div>
            <div className="absolute bottom-1/2 left-0 w-full border-t border-white/5 border-dashed pointer-events-none" />

            {/* Bars */}
            {[]?.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 italic">No activity data yet</div>
            ) : [].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full bg-slate-900 border border-white/10 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold transition-all mb-1 pointer-events-none z-10">
                  {bar.hours} Hours
                </div>
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${(bar.hours / 7) * 100}%` }}
                  transition={{ duration: 1, delay: i * 0.05, ease: "easeOut" }}
                  className="w-full rounded-t-lg shadow-lg relative overflow-hidden"
                  style={{ backgroundColor: bar.color }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/10" />
                </motion.div>
                <span className="text-[10px] font-bold font-mono text-gray-400">{bar.day}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center items-center bg-white/5 border border-white/5 rounded-2xl p-3 text-xs text-gray-500 italic">
            No subject performance data
          </div>
        </div>

        {/* Upcoming Exams Card */}
        <div className="rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-none shadow-xl flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="font-bold text-sm tracking-wide uppercase text-pink-300">{dt.upcomingExams}</span>
            <Calendar size={16} className="text-pink-400" />
          </div>

          <div className="space-y-4 my-2 flex-1">
            <div className="py-8 text-center text-gray-500 text-xs italic">No upcoming exams</div>
          </div>

          <button 
            onClick={() => setActiveTab('routine')}
            className="w-full text-center border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl cursor-pointer"
          >
            {dt.openPlanner}
          </button>
        </div>
      </div>

    </div>
  );
}

