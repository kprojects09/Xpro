import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ContentExplorer } from './ContentExplorer';
import { 
  Clock, Award, BookOpen, CheckSquare, ListTodo, Trophy, Play, Pause, 
  RotateCcw, Sparkles, BookMarked, Save, Trash2, ArrowRight, Brain, Check, HelpCircle, Crown
} from 'lucide-react';

interface LearnCenterProps {
  theme: any;
  addSystemLog: (log: string) => void;
  currentUser: any;
  userProfile: any;
}

export function LearnCenter({ theme, addSystemLog, currentUser, userProfile }: LearnCenterProps) {
  // Nested Sub-Tab State
  const [learnTab, setLearnTab] = useState<'timer' | 'quiz' | 'notes' | 'materials' | 'planner' | 'leaderboard'>('timer');

  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  useEffect(() => {
    const q = collection(db, 'users');
    const unsub = onSnapshot(q, (snap) => {
      setDbUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingLeaderboard(false);
    }, (err) => {
      console.error("Leaderboard query error:", err);
      setLoadingLeaderboard(false);
    });
    return () => unsub();
  }, []);

  // --- 1. Pomodoro Timer State ---
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<any>(null);
  const [timerType, setTimerType] = useState<'study' | 'short_break' | 'long_break'>('study');

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerActive(false);
            addSystemLog(`[STUDY] Pomodoro session completed! Time to rest.`);
            alert('Timer Finished! Good job.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const changeTimerType = (type: 'study' | 'short_break' | 'long_break') => {
    setTimerActive(false);
    setTimerType(type);
    if (type === 'study') setTimeRemaining(25 * 60);
    else if (type === 'short_break') setTimeRemaining(5 * 60);
    else if (type === 'long_break') setTimeRemaining(15 * 60);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- 2. Interactive AI Quiz Engine State ---
  const quizQuestions = [
    {
      id: 1,
      q: "What is the force between two static point charges called in physics?",
      options: ["Gravity Force", "Coulomb Force", "Lorentz Force", "Kepler Force"],
      answer: 1,
      explanation: "Coulomb's Law describes the electrostatic interaction between electrically charged particles."
    },
    {
      id: 2,
      q: "Which mathematical constant describes the base of natural logarithms?",
      options: ["e (Euler's number)", "Pi (π)", "Phi (φ)", "Golden Ratio"],
      answer: 0,
      explanation: "Euler's number (e ≈ 2.71828) is the mathematical constant representing the natural log base."
    },
    {
      id: 3,
      q: "In Computer Science, what is the worst-case time complexity of standard QuickSort?",
      options: ["O(log N)", "O(N log N)", "O(N^2)", "O(1)"],
      answer: 2,
      explanation: "QuickSort degrades to O(N^2) if the pivot elements are poorly chosen (e.g. sorted arrays)."
    },
    {
      id: 4,
      q: "What substance in blood is responsible for binding oxygen?",
      options: ["Plasma", "Hemoglobin", "Platelets", "Lymphocytes"],
      answer: 1,
      explanation: "Hemoglobin is an iron-rich protein in red blood cells that carries oxygen throughout the body."
    }
  ];

  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleOptionSelect = (idx: number) => {
    if (selectedOption !== null) return; // Prevent double select
    setSelectedOption(idx);
    setShowExplanation(true);
    if (idx === quizQuestions[currentQuizIndex].answer) {
      setQuizScore(s => s + 1);
    }
  };

  const nextQuizQuestion = () => {
    setSelectedOption(null);
    setShowExplanation(false);
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(i => i + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizFinished(false);
    setShowExplanation(false);
  };

  // --- 3. Subject Notes Editor State ---
  const [notesList, setNotesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('sweety_study_notes');
    return saved ? JSON.parse(saved) : ["✨ Math Class summary:\n- Derivative of sin(x) is cos(x)\n- Derivative of cos(x) is -sin(x)\n- Remember trigonometric identities!"];
  });

  const [materials, setMaterials] = useState<any>({
    pdfs: [],
    videos: [],
    images: [],
    audio: [],
    mock_tests: [],
    pyq: []
  });

  useEffect(() => {
    const cols = ['admin_pdfs', 'admin_videos', 'admin_images', 'admin_audio', 'admin_mock_tests', 'admin_pyq'];
    const unsubs = cols.map(c => 
      onSnapshot(collection(db, c), snap => {
        setMaterials((prev: any) => ({
          ...prev,
          [c.replace('admin_', '')]: snap.docs.map(d => ({ id: d.id, ...d.data() }))
        }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);

  const [adminNotes, setAdminNotes] = useState<any[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admin_notes'), (snap) => {
      setAdminNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const [currentNote, setCurrentNote] = useState('');

  const saveNote = () => {
    if (!currentNote.trim()) return;
    const updated = [currentNote, ...notesList];
    setNotesList(updated);
    localStorage.setItem('sweety_study_notes', JSON.stringify(updated));
    setCurrentNote('');
    addSystemLog(`[NOTES] Added new Study note to local binder.`);
  };

  const deleteNote = (index: number) => {
    const updated = notesList.filter((_, i) => i !== index);
    setNotesList(updated);
    localStorage.setItem('sweety_study_notes', JSON.stringify(updated));
  };

  // --- 4. Daily Planner Schedules ---
  const [plannerEvents, setPlannerEvents] = useState([
    { id: 1, time: '09:00 AM', text: 'Calculus Lecture live with XPRO AGENT' },
    { id: 2, time: '11:30 AM', text: 'Chemistry Lab Homework submission' },
    { id: 0, time: '02:00 PM', text: 'Solve Computer Science previous year question papers' },
    { id: 4, time: '04:30 PM', text: 'AI Study group debate & voice review' }
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto text-white pb-32">
      
      {/* Upper sub navigation */}
      <div className="flex gap-2 mb-6 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-full overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
                    { id: 'timer', label: 'Pomodoro Timer', icon: Clock },
          { id: 'quiz', label: 'AI Quiz Engine', icon: Brain },
          { id: 'notes', label: 'Subject Notes', icon: BookMarked },
          { id: 'materials', label: 'Study Materials', icon: BookOpen },
          { id: 'planner', label: 'Daily Planner', icon: ListTodo },
          { id: 'leaderboard', label: 'Achievements', icon: Trophy }
        ].map(item => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setLearnTab(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                learnTab === item.id 
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <IconComp size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[420px]">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: POMODORO TIMER */}
          {learnTab === 'timer' && (
            <motion.div
              key="tab-timer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl p-6 md:p-8 bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden"
            >
              {/* Pulsing light behind the clock */}
              <div className="absolute w-72 h-72 bg-indigo-500/10 blur-[20px] rounded-full pointer-events-none -z-10 animate-pulse" />

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-indigo-400">Deep Focus Timer</span>
                <h3 className="text-2xl font-extrabold tracking-tight">Focus & Power Co-working</h3>
              </div>

              {/* Presets */}
              <div className="flex gap-2 bg-black/30 p-1 rounded-xl border border-white/5">
                {[
                  { id: 'study', label: 'Study block (25m)' },
                  { id: 'short_break', label: 'Short Break (5m)' },
                  { id: 'long_break', label: 'Long Break (15m)' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => changeTimerType(p.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                      timerType === p.id 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Big clock numbers */}
              <div className="text-7xl md:text-8xl font-extrabold tracking-tight font-mono text-white select-none relative">
                {formatTime(timeRemaining)}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setTimerActive(!timerActive)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer ${
                    timerActive 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                  }`}
                  title={timerActive ? 'Pause' : 'Start'}
                >
                  {timerActive ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                </button>

                <button
                  onClick={() => {
                    setTimerActive(false);
                    changeTimerType(timerType);
                  }}
                  className="w-12 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center justify-center active:scale-95 cursor-pointer transition-all"
                  title="Reset"
                >
                  <RotateCcw size={18} />
                </button>
              </div>

              <div className="text-xs text-indigo-300 font-semibold max-w-md">
                💡 Tip: Turn on the background relaxing music inside the Options Menu to keep your mind perfectly optimized while the timer ticks down.
              </div>
            </motion.div>
          )}

          {learnTab === 'materials' && (
            <motion.div
              key="tab-materials"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ContentExplorer currentUser={currentUser} userProfile={userProfile} />
            </motion.div>
          )}
          {/* TAB 2: AI QUIZ ENGINE */}
          {learnTab === 'quiz' && (
            <motion.div
              key="tab-quiz"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col justify-between gap-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-pink-500/15 text-pink-400 rounded-xl">
                    <Brain size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Interactive Syllabus Quiz</h4>
                    <p className="text-[10px] text-gray-400">Subject metrics generator & test</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-white/5 px-2.5 py-1 rounded-lg">Question {currentQuizIndex + 1}/{quizQuestions.length}</span>
              </div>

              {!quizFinished ? (
                <div className="space-y-6">
                  {/* Question */}
                  <h3 className="text-base font-extrabold tracking-wide leading-relaxed text-pink-100">
                    {quizQuestions[currentQuizIndex].q}
                  </h3>

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quizQuestions[currentQuizIndex].options.map((opt, idx) => {
                      const isSelected = selectedOption === idx;
                      const isCorrect = idx === quizQuestions[currentQuizIndex].answer;
                      let optionStyle = "border-white/10 hover:bg-white/5";
                      
                      if (selectedOption !== null) {
                        if (isCorrect) {
                          optionStyle = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-emerald-500/5";
                        } else if (isSelected) {
                          optionStyle = "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-rose-500/5";
                        } else {
                          optionStyle = "opacity-40 border-white/5";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={selectedOption !== null}
                          onClick={() => handleOptionSelect(idx)}
                          className={`flex items-center justify-between p-4 rounded-xl border text-left font-semibold text-xs transition-all duration-300 cursor-pointer ${optionStyle}`}
                        >
                          <span>{opt}</span>
                          {selectedOption !== null && isCorrect && <Check size={16} className="text-emerald-400 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Block */}
                  {showExplanation && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-300 leading-relaxed flex items-start gap-2.5"
                    >
                      <HelpCircle size={16} className="text-pink-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-pink-200">AI Explanation: </strong>
                        {quizQuestions[currentQuizIndex].explanation}
                      </div>
                    </motion.div>
                  )}

                  {/* Actions */}
                  {selectedOption !== null && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={nextQuizQuestion}
                        className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        <span>{currentQuizIndex === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center space-y-6 max-w-sm mx-auto flex flex-col items-center">
                  <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-full w-fit animate-bounce">
                    <Award size={48} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold">Quiz Session Complete!</h4>
                    <p className="text-xs text-gray-400">Excellent performance, you've earned 50xp study points!</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-3xl font-extrabold font-mono text-pink-300">
                    {quizScore} / {quizQuestions.length} Correct
                  </div>

                  <button
                    onClick={restartQuiz}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl cursor-pointer"
                  >
                    Take Another Quiz
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: SUBJECT NOTES EDITOR */}
          {learnTab === 'notes' && (
            <motion.div
              key="tab-notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Note creator / Text area */}
              <div className="md:col-span-2 rounded-3xl p-5 bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-bold text-sm uppercase tracking-wider text-purple-300">Note Workspace</span>
                  <button 
                    onClick={saveNote}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg cursor-pointer hover:bg-purple-500/30 transition-all"
                  >
                    <Save size={12} />
                    <span>Save Note</span>
                  </button>
                </div>

                <textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="Draft your calculus equations, science formulas, or history key dates here. Click 'Save Note' to secure it..."
                  className="flex-1 w-full min-h-[180px] bg-black/20 rounded-xl p-4 border border-white/5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-medium resize-none"
                />
              </div>

              
              {/* Admin Notes */}
              {adminNotes.length > 0 && (
                <div className="rounded-3xl p-5 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-none shadow-2xl flex flex-col gap-3 mb-6">
                  <span className="font-bold text-xs uppercase tracking-wider text-indigo-400 border-b border-indigo-500/20 pb-2 flex items-center gap-2"><BookMarked size={14}/> Official Materials ({adminNotes.length})</span>
                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] scrollbar-thin">
                    {adminNotes.map((note: any) => (
                      <div key={note.id} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 relative group hover:border-white/20 transition-all">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white text-sm">{note.title}</h4>
                          {note.subject && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{note.subject}</span>}
                        </div>
                        {note.fileUrl && (
                          <a href={note.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold">
                            View Document <ArrowRight size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Notes List */}
              <div className="rounded-3xl p-5 bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col gap-3 h-[300px] overflow-hidden">
                <span className="font-bold text-xs uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">Binder Notes ({notesList.length})</span>
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                  {notesList.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 text-xs">No notes saved. Write and save above.</div>
                  ) : (
                    notesList.map((note, idx) => (
                      <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2 relative group hover:border-white/10 transition-all">
                        <p className="text-[11px] text-gray-300 font-medium font-sans whitespace-pre-wrap leading-relaxed truncate-2-lines">{note}</p>
                        <button
                          onClick={() => deleteNote(idx)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-400 rounded transition-all text-gray-400 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: DAILY PLANNER */}
          {learnTab === 'planner' && (
            <motion.div
              key="tab-planner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="font-bold text-sm uppercase tracking-wide text-indigo-300">Daily Study Planner</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hourly Blocks</span>
              </div>

              <div className="space-y-3.5 my-2">
                {plannerEvents.map((ev, idx) => (
                  <div key={idx} className="flex gap-4 items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-xs font-mono font-extrabold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-3 py-1.5 rounded-lg whitespace-nowrap min-w-[80px] text-center">
                      {ev.time}
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {ev.text}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 5: ACHIEVEMENTS & LEADERBOARD */}
          {learnTab === 'leaderboard' && (
            <motion.div
              key="tab-leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Shelf */}
              <div className="rounded-3xl p-5 bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col gap-4">
                <span className="font-bold text-sm uppercase tracking-wider text-pink-300 border-b border-white/5 pb-2 flex items-center gap-1.5">
                  <Award size={16} />
                  <span>My Badges ({3})</span>
                </span>
                
                <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[260px] pr-1">
                  {[
                    { id: 1, name: 'Calculus Hero', desc: 'Solved 20+ integrals', unlocked: true, color: 'from-amber-500 to-orange-600' },
                    { id: 2, name: 'Pomodoro Beast', desc: '4+ consecutive study cycles', unlocked: true, color: 'from-pink-500 to-rose-600' },
                    { id: 3, name: 'Active Vocalist', desc: 'Talked to AI for 10+ mins', unlocked: true, color: 'from-purple-500 to-indigo-600' },
                    { id: 4, name: 'Full Streaker', desc: 'Hit a 30-day streak', unlocked: false, color: 'from-slate-700 to-slate-800' }
                  ].map(b => (
                    <div key={b.id} className={`p-3 border rounded-xl flex flex-col gap-1 items-center text-center relative overflow-hidden transition-all ${
                      b.unlocked ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/40 border-dashed border-white/10 opacity-50'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-r ${b.color} shadow-lg font-bold text-lg mb-2`}>
                        {b.name.charAt(0)}
                      </div>
                      <h5 className="font-bold text-[11px] leading-tight text-white">{b.name}</h5>
                      <p className="text-[9px] text-gray-400 mt-0.5 font-semibold">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard Streaks */}
              <div className="rounded-3xl p-5 bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col gap-3">
                <span className="font-bold text-sm uppercase tracking-wider text-indigo-300 border-b border-white/5 pb-2 flex items-center gap-1.5">
                  <Trophy size={16} />
                  <span>Leaderboard Study Streaks</span>
                </span>

                <div className="space-y-2.5 overflow-y-auto max-h-[260px] pr-1 flex-1">
                  {loadingLeaderboard ? (
                    <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full mx-auto" /></div>
                  ) : dbUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs italic">
                      No activity yet
                    </div>
                  ) : (
                    [...dbUsers]
                      .map(u => ({
                        ...u,
                        streak: u.streak || 0,
                        xp: u.xp || 0,
                        name: u.fullName || u.displayName || u.email?.split('@')[0] || 'User'
                      }))
                      .sort((a, b) => b.xp - a.xp || b.streak - a.streak)
                      .slice(0, 15)
                      .map((usr, index) => {
                        const rank = index + 1;
                        const isSelf = usr.id === currentUser?.uid;
                        const hasPremium = usr.isPremium === true;
                        
                        return (
                          <div key={usr.id} className={`flex justify-between items-center p-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                            isSelf 
                              ? 'bg-pink-500/10 border-pink-500/30' 
                              : hasPremium
                              ? 'bg-amber-500/5 border-amber-500/20'
                              : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}>
                            <div className="flex items-center gap-2 max-w-[65%]">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                                rank === 1 
                                  ? 'bg-amber-500 text-black' 
                                  : rank === 2 
                                  ? 'bg-slate-300 text-black' 
                                  : rank === 3 
                                  ? 'bg-amber-700 text-white' 
                                  : 'bg-white/5 text-gray-400'
                              }`}>
                                {rank}
                              </span>
                              <span className="truncate flex items-center gap-1.5 text-white">
                                <span className={isSelf ? 'text-pink-400 font-bold' : ''}>
                                  {usr.name} {isSelf && '(You)'}
                                </span>
                                {hasPremium && (
                                  <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">
                                    <Crown size={8} /> Premium
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-mono text-right shrink-0">
                              <span className="text-pink-400">{usr.streak} Days 🔥</span>
                              <span className="text-indigo-300">XP {usr.xp || (usr.streak * 50)}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
