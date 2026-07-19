import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Shield, Key, Eye, EyeOff, Sliders, Volume2, AppWindow, 
  Info, ExternalLink, Moon, Sparkles, BookOpen, Clock, Flame, LogOut, Check,
  School, Award, Globe, MapPin, CheckCircle, Lock, Ban, UserMinus
} from 'lucide-react';
import { db } from '../firebase';
import { syncUserProfile } from '../lib/profileSync';
import { permissionManager } from '../lib/permissionManager';
import { doc, setDoc, getDoc, updateDoc, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { SearchableSelect } from './SearchableSelect';
import { useLiveSettings } from '../lib/useLiveSettings';
import { useLocationData } from '../lib/useLocationData';
import { 
  WBCHSE_SCIENCE_LANG1, WBCHSE_SCIENCE_LANG2, WBCHSE_SCIENCE_OPTIONAL,
  WBCHSE_ARTS_LANG1, WBCHSE_ARTS_LANG2, WBCHSE_ARTS_ELECTIVE,
  WBCHSE_COMMERCE_CHOOSE_ONE, WBCHSE_COMMERCE_ELECTIVE
} from '../lib/subjectData';

interface UserProfileSettingsProps {
  currentUser: any;
  userProfile: any;
  onUpdateProfile: (updatedData: any) => void;
  theme: any;
  currentTheme: string;
  setCurrentTheme: (t: any) => void;
  onLogout: () => void;
  addSystemLog: (log: string) => void;
  isAdmin: boolean;
  onNavigateHome?: () => void;
}

export function Settings({
  currentUser,
  userProfile,
  onUpdateProfile,
  theme,
  currentTheme,
  setCurrentTheme,
  onLogout,
  addSystemLog,
  isAdmin,
  onNavigateHome
}: UserProfileSettingsProps) {
  const { appSettings } = useLiveSettings();
  const { states, getDistrictsForState, getBlocksForDistrict, getSchoolsForBlock, loading: locationsLoading } = useLocationData();
  
  // API Key local state (only shown if isAdmin === true)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('custom_gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(() => !!localStorage.getItem('custom_gemini_api_key'));
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Student Profile fields state
  const [fullName, setFullName] = useState(userProfile?.fullName || currentUser?.displayName || 'Student Operator');
  const [schoolName, setSchoolName] = useState(userProfile?.schoolName || userProfile?.school || '');
  const [studentClass, setStudentClass] = useState(userProfile?.class || 'Class 11');
  const [board, setBoard] = useState(userProfile?.board || 'WBCHSE');
  const [stream, setStream] = useState(userProfile?.stream || 'Science');
  const [language, setLanguage] = useState(userProfile?.language || 'English');
  
  // Location
  const [country, setCountry] = useState(userProfile?.country || 'India');
  const [state, setState] = useState(userProfile?.state || '');
  const [district, setDistrict] = useState(userProfile?.district || '');
  const [block, setBlock] = useState(userProfile?.block || '');

  // Subjects System
  const [subjects, setSubjects] = useState<string[]>(userProfile?.subjects || []);
  const [firstLang, setFirstLang] = useState('');
  const [secondLang, setSecondLang] = useState('');
  const [optionalSubjects, setOptionalSubjects] = useState<string[]>([]);

  // Parse existing subjects if possible
  useEffect(() => {
    if (board === 'WBCHSE' && subjects.length > 0) {
      if (stream === 'Science') {
        const l1 = subjects.find(s => WBCHSE_SCIENCE_LANG1.includes(s));
        const l2 = subjects.find(s => WBCHSE_SCIENCE_LANG2.includes(s));
        if (l1) setFirstLang(l1);
        if (l2) setSecondLang(l2);
        setOptionalSubjects(subjects.filter(s => s !== l1 && s !== l2 && s !== 'Physics' && s !== 'Chemistry'));
      } else if (stream === 'Arts') {
        const l1 = subjects.find(s => WBCHSE_ARTS_LANG1.includes(s));
        const l2 = subjects.find(s => WBCHSE_ARTS_LANG2.includes(s));
        if (l1) setFirstLang(l1);
        if (l2) setSecondLang(l2);
        setOptionalSubjects(subjects.filter(s => s !== l1 && s !== l2));
      } else if (stream === 'Commerce') {
        const l2 = subjects.find(s => WBCHSE_COMMERCE_CHOOSE_ONE.includes(s));
        if (l2) setSecondLang(l2);
        setOptionalSubjects(subjects.filter(s => s !== 'English' && s !== l2));
      }
    } else {
      setOptionalSubjects(subjects);
    }
  }, [board, stream]); // Run once mostly

  const toggleOptionalSubject = (subj: string) => {
    setOptionalSubjects(prev => 
      prev.includes(subj) ? prev.filter(s => s !== subj) : [...prev, subj]
    );
  };

  const [bio, setBio] = useState(userProfile?.bio || '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(userProfile?.customAvatarUrl || '');
  const [avatarIndex, setAvatarIndex] = useState(userProfile?.avatarIndex || 0);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Version 3.7 - New states
  const [username, setUsername] = useState(userProfile?.username || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [privacyRequests, setPrivacyRequests] = useState(userProfile?.privacyRequests || 'everyone');
  const [blockedUsersList, setBlockedUsersList] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Fetch blocked users details
  useEffect(() => {
    if (!userProfile?.blockedUsers?.length) {
      setBlockedUsersList([]);
      return;
    }
    const fetchBlockedDetails = async () => {
      setLoadingBlocked(true);
      try {
        const list: any[] = [];
        for (const uid of userProfile.blockedUsers) {
          const uDoc = await getDoc(doc(db, 'users', uid));
          if (uDoc.exists()) {
            list.push({ id: uid, ...uDoc.data() });
          } else {
            list.push({ id: uid, fullName: 'Unknown User', username: 'unknown' });
          }
        }
        setBlockedUsersList(list);
      } catch (err) {
        console.error('Failed to load blocked users:', err);
      } finally {
        setLoadingBlocked(false);
      }
    };
    fetchBlockedDetails();
  }, [userProfile?.blockedUsers]);

  // Client-side image cropping and compression
  const cropAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 250; // perfect square avatar size
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Center crop to square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // 0.8 quality JPEG
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
    });
  };

  const avatars = [
    '🎓', '🌟', '🔬', '🚀', '🧠', '✏️', '💻', '💡'
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await cropAndCompressImage(file);
        setCustomAvatarUrl(compressedBase64);
      } catch (err) {
        console.error("Compression failed:", err);
        alert("Failed to process image. Please try another one.");
      }
    }
  };

  const handleSaveProfile = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError('');

    if (!fullName.trim()) {
      alert("Name is a required field!");
      setIsSaving(false);
      return;
    }

    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) {
      alert("Username cannot be empty.");
      setIsSaving(false);
      return;
    }
    const regex = /^[a-zA-Z0-9_.]+$/;
    if (!regex.test(cleanUsername)) {
      alert("Username can only contain letters, numbers, underscores (_), and periods (.).");
      setIsSaving(false);
      return;
    }

    // 30 days change cooldown check
    let lastUsernameChangeVal = userProfile?.lastUsernameChange || null;
    if (userProfile?.username && cleanUsername !== userProfile.username) {
      if (userProfile.lastUsernameChange) {
        const lastChange = new Date(userProfile.lastUsernameChange).getTime();
        const diffDays = (Date.now() - lastChange) / (1000 * 60 * 60 * 24);
        const cooldownDays = 30; // 30 days limit
        if (diffDays < cooldownDays) {
          const rem = Math.ceil(cooldownDays - diffDays);
          alert(`You can only change your username once every ${cooldownDays} days. Please try again in ${rem} days.`);
          setIsSaving(false);
          return;
        }
      }
      
      // Perform uniqueness check
      try {
        const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const snap = await getDocs(q);
        const alreadyTaken = snap.docs.some(doc => doc.id !== currentUser.uid);
        if (alreadyTaken) {
          alert("This username is already taken. Please try another one.");
          setIsSaving(false);
          return;
        }
        lastUsernameChangeVal = new Date().toISOString();
      } catch (err) {
        console.error('Uniqueness check error:', err);
        alert("Failed to check username availability.");
        setIsSaving(false);
        return;
      }
    }

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
    finalSubjects = finalSubjects.filter(Boolean);

    const payload = {
      fullName: fullName.trim(),
      username: cleanUsername,
      privacyRequests,
      lastUsernameChange: lastUsernameChangeVal,
      schoolName: schoolName.trim(),
      school: schoolName.trim(),
      class: studentClass,
      board,
      stream,
      country,
      state,
      district,
      block,
      language,
      subjects: finalSubjects,
      bio: bio.trim(),
      customAvatarUrl,
      avatarIndex,
      theme: currentTheme,
      hasOnboarded: true
    };

    try {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        await syncUserProfile(currentUser.uid, payload);
        addSystemLog(`[PROFILE] Synced profile details to cloud.`);
      }
      onUpdateProfile(payload);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to save profile: " + err.message);
    }
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('custom_gemini_api_key', apiKey.trim());
      setKeySaved(true);
      setSaveSuccess(true);
      addSystemLog(`[SECURITY] Admin updated system API configuration.`);
      setTimeout(() => setSaveSuccess(false), 2000);
    } else {
      localStorage.removeItem('custom_gemini_api_key');
      setKeySaved(false);
      setApiKey('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full max-w-2xl mx-auto pb-48 font-sans">
      <div className="p-4 sm:p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500/20 to-indigo-500/20 flex items-center justify-center border border-pink-500/30">
            <User size={20} className="text-pink-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Identity & Profile</h2>
            <p className="text-[10px] text-gray-400 font-mono tracking-wider">WORKSPACE CONFIGURATION</p>
          </div>
        </div>

        {/* PREMIUM PROFILE WIDGET */}
        {userProfile?.isPremium && (
          <div className="bg-gradient-to-br from-amber-500 via-yellow-600 to-black border border-amber-500/30 p-6 rounded-3xl shadow-[0_0_25px_rgba(245,158,11,0.15)] relative overflow-hidden text-center space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 blur-[30px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-black/40 border border-amber-500/30 rounded-2xl flex items-center justify-center text-4xl shadow-xl animate-pulse">
                👑
              </div>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest text-amber-300 bg-black/40 px-3.5 py-1.5 rounded-full border border-amber-500/40 uppercase">
                  ⭐ PREMIUM USER
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">{fullName}</h3>
              {userProfile.premiumExpiresAt ? (
                <p className="text-[11px] text-amber-200/80 font-mono">
                  Active until: {new Date(userProfile.premiumExpiresAt).toLocaleString()}
                </p>
              ) : (
                <p className="text-[11px] text-amber-200/80 font-black tracking-widest uppercase">
                  ⭐ LIFETIME PREMIUM ⭐
                </p>
              )}
            </div>
            
            <p className="text-[10px] text-white/60 leading-relaxed italic">
              Enjoying unlimited AI Voice assistance, zero ads, and early access to premium features.
            </p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl  space-y-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[20px] pointer-events-none rounded-full" />
          
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer">
              {customAvatarUrl ? (
                <img src={customAvatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-pink-500/50 shadow-lg shadow-pink-500/20" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/20">
                  {avatars[avatarIndex]}
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10px] font-bold text-white tracking-wider">EDIT</span>
              </div>
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
            </div>

            <div className="flex-1">
              <input 
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-transparent text-lg font-bold text-white focus:outline-none border-b border-white/10 focus:border-pink-500 pb-1 mb-1 transition-colors"
                placeholder="Full Name"
              />
              <input 
                type="text"
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full bg-transparent text-[11px] text-gray-400 focus:outline-none border-b border-transparent focus:border-white/10 pb-1"
                placeholder="Add a short bio or goal..."
              />
              <div className="flex items-center gap-1.5 mt-2 bg-black/20 px-2.5 py-1 rounded-xl border border-white/5 w-fit">
                <span className="text-indigo-400 font-bold text-xs">@</span>
                <input 
                  type="text"
                  value={username}
                  onChange={e => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                    setUsername(val);
                  }}
                  className="bg-transparent text-xs text-indigo-300 font-bold focus:outline-none placeholder-indigo-500 w-32"
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Standard</label>
              <select 
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {['Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Primary Language</label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="English">English</option>
                <option value="Bengali">Bengali</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1">
              <MapPin size={12} className="text-indigo-400" /> Location Details
            </h4>
            
            <SearchableSelect 
              label="State / Union Territory"
              value={state}
              onChange={(val) => { setState(val); setDistrict(''); setBlock(''); setSchoolName(''); }}
              options={states}
              placeholder="Select State"
            />
            
            <SearchableSelect 
              label="District"
              value={district}
              onChange={(val) => { setDistrict(val); setBlock(''); setSchoolName(''); }}
              options={state ? getDistrictsForState(state) : []}
              placeholder="Select District"
            />
            
            <SearchableSelect 
              label="Block / Municipality"
              value={block}
              onChange={(val) => { setBlock(val); setSchoolName(''); }}
              options={district ? getBlocksForDistrict(state, district) : []}
              placeholder="Select or Type your Block"
            />
            
            <SearchableSelect 
              label="School / Institution"
              value={schoolName}
              onChange={setSchoolName}
              options={block ? getSchoolsForBlock(state, district, block) : []}
              placeholder="Select or Type your School"
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Board</label>
                <select 
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="WBCHSE">WBCHSE</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                </select>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Stream</label>
                <select 
                  value={stream}
                  onChange={(e) => {
                    setStream(e.target.value);
                    setFirstLang('');
                    setSecondLang('');
                    setOptionalSubjects([]);
                  }}
                  className="w-full bg-black/40 border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Science">Science</option>
                  <option value="Arts">Arts</option>
                  <option value="Commerce">Commerce</option>
                </select>
              </div>
            </div>

            {/* Smart Subjects Section */}
            {board === 'WBCHSE' ? (
              <div className="space-y-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                <h5 className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">WBCHSE Curriculum</h5>
                
                {stream === 'Science' && (
                  <>
                    <SearchableSelect label="First Language" value={firstLang} onChange={setFirstLang} options={WBCHSE_SCIENCE_LANG1} />
                    <SearchableSelect label="Second Language" value={secondLang} onChange={setSecondLang} options={WBCHSE_SCIENCE_LANG2} />
                    <div className="text-[10px] font-bold text-gray-400">Compulsory: Physics, Chemistry</div>
                    <div className="text-[10px] font-bold text-gray-400">Optional Subjects:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {WBCHSE_SCIENCE_OPTIONAL.map(subj => (
                        <button key={subj} onClick={() => toggleOptionalSubject(subj)} className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${optionalSubjects.includes(subj) ? 'bg-pink-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                          {subj}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {stream === 'Arts' && (
                  <>
                    <SearchableSelect label="First Language" value={firstLang} onChange={setFirstLang} options={WBCHSE_ARTS_LANG1} />
                    <SearchableSelect label="Second Language" value={secondLang} onChange={setSecondLang} options={WBCHSE_ARTS_LANG2} />
                    <div className="text-[10px] font-bold text-gray-400">Elective Subjects:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {WBCHSE_ARTS_ELECTIVE.map(subj => (
                        <button key={subj} onClick={() => toggleOptionalSubject(subj)} className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${optionalSubjects.includes(subj) ? 'bg-pink-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                          {subj}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {stream === 'Commerce' && (
                  <>
                    <div className="text-[10px] font-bold text-gray-400">Compulsory: English</div>
                    <SearchableSelect label="Choose One Language" value={secondLang} onChange={setSecondLang} options={WBCHSE_COMMERCE_CHOOSE_ONE} />
                    <div className="text-[10px] font-bold text-gray-400">Elective Subjects:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {WBCHSE_COMMERCE_ELECTIVE.map(subj => (
                        <button key={subj} onClick={() => toggleOptionalSubject(subj)} className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${optionalSubjects.includes(subj) ? 'bg-pink-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                          {subj}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <SearchableSelect 
                  label="Add Subjects"
                  value=""
                  onChange={(val) => {
                    if (val && !optionalSubjects.includes(val)) {
                      setOptionalSubjects([...optionalSubjects, val]);
                    }
                  }}
                  options={[]}
                  placeholder="Type a subject"
                />
                <div className="flex flex-wrap gap-1.5">
                  {optionalSubjects.map(subj => (
                    <div key={subj} className="px-2 py-1 bg-white/10 text-white rounded-lg text-[10px] flex items-center gap-1.5">
                      {subj}
                      <button onClick={() => toggleOptionalSubject(subj)} className="text-rose-400 hover:text-rose-300">&times;</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button 
              onClick={() => setAvatarIndex(p => (p + 1) % avatars.length)}
              className="text-[10px] text-pink-400 font-bold hover:text-pink-300 transition-colors uppercase tracking-wider"
            >
              Cycle Avatar
            </button>

            <div className="flex flex-col items-end">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving || profileSaved}
              className={`py-2.5 px-6 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                profileSaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 
                isSaving ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed' :
                'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:brightness-110 active:scale-95 shadow-lg shadow-purple-500/20'
              }`}
            >
              {profileSaved ? (
                <><Check size={14} /> Saved</>
              ) : isSaving ? (
                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
              ) : (
                'Save Profile'
              )}
            </button>
            {saveError && <span className="text-[10px] text-rose-400 mt-1">{saveError}</span>}
            </div>

          </div>
        </div>

        {/* Application Preferences */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl  space-y-4 shadow-xl">
          <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-3">
            <Sliders size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Application Preferences</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white mb-0.5">Theme Selection</div>
                <div className="text-[10px] text-gray-400">Change your visual environment</div>
              </div>
              <button 
                onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors"
              >
                {theme.name || 'Select'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white mb-0.5">Language & Voice</div>
                <div className="text-[10px] text-gray-400">{appSettings.aiAssistantName}'s communication language</div>
              </div>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-black/40 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Bengali">Bengali</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white mb-0.5">Notifications</div>
                <div className="text-[10px] text-gray-400">Allow push notifications</div>
              </div>
              <button 
                onClick={() => permissionManager.requestPermission('notifications', 'Push Notifications', 'Sweety will send you alerts for missed calls, friend requests, and study reminders.')}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold"
              >
                Allow
              </button>
            </div>
          </div>
        </div>

        {/* Schedule & Alerts */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl  space-y-4 shadow-xl">
          <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-3">
            <Clock size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">Routine & Alerts</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-bold text-white mb-0.5">Study Routine Engine</div>
              <div className="text-[10px] text-gray-400">Auto-organize schedule based on school hours</div>
              <div className="mt-2 text-[10px] bg-amber-500/10 text-amber-300 px-2 py-1.5 rounded-lg border border-amber-500/20">
                Routine preferences sync automatically.
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-xs font-bold text-white mb-0.5">Reminders & Alarms</div>
              <div className="text-[10px] text-gray-400">Sound and vibration settings for upcoming subjects</div>
              <div className="mt-2 flex gap-2">
                <span className="text-[9px] uppercase tracking-wider font-bold bg-white/10 px-2 py-1 rounded-md">Vibration: On</span>
                <span className="text-[9px] uppercase tracking-wider font-bold bg-white/10 px-2 py-1 rounded-md">Sound: Watch Alarm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Safety */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-3">
            <Lock size={16} className="text-pink-400" />
            <h3 className="text-sm font-bold text-white">Privacy & Safety</h3>
          </div>
          
          <div className="space-y-4">
            {/* Request settings */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white mb-0.5">Message Requests</div>
                <div className="text-[10px] text-gray-400">Control who can send you messages</div>
              </div>
              <select 
                value={privacyRequests}
                onChange={(e) => setPrivacyRequests(e.target.value)}
                className="bg-black/40 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="everyone">Everyone</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white mb-0.5">Friend Requests</div>
                <div className="text-[10px] text-gray-400">Who can send you friend requests</div>
              </div>
              <select 
                value={userProfile?.privacyFriendRequests || 'everyone'}
                onChange={async (e) => {
                  const val = e.target.value;
                  const uRef = doc(db, 'users', currentUser.uid);
                  await updateDoc(uRef, { privacyFriendRequests: val });
                  onUpdateProfile({ ...userProfile, privacyFriendRequests: val });
                }}
                className="bg-black/40 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="everyone">Everyone</option>
                <option value="friends_of_friends">Friends of Friends</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Blocked users list */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Ban size={13} className="text-rose-400" />
                <span>Blocked Users ({blockedUsersList.length})</span>
              </div>
              
              {loadingBlocked ? (
                <div className="py-2 text-center">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : blockedUsersList.length === 0 ? (
                <p className="text-[10px] text-gray-500 italic">No blocked users.</p>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {blockedUsersList.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 bg-black/20 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-[10px] text-indigo-400 overflow-hidden shrink-0">
                          {u.customAvatarUrl ? (
                            <img src={u.customAvatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{u.fullName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-white truncate">{u.fullName}</p>
                          <p className="text-[9px] text-indigo-400 truncate">@{u.username || 'unknown'}</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!currentUser) return;
                          try {
                            const uRef = doc(db, 'users', currentUser.uid);
                            await updateDoc(uRef, {
                              blockedUsers: arrayRemove(u.id)
                            });
                            onUpdateProfile({
                              ...userProfile,
                              blockedUsers: (userProfile.blockedUsers || []).filter((uid: string) => uid !== u.id)
                            });
                          } catch (err) {
                            console.error('Failed to unblock:', err);
                          }
                        }}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/25 text-rose-300 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 shrink-0"
                      >
                        <UserMinus size={11} /> Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Management */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl  space-y-4 shadow-xl">
          <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-3">
            <LogOut size={16} className="text-red-400" />
            <h3 className="text-sm font-bold text-white">Account Management</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white mb-0.5">Connected Identity</div>
                <div className="text-[10px] text-gray-400">{currentUser?.email || 'Guest Operator'}</div>
              </div>
              <button 
                onClick={onLogout}
                className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Security & System */}
        {isAdmin && (
          <div className="bg-white/5 border border-white/10 p-5 rounded-3xl  space-y-4 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-rose-400" />
              <h3 className="text-sm font-bold text-white">System Override</h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center justify-between">
                <span>Custom Gemini API Key</span>
                {keySaved && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={10} /> Active</span>}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/40 border border-white/10 p-3 pl-10 pr-10 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
                <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <button 
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                If provided, this key overrides the server defaults. Your key is stored locally and never synced.
              </p>
              <button
                onClick={handleSaveApiKey}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all mt-2 flex items-center justify-center gap-2"
              >
                {saveSuccess ? <span className="text-emerald-400">Configured Successfully</span> : 'Apply Override Configuration'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
