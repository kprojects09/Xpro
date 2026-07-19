import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, School, BookOpen, Sparkles, ArrowRight, ArrowLeft, Palette, Globe, MapPin, Check, ChevronRight } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { useLiveSettings } from '../lib/useLiveSettings';
import { useLocationData } from '../lib/useLocationData';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { 
  WBCHSE_SCIENCE_LANG1, WBCHSE_SCIENCE_LANG2, WBCHSE_SCIENCE_OPTIONAL,
  WBCHSE_ARTS_LANG1, WBCHSE_ARTS_LANG2, WBCHSE_ARTS_ELECTIVE,
  WBCHSE_COMMERCE_CHOOSE_ONE, WBCHSE_COMMERCE_ELECTIVE
} from '../lib/subjectData';

export function OnboardingForm({ 
  userId, 
  userEmail, 
  onComplete 
}: { 
  userId: string, 
  userEmail: string, 
  onComplete: (data: any) => void 
}) {
  const { states, getDistrictsForState, getBlocksForDistrict, getSchoolsForBlock, loading: locationsLoading } = useLocationData();
  const { appSettings } = useLiveSettings();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Field Data
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const checkUsernameAvailability = async () => {
    const clean = username.toLowerCase().trim();
    if (!clean) {
      setUsernameError('Username cannot be empty.');
      return;
    }
    const regex = /^[a-zA-Z0-9_.]+$/;
    if (!regex.test(clean)) {
      setUsernameError('Username can only contain letters, numbers, underscores (_), and periods (.).');
      return;
    }
    setCheckingUsername(true);
    setUsernameError(null);
    try {
      const q = query(collection(db, 'users'), where('username', '==', clean), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setUsernameError('This username is already taken. Please try another one.');
        setUsernameChecked(false);
      } else {
        setUsernameError(null);
        setUsernameChecked(true);
      }
    } catch (err) {
      setUsernameError('Failed to check username. Please try again.');
    } finally {
      setCheckingUsername(false);
    }
  };

  const [studentClass, setStudentClass] = useState('Class 11');
  const [board, setBoard] = useState('WBCHSE');
  const [stream, setStream] = useState('Science');
  
  // Location Data
  const [country] = useState('India');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // WBCHSE Subject Setup
  const [firstLang, setFirstLang] = useState('');
  const [secondLang, setSecondLang] = useState('');
  const [optionalSubjects, setOptionalSubjects] = useState<string[]>([]);

  // Other Settings
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('English');
  const [avatarIndex, setAvatarIndex] = useState(0);

  // Computed state logic
  useEffect(() => {
    // Reset subjects when stream changes
    setFirstLang('');
    setSecondLang('');
    setOptionalSubjects([]);
  }, [stream]);

  const toggleOptionalSubject = (subj: string) => {
    setOptionalSubjects(prev => 
      prev.includes(subj) ? prev.filter(s => s !== subj) : [...prev, subj]
    );
  };

  const handleNext = async () => {
    setError(null);
    if (step === 1) {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      const cleanUsername = username.toLowerCase().trim();
      if (!cleanUsername) {
        setError('Please choose a username.');
        return;
      }
      const regex = /^[a-zA-Z0-9_.]+$/;
      if (!regex.test(cleanUsername)) {
        setError('Username can only contain letters, numbers, underscores (_), and periods (.).');
        return;
      }

      setCheckingUsername(true);
      try {
        const q = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setError('This username is already taken. Please try another one.');
          setCheckingUsername(false);
          return;
        }
      } catch (err) {
        setError('Failed to validate username uniqueness. Please try again.');
        setCheckingUsername(false);
        return;
      } finally {
        setCheckingUsername(false);
      }

      setStep(2);
    } else if (step === 2) {
      if (!state || !district || !block || !schoolName) {
        setError('Please fill out all location and school fields.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Validate subjects if WBCHSE
      if (board === 'WBCHSE') {
        if (stream === 'Science' || stream === 'Arts') {
          if (!firstLang || !secondLang) {
            setError('Please select both First and Second Languages.');
            return;
          }
        }
        if (stream === 'Commerce') {
          if (!secondLang) {
            setError('Please choose your language option.');
            return;
          }
        }
      }
      setStep(4);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const handleComplete = async () => {
    if (isSaving) return;
    setIsSaving(true);
    // Generate subjects array based on stream
    let finalSubjects: string[] = [];
    if (board === 'WBCHSE') {
      if (stream === 'Science') {
        finalSubjects = [firstLang, secondLang, 'Physics', 'Chemistry', ...optionalSubjects];
      } else if (stream === 'Arts') {
        finalSubjects = [firstLang, secondLang, ...optionalSubjects];
      } else if (stream === 'Commerce') {
        finalSubjects = ['English', secondLang, ...optionalSubjects];
      }
    } else {
      finalSubjects = optionalSubjects;
    }

    try {
      setSaveError('');
      const payload = {
        fullName,
        username: username.toLowerCase().trim(),
        class: studentClass,
        board,
        stream,
        country,
        state,
        district,
        block,
        school: schoolName,
        subjects: finalSubjects.filter(Boolean),
        theme,
        language,
        avatarIndex,
        hasOnboarded: true
      };
      await Promise.race([
        onComplete(payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
      ]);
      // isSaving is kept true because it navigates away
    } catch (err: any) {
      setIsSaving(false);
      if (err.message === "timeout") {
        setSaveError("Something went wrong. Please try again.");
      } else {
        setSaveError("Failed to save profile.");
      }
      setTimeout(() => setSaveError(''), 5000);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060413] overflow-y-auto font-sans text-white z-[9999] safe-top safe-bottom">
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
        
        {/* Background glow */}
        <div className="fixed top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[20px] md:blur-[20px] pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[20px] md:blur-[20px] pointer-events-none" />

        <div className="w-full max-w-2xl text-center space-y-4 mb-8 z-10 relative mt-4">
          <div className="flex justify-between items-start w-full px-4 mb-4">
             <div className="opacity-0 w-24"></div>
             <button onClick={() => {
                const p = {
                  fullName: "Scholar",
                  username: "user_" + Math.floor(Math.random() * 1000000),
                  hasOnboarded: true,
                  skipped: true,
                  avatarIndex: 0
                };
                onComplete(p);
             }} className="text-sm font-bold text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-2xl backdrop-blur-md active:scale-90 border border-white/10">
                Skip for now
             </button>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/35 rounded-full text-xs font-semibold text-purple-300">
            <Sparkles size={14} className="animate-pulse" />
            <span>Smart Profile Setup</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-200">
            Welcome to {appSettings.appName}
          </h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Let's personalize your learning experience. We'll set up your curriculum intelligently.
          </p>
        </div>

        <motion.div 
          layout
          className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-none border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-rose-500/15 border border-rose-500/25 rounded-2xl text-sm text-rose-300 flex items-center gap-3"
            >
              <div className="w-2 h-2 bg-rose-500 rounded-full shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            
            {/* STEP 1: Basic Identity & Academics */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-white/5 pb-3">
                  <h3 className="font-bold text-xl text-white flex items-center gap-2">
                    <User size={20} className="text-pink-400" />
                    Student Profile
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-300">1. Full Name</label>
                  <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Krishanu Majee"
                    className="w-full bg-black/40 border border-white/10 focus:border-pink-500 rounded-2xl px-4 py-3.5 text-sm focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-300">Choose Unique Username</label>
                  <div className="relative flex items-center">
                    <input 
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                        setUsername(val);
                        setUsernameChecked(false);
                        setUsernameError(null);
                      }}
                      placeholder="letters, numbers, _ , ."
                      className="w-full bg-black/40 border border-white/10 focus:border-pink-500 rounded-2xl pl-4 pr-32 py-3.5 text-sm focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      disabled={checkingUsername || !username.trim()}
                      onClick={checkUsernameAvailability}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer"
                    >
                      {checkingUsername ? 'Checking...' : usernameChecked ? 'Available ✓' : 'Check'}
                    </button>
                  </div>
                  {usernameError && <p className="text-xs text-rose-400 font-medium">{usernameError}</p>}
                  {usernameChecked && !usernameError && <p className="text-xs text-emerald-400 font-medium">Username is available!</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-300">2. Class</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Class 9', 'Class 10', 'Class 11', 'Class 12'].map(cls => (
                      <button
                        key={cls}
                        onClick={() => setStudentClass(cls)}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                          studentClass === cls ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">3. Academic Board</label>
                    <select 
                      value={board}
                      onChange={(e) => setBoard(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="WBCHSE">WBCHSE</option>
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE">ICSE</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">4. Stream</label>
                    <select 
                      value={stream}
                      onChange={(e) => setStream(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="Science">Science</option>
                      <option value="Arts">Arts</option>
                      <option value="Commerce">Commerce</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    onClick={handleNext}
                    className="py-3.5 px-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span>Next</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Location Selector */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-white/5 pb-3">
                  <h3 className="font-bold text-xl text-white flex items-center gap-2">
                    <MapPin size={20} className="text-indigo-400" />
                    Location Setup
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">Country</label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-sm text-gray-400 cursor-not-allowed">
                      India (Default)
                    </div>
                  </div>

                  <SearchableSelect 
                    label="State / Union Territory"
                    value={state}
                    onChange={(val) => { setState(val); setDistrict(''); setBlock(''); setSchoolName(''); }}
                    options={states}
                    placeholder="Select your State"
                  />

                  {state && (
                    <SearchableSelect 
                      label="District"
                      value={district}
                      onChange={(val) => { setDistrict(val); setBlock(''); setSchoolName(''); }}
                      options={getDistrictsForState(state)}
                      placeholder="Select or type your District"
                    />
                  )}

                  {district && (
                    <SearchableSelect 
                      label="Block / Municipality"
                      value={block}
                      onChange={(val) => { setBlock(val); setSchoolName(''); }}
                      options={getBlocksForDistrict(state, district)}
                      placeholder="Select or type your Block / Area"
                    />
                  )}

                  {block && (
                    <SearchableSelect 
                      label="School / Institution"
                      value={schoolName}
                      onChange={setSchoolName}
                      options={getSchoolsForBlock(state, district, block)}
                      placeholder="Select or type your School Name"
                    />
                  )}
                </div>

                <div className="pt-6 flex justify-between">
                  <button onClick={() => setStep(1)} className="py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 font-bold transition-all">Back</button>
                  <button
                    onClick={handleNext}
                    className="py-3.5 px-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span>Next</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Smart Subject Engine */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-white/5 pb-3">
                  <h3 className="font-bold text-xl text-white flex items-center gap-2">
                    <BookOpen size={20} className="text-emerald-400" />
                    Subjects Engine ({board} - {stream})
                  </h3>
                </div>

                {board === 'WBCHSE' ? (
                  <div className="space-y-6">
                    {/* Science Stream */}
                    {stream === 'Science' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <SearchableSelect label="First Language" value={firstLang} onChange={setFirstLang} options={WBCHSE_SCIENCE_LANG1} />
                          <SearchableSelect label="Second Language" value={secondLang} onChange={setSecondLang} options={WBCHSE_SCIENCE_LANG2} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-300">Compulsory Subjects</label>
                          <div className="flex gap-2">
                            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold">Physics</span>
                            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold">Chemistry</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-300">Optional Subjects (Select Multiple)</label>
                          <div className="flex flex-wrap gap-2">
                            {WBCHSE_SCIENCE_OPTIONAL.map(subj => (
                              <button key={subj} onClick={() => toggleOptionalSubject(subj)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${optionalSubjects.includes(subj) ? 'bg-pink-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                {subj}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Arts Stream */}
                    {stream === 'Arts' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <SearchableSelect label="First Language" value={firstLang} onChange={setFirstLang} options={WBCHSE_ARTS_LANG1} />
                          <SearchableSelect label="Second Language" value={secondLang} onChange={setSecondLang} options={WBCHSE_ARTS_LANG2} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-300">Elective Subjects (Select Multiple)</label>
                          <div className="flex flex-wrap gap-2">
                            {WBCHSE_ARTS_ELECTIVE.map(subj => (
                              <button key={subj} onClick={() => toggleOptionalSubject(subj)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${optionalSubjects.includes(subj) ? 'bg-pink-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                {subj}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Commerce Stream */}
                    {stream === 'Commerce' && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-300">Compulsory Language</label>
                          <div className="inline-block px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold">English</div>
                        </div>
                        <SearchableSelect label="Choose One Language" value={secondLang} onChange={setSecondLang} options={WBCHSE_COMMERCE_CHOOSE_ONE} />
                        <div className="space-y-2 mt-4">
                          <label className="text-sm font-semibold text-gray-300">Elective Subjects (Select Multiple)</label>
                          <div className="flex flex-wrap gap-2">
                            {WBCHSE_COMMERCE_ELECTIVE.map(subj => (
                              <button key={subj} onClick={() => toggleOptionalSubject(subj)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${optionalSubjects.includes(subj) ? 'bg-pink-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                {subj}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">Since you selected {board}, please type your subjects manually.</p>
                    <SearchableSelect 
                      label="Add Subjects"
                      value=""
                      onChange={(val) => {
                        if (val && !optionalSubjects.includes(val)) {
                          setOptionalSubjects([...optionalSubjects, val]);
                        }
                      }}
                      options={[]}
                      placeholder="Type a subject and press Enter/Check"
                    />
                    <div className="flex flex-wrap gap-2">
                      {optionalSubjects.map(subj => (
                        <div key={subj} className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs flex items-center gap-2">
                          {subj}
                          <button onClick={() => toggleOptionalSubject(subj)} className="text-rose-400 hover:text-rose-300">&times;</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 flex justify-between">
                  <button onClick={() => setStep(2)} className="py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 font-bold transition-all">Back</button>
                  <button onClick={handleNext} className="py-3.5 px-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all">
                    Next
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Personalization & Finish */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-white/5 pb-3">
                  <h3 className="font-bold text-xl text-white flex items-center gap-2">
                    <Palette size={20} className="text-amber-400" />
                    Personalization
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">App Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['dark', 'dracula'].map(t => (
                        <button key={t} onClick={() => setTheme(t)} className={`py-3 rounded-xl border text-sm font-bold capitalize transition-all ${theme === t ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/5 border-transparent text-gray-400'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-300">Voice Language</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 text-sm focus:outline-none">
                      <option value="English">English</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 flex justify-between">
                  <button onClick={() => setStep(3)} className="py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 font-bold transition-all">Back</button>
                  <div className="flex flex-col items-end gap-1">
                  <button onClick={handleComplete} disabled={isSaving} className={`py-3.5 px-8 rounded-2xl font-bold transition-all text-white flex items-center gap-2 ${isSaving ? 'bg-gray-500/50 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95'}`}>
                    {!isSaving && <Check size={16} />}
                    {isSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</> : 'Save Profile'}
                  </button>
                  {saveError && <span className="text-rose-400 text-[10px]">{saveError}</span>}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
