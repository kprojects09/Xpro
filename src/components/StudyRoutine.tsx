import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Clock, Plus, Trash2, Edit3, Copy, CheckCircle, 
  ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Bookmark, Sparkles, X, Info
} from 'lucide-react';
import { db } from '../firebase';
import { permissionManager } from '../lib/permissionManager';
import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Routine, AppLanguage } from '../types';

interface StudyRoutineProps {
  currentUser: any;
  language: AppLanguage;
  addSystemLog: (log: string) => void;
}

const TRANSLATIONS = {
  English: {
    routineTitle: "Study Routine",
    addRoutine: "Add Routine",
    editRoutine: "Edit Routine",
    duplicateRoutine: "Duplicate Routine",
    delete: "Delete",
    save: "Save Routine",
    cancel: "Cancel",
    subject: "Subject",
    title: "Routine Title",
    description: "Description",
    date: "Date",
    startTime: "Start Time",
    endTime: "End Time",
    priority: "Priority",
    repeat: "Repeat",
    reminderTime: "Reminder Time",
    completed: "Completed",
    pending: "Pending",
    missed: "Missed",
    noRoutines: "No study routine scheduled for this day.",
    high: "High",
    medium: "Medium",
    low: "Low",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    custom: "Custom",
    atTime: "At Time",
    min5: "5 mins before",
    min10: "10 mins before",
    min15: "15 mins before",
    min30: "30 mins before",
    hour1: "1 hour before",
    todayStudy: "Today's Study",
    streak: "Streak",
    progress: "Daily Progress",
    upcoming: "Upcoming",
    quickAdd: "Quick Add",
    allDays: "All Routines List",
    selectDate: "Select Date",
    subjectPlaceholder: "e.g., Physics, Calculus",
    titlePlaceholder: "e.g., Chapter 4 Revision",
    descPlaceholder: "e.g., Solve practice papers & notes",
    streakDays: "Days",
  },
  Bengali: {
    routineTitle: "পড়াশোনার রুটিন",
    addRoutine: "রুটিন যুক্ত করুন",
    editRoutine: "রুটিন পরিবর্তন করুন",
    duplicateRoutine: "ডুপ্লিকেট করুন",
    delete: "মুছে ফেলুন",
    save: "রুটিন সংরক্ষণ করুন",
    cancel: "বাতিল করুন",
    subject: "বিষয়",
    title: "রুটিনের শিরোনাম",
    description: "বিবরণ",
    date: "তারিখ",
    startTime: "শুরুর সময়",
    endTime: "শেষের সময়",
    priority: "অগ্রাধিকার",
    repeat: "পুনরাবৃত্তি",
    reminderTime: "স্মারক সময়",
    completed: "সম্পন্ন",
    pending: "চলমান",
    missed: "মিসড",
    noRoutines: "এই দিনে কোনো পড়াশোনার রুটিন নেই।",
    high: "উচ্চ",
    medium: "মাঝারি",
    low: "নিম্ন",
    daily: "দৈনিক",
    weekly: "সাপ্তাহিক",
    monthly: "মাসিক",
    custom: "কাস্টম",
    atTime: "ঠিক সময়ে",
    min5: "৫ মিনিট আগে",
    min10: "১০ মিনিট আগে",
    min15: "১৫ মিনিট আগে",
    min30: "৩০ মিনিট আগে",
    hour1: "১ ঘণ্টা আগে",
    todayStudy: "আজকের পড়াশোনা",
    streak: "টানা পড়ার রেকর্ড",
    progress: "আজকের অগ্রগতি",
    upcoming: "আসন্ন রুটিন",
    quickAdd: "দ্রুত যোগ করুন",
    allDays: "সব রুটিনের তালিকা",
    selectDate: "তারিখ নির্বাচন",
    subjectPlaceholder: "উদাঃ পদার্থবিজ্ঞান, গণিত",
    titlePlaceholder: "উদাঃ অধ্যায় ৪ রিভিশন",
    descPlaceholder: "উদাঃ প্র্যাকটিস পেপার ও নোটস পড়া",
    streakDays: "দিন",
  },
  Hindi: {
    routineTitle: "अध्ययन दिनचर्या",
    addRoutine: "दिनचर्या जोड़ें",
    editRoutine: "दिनचर्या संपादित करें",
    duplicateRoutine: "डुप्लिकेट करें",
    delete: "हटाएं",
    save: "दिनचर्या सहेजें",
    cancel: "रद्द करें",
    subject: "विषय",
    title: "दिनचर्या का शीर्षक",
    description: "विवरण",
    date: "तारीख",
    startTime: "शुरू होने का समय",
    endTime: "समाप्ति समय",
    priority: "प्राथमिकता",
    repeat: "दहराएं",
    reminderTime: "अनुस्मारक समय",
    completed: "पूरा हुआ",
    pending: "लंबित",
    missed: "छूट गया",
    noRoutines: "इस दिन के लिए कोई अध्ययन दिनचर्या निर्धारित नहीं है।",
    high: "उच्च",
    medium: "मध्यम",
    low: "निम्न",
    daily: "दैनिक",
    weekly: "साप्ताहिक",
    monthly: "मासिक",
    custom: "कस्टम",
    atTime: "उसी समय",
    min5: "5 मिनट पहले",
    min10: "10 मिनट पहले",
    min15: "15 मिनट पहले",
    min30: "30 मिनट पहले",
    hour1: "1 घंटा पहले",
    todayStudy: "आज का अध्ययन",
    streak: "लगातार पढ़ाई",
    progress: "दैनिक प्रगति",
    upcoming: "आगामी",
    quickAdd: "त्वरित जोड़ें",
    allDays: "सभी दिनचर्या सूची",
    selectDate: "तारीख चुनें",
    subjectPlaceholder: "उदा. भौतिकी, गणित",
    titlePlaceholder: "उदा. अध्याय 4 संशोधन",
    descPlaceholder: "उदा. अभ्यास पत्र और नोट्स पढ़ना",
    streakDays: "दिन",
  }
};

const SUBJECT_THEMES: Record<string, string> = {
  physics: "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-300",
  chemistry: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300",
  mathematics: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-300",
  math: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-300",
  calculus: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-300",
  biology: "from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-300",
  english: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300",
  general: "from-slate-500/20 to-zinc-500/10 border-slate-500/30 text-slate-300"
};

export function StudyRoutine({ currentUser, language, addSystemLog }: StudyRoutineProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.English;

  // State
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'duplicate'>('add');
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  
  const [formSubject, setFormSubject] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formPriority, setFormPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [formRepeat, setFormRepeat] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom'>('Daily');
  const [formReminderTime, setFormReminderTime] = useState<'At Time' | '5 min' | '10 min' | '15 min' | '30 min' | '1 hour'>('5 min');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch routines from cloud
  const fetchRoutines = async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const q = query(collection(db, 'users', currentUser.uid, 'routines'));
      const querySnapshot = await getDocs(q);
      const list: Routine[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Routine);
      });
      
      // Compute status (missed) dynamically based on current time
      const now = new Date();
      const updatedList = list.map(r => {
        const [hour, min] = r.endTime.split(':').map(Number);
        const rDate = new Date(r.date);
        rDate.setHours(hour, min, 0, 0);
        const isPastStr = rDate < now;
        return {
          ...r,
          missed: !r.completed && isPastStr
        };
      });

      setRoutines(updatedList);
    } catch (err: any) {
      console.error("Error fetching routines:", err);
      addSystemLog(`[DB_ERROR] Failed to fetch routines: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
    
    // Check Notification Permissions
    if ('Notification' in window && Notification.permission === 'default') {
      permissionManager.requestPermission('notifications', 'Push Notifications', 'XPRO AGENT needs notification access to remind you about your upcoming study routines.');
    }
  }, [currentUser]);

  // Open Add Modal
  const openAddModal = (dateStr: string = selectedDate) => {
    setModalMode('add');
    setEditingRoutine(null);
    setFormSubject('');
    setFormTitle('');
    setFormDescription('');
    setFormDate(dateStr);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormPriority('Medium');
    setFormRepeat('Daily');
    setFormReminderTime('5 min');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (routine: Routine) => {
    setModalMode('edit');
    setEditingRoutine(routine);
    setFormSubject(routine.subject);
    setFormTitle(routine.title);
    setFormDescription(routine.description);
    setFormDate(routine.date);
    setFormStartTime(routine.startTime);
    setFormEndTime(routine.endTime);
    setFormPriority(routine.priority);
    setFormRepeat(routine.repeat);
    setFormReminderTime(routine.reminderTime);
    setIsModalOpen(true);
  };

  // Open Duplicate Modal
  const openDuplicateModal = (routine: Routine) => {
    setModalMode('duplicate');
    setEditingRoutine(routine);
    setFormSubject(routine.subject);
    setFormTitle(routine.title + " (Copy)");
    setFormDescription(routine.description);
    setFormDate(routine.date);
    setFormStartTime(routine.startTime);
    setFormEndTime(routine.endTime);
    setFormPriority(routine.priority);
    setFormRepeat(routine.repeat);
    setFormReminderTime(routine.reminderTime);
    setIsModalOpen(true);
  };

  // Save / Update Routine
  const handleSaveRoutine = async () => {
    if (!currentUser) return;
    if (!formSubject.trim() || !formTitle.trim() || !formDate) {
      alert("Please fill Subject, Title and Date fields!");
      return;
    }

    try {
      const routineId = modalMode === 'edit' && editingRoutine ? editingRoutine.id : `routine_${Date.now()}`;
      const docRef = doc(db, 'users', currentUser.uid, 'routines', routineId);

      const payload: Omit<Routine, 'id'> = {
        userId: currentUser.uid,
        subject: formSubject.trim(),
        title: formTitle.trim(),
        description: formDescription.trim(),
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        priority: formPriority,
        repeat: formRepeat,
        reminderTime: formReminderTime,
        completed: modalMode === 'edit' && editingRoutine ? editingRoutine.completed : false,
        createdAt: modalMode === 'edit' && editingRoutine ? editingRoutine.createdAt : new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge: true });
      addSystemLog(`[ROUTINE] Routine "${payload.title}" saved successfully.`);
      setIsModalOpen(false);
      fetchRoutines();
    } catch (err: any) {
      console.error("Error saving routine:", err);
      alert(`Failed to save routine: ${err.message}`);
    }
  };

  // Delete Routine
  const handleDeleteRoutine = async (routineId: string) => {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to delete this study routine?")) return;

    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'routines', routineId));
      addSystemLog(`[ROUTINE] Routine deleted.`);
      fetchRoutines();
    } catch (err: any) {
      console.error("Error deleting routine:", err);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleDuplicateRoutine = async (routine: Routine) => {
    if (!currentUser) return;
    try {
      const newId = Date.now().toString();
      const duplicateData = {
        ...routine,
        id: newId,
        title: `${routine.title} (Copy)`,
        completed: false
      };
      await setDoc(doc(db, 'users', currentUser.uid, 'routines', newId), duplicateData);
      addSystemLog(`[ROUTINE] Duplicated routine "${routine.title}".`);
      fetchRoutines();
    } catch (err: any) {
      console.error("Error duplicating routine:", err);
    }
  };

  // Toggle Completed Status
  const handleToggleCompleted = async (routine: Routine) => {
    if (!currentUser) return;
    try {
      const updatedStatus = !routine.completed;
      const docRef = doc(db, 'users', currentUser.uid, 'routines', routine.id);
      await setDoc(docRef, { completed: updatedStatus }, { merge: true });
      addSystemLog(`[ROUTINE] Marked "${routine.title}" as ${updatedStatus ? 'Completed' : 'Pending'}`);
      
      // Optimistic update
      setRoutines(prev => prev.map(r => r.id === routine.id ? { ...r, completed: updatedStatus, missed: updatedStatus ? false : r.missed } : r));
    } catch (err: any) {
      console.error("Error toggling completion:", err);
    }
  };

  // Month navigation helpers
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Generate Calendar Days
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(dayStr);
    }
    return days;
  };

  const calendarDays = getDaysInMonth();
  const monthName = currentMonth.toLocaleString(language === 'Bengali' ? 'bn-BD' : language === 'Hindi' ? 'hi-IN' : 'en-US', { month: 'long', year: 'numeric' });

  // Filter routines for selected date
  const selectedDateRoutines = routines.filter(r => r.date === selectedDate);

  // Get status class for background colors
  const getSubjectStyle = (sub: string) => {
    const s = sub.toLowerCase();
    for (const key in SUBJECT_THEMES) {
      if (s.includes(key)) return SUBJECT_THEMES[key];
    }
    return SUBJECT_THEMES.general;
  };

  // Count routines of each state on a date
  const getDateStatusSummary = (dateStr: string) => {
    const dayRoutines = routines.filter(r => r.date === dateStr);
    if (dayRoutines.length === 0) return null;
    
    const completed = dayRoutines.filter(r => r.completed).length;
    const missed = dayRoutines.filter(r => r.missed).length;
    const total = dayRoutines.length;
    
    if (completed === total) return 'completed';
    if (missed > 0) return 'missed';
    return 'pending';
  };

  return (
    <div className="w-full space-y-6 pb-32 text-white">
      
      {/* Page Title Tag */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-pink-400 uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            <Sparkles size={12} className="animate-pulse" />
            <span>Premium Task Orchestrator</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-200">
            {t.routineTitle}
          </h2>
        </div>
        <button
          onClick={() => openAddModal(selectedDate)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:brightness-110 active:scale-95 transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xl shadow-purple-500/20"
        >
          <Plus size={15} className="stroke-[3]" />
          <span>{t.addRoutine}</span>
        </button>
      </div>

      {/* Grid Layout: Calendar on Left, Routines List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MONTHLY CALENDAR CARD (lg:col-span-7) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl relative overflow-hidden flex flex-col gap-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-pink-500/10 text-pink-400 rounded-xl">
                <CalendarIcon size={18} />
              </div>
              <span className="font-extrabold text-sm uppercase tracking-wider text-pink-300">{monthName}</span>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={prevMonth}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={nextMonth}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Titles */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <div key={idx} className="py-1">{day}</div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square opacity-0 pointer-events-none" />;
              }

              const isSelected = day === selectedDate;
              const status = getDateStatusSummary(day);
              const dateObj = new Date(day);
              const dayNum = dateObj.getDate();
              
              let statusIndicatorClass = "";
              if (status === 'completed') statusIndicatorClass = "bg-emerald-500 shadow-[0_0_8px_#10b981]";
              else if (status === 'missed') statusIndicatorClass = "bg-rose-500 shadow-[0_0_8px_#f43f5e]";
              else if (status === 'pending') statusIndicatorClass = "bg-amber-500 shadow-[0_0_8px_#f59e0b]";

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-xl p-1.5 flex flex-col justify-between items-center relative transition-all duration-300 cursor-pointer ${
                    isSelected 
                      ? 'bg-purple-600/40 border border-purple-500 shadow-lg scale-105' 
                      : 'bg-white/5 border border-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className={`text-xs font-black font-mono ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {dayNum}
                  </span>

                  {/* Tiny dot indicators for tasks status */}
                  {status && (
                    <span className={`w-2 h-2 rounded-full ${statusIndicatorClass}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Color Legend */}
          <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-t border-white/5 pt-3.5 mt-2 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              <span>{t.completed}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
              <span>{t.pending}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
              <span>{t.missed}</span>
            </div>
          </div>
        </motion.div>

        {/* DAY'S ROUTINE DETAIL LIST (lg:col-span-5) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col gap-4"
        >
          {/* Header info */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-purple-400" />
              <span className="font-extrabold text-sm uppercase tracking-wider text-purple-300">
                {selectedDate === new Date().toISOString().split('T')[0] ? "Today's Plan" : selectedDate}
              </span>
            </div>
            <span className="text-[10px] bg-white/5 px-2.5 py-1 rounded-lg text-gray-400 font-bold uppercase font-mono">
              Routines: {selectedDateRoutines.length}
            </span>
          </div>

          {/* Routine items loop */}
          <div className="space-y-3.5 flex-1 max-h-[420px] overflow-y-auto pr-1">
            {selectedDateRoutines.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-gray-400 space-y-3">
                <Info size={36} className="opacity-40 text-purple-400" />
                <p className="text-xs font-semibold leading-relaxed max-w-xs">{t.noRoutines}</p>
                <button
                  onClick={() => openAddModal(selectedDate)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Create One Now
                </button>
              </div>
            ) : (
              selectedDateRoutines.map((routine) => {
                const isCompleted = routine.completed;
                const isMissed = routine.missed;
                
                let priorityColor = "text-blue-400 border-blue-400/20 bg-blue-500/10";
                if (routine.priority === 'High') priorityColor = "text-rose-400 border-rose-400/20 bg-rose-500/10";
                else if (routine.priority === 'Medium') priorityColor = "text-amber-400 border-amber-400/20 bg-amber-500/10";

                return (
                  <motion.div
                    key={routine.id}
                    layoutId={`routine-card-${routine.id}`}
                    className={`p-4 border rounded-2xl flex flex-col gap-3 relative overflow-hidden transition-all duration-300 bg-gradient-to-r ${getSubjectStyle(routine.subject)}`}
                  >
                    {/* Tiny background accent line */}
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-purple-600" />

                    <div className="flex items-start justify-between gap-2 pl-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-white">
                            {routine.subject}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityColor}`}>
                            {routine.priority}
                          </span>
                        </div>
                        <h4 className={`text-sm font-extrabold leading-tight ${isCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {routine.title}
                        </h4>
                        {routine.description && (
                          <p className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">
                            {routine.description}
                          </p>
                        )}
                      </div>

                      {/* Complete Check button */}
                      <button
                        onClick={() => handleToggleCompleted(routine)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isCompleted 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <CheckCircle size={16} className="stroke-[3]" />
                      </button>
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2.5 pl-2 text-[10px] font-bold font-mono text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-purple-400" />
                        <span>{routine.startTime} - {routine.endTime}</span>
                        {routine.repeat !== 'Custom' && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded border border-white/5 uppercase">
                            {routine.repeat}
                          </span>
                        )}
                      </div>

                      {/* Admin Tools */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openDuplicateModal(routine)}
                          title={t.duplicateRoutine}
                          className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-300 hover:text-pink-400 transition-colors cursor-pointer"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={() => openEditModal(routine)}
                          title={t.editRoutine}
                          className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-300 hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteRoutine(routine.id)}
                          title={t.delete}
                          className="p-1.5 bg-white/5 hover:bg-rose-500/20 border border-white/5 rounded-lg text-gray-300 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Completion/Missed floating states */}
                    {isCompleted && (
                      <div className="absolute top-1 right-12 text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest">
                        {t.completed}
                      </div>
                    )}
                    {isMissed && (
                      <div className="absolute top-1 right-12 text-[8px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest">
                        {t.missed}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* COMPREHENSIVE ADD/EDIT MODAL OVERLAY */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-none"
            />

            {/* Form box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="w-full max-w-lg p-6 md:p-8 rounded-[32px] bg-slate-900 border border-white/10 shadow-3xl relative z-10 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                  <Bookmark size={16} className="text-pink-400" />
                  <span>
                    {modalMode === 'add' ? t.addRoutine : modalMode === 'edit' ? t.editRoutine : t.duplicateRoutine}
                  </span>
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Form elements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.subject}</label>
                  <input 
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder={t.subjectPlaceholder}
                    className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-pink-500 text-white"
                  />
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.title}</label>
                  <input 
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={t.titlePlaceholder}
                    className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-pink-500 text-white"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.date}</label>
                  <input 
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-pink-500 text-white font-mono"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.priority}</label>
                  <select 
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="High">{t.high}</option>
                    <option value="Medium">{t.medium}</option>
                    <option value="Low">{t.low}</option>
                  </select>
                </div>

                {/* Start Time */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.startTime}</label>
                  <input 
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-pink-500 text-white font-mono"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.endTime}</label>
                  <input 
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-pink-500 text-white font-mono"
                  />
                </div>

                {/* Repeat */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.repeat}</label>
                  <select 
                    value={formRepeat}
                    onChange={(e) => setFormRepeat(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="Daily">{t.daily}</option>
                    <option value="Weekly">{t.weekly}</option>
                    <option value="Monthly">{t.monthly}</option>
                    <option value="Custom">{t.custom}</option>
                  </select>
                </div>

                {/* Reminder time */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.reminderTime}</label>
                  <select 
                    value={formReminderTime}
                    onChange={(e) => setFormReminderTime(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="At Time">{t.atTime}</option>
                    <option value="5 min">{t.min5}</option>
                    <option value="10 min">{t.min10}</option>
                    <option value="15 min">{t.min15}</option>
                    <option value="30 min">{t.min30}</option>
                    <option value="1 hour">{t.hour1}</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.description}</label>
                  <textarea 
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={t.descPlaceholder}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl text-xs focus:outline-none focus:border-pink-500 text-white leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-3 border-t border-white/5 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoutine}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
                >
                  {t.save}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
