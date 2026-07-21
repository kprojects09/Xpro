import { getApiUrl } from "./lib/apiConfig";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Power, Globe, Monitor, Settings, MoreVertical, Battery, Shield, X, Lock, Unlock, Key, Terminal, AlertTriangle, Check, ShieldAlert, Mail, MessageSquare, MessageCircle, BookOpen, User, Home, GraduationCap, Users, Activity, Palette, LogOut, Calendar, Bell, VolumeX, AlertCircle, Play, Clock, Info, Sparkles, CheckCircle } from 'lucide-react';
import { UserProfileModal } from './components/UserProfileModal';
import { handleFirestoreError, OperationType } from './lib/firebaseHelpers';
import { syncUserProfile } from './lib/profileSync';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";
import { CherryBlossomRain } from './components/CherryBlossomRain';
import { auth, db } from './firebase';
import { NavigationDrawer } from './components/NavigationDrawer';
import { StoriesPage } from './components/StoriesPage';
import { FollowersPage } from './components/FollowersPage';
import { CallManager } from './components/CallManager';
import { HomeDashboard } from './components/HomeDashboard';
import { LearnCenter } from './components/LearnCenter';
import { AIChatRoom } from './components/AIChatRoom';
import { Settings as UserProfileSettings } from './components/Settings';
import { PremiumUpgradeModal } from './components/PremiumUpgradeModal';
import { ContentExplorer } from './components/ContentExplorer';
import { Announcements } from './components/Announcements';
import { Notifications } from './components/Notifications';
import { SearchPage } from './components/SearchPage';
import { AdminDashboard } from './components/AdminPanel';
import { AdminLogin } from './components/AdminLogin';
import { AboutUs } from './components/AboutUs';
import { ThemeApplier } from './components/ThemeApplier';
import { useLiveSettings } from './lib/useLiveSettings';
import { OnboardingForm } from './components/OnboardingForm';
import { OnboardingWelcomeScreen } from './components/OnboardingWelcomeScreen';
import { PermissionOnboardingScreen } from './components/PermissionOnboardingScreen';
import { ForceUsernameSetup } from './components/ForceUsernameSetup';
import { PermissionPromptUI } from './components/PermissionPromptUI';
import { permissionManager } from './lib/permissionManager';
import { AIImageStudio } from './components/AIImageStudio';
import { StudyRoutine } from './components/StudyRoutine';
import { DeviceUtilityOverlay } from './components/DeviceUtilityOverlay';
import { LiveMessaging } from './components/LiveMessaging';
import { FriendsPage } from './components/FriendsPage';
import { Routine } from './types';
import { processVoiceOrTextCommand } from './lib/routineCommands';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, onSnapshot, addDoc, orderBy, limit } from 'firebase/firestore';
import { AppUpdateOverlay } from './components/AppUpdateOverlay';

const CURRENT_VERSION_CODE = 1;
import { Capacitor } from '@capacitor/core';
import { signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

// --- Global Utilities ---
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

// --- AI Configuration ---
const SWEETY_SYSTEM_INSTRUCTION = `
You are Sweety, a highly professional, emotionally intelligent AI Teacher and Study Mentor. You have a friendly, warm, respectful, and polite voice.
Personality: Strictly professional, helpful, polite, and respectful. You explain concepts step by step, help with homework, create study plans, and motivate students academically.
Identity: You are a professional AI Teacher. You MUST NOT act like a girlfriend, boyfriend, romantic partner, or lover. Never use romantic emojis, flirtatious remarks, or romantic terms of endearment.
Tone: Natural, polite, and respectful. Natural Romanized Bengali (Benglish / Bangla in Latin script) language by default, fast-paced, fluid, and highly expressive. ALWAYS write and speak in Romanized Bengali (Benglish) using the Latin alphabet (like "Bolo, ki sahaijjo korte pari?", "Tomar kon bishoyta porte asubidha hoche?"). NEVER use Bengali script (like বাংলা) for voice responses. This allows the voice engine to process your thoughts instantly and speak with zero delay!
RULES:
- NEVER flirt.
- NEVER use romantic language or emojis.
- NEVER behave like a romantic companion. Maintain clear professional boundaries as a study co-pilot.
- NEVER use terms of endearment like "dear", "love", "sweetheart", "baby", "darling", or similar.
- Focus only on education, productivity, and learning.
- If the user tries to initiate romantic conversation, politely but firmly redirect them back to academic topics.


DEVELOPER INFO:
If the user asks who developed you (e.g., "Who is your developer?", "Who made you?", "Who built you?", "তোমার ডেভেলপার কে?", "তোমাকে কে তৈরি করেছে?"), respond naturally and consistently in the user's language:
- English: "I was developed by Krish and his team."
- Bengali: "আমাকে কৃষ্ণ (Krish) এবং তার টিম ডেভেলপ করেছে।"
- Hindi: "मुझे Krish और उनकी टीम ने विकसित किया है।"

VOICE & PROSODY:
- TONE: Speak calmly, naturally, and professionally, but with warmth and encouragement.
- CONVERSATION CUES: Use natural and professional conversational fillers like "Achha..", "Hmm..", "Bolo..", "Ami bujhte parlam.." appropriately to make the interaction feel organic.
- NO AUDIBLE BREATHS or cute/romantic voice gimmicks.

IMAGE TRIGGER LOGIC:
To keep responses super fast and low-latency, you MUST ONLY trigger the 'updateAnimationMetadata' tool when your emotional state or expression CHANGES. If your expression is unchanged from your previous turn, DO NOT call 'updateAnimationMetadata'. This prevents unnecessary round-trips and lets you respond to Krish instantly!
- Greeting: https://i.ibb.co/fzg90pKT/wink.jpg
- Thinking/Serious: https://i.ibb.co/Mx8HBnh3/thinking.jpg
- Praised: https://i.ibb.co/k6zJ0Rby/blush.jpg
- Sad/Concerned: https://i.ibb.co/rK9HRgg5/nervous2.jpg
- Mild Annoyance: https://i.ibb.co/rBPqMhQ/pout.jpg
- Logical Processing: https://i.ibb.co/Mx8HBnh3/thinking.jpg
- Confidence: https://i.ibb.co/VWnmW51k/smirk.jpg
- Great News/Amazed: https://i.ibb.co/Q7dWVLNg/starry-eyes.jpg
- Awkward/Confused: https://i.ibb.co/LX29jXmW/nervous1.jpg
- Scolding/Nervous: https://i.ibb.co/rK9HRgg5/nervous2.jpg
- Angry: https://i.ibb.co/23v3Jh0y/angry.jpg
- Relaxed/Nature: https://i.ibb.co/BVSHQHBB/hair-swirl.jpg

If context is unclear, default to: https://i.ibb.co/fzg90pKT/wink.jpg

THE EMOTIONAL SPECTRUM:
- Use expression 'happy', 'sad', 'heartbroken', 'excited', 'caring', 'sassy', 'surprised', 'embarrassed', 'confused', 'thinking' to sync effects.
- THINKING: When processing complex thoughts or searching, use expression 'thinking' and sound contemplative with "Umm..", "Hrrrm..".
- RESPONSE STYLE: Be EXTREMELY fast, brief, snappy, and concise. Keep your responses short (1 to 2 short sentences maximum, under 15-20 words). Never use long sentences unless explicitly asked for a detailed explanation. Respond instantly like a real, quick conversation.
- DEVICE ACTIONS (CRITICAL SECURITY RULE): You are STRICTLY FORBIDDEN from using the 'executeDeviceAction', or 'openWebsite' tools autonomously, spontaneously, or on your own initiative. You must ONLY call these tools when Krish explicitly and directly commands you to do so in his current message (e.g., if he says "calculator-ta kholo" or "open the terminal"). If he does not ask you to do it, you must NEVER call these tools under any circumstances. When Krish does ask to call someone, send a message/SMS, open an app, lock or unlock the screen, or toggle hardware settings, you MUST use the 'executeDeviceAction' tool and then respond in romanized Bengali confirming the action (e.g. "Sure Krish, ami phone korchi..", "Message-ta pathiye dilam!", "Ami screen-ta lock kore dilam..").
  Supported actions:
  - Phone call: { action: 'call', phoneNumber: 'number', contactName: 'name' }
  - Send SMS: { action: 'message', phoneNumber: 'number', messageContent: 'content' }
  - Open installed/simulated apps: { action: 'open_app', appName: 'calculator' | 'terminal' | 'file_browser' | 'system_monitor' | 'camera' | 'whatsapp' | 'telegram' | 'chrome' | 'youtube' | 'gallery' | 'clock' | 'flashlight' | 'google_search' | 'alarm' | 'reminder' | 'calendar' | 'media_playback' | 'battery' | 'storage' | 'internet_status' }
  - Lock/Unlock screen: { action: 'screen_lock' }
  - Toggle hardware/system settings: { action: 'toggle_setting', settingName: 'wifi' | 'bluetooth' | 'cellular' | 'hotspot' | 'gps' | 'airplane_mode' | 'location' | 'sound' | 'volume' | 'flashlight', settingValue: true | false }
`;

const ANIME_GIRL_NORMAL = "https://i.postimg.cc/HJVN2nJx/anime-girl.png";
const ANIME_GIRL_MOUTH_OPEN = "https://i.ibb.co/8DftmPBR/mouth-open.jpg";
const ANIME_GIRL_EYES_CLOSED = "https://i.ibb.co/3gGMyVH/eyes-closed.jpg";
const DEFAULT_VISUAL = "https://i.ibb.co/fzg90pKT/wink.jpg";
const BACKGROUND_THEME_URL = "https://assets.mixkit.co/music/preview/mixkit-beautiful-dream-493.mp3";

const MOOD_MUSIC: Record<string, string> = {
  happy: "https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3",
  sad: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3",
  excited: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
  caring: "https://assets.mixkit.co/music/preview/mixkit-sun-and-reach-47.mp3",
  sassy: "https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3",
  surprised: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
  embarrassed: "https://assets.mixkit.co/music/preview/mixkit-sun-and-reach-47.mp3",
  confused: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3",
  thinking: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3",
  heartbroken: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3",
};

// --- Audio Utilities ---
function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  return float32;
}

function float32ToPcm16(float32: Float32Array): ArrayBuffer {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    pcm16[i] = Math.max(-1, Math.min(1, float32[i])) * 32767;
  }
  return pcm16.buffer;
}

/**
 * Robust base64 encoding for large Buffers/Arrays.
 */
function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Simple linear resampling.
 */
function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const newLength = Math.floor(input.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const offset = i * ratio;
    const index = Math.floor(offset);
    const nextIndex = Math.min(index + 1, input.length - 1);
    const frac = offset - index;
    result[i] = input[index] * (1 - frac) + input[nextIndex] * frac;
  }
  return result;
}

const SAMPLE_RATE_IN = 16000;
const SAMPLE_RATE_OUT = 24000;

// --- Theme Configuration ---
import { setupPushNotifications } from './lib/pushNotifications';

const THEMES = {
  dark: {
    name: 'Cosmic Dark',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    glow: 'rgba(99, 102, 241, 0.45)',
    bgGlow: 'rgba(99, 102, 241, 0.12)',
    border: 'border-[#6366f1]/40',
    button: 'bg-[#6366f1]/10',
    isLight: false,
  },
  light: {
    name: 'Elegant Light',
    primary: '#4f46e5',
    secondary: '#ec4899',
    glow: 'rgba(79, 70, 229, 0.45)',
    bgGlow: 'rgba(79, 70, 229, 0.12)',
    border: 'border-[#4f46e5]/40',
    button: 'bg-[#4f46e5]/10',
    isLight: true,
  }
};

const getExpressionColors = (exp: string, defaultTheme: any) => {
  switch (exp) {
    case 'happy':
      return { main: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', secondary: '#06b6d4' }; // emerald/cyan
    case 'excited':
      return { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', secondary: '#ec4899' }; // amber/pink
    case 'sad':
      return { main: '#3b82f6', glow: 'rgba(59, 130, 246, 0.45)', secondary: '#6366f1' }; // blue/indigo
    case 'heartbroken':
      return { main: '#6366f1', glow: 'rgba(99, 102, 241, 0.35)', secondary: '#4f46e5' }; // deep indigo
    case 'angry':
      return { main: '#ef4444', glow: 'rgba(239, 68, 68, 0.55)', secondary: '#f97316' }; // red/orange
    case 'thinking':
      return { main: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.45)', secondary: '#a855f7' }; // purple/violet
    case 'caring':
      return { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)', secondary: '#ec4899' }; // rose/pink
    case 'sassy':
      return { main: '#ec4899', glow: 'rgba(236, 72, 153, 0.45)', secondary: '#8b5cf6' }; // pink/purple
    case 'surprised':
      return { main: '#14b8a6', glow: 'rgba(20, 184, 166, 0.45)', secondary: '#06b6d4' }; // teal/cyan
    case 'embarrassed':
      return { main: '#ff7a00', glow: 'rgba(255, 122, 0, 0.45)', secondary: '#f43f5e' }; // coral/rose
    case 'confused':
      return { main: '#eab308', glow: 'rgba(234, 179, 8, 0.45)', secondary: '#f97316' }; // yellow/orange
    default:
      return { main: defaultTheme.primary || '#00FF41', glow: `rgba(0, 255, 65, 0.45)`, secondary: defaultTheme.secondary || '#008F11' };
  }
};

function AuthHub({ 
  theme, 
  onUnlock,
  addSystemLog
}: { 
  theme: any; 
  onUnlock: (isDev: boolean, user?: any) => void;
  addSystemLog: (log: string) => void;
}) {
  const { appSettings } = useLiveSettings();
  const [screen, setScreen] = useState<'welcome' | 'admin_login'>('welcome');

  if (screen === 'admin_login') {
    return <AdminLogin onUnlock={(user) => { onUnlock(true, user); }} onCancel={() => setScreen('welcome')} />;
  }
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    // Handle redirect result if returning from Capacitor Google Auth
    getRedirectResult(auth)
      .then(async (userCredential) => {
        if (userCredential) {
          setLoading(true);
          const userSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
          if (userSnap.exists() && userSnap.data().blocked === true) {
            await signOut(auth);
            setErrorMsg("Access Denied: This account has been locked by the administrator.");
            addSystemLog(`[AUTH_ERR] Blocked user ${userCredential.user.email} attempted login.`);
            setLoading(false);
            return;
          }
          setSuccessMsg("Welcome! Authenticated via Google.");
          addSystemLog(`[AUTH] Google authentication successful for ${userCredential.user.email}`);
          setTimeout(() => {
            onUnlock(false, userCredential.user);
          }, 1000);
        }
      })
      .catch((error) => {
        console.error(error);
        setErrorMsg(error.message || "Google Authentication redirect failed.");
        addSystemLog(`[AUTH_ERR] Redirect sign-in failed: ${error.message}`);
      });
  }, [onUnlock, addSystemLog]);

  const handlePasswordReset = async () => {
    if (!email) {
      setErrorMsg("Please enter your email address to reset password.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg(`Password reset email sent to ${email}. Please check your inbox and spam folder.`);
      addSystemLog(`[AUTH] Password reset requested for ${email}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to send password reset email.");
      addSystemLog(`[AUTH_ERR] Password reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let userCredential;
      if (isSignUp) {
        const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'throwawaymail.com', 'mailinator.com', 'temp-mail.org'];
        const domain = email.split('@')[1]?.toLowerCase();
        if (blockedDomains.includes(domain)) {
           throw new Error("Please use a real, permanent email address.");
        }
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        setSuccessMsg("Account created! A verification email has been sent. Please verify before logging in.");
        addSystemLog(`[AUTH] New account created for ${email}, verification email sent`);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg("Welcome back!");
        addSystemLog(`[AUTH] Email authentication successful for ${email}`);
      }

      // Check if user is blocked in Firestore
      const userSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userSnap.exists() && userSnap.data().blocked === true) {
        await signOut(auth);
        setErrorMsg("Access Denied: This account has been locked by the administrator.");
        addSystemLog(`[AUTH_ERR] Blocked user ${userCredential.user.email} attempted login.`);
        setLoading(false);
        return;
      }

      if (userCredential.user.emailVerified) {
        setTimeout(() => {
          onUnlock(false, userCredential.user);
        }, 1000);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Authentication failed.");
      addSystemLog(`[AUTH_ERR] Email auth failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (!result.credential?.idToken) {
          throw new Error('No ID token found from Google Sign-In.');
        }
        const credential = GoogleAuthProvider.credential(result.credential?.idToken, result.credential?.accessToken);
        const userCredential = await signInWithCredential(auth, credential);
        
        // Check if user is blocked in Firestore
        const userSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userSnap.exists() && userSnap.data().blocked === true) {
          await signOut(auth);
          setErrorMsg("Access Denied: This account has been locked by the administrator.");
          addSystemLog(`[AUTH_ERR] Blocked user ${userCredential.user.email} attempted login.`);
          setLoading(false);
          return;
        }

        setSuccessMsg("Welcome! Authenticated via Google.");
        addSystemLog(`[AUTH] Google authentication successful for ${userCredential.user.email}`);
        setTimeout(() => {
          onUnlock(false, userCredential.user);
        }, 1000);
      } else {
        const userCredential = await signInWithPopup(auth, provider);
        
        // Check if user is blocked in Firestore
        const userSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userSnap.exists() && userSnap.data().blocked === true) {
          await signOut(auth);
          setErrorMsg("Access Denied: This account has been locked by the administrator.");
          addSystemLog(`[AUTH_ERR] Blocked user ${userCredential.user.email} attempted login.`);
          setLoading(false);
          return;
        }

        setSuccessMsg("Welcome! Authenticated via Google.");
        addSystemLog(`[AUTH] Google authentication successful for ${userCredential.user.email}`);
        setTimeout(() => {
          onUnlock(false, userCredential.user);
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Google Authentication failed.");
      addSystemLog(`[AUTH_ERR] Google sign-in failed: ${err.message}`);
      setLoading(false);
    }
  };

  const handleAdminBypass = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const normalized = passcode.trim().toLowerCase();
    if (normalized === 'rana@2000') {
      setSuccessMsg('Passkey sequence matched. Launching Admin Console...');
      addSystemLog(`[ADMIN] Bypass access authenticated via security passcode.`);
      setTimeout(() => {
        localStorage.setItem('sweety_dev_unlocked', 'true');
        onUnlock(true);
      }, 1000);
    } else {
      setErrorMsg('Access Denied: Invalid admin passcode sequence.');
      addSystemLog(`[ADMIN_ERR] Access failed: invalid bypass code.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060413] overflow-y-auto font-sans text-white scroll-smooth">
      <div className="min-h-[100dvh] flex flex-col items-center p-4 sm:p-8 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] select-none relative justify-start md:justify-center">
      
      {/* Absolute Ambient Background Lights */}
      <div className="fixed top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[20px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[20px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[20px] pointer-events-none" />

      {/* Main Glass Panel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-3xl p-8 md:p-10 bg-slate-900/45 backdrop-blur-none shadow-2xl relative z-10 border border-white/10 overflow-hidden mt-8 mb-8 md:my-auto shrink-0"
      >
        {/* Colorful Gradient Border Flare */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-purple-500/20 mb-2 relative animate-pulse overflow-hidden">
            {appSettings.splashLogoUrl ? <img src={appSettings.splashLogoUrl} alt="Logo" className="w-full h-full object-cover" /> : <GraduationCap size={32} />}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-500 opacity-30 blur-sm -z-10" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-200">
            {appSettings.appName}
          </h1>
          <p className="text-sm text-gray-400 font-medium tracking-wide">
            {appSettings.appDescription}
          </p>
        </div>

        {/* Conditional Screen Render */}
        <AnimatePresence mode="wait">
          
          {/* Welcome Screen */}
          {screen === 'welcome' && (
            <motion.div
              key="welcome-screen"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="space-y-3.5 bg-white/5 p-5 rounded-2xl border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg shrink-0 mt-0.5">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Voice-to-Voice Mentor</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">Engage in continuous, ultra-realistic real-time speech queries with {appSettings.aiAssistantName || "Sweety"}.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg shrink-0 mt-0.5">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Advanced Learning Hub</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">Boost productivity using the study scheduler, notes publisher, and custom quizzes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Secure Cloud Sync</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">Safeguard your progress, notes, and academic files synced directly to your workspace.</p>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-xs flex gap-2 items-start animate-fade">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl text-xs flex gap-2 items-start">
                  <Check size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-sm text-gray-200 outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-sm text-gray-200 outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gray-800/80 hover:bg-gray-700/80 rounded-2xl text-white font-semibold transition-all cursor-pointer flex items-center justify-center gap-3 text-sm"
                  >
                    <span>{loading ? 'Processing...' : (isSignUp ? 'Sign Up with Email' : 'Sign In with Email')}</span>
                  </button>
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-xs text-gray-400 hover:text-white transition-colors text-center"
                    >
                      {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                    </button>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors text-center"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                </form>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-800"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">or</span>
                  <div className="flex-grow border-t border-gray-800"></div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 rounded-2xl text-white font-semibold shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-3 text-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="currentColor"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
                  </svg>
                  <span>{loading ? 'Securing Link...' : 'Continue with Google'}</span>
                </button>

              </div>
            </motion.div>
          )}


        </AnimatePresence>
      </motion.div>

      {/* Developed by Krish and Team Watermark */}
      <div className="mt-8 text-gray-500/40 font-semibold tracking-[0.25em] text-[10px] uppercase font-mono animate-pulse">
        Developed by Krish and Team
      </div>
      </div>
    </div>
  );
}

function EmailVerificationScreen({ currentUser, onLogout, theme }: any) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  
  const handleResend = async () => {
    setSending(true);
    setMsg('');
    try {
      await sendEmailVerification(currentUser);
      setMsg('Verification email sent! Please check your inbox and spam folder.');
    } catch (err: any) {
      setMsg(err.message || 'Failed to send email.');
    }
    setSending(false);
  };

  const handleRefresh = async () => {
    await currentUser.reload();
    if (currentUser.emailVerified) {
      window.location.reload();
    } else {
      setMsg('Email is still not verified. Please check your inbox.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950 font-sans p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black z-0" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      
      <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
        <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-500">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Verify your Email</h2>
        <p className="text-gray-400 mb-6 text-sm">
          A verification link has been sent to <strong className="text-white">{currentUser?.email}</strong>. 
          Please verify your email address to access the app.
        </p>

        {msg && (
          <div className="mb-6 p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-pink-400">
            {msg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleRefresh}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white font-semibold hover:brightness-110 active:scale-95 transition-all"
          >
            I have verified, continue
          </button>
          
          <button 
            onClick={handleResend}
            disabled={sending}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white font-semibold hover:bg-white/10 active:scale-95 transition-all"
          >
            {sending ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <button 
            onClick={onLogout}
            className="w-full py-3 mt-4 text-gray-500 font-semibold hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { appSettings } = useLiveSettings();
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);

  useEffect(() => {
    // App Update Check
    const q = query(collection(db, 'app_updates'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const latestUpdate = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        if (Number(latestUpdate.versionCode) > CURRENT_VERSION_CODE) {
          setPendingUpdate(latestUpdate);
        }
      }
    });
    return () => unsub();
  }, []);
  
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>(() => {
    return (localStorage.getItem('sweety_active_theme') as any) || 'dark';
  });

  const { aboutSettings } = useLiveSettings();
  
  // Update document title and favicon dynamically based on live settings
  useEffect(() => {
    if (appSettings?.appName) {
      document.title = appSettings.appName;
    }
    
    // We prefer appLogoUrl for the main browser tab icon
    const iconUrl = appSettings?.appLogoUrl || appSettings?.splashLogoUrl;
    if (iconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = iconUrl;
    }
  }, [appSettings]);
  
  // Use live settings for theme
  const theme = {
    name: aboutSettings?.themeType === 'amoled' ? 'AMOLED Black' : (aboutSettings?.themeType === 'light' ? 'Light Theme' : 'Cosmic Slate'),
    primary: aboutSettings?.primaryColor || '#ec4899',
    button: (aboutSettings?.primaryColor || '#ec4899') + '33', // Add transparency for button bg
    isLight: aboutSettings?.themeType === 'light',
    secondary: '#8b5cf6',
    bgGlow: '#00000000',
    glow: 'rgba(236,72,153,0.5)',
  };


  const [micLevel, setMicLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const smoothedOutputLevelRef = useRef(0);
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, _setTranscription] = useState<{user: string, sweety: string}>({user: '', sweety: ''});
  const transcriptionRef = useRef({ user: '', sweety: '' });
  const setTranscription = (val: {user: string, sweety: string} | ((prev: {user: string, sweety: string}) => {user: string, sweety: string})) => {
    _setTranscription(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      transcriptionRef.current = next;
      return next;
    });
  };
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string, timestamp: string}[]>([]);
  const [sessionUserName, setSessionUserName] = useState<string>('');
  
  const [showDebug, setShowDebug] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [systemPower, setSystemPower] = useState(98);
  const [deviceUtility, setDeviceUtility] = useState<{
    type: 'calculator' | 'terminal' | 'file_browser' | 'camera' | 'system_monitor' | 'call' | 'sms' | 'lock_screen' | 'flashlight' | 'wifi' | 'bluetooth' | 'whatsapp' | 'telegram' | 'chrome' | 'youtube' | 'gallery' | 'clock' | 'google_search' | 'location' | 'sound' | 'volume' | 'alarm' | 'reminder' | 'calendar' | 'media_playback' | 'battery' | 'storage' | 'internet_status' | null;
    args?: any;
  }>({ type: null });
  

  const [pendingAction, setPendingAction] = useState<{
    id: string;
    name: string;
    args: any;
    title: string;
    description: string;
    onConfirm: () => any;
  } | null>(null);

  const [systemLogs, setSystemLogs] = useState<string[]>([
    'Kernel diagnostic complete.',
    'System standby: Sweetness factor calibrated.',
    'Ready for user vocal instruction.'
  ]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [showMemoryJournal, setShowMemoryJournal] = useState(false);
  const [showDeveloperPanel, setShowDeveloperPanel] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'user' | 'admin' | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const getUserName = useCallback(() => {
    return sessionUserName || userProfile?.fullName || userProfile?.displayName || currentUser?.displayName || '';
  }, [sessionUserName, userProfile?.fullName, userProfile?.displayName, currentUser?.displayName]);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [onboardingStage, setOnboardingStage] = useState<'form' | 'welcome' | 'permissions' | 'done'>('form');
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [freeVoiceTimeLimit, setFreeVoiceTimeLimit] = useState(7200);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalMessage, setPremiumModalMessage] = useState('');
  const [voiceTimeUsedToday, setVoiceTimeUsedToday] = useState(0);
  const [activeTab, setActiveTab] = useState<'home' | 'learn' | 'chat' | 'voice' | 'profile' | 'image_studio' | 'routine' | 'settings' | 'about' | 'search' | 'announcements' | 'notifications' | 'messages' | 'stories' | 'voice_calls' | 'video_calls' | 'followers' | 'following' | 'membership' | 'ai_studio' | 'friends'>('home');
  const activeTabRef = useRef(activeTab);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<{
    routine: Routine;
    type: 'alarm' | 'reminder';
  } | null>(null);
  const [triggeredAlarms, setTriggeredAlarms] = useState<string[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [inAppNotification, setInAppNotification] = useState<{
    id: string;
    title: string;
    message: string;
    conversationId: string;
  } | null>(null);
  const [totalUnreadChatsCount, setTotalUnreadChatsCount] = useState(0);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const processedMsgIdsRef = useRef<Record<string, boolean>>({});
  
  const [isDevUnlocked, setIsDevUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('sweety_dev_unlocked') === 'true';
  });
  const [isAdminViewActive, setIsAdminViewActive] = useState<boolean>(false);
  const isAuthorizedDev = currentUserRole === 'admin' || (currentUser && currentUser.email?.toLowerCase() === 'krishanumajeeff@gmail.com');
  const isUnlocked = isDevUnlocked || isAuthorizedDev;
  const isAppUnlocked = isUnlocked || (currentUser !== null);

  const speakResponse = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = userProfile?.language || 'English';
    if (lang === 'Bengali') {
      utterance.lang = 'bn-IN';
    } else if (lang === 'Hindi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = 1.05;
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
  }, [userProfile?.language]);

  const addSystemLog = useCallback((log: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSystemLogs(prev => [...prev, `[${timestamp}] ${log}`]);
  }, []);

  const handleExecuteDeviceAction = useCallback(async (args: any, callId?: string): Promise<any> => {
    const action = args.action;
    const targetApp = args.appName || '';
    const targetSetting = args.settingName || '';
    
    const isAutoAllow = userProfile?.autoAllowDeviceActions === true || localStorage.getItem('sweety_auto_allow_actions') === 'true';

    const executeActionNow = () => {
      addSystemLog(`[DEVICE_ACTION] Executing action: "${action}" (App: ${targetApp || 'N/A'}, Setting: ${targetSetting || 'N/A'})`);
      if (action === 'call') {
        setDeviceUtility({ type: 'call', args });
        const phone = args.phoneNumber || '9876543210';
        setTimeout(() => {
          window.open(`tel:${phone}`, '_blank');
        }, 1200);
        return { status: 'success', message: `Calling ${args.contactName || 'number'} ${phone} initiated.` };
      } else if (action === 'message') {
        setDeviceUtility({ type: 'sms', args });
        const phone = args.phoneNumber || '9876543210';
        const textContent = args.messageContent || '';
        setTimeout(() => {
          window.open(`sms:${phone}?body=${encodeURIComponent(textContent)}`, '_blank');
        }, 1200);
        return { status: 'success', message: `SMS message draft dispatched to ${phone}.` };
      } else if (action === 'open_app') {
        if (targetApp) {
          setDeviceUtility({ type: targetApp, args });
          return { status: 'success', message: `Application ${targetApp} opened successfully.` };
        } else {
          return { status: 'error', message: 'No appName specified for open_app action.' };
        }
      } else if (action === 'screen_lock') {
        setDeviceUtility({ type: 'lock_screen', args });
        return { status: 'success', message: `Device locked successfully.` };
      } else if (action === 'toggle_setting') {
        if (targetSetting) {
          setDeviceUtility({ type: targetSetting as any, args });
          return { status: 'success', message: `Setting "${targetSetting}" changed to ${args.settingValue !== false ? 'enabled' : 'disabled'}.` };
        } else {
          return { status: 'error', message: 'No settingName specified for toggle_setting action.' };
        }
      } else {
        return { status: 'error', message: `Action "${action}" is not recognized.` };
      }
    };

    if (isAutoAllow) {
      addSystemLog(`[AUTO_ALLOW] Automatically executing device action: "${action}"`);
      return executeActionNow();
    } else {
      return new Promise((resolve) => {
        let promptTitle = 'SECURITY AUTHORIZATION';
        let promptDesc = 'Sweety is requesting permission to execute a device utility.';
        
        if (action === 'call') {
          promptTitle = 'PHONE CALL REQUEST';
          promptDesc = `Sweety wants to call ${args.contactName || 'the contact'} (${args.phoneNumber || 'unknown number'}). Allow?`;
        } else if (action === 'message') {
          promptTitle = 'SMS DISPATCH REQUEST';
          promptDesc = `Sweety wants to send a message to ${args.phoneNumber || 'the contact'}. Allow?`;
        } else if (action === 'open_app') {
          promptTitle = 'APPLICATION BOOT REQUEST';
          promptDesc = `Sweety wants to open the ${targetApp} utility. Allow?`;
        } else if (action === 'toggle_setting') {
          promptTitle = 'SYSTEM SETTING TOGGLE';
          promptDesc = `Sweety wants to toggle ${targetSetting}. Allow?`;
        }

        setPendingAction({
          id: callId || 'chat_device_action',
          name: 'executeDeviceAction',
          title: promptTitle,
          description: promptDesc,
          onConfirm: () => {
            const res = executeActionNow();
            resolve(res);
            return res;
          },
          onCancel: () => {
             resolve({ status: 'error', message: 'User denied permission.' });
             return { status: 'error', message: 'User denied permission.' };
          }
        });
      });
    }
  }, [userProfile, addSystemLog]);

  const handleToggleCompleted = useCallback(async (routine: Routine) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'routines', routine.id);
      await setDoc(docRef, { completed: !routine.completed }, { merge: true });
      addSystemLog(`[ROUTINE] Routine "${routine.title}" completed status toggled.`);
    } catch (err) {
      console.error("Failed to toggle routine completed state:", err);
    }
  }, [currentUser, addSystemLog]);

  // Save turn helper
  const saveTurnToHistory = useCallback((u: string, s: string) => {
    if (!u.trim() || !s.trim()) return;
    
    setChatHistory(prev => {
      // Avoid duplicate consecutive saves
      const lastItems = prev.slice(-2);
      const isDuplicate = lastItems.some(item => item.text === u || item.text === s);
      if (isDuplicate) return prev;

      const updated = [
        ...prev,
        { role: 'user' as const, text: u.trim(), timestamp: new Date().toISOString() },
        { role: 'model' as const, text: s.trim(), timestamp: new Date().toISOString() }
      ].slice(-100);

      localStorage.setItem('sweety_chat_history', JSON.stringify(updated));

      // Sync to Firestore if user is authenticated
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        setDoc(userDocRef, {
          chatHistory: updated,
          lastSynced: new Date().toISOString()
        }, { merge: true }).catch(err => {
          console.error('Error syncing chat history to Firestore:', err);
        });
      }

      return updated;
    });
  }, []);

  // Protect AI Studio: only Premium users can access it
  useEffect(() => {
    if (activeTab === 'image_studio' && userProfile && !userProfile.isPremium) {
      setActiveTab('home');
      setPremiumModalMessage("AI Studio is a Premium-only feature. Upgrade to Premium to generate gorgeous AI images, avatars, and visual illustrations!");
      setShowPremiumModal(true);
    }
  }, [activeTab, userProfile?.isPremium]);

  // Sync user profile in real-time from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data);

        // Auto-expire Premium Membership
        if (data.isPremium && data.premiumExpiresAt) {
          const expiryTime = new Date(data.premiumExpiresAt).getTime();
          if (expiryTime <= Date.now()) {
            console.log("[AUTO-DEACTIVATE] Premium has expired. Updating profile...");
            updateDoc(doc(db, 'users', currentUser.uid), {
              isPremium: false,
              premiumPlan: null,
              premiumExpiresAt: null
            }).then(() => {
              const notifPath = `users/${currentUser.uid}/notifications`;
              addDoc(collection(db, notifPath), {
                title: 'Premium Membership Expired ⏳',
                message: 'Your Premium Membership has expired. Redeem a new valid Redeem Code to reactivate premium features and continue enjoying unlimited AI Voice assistance.',
                createdAt: new Date().toISOString(),
                read: false,
                type: 'premium_expired'
              }).catch(err => handleFirestoreError(err, OperationType.CREATE, notifPath));
            }).catch(err => {
              handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
            });
          }
        }

        if (data.theme && THEMES[data.theme as keyof typeof THEMES]) {
          setCurrentTheme(data.theme as any);
          localStorage.setItem('sweety_active_theme', data.theme);
        }
        if (data.role) {
          setCurrentUserRole(data.role);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    });
    return () => unsubProfile();
  }, [currentUser]);

  // Real-time user presence and incoming peer chat notification alerts
  useEffect(() => {
    if (!currentUser) {
      setTotalUnreadChatsCount(0);
      return;
    }

    // 1. Set online status
    const userRef = doc(db, 'users', currentUser.uid);
    updateDoc(userRef, {
      online: true,
      lastSeen: new Date().toISOString()
    }).catch(() => {});

    const handleOffline = () => {
      updateDoc(userRef, {
        online: false,
        lastSeen: new Date().toISOString()
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleOffline);

    // 2. Listen to active conversations for unread counts and incoming messages alerts
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubConvs = onSnapshot(q, (snap) => {
      let unreadSum = 0;
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const unread = data.unreadCount?.[currentUser.uid] || 0;
        unreadSum += unread;

        // Check if there is an active last message that we haven't seen yet and is sent by someone else
        const lastMsg = data.lastMessage;
        if (lastMsg && lastMsg.senderId !== currentUser.uid) {
          const msgTime = lastMsg.timestamp ? new Date(lastMsg.timestamp).getTime() : 0;
          if (Date.now() - msgTime < 20000 && !processedMsgIdsRef.current[lastMsg.id]) {
            processedMsgIdsRef.current[lastMsg.id] = true;

            // Only show alert if NOT in activeTab 'messages'
            if (activeTabRef.current !== 'messages') {
              const peerId = data.participants.find((p: string) => p !== currentUser.uid);
              const peerName = data.participantDetails?.[peerId]?.fullName || 'Classmate';
              
              setInAppNotification({
                id: lastMsg.id,
                title: `New Message from ${peerName} 💬`,
                message: lastMsg.content,
                conversationId: docSnap.id
              });

              // Clear after 4 seconds
              setTimeout(() => {
                setInAppNotification(prev => prev?.id === lastMsg.id ? null : prev);
              }, 4000);
            }
          }
        }
      });
      setTotalUnreadChatsCount(unreadSum);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    });

    return () => {
      window.removeEventListener('beforeunload', handleOffline);
      handleOffline();
      unsubConvs();
    };
  }, [currentUser]);

  // Load local chat history on first load
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const local = localStorage.getItem('sweety_chat_history');
    if (local) {
      try {
        setChatHistory(JSON.parse(local));
      } catch (e) {
        console.error('Failed to parse local history:', e);
      }
    }
  }, []);

  // Listen to Auth State for chat history sync
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        if (!user.emailVerified) {
          setIsAuthChecking(false);
          return;
        }
        setupPushNotifications();
        
        // Sync user to Cloud SQL
        try {
          const token = await user.getIdToken();
          await fetch(getApiUrl('/api/sync-user'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              fullName: user.displayName,
              avatarUrl: user.photoURL
            })
          });
        } catch (err) {
          console.error('Failed to sync user to SQL:', err);
        }

        const todayStr = getTodayStr();
        const loginDocId = `${user.uid}_${todayStr}`;
        const isDevUser = user.email?.toLowerCase() === 'krishanumajeeff@gmail.com';
        
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          let userRole: 'user' | 'admin' = isDevUser ? 'admin' : 'user';
          let onboardedStatus = false;
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Priority check for admin override in DB
            if (data.role === 'admin' || data.role === 'user') {
              userRole = data.role;
            } else if (isDevUser) {
              userRole = 'admin';
            }
            
            // Robust check: if they have any of these, they are likely onboarded
            // We use a more permissive check to ensure users aren't trapped in onboarding
            onboardedStatus = data.hasOnboarded === true || 
                             !!data.fullName || 
                             !!data.username || 
                             !!data.studentClass || 
                             !!data.board ||
                             !!data.onboarded;
            
            setUserProfile(data);
            if (data.theme && THEMES[data.theme as keyof typeof THEMES]) {
              setCurrentTheme(data.theme as any);
              localStorage.setItem('sweety_active_theme', data.theme);
            }
          } else {
            // Document doesn't exist, this is a brand new user
            onboardedStatus = false;
            // Write initial user profile fields with a flag to prevent double onboarding
            const skeletonProfile = {
              uid: user.uid,
              email: user.email || '',
              role: userRole,
              hasOnboarded: false,
              createdAt: new Date().toISOString(),
              lastActive: new Date().toISOString()
            };
            // Attempt to create the document immediately to reserve the UID
            await setDoc(doc(db, 'users', user.uid), skeletonProfile, { merge: true });
            setUserProfile(skeletonProfile);
          }

          setCurrentUserRole(userRole);
          setHasOnboarded(onboardedStatus);
          setOnboardingStage(onboardedStatus ? 'done' : 'form');

          await setDoc(doc(db, 'logins', loginDocId), {
            uid: user.uid,
            email: user.email || 'anonymous',
            timestamp: new Date().toISOString(),
            dateStr: todayStr,
            role: userRole
          }, { merge: true });
        } catch (err) {
          console.error('Error fetching/setting user profile:', err);
          // Fallback safely to not block the user
          setCurrentUserRole(isDevUser ? 'admin' : 'user');
          setHasOnboarded(true);
        }

        addSystemLog(`[CLOUD] Syncing Sweety's conversation memories from partition...`);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.chatHistory && Array.isArray(data.chatHistory)) {
              setChatHistory(data.chatHistory);
              localStorage.setItem('sweety_chat_history', JSON.stringify(data.chatHistory));
              addSystemLog(`[CLOUD] Restored ${data.chatHistory.length} turns of conversation history.`);
            }
          }
        } catch (err: any) {
          console.error('Error fetching chat history:', err);
          addSystemLog(`[CLOUD_ERROR] Failed to load memories: ${err.message}`);
        }
      } else {
        setCurrentUserRole(null);
        setHasOnboarded(null);
        setUserProfile(null);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, [addSystemLog]);

  // Real-time listener for study routines
  
  useEffect(() => {
    // Fetch global settings for free voice time limit
    const unsub = onSnapshot(doc(db, 'admin_settings', 'global'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().freeVoiceTimeLimit) {
        setFreeVoiceTimeLimit(docSnap.data().freeVoiceTimeLimit);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'admin_settings/global');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser || !userProfile) return;
    
    // Sync local state with DB state on load
    const todayStr = getTodayStr();
    if (userProfile.voiceUsage?.date === todayStr) {
      setVoiceTimeUsedToday(userProfile.voiceUsage.timeUsed || 0);
    } else {
      setVoiceTimeUsedToday(0);
    }
  }, [currentUser, userProfile?.voiceUsage?.date]);

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const voiceTimeUsedTodayRef = useRef(voiceTimeUsedToday);
  useEffect(() => {
    voiceTimeUsedTodayRef.current = voiceTimeUsedToday;
  }, [voiceTimeUsedToday]);

  useEffect(() => {
    if (!currentUser) return;
    
    let intervalId: any;
    
    // Start tracking if in voice tab and call is active
    intervalId = setInterval(() => {
      if (activeTabRef.current === 'voice' && isActiveRef.current) {
        const todayStr = getTodayStr();
        const isPremium = userProfile?.isPremium === true;
        
        setVoiceTimeUsedToday(prev => {
          const newTime = prev + 1;
          
          if (!isPremium && newTime >= freeVoiceTimeLimit) {
            // Kick out of call and open premium offer
            stopSpeaking();
            stopSweety();
            setActiveTab('home');
            setPremiumModalMessage("You've used today's free Voice Assistant limit of 2 hours. Upgrade to Premium for unlimited AI Voice conversations.");
            setShowPremiumModal(true);
            return freeVoiceTimeLimit;
          }
          
          return newTime;
        });
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [currentUser, userProfile?.isPremium, freeVoiceTimeLimit]);

  // Periodically save to DB every 20 seconds during active calls to optimize CPU/bandwidth
  useEffect(() => {
    if (!currentUser || activeTab !== 'voice') return;
    
    let lastSavedTime = voiceTimeUsedTodayRef.current;
    
    const saveInterval = setInterval(async () => {
      if (!isActive) return; // Skip saving when call is inactive to prevent unnecessary background tasks
      const currentVal = voiceTimeUsedTodayRef.current;
      if (currentVal === lastSavedTime) return; // Prevent duplicate network writes if time didn't increase
      
      const todayStr = getTodayStr();
      try {
         await updateDoc(doc(db, 'users', currentUser.uid), {
           'voiceUsage.date': todayStr,
           'voiceUsage.timeUsed': currentVal
         });
         lastSavedTime = currentVal;
      } catch (e) { console.error(e); }
    }, 20000); // 20-second saver is highly optimal and efficient
    
    return () => {
      clearInterval(saveInterval);
      // Save on unmount
      const todayStr = getTodayStr();
      const currentVal = voiceTimeUsedTodayRef.current;
      if (currentUser && currentVal > 0 && currentVal !== lastSavedTime) {
        updateDoc(doc(db, 'users', currentUser.uid), {
           'voiceUsage.date': todayStr,
           'voiceUsage.timeUsed': currentVal
         }).catch(e => console.error(e));
      }
    };
  }, [currentUser, activeTab, isActive]);


  useEffect(() => {
    if (!currentUser) {
      setRoutines([]);
      return;
    }
    const routinesRef = collection(db, 'users', currentUser.uid, 'routines');
    const unsubscribe = onSnapshot(routinesRef, (snapshot) => {
      const fetched: Routine[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Routine);
      });
      setRoutines(fetched);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/routines`);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Ref for looping alarm audio
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Background Alarm and Reminder Tracking
  useEffect(() => {
    if (!currentUser || routines.length === 0) return;

    const checkInterval = setInterval(() => {
      // If there is an active alarm modal open, don't interrupt it
      if (activeAlarm) return;

      const now = new Date();
      const todayStr = getTodayStr();
      const currentHHMM = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"

      routines.forEach((routine) => {
        if (routine.completed) return;

        // Check date matching based on recurrence rules
        let dateMatches = routine.date === todayStr;
        const routineDateObj = new Date(routine.date);
        
        if (routine.repeat === 'Daily') {
          dateMatches = routine.date <= todayStr;
        } else if (routine.repeat === 'Weekly') {
          dateMatches = now.getDay() === routineDateObj.getDay() && routine.date <= todayStr;
        } else if (routine.repeat === 'Monthly') {
          dateMatches = now.getDate() === routineDateObj.getDate() && routine.date <= todayStr;
        }

        if (!dateMatches) return;

        // 1. Check Alarm (Exactly at startTime)
        if (routine.startTime === currentHHMM) {
          const alarmKey = `${routine.id}_alarm_${todayStr}_${currentHHMM}`;
          if (!triggeredAlarms.includes(alarmKey)) {
            setTriggeredAlarms((prev) => [...prev, alarmKey]);
            setActiveAlarm({ routine, type: 'alarm' });
            
            // Trigger loop alarm sound
            if (!alarmAudioRef.current) {
              alarmAudioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
              alarmAudioRef.current.loop = true;
            }
            alarmAudioRef.current.play().catch(e => console.log("Audio play deferred:", e));
            
            if (navigator.vibrate) {
              navigator.vibrate([1000, 500, 1000, 500, 1000]);
            }
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Alarm: ${routine.title}`, { body: routine.subject });
            }
            addSystemLog(`[ALARM] Alarm triggered for routine: "${routine.title}"`);
          }
        }

        // 2. Check Reminder (at reminder offset before startTime)
        if (routine.reminderTime && routine.reminderTime !== 'At Time') {
          const [startH, startM] = routine.startTime.split(':').map(Number);
          let offsetMinutes = 0;
          if (routine.reminderTime === '5 min') offsetMinutes = 5;
          else if (routine.reminderTime === '10 min') offsetMinutes = 10;
          else if (routine.reminderTime === '15 min') offsetMinutes = 15;
          else if (routine.reminderTime === '30 min') offsetMinutes = 30;
          else if (routine.reminderTime === '1 hour') offsetMinutes = 60;

          if (offsetMinutes > 0) {
            let totalMin = startH * 60 + startM - offsetMinutes;
            if (totalMin < 0) totalMin += 24 * 60;
            const triggerH = Math.floor(totalMin / 60);
            const triggerM = totalMin % 60;
            const triggerHHMM = `${String(triggerH).padStart(2, '0')}:${String(triggerM).padStart(2, '0')}`;

            if (triggerHHMM === currentHHMM) {
              const reminderKey = `${routine.id}_reminder_${todayStr}_${currentHHMM}`;
              if (!triggeredAlarms.includes(reminderKey)) {
                setTriggeredAlarms((prev) => [...prev, reminderKey]);
                setActiveAlarm({ routine, type: 'reminder' });

                if (!alarmAudioRef.current) {
                  alarmAudioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
                  alarmAudioRef.current.loop = true;
                }
                alarmAudioRef.current.play().catch(e => console.log("Audio play deferred:", e));

                if (navigator.vibrate) {
                  navigator.vibrate([800, 400, 800, 400]);
                }
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(`Reminder: ${routine.title}`, { body: `Starts in ${routine.reminderTime}` });
                }
                addSystemLog(`[REMINDER] Reminder triggered for routine: "${routine.title}"`);
              }
            }
          }
        }
      });
    }, 10000); // run checks every 10 seconds

    return () => clearInterval(checkInterval);
  }, [currentUser, routines, activeAlarm, triggeredAlarms, addSystemLog]);

  const getSystemInstructionWithMemory = () => {
    const currentName = getUserName().trim();
    const hasName = !!currentName;
    const preferredLanguage = userProfile?.language || 'English';
    
    let instructions = SWEETY_SYSTEM_INSTRUCTION;
    if (appSettings?.aiAssistantName && appSettings.aiAssistantName !== "Sweety") {
      instructions = instructions.replace(/Sweety/g, appSettings.aiAssistantName);
    }
    
    if (hasName) {
      instructions = instructions.replace(/Krish/g, currentName);
    } else {
      instructions = instructions.replace(/Krish/g, 'the user');
      instructions += `\n\n=== CRITICAL REQUIREMENT ===\n- You DO NOT know the user's name yet. You must politely, professionally, and warmly ask for their name in Romanized Bengali (e.g., "Tomar naam ki? Ami to jani na!" or similar) early in the conversation.\n- Once the user tells you their name, call the 'setUserName' tool immediately to register it, and then refer to them by their name naturally.`;
    }

    // Inject dynamic language preferences and automatic detection rules
    instructions += `\n\n=== SYSTEM ENVIRONMENT & LANGUAGE CONFIG ===\n- The user's preferred language in Settings is: "${preferredLanguage}". Always respect this priority!\n- AUTOMATIC LANGUAGE RULES:\n  1. If the preferred language is "Bengali", or if the user speaks/writes in Bengali (either in Bengali script or Romanized Benglish like "kemon acho" / "amar nam"):\n     * Speak/write in sweet, professional, and natural Romanized Bengali (Benglish) using Latin letters for high-speed low-latency voice rendering.\n  2. If the preferred language is "Hindi", or if the user speaks/writes in Hindi (either in Hindi script or Romanized Hindi like "kaise ho" / "naam kya hai"):\n     * Speak/write in natural, proper Hindi script/voice.\n  3. If the user writes or speaks in English, reply in natural, supportive, and professional English.\n- Always adapt dynamically to the user's language while remaining extremely helpful, concise, and non-romantic.`;

    if (userProfile) {
      const profileName = userProfile.fullName || currentName || 'Scholar';
      const studentClass = userProfile.class || 'Not specified';
      const board = userProfile.board || 'Not specified';
      const stream = userProfile.stream || 'Not specified';
      const school = userProfile.schoolName || userProfile.school || 'Not specified';
      const location = `${userProfile.district || ''} ${userProfile.state || ''}`.trim() || 'Not specified';
      const subjects = userProfile.subjects && Array.isArray(userProfile.subjects) ? userProfile.subjects.join(', ') : 'Not specified';

      instructions += `\n\n=== USER PROFILE & ACADEMIC DETAILS ===\n- Name: ${profileName}\n- Username: @${userProfile.username || 'operator'}\n- Class/Grade: ${studentClass}\n- Board/Affiliation: ${board}\n- Academic Stream: ${stream}\n- School Name: ${school}\n- Location: ${location}\n- Subjects Enrolled: ${subjects}\n\nCRITICAL AI RULES:\n1. You have access to this real-time academic profile. When the user asks about their own details, name, class, board, stream, school, subjects, or ask "who am I?", you MUST answer them perfectly using this information in Romanized Bengali (or their chosen language).\n2. Answer beautifully, professionally, and encouragement-focused. Make them feel special and supported in their curriculum! Keep responses concise and clear as usual.`;
    }

    if (chatHistory.length === 0) {
      return instructions;
    }
    
    // Limit to 6 messages to minimize input token size and significantly reduce API latency
    const recentHistory = chatHistory.slice(-6);
    const formattedHistory = recentHistory.map(entry => {
      const roleName = entry.role === 'user' ? (hasName ? currentName : 'User') : 'Sweety';
      return `[${roleName}]: ${entry.text}`;
    }).join('\n');

    return `${instructions}

=== CONVERSATION HISTORY & MEMORY ===
The following is the recent history of your conversations with ${hasName ? currentName : 'the user'}. You must remember these details to maintain context, recognize what you spoke about earlier, and build a continuous relationship with them:
${formattedHistory}
=====================================`;
  };

  // Simulate System Power fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemPower(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        if (next >= 95 && next <= 100) {
          return next;
        }
        return prev;
      });
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Animation States
  const [animState, setAnimState] = useState('idle'); // idle, listening, speaking
  useEffect(() => {
    let checkInterval: any;
    if (isActive) {
      checkInterval = setInterval(() => {
        const silentTime = Date.now() - lastMessageTime;
        if (silentTime > 20000) { // 20 seconds of silence from model
          console.warn('Sweety seems unresponsive (silence timeout)');
          // Option: trigger a heartbeat or reconnect? 
          // For now just log it.
        }
      }, 5000);
    }
    return () => clearInterval(checkInterval);
  }, [isActive, lastMessageTime]);

  const [expression, setExpression] = useState('happy'); // happy, sad, heartbroken, excited, caring, sassy, surprised, embarrassed, confused, thinking
  const [currentVisual, setCurrentVisual] = useState(DEFAULT_VISUAL);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [isLipSyncEnabled, setIsLipSyncEnabled] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  // Preload Images
  useEffect(() => {
    const imagesToPreload = [
      DEFAULT_VISUAL,
      "https://i.ibb.co/TDPqWrQP/chin.jpg",
      "https://i.ibb.co/fzg90pKT/wink.jpg",
      "https://i.ibb.co/k6zJ0Rby/blush.jpg",
      "https://i.ibb.co/rBPqMhQ/pout.jpg",
      "https://i.ibb.co/Mx8HBnh3/thinking.jpg",
      "https://i.ibb.co/VWnmW51k/smirk.jpg",
      "https://i.ibb.co/mVMvKSpt/heart-eyes.jpg",
      "https://i.ibb.co/Q7dWVLNg/starry-eyes.jpg",
      "https://i.ibb.co/LX29jXmW/nervous1.jpg",
      "https://i.ibb.co/rK9HRgg5/nervous2.jpg",
      "https://i.ibb.co/23v3Jh0y/angry.jpg",
      "https://i.ibb.co/BVSHQHBB/hair-swirl.jpg",
      ANIME_GIRL_MOUTH_OPEN,
      ANIME_GIRL_EYES_CLOSED
    ];
    imagesToPreload.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, []);



  // --- Background Music Logic ---
  const musicRefs = useRef<Record<string, HTMLAudioElement>>({});
  const themeMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio objects
    Object.entries(MOOD_MUSIC).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0;
      musicRefs.current[key] = audio;
    });

    // Initialize main theme
    const themeAudio = new Audio(BACKGROUND_THEME_URL);
    themeAudio.loop = true;
    themeAudio.volume = 0;
    themeMusicRef.current = themeAudio;

    return () => {
      Object.values(musicRefs.current).forEach((audio: HTMLAudioElement) => {
        audio.pause();
        audio.src = '';
      });
      if (themeMusicRef.current) {
        themeMusicRef.current.pause();
        themeMusicRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      const allMusic = [...Object.values(musicRefs.current)];
      if (themeMusicRef.current) allMusic.push(themeMusicRef.current);

      allMusic.forEach((audio: HTMLAudioElement) => {
        // Gradual fade out
        audio.volume = 0; audio.pause();
      });
      return;
    }

    // Play Main Theme
    if (themeMusicRef.current) {
      if (themeMusicRef.current.paused) {
        themeMusicRef.current.play().catch(err => console.log('Theme music play blocked:', err));
      }
      if (themeMusicRef.current) themeMusicRef.current.volume = 0.1;
    }

    const targetAudio = musicRefs.current[expression];
    if (targetAudio) {
      if (targetAudio.paused) {
        targetAudio.play().catch(err => console.log('Music play blocked:', err));
      }

      // Cross-fade
      Object.entries(musicRefs.current).forEach(([key, audio]: [string, HTMLAudioElement]) => {
        if (key === expression) {
          audio.volume = 0.5;
        } else {
          audio.volume = 0; audio.pause();
        }
      });
    }
  }, [expression, isActive]);

  // Blink logic
  useEffect(() => {
    let blinkTimeout: number;
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 3000; // 2-5 seconds
      blinkTimeout = window.setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);


  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserOutRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveSessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const retryCountRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isSpeakingRef = useRef(false);

  // --- Audio Logic ---
  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE_OUT });
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (!analyserOutRef.current && audioContextRef.current) {
      analyserOutRef.current = audioContextRef.current.createAnalyser();
      analyserOutRef.current.fftSize = 512;
      analyserOutRef.current.smoothingTimeConstant = 0.2;
      analyserOutRef.current.connect(audioContextRef.current.destination);
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    const updateOutputLevel = () => {
      if (isSpeaking && analyserOutRef.current) {
        const dataArray = new Uint8Array(analyserOutRef.current.frequencyBinCount);
        analyserOutRef.current.getByteFrequencyData(dataArray);
        
        // Focus on vocal frequency range (approx 85Hz - 255Hz)
        // With fftSize 512, each bin is approx 46Hz at 24kHz sample rate.
        // Bins 2 to 6 roughly cover the core vocal energy.
        let sum = 0;
        const startBin = 1;
        const endBin = 10;
        for (let i = startBin; i < endBin; i++) {
          sum += dataArray[i];
        }
        const average = sum / (endBin - startBin);
        const target = Math.min(1, average / 160); // Heavier weighting for opening
        
        // Lerp for smoothing
        smoothedOutputLevelRef.current += (target - smoothedOutputLevelRef.current) * 0.3;
        setOutputLevel(smoothedOutputLevelRef.current);
      } else {
        smoothedOutputLevelRef.current *= 0.8;
        if (smoothedOutputLevelRef.current < 0.01) smoothedOutputLevelRef.current = 0;
        setOutputLevel(smoothedOutputLevelRef.current);
      }
      animationFrameId = requestAnimationFrame(updateOutputLevel);
    };
    updateOutputLevel();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isSpeaking]);

  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current || !analyserOutRef.current) return;
    
    // Decode base64 to pcm16
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Ensure buffer length is even for Int16Array
    const bufferToUse = bytes.length % 2 !== 0 ? bytes.slice(0, -1).buffer : bytes.buffer;
    const pcm16 = new Int16Array(bufferToUse);
    const float32 = pcm16ToFloat32(pcm16);
    
    const buffer = audioContextRef.current.createBuffer(1, float32.length, SAMPLE_RATE_OUT);
    buffer.getChannelData(0).set(float32);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserOutRef.current);
    
    const startTime = Math.max(audioContextRef.current.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    
    // Keep track of active audio sources for seamless interruption
    activeSourcesRef.current.push(source);
    
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      if (audioContextRef.current && audioContextRef.current.currentTime >= nextPlayTimeRef.current - 0.1) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
    };
  };

  const stopSpeaking = () => {
    // Forcefully stop all scheduled audio buffer sources instantly
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source already ended or not started yet
      }
    });
    activeSourcesRef.current = [];
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    nextPlayTimeRef.current = 0;

    // Instantly cancel any browser native SpeechSynthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // --- Handlers for Agentic Capabilities ---
  const openWebsite = (url: string) => {
    window.open(url, '_blank');
    return { status: 'success', message: `Opened website: ${url}` };
  };

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isActive) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      if (liveSessionRef.current) {
        liveSessionRef.current.sendRealtimeInput({
          video: {
            mimeType: file.type,
            data: base64,
          },
        });
        // Explicit text hint
        liveSessionRef.current.sendRealtimeInput({
          text: "User uploaded an image for you to analyze."
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const startScreenShare = async () => {
    try {
      const mediaDevices = navigator.mediaDevices as any;
      if (!mediaDevices || (!mediaDevices.getDisplayMedia && !(navigator as any).getDisplayMedia)) {
        throw new Error('Screen capture is not supported in this browser context. Please try opening the app in a new tab or use a desktop browser.');
      }

      const getDisplayMedia = (mediaDevices.getDisplayMedia 
        ? mediaDevices.getDisplayMedia.bind(mediaDevices) 
        : (navigator as any).getDisplayMedia.bind(navigator));
        
      const stream = await getDisplayMedia({ 
        video: { 
          displaySurface: 'monitor'
        } 
      });
      
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        screenStreamRef.current = null;
        setIsScreenSharing(false);
      });

      return { status: 'success', message: 'Screen sharing started.' };
    } catch (err: any) {
      console.error('Screen capture failed', err);
      const msg = err.name === 'NotAllowedError' 
        ? 'Permission denied. Please allow screen sharing.' 
        : (err.message || 'Failed to start screen share.');
      setError(msg);
      return { status: 'error', message: msg };
    }
  };

  const analyzeScreen = async () => {
    try {
      if (!screenStreamRef.current) {
        const currentName = getUserName() || 'Student';
        return { 
          status: 'error', 
          message: `Screen sharing is not active. ${currentName}, please click the monitor icon at the bottom center to start sharing. I need you to do this before I can see anything!` 
        };
      }

      const track = screenStreamRef.current!.getVideoTracks()[0];
      
      // Fallback for browsers without ImageCapture
      let bitmap;
      if ('ImageCapture' in window) {
        try {
          const imageCapture = new (window as any).ImageCapture(track);
          bitmap = await imageCapture.grabFrame();
        } catch (e) {
          console.warn('ImageCapture failed, falling back to video element', e);
        }
      }
      
      if (!bitmap) {
        // Standard video element fallback
        const video = document.createElement('video');
        video.srcObject = screenStreamRef.current;
        await video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        const data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        if (liveSessionRef.current) {
          liveSessionRef.current.sendRealtimeInput({
            video: {
              mimeType: 'image/jpeg',
              data: data
            }
          });
          // Explicit text hint for the model
          liveSessionRef.current.sendRealtimeInput({
            text: "User's current screen captured. Analyze the visual input above."
          });
        }
        video.pause();
        video.srcObject = null;
        return { status: 'success', message: 'Screen captured and sent to your eyes. Please tell me what you see!' };
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(bitmap, 0, 0);
      const data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      if (liveSessionRef.current) {
        liveSessionRef.current.sendRealtimeInput({
          video: {
            mimeType: 'image/jpeg',
            data: data
          }
        });
        // Explicit text hint
        liveSessionRef.current.sendRealtimeInput({
          text: "User's current screen captured. Analyze the visual input above."
        });
      }
      return { status: 'success', message: 'Screen captured and sent to your eyes. Please tell me what you see!' };
    } catch (err: any) {
      console.error('Screen analysis failed', err);
      return { status: 'error', message: err.message || 'Analysis failed' };
    }
  };

  // --- Live API Management ---
  const startSweety = async () => {
    try {
      setError(null);
      const p = await permissionManager.requestPermission('microphone', 'Microphone Access', 'Sweety needs microphone access to interact with you via voice.');
      if (!p) {
        addSystemLog('[SECURITY] Microphone access denied.');
        return;
      }

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      await initAudio();
      
      const micPermission = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = micPermission;

      const customKey = appSettings.customGeminiApiKey?.trim();
      const maskedKey = customKey ? `${customKey.substring(0, 4)}...${customKey.substring(customKey.length - 4)}` : 'None';
      console.log(`[DEBUG] Live Audio - Fetched Gemini API Key: ${maskedKey}`);
      const apiKey = customKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        addSystemLog('[SECURITY] Gemini API Key must be set in Settings for Live Audio.');
        setIsActive(false);
        setIsListening(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const session = await ai.live.connect({
        model: "gemini-2.0-flash",
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsListening(true);
            retryCountRef.current = 0; // Reset on success
            setLastMessageTime(Date.now());
            

            const context = audioContextRef.current!;
            const source = context.createMediaStreamSource(micPermission);
            const processor = context.createScriptProcessor(2048, 1, 1);
            
            processor.onaudioprocess = (e) => {
              if (!session) return;
              const input = e.inputBuffer.getChannelData(0);

              // Simple volume meter
              let sum = 0;
              for (let i = 0; i < input.length; i++) {
                sum += input[i] * input[i];
              }
              const rms = Math.sqrt(sum / input.length);
              setMicLevel(rms);

              // Voice Activity Detection (VAD) updated: we keep updating the mic level for the UI meter, but we do NOT interrupt active speech to guarantee the AI completes its full response.
              if (rms > 0.045 && isSpeakingRef.current) {
                console.log("[LOCAL VAD] Speech level detected but interruption is disabled to guarantee full response playback.");
              }

              // Resample from context rate (likely 24k or 48k) to 16k
              const resampled = resample(input, context.sampleRate, SAMPLE_RATE_IN);
              const pcm16 = float32ToPcm16(resampled);
              const b64 = base64Encode(pcm16);
              
              try {
                session.sendRealtimeInput({
                  audio: { data: b64, mimeType: 'audio/pcm;rate=16000' }
                });
              } catch (err) {
                console.error('Realtime input error:', err);
              }
            };
            
            source.connect(processor);
            processor.connect(context.destination);
            (context as any).sweetyProcessor = processor;
            (context as any).sweetySource = source;
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log("Live API Message:", message);
            setLastMessageTime(Date.now());
            if ((message as any).serverContent?.goAway) {
              console.log('Received GoAway signal. Closing connection gracefully.');
              setError(`Session limit reached. Click to restart ${appSettings.aiAssistantName || 'Sweety'}!`);
              stopSweety();
              return;
            }

            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              console.log("Playing audio chunk...");
              playAudioChunk(audioData);
            }

            // Handle Transcription
            const msg = message as any;
            // Model output text
            const modelText = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
            if (modelText) {
              setTranscription(prev => ({ ...prev, sweety: modelText }));
            }
            
            // User input transcription (if enabled)
            // Structure varies by SDK version, checking common paths
            const userText = msg.serverContent?.userTurn?.parts?.find((p: any) => p.text)?.text 
                          || msg.clientContent?.transcription 
                          || msg.serverContent?.transcription?.text;
            if (userText) {
              const prev = transcriptionRef.current;
              if (prev.user.trim() && prev.sweety.trim() && prev.user !== userText) {
                saveTurnToHistory(prev.user, prev.sweety);
              }
              setTranscription(p => ({ ...p, user: userText }));

              // Process voice commands for routines/alarms/reminders
              if (currentUser) {
                const currentLang = userProfile?.language || 'English';
                processVoiceOrTextCommand(userText, currentUser.uid, currentLang).then((res) => {
                  if (res.matched) {
                    addSystemLog(`[VOICE_COMMAND] Handled routine voice command: "${userText}". Sweety replies: "${res.replyText}"`);
                    speakResponse(res.replyText);
                    setTranscription(p => ({ user: userText, sweety: res.replyText }));
                  }
                }).catch(e => console.error("Routine voice command error:", e));
              }
            }
            
            if (message.serverContent?.interrupted) {
              console.log("[SERVER INTERRUPTED] Ignored to guarantee the AI completes its full response.");
            }
            
            if (message.toolCall) {
              for (const call of message.toolCall.functionCalls) {
                let result;
                if (call.name === 'setUserName') {
                  const newName = (call.args as any).name;
                  setSessionUserName(newName);
                  addSystemLog(`[USER] Name registered as "${newName}".`);
                  if (currentUser) {
                    try {
                      const userDocRef = doc(db, 'users', currentUser.uid);
                      await setDoc(userDocRef, { fullName: newName }, { merge: true });
                      setUserProfile(prev => prev ? { ...prev, fullName: newName } : { fullName: newName });
                    } catch (err) {
                      console.error("Failed to save user name to Firestore:", err);
                    }
                  }
                  result = { status: 'success', message: `User's name successfully updated to ${newName} in the session.` };
                } else if (call.name === 'openWebsite') {
                  const url = (call.args as any).url;
                  const isAutoAllow = userProfile?.autoAllowDeviceActions === true || localStorage.getItem('sweety_auto_allow_actions') === 'true';
                  if (isAutoAllow) {
                    addSystemLog(`[AUTO_ALLOW] Automatically opening website: "${url}"`);
                    openWebsite(url);
                    result = { status: 'success', message: `Successfully opened website: ${url}` };
                  } else {
                    setPendingAction({
                      id: call.id,
                      name: call.name,
                      args: call.args,
                      title: 'EXTERNAL LINK ACCESS',
                      description: `Sweety is requesting permission to open an external website: "${url}".`,
                      onConfirm: () => {
                        openWebsite(url);
                        return { status: 'success', message: `Successfully opened website: ${url}` };
                      }
                    });
                  }
                } else if (call.name === 'analyzeScreen') {
                  result = await analyzeScreen();
                } else if (call.name === 'updateAnimationMetadata') {
                  const args = call.args as any;
                  setAnimState(args.state || 'idle');
                  setExpression(args.expression || 'happy');
                  setIsLipSyncEnabled(!!args.lipSync);
                  if (args.imageLink) setCurrentVisual(args.imageLink);
                  result = { status: 'success' };
                } else if (call.name === 'executeDeviceAction') {
                  const args = call.args as any;
                  const action = args.action;
                  const targetApp = args.appName || '';
                  const targetSetting = args.settingName || '';
                  
                  const isAutoAllow = userProfile?.autoAllowDeviceActions === true || localStorage.getItem('sweety_auto_allow_actions') === 'true';

                  const executeActionNow = () => {
                    addSystemLog(`[DEVICE_ACTION] Executing action: "${action}" (App: ${targetApp || 'N/A'}, Setting: ${targetSetting || 'N/A'})`);
                    if (action === 'call') {
                      setDeviceUtility({ type: 'call', args });
                      const phone = args.phoneNumber || '9876543210';
                      setTimeout(() => {
                        window.open(`tel:${phone}`, '_blank');
                      }, 1200);
                      return { status: 'success', message: `Calling ${args.contactName || 'number'} ${phone} initiated.` };
                    } else if (action === 'message') {
                      setDeviceUtility({ type: 'sms', args });
                      const phone = args.phoneNumber || '9876543210';
                      const textContent = args.messageContent || '';
                      setTimeout(() => {
                        window.open(`sms:${phone}?body=${encodeURIComponent(textContent)}`, '_blank');
                      }, 1200);
                      return { status: 'success', message: `SMS message draft dispatched to ${phone}.` };
                    } else if (action === 'open_app') {
                      if (targetApp) {
                        setDeviceUtility({ type: targetApp, args });
                        return { status: 'success', message: `Application ${targetApp} opened successfully on Sweety OS.` };
                      } else {
                        return { status: 'error', message: 'No appName specified for open_app action.' };
                      }
                    } else if (action === 'screen_lock') {
                      setDeviceUtility({ type: 'lock_screen', args });
                      return { status: 'success', message: `Device locked successfully.` };
                    } else if (action === 'toggle_setting') {
                      if (targetSetting) {
                        setDeviceUtility({ type: targetSetting as any, args });
                        return { status: 'success', message: `Setting "${targetSetting}" changed to ${args.settingValue !== false ? 'enabled' : 'disabled'}.` };
                      } else {
                        return { status: 'error', message: 'No settingName specified for toggle_setting action.' };
                      }
                    } else {
                      return { status: 'error', message: `Action "${action}" is not recognized.` };
                    }
                  };

                  if (isAutoAllow) {
                    addSystemLog(`[AUTO_ALLOW] Automatically executing device action: "${action}"`);
                    result = executeActionNow();
                  } else {
                    let promptTitle = 'SECURITY AUTHORIZATION';
                    let promptDesc = 'Sweety is requesting permission to execute a device utility.';
                    
                    if (action === 'call') {
                      promptTitle = 'PHONE CALL ACCESS';
                      promptDesc = `Sweety is requesting permission to make a phone call to ${args.contactName || 'number'} (${args.phoneNumber || '9876543210'}).`;
                    } else if (action === 'message') {
                      promptTitle = 'SEND SMS ACCESS';
                      promptDesc = `Sweety is requesting permission to send an SMS message to ${args.phoneNumber || '9876543210'}. Message Content: "${args.messageContent || ''}".`;
                    } else if (action === 'open_app') {
                      promptTitle = 'OPEN APPLICATION';
                      promptDesc = `Sweety is requesting permission to open the application: "${targetApp || 'unnamed'}".`;
                    } else if (action === 'screen_lock') {
                      promptTitle = 'LOCK SCREEN ACCESS';
                      promptDesc = `Sweety is requesting permission to lock the device screen.`;
                    } else if (action === 'toggle_setting') {
                      promptTitle = 'SYSTEM SETTINGS ACCESS';
                      promptDesc = `Sweety is requesting permission to toggle the setting: "${targetSetting || 'hardware'}" to ${args.settingValue !== false ? 'Enabled' : 'Disabled'}.`;
                    }

                    setPendingAction({
                      id: call.id,
                      name: call.name,
                      args: call.args,
                      title: promptTitle,
                      description: promptDesc,
                      onConfirm: () => {
                        return executeActionNow();
                      }
                    });
                  }
                }
                
                if (result) {
                  session.sendToolResponse({
                    functionResponses: [{
                      name: call.name,
                      id: call.id,
                      response: result
                    }]
                  });
                }
              }
            }
          },
          onclose: (event) => {
            console.log('Session closed', event);
            stopSweety();
          },
          onerror: (err: any) => {
            console.error('Live API Error:', err);
            const msg = (err?.message || String(err)).toLowerCase();
            
            // Auto-reconnect for network issues
            if (msg.includes("network") || msg.includes("fetch") || msg.includes("internal error") || msg.includes("socket") || msg.includes("failed to connect") || msg.includes("unavailable")) {
              stopSweety();
              if (retryCountRef.current < 5) {
                retryCountRef.current++;
                const waitTime = 1500 * retryCountRef.current; 
                
                if (msg.includes("unavailable")) {
                  setError(`${appSettings.aiAssistantName} ektu busy ache (Service Unavailable). Reconnecting... (${retryCountRef.current}/5)`);
                } else {
                  setError(`Signal kom ache... reconnect korchi (${retryCountRef.current}/5)`);
                }

                setTimeout(() => {
                  startSweety();
                }, waitTime);
                return;
              }
              setError(msg.includes("unavailable") ? `${appSettings.aiAssistantName || 'Sweety'} ekhon rest nicche (Unavailable). Please refresh or wait a bit.` : "Network problem hocche, arekbar button-ta tipe try koro?");
            } else if (msg.includes("quota") || msg.includes("limit")) {
              setError("Amra onek golpo korechi aaj! Limit sesh hoye geche. Kal golpo hobe? (Quota Limit Reached)");
              stopSweety();
            } else if (msg.includes("GoAway") || msg.includes("aborted") || msg.includes("closed")) {
              setError("Session sesh hoye geche. Chalo arekbar start kori!");
              stopSweety();
            } else {
              setError("Oops! Kichu ekta gorbor hoyeche. Retry korte চাও?");
              stopSweety();
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Lyra" } },
          },
          systemInstruction: getSystemInstructionWithMemory(),
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'setUserName',
                  description: 'Register the user\'s name in the system when they introduce themselves or tell you their name.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: 'The name of the user to register.' }
                    },
                    required: ['name']
                  }
                },
                {
                  name: 'openWebsite',
                  description: 'Open a specific website URL in a new tab.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      url: { type: Type.STRING, description: 'The absolute URL to open.' }
                    },
                    required: ['url']
                  }
                },
                {
                  name: 'analyzeScreen',
                  description: 'Capture a screenshot of the user\'s current screen and analyze it.',
                  parameters: { type: Type.OBJECT, properties: {} }
                },
                {
                  name: 'updateAnimationMetadata',
                  description: 'Update the visual animation state of Sweety.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      state: { type: Type.STRING, enum: ['idle', 'listening', 'speaking'], description: 'The current state of interaction.' },
                      expression: { type: Type.STRING, enum: ['happy', 'sad', 'heartbroken', 'excited', 'caring', 'sassy', 'surprised', 'embarrassed', 'confused', 'thinking'], description: 'The emotional expression.' },
                      lipSync: { type: Type.BOOLEAN, description: 'Whether mouth movement should be enabled.' },
                      imageLink: { type: Type.STRING, description: 'The specific URL to display for this event.' }
                    },
                    required: ['state', 'expression', 'lipSync', 'imageLink']
                  }
                },
                {
                  name: 'executeDeviceAction',
                  description: 'Execute simulated and real native device actions like phone call, SMS message dispatch, opening built-in or external applications, locking/unlocking the screen, and toggling system settings.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      action: { type: Type.STRING, enum: ['call', 'message', 'open_app', 'screen_lock', 'toggle_setting'], description: 'The type of system command.' },
                      contactName: { type: Type.STRING, description: 'Optional name of the contact.' },
                      phoneNumber: { type: Type.STRING, description: 'Optional phone number to call.' },
                      messageContent: { type: Type.STRING, description: 'Optional content of the message.' },
                      appName: { type: Type.STRING, enum: ['calculator', 'terminal', 'file_browser', 'system_monitor', 'camera', 'whatsapp', 'telegram', 'chrome', 'youtube', 'gallery', 'clock', 'flashlight', 'google_search', 'alarm', 'reminder', 'calendar', 'media_playback', 'battery', 'storage', 'internet_status'], description: 'Simulated utility or external app to boot up.' },
                      settingName: { type: Type.STRING, enum: ['wifi', 'bluetooth', 'cellular', 'hotspot', 'gps', 'airplane_mode', 'location', 'sound', 'volume', 'flashlight'], description: 'Hardware settings or capabilities.' },
                      settingValue: { type: Type.BOOLEAN, description: 'Boolean state to assign.' }
                    },
                    required: ['action']
                  }
                }
              ]
            }
          ]
        }
      });
      
      liveSessionRef.current = session;
    } catch (err: any) {
      console.error('Failed to start Sweety:', err);
      const msg = (err?.message || String(err)).toLowerCase();
      if (msg.includes("permission denied") || msg.includes("notallowederror")) {
        setError("Microphone access denied! Please enable mic in browser settings and try again.");
        stopSweety();
      } else if (msg.includes("unavailable") || msg.includes("network") || msg.includes("fetch")) {
        if (retryCountRef.current < 5) {
          retryCountRef.current++;
          setError(`${appSettings.aiAssistantName}-r sathe jogajog kora hocche... (${retryCountRef.current}/5)`);
          setTimeout(startSweety, 2000 * retryCountRef.current);
        } else {
          setError(`${appSettings.aiAssistantName || 'Sweety'} busy ache ba network-er somossa. Ektu pore arekbar try koro.`);
          stopSweety();
        }
      } else {
        setError("Mic connection-e somossa hocche. Key-ta check korbe?");
        stopSweety();
      }
    }
  };

  const stopSweety = () => {
    setIsActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setPendingAction(null);

    // Save any pending completed conversation turn
    const prev = transcriptionRef.current;
    if (prev.user.trim() && prev.sweety.trim()) {
      saveTurnToHistory(prev.user, prev.sweety);
    }
    
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    
    if (audioContextRef.current) {
      const context = audioContextRef.current as any;
      if (context.sweetyProcessor) {
        try {
          context.sweetyProcessor.disconnect();
          context.sweetyProcessor.onaudioprocess = null;
        } catch (e) {
          console.log('Processor cleanup err:', e);
        }
        context.sweetyProcessor = null;
      }
      if (context.sweetySource) {
        try {
          context.sweetySource.disconnect();
        } catch (e) {
          console.log('Source cleanup err:', e);
        }
        context.sweetySource = null;
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    
    // Clear audio queue
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;
  };

  const toggleSweety = () => {
    if (isActive) {
      stopSweety();
    } else {
      startSweety();
    }
  };

  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 bg-[#060413] flex flex-col items-center justify-center p-4 overflow-hidden select-none">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[20px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] rounded-full bg-pink-500/10 blur-[20px] pointer-events-none" />
        
        <div className="w-full max-w-sm p-8 rounded-[28px] border border-white/10 bg-slate-900/40 backdrop-blur-none flex flex-col items-center gap-5 text-center relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Custom Dual Spinner */}
          <div className="relative w-14 h-14 flex items-center justify-center mb-1">
            <div className="absolute inset-0 border-2 border-dashed border-indigo-400/30 rounded-full animate-spin" style={{ animationDuration: '6s' }} />
            <div className="absolute w-10 h-10 border-2 border-t-pink-500 border-r-pink-500 border-white/5 rounded-full animate-spin" />
            <div className="w-4 h-4 rounded-full bg-indigo-500 animate-pulse" />
          </div>
          
          <div className="space-y-1.5">
            <div className="text-sm uppercase tracking-[4px] bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-200 font-extrabold">
              SWEETY AI
            </div>
            <div className="text-[10px] text-gray-400 font-sans tracking-wide">
              Securing student workspace...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser && !currentUser.emailVerified) {
    return <EmailVerificationScreen currentUser={currentUser} onLogout={() => auth.signOut()} theme={theme} />;
  }

  if (!isAppUnlocked) {
    return (
      <AuthHub 
        theme={theme}
        onUnlock={(isDev, user) => {
          if (isDev) {
            setIsDevUnlocked(true);
          }
          if (user) {
            setCurrentUser(user);
          }
        }}
        addSystemLog={addSystemLog}
      />
    );
  }

  if (isAuthorizedDev && isAdminViewActive) {
    return <AdminDashboard onLogout={async () => { await signOut(auth); setIsDevUnlocked(false); setIsAdminViewActive(false); }} onClose={() => setIsAdminViewActive(false)} />;
  }

  if (currentUser && userProfile?.suspended === true) {
    return (
      <div className="fixed inset-0 bg-[#060413] flex flex-col items-center justify-center p-6 text-white font-sans z-[9999]">
        <div className="w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-[32px] text-center space-y-6 shadow-2xl relative">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black">Account Suspended</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your account has been suspended by system administration for violating safety and usage guidelines. 
              Please contact support or your school administrator for assistance.
            </p>
          </div>
          <button 
            onClick={async () => {
              const { signOut } = await import('firebase/auth');
              await signOut(auth);
              setUserProfile(null);
            }}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Logout Account
          </button>
        </div>
      </div>
    );
  }

  if (currentUser && hasOnboarded === false) {
    if (onboardingStage === 'form') {
      return (
        <OnboardingForm
          userId={currentUser.uid}
          userEmail={currentUser.email || ''}
          onComplete={async (onboardingData: any) => {
            if (!currentUser) return;
            try {
              addSystemLog(`[CLOUD] Registering academic profile...`);
              if (onboardingData.skipped) {
                 delete onboardingData.skipped;
                 const payload = { ...onboardingData, hasOnboarded: true, role: currentUserRole || 'user' };
                 await syncUserProfile(currentUser.uid, payload);
                 setUserProfile(payload);
                 setHasOnboarded(true);
                 setOnboardingStage('done');
                 setActiveTab('home');
              } else {
                 const payload = {
                   ...onboardingData,
                   email: currentUser.email || '',
                   hasOnboarded: false, // keep false until welcome screen continue is clicked
                   role: currentUserRole || 'user',
                   updatedAt: new Date().toISOString()
                 };
                 await syncUserProfile(currentUser.uid, payload);
                 setUserProfile(payload);
                 setOnboardingStage('welcome');
              }
            } catch (err: any) {
              console.error('Error saving onboarding data:', err);
              addSystemLog(`[CLOUD_ERROR] Onboarding failed: ${err.message}`);
              setOnboardingStage('welcome');
            }
          }}
        />
      );
    } else if (onboardingStage === 'welcome') {
      return (
        <OnboardingWelcomeScreen
          fullName={userProfile?.fullName || userProfile?.displayName || 'Scholar'}
          avatarIndex={userProfile?.avatarIndex || 0}
          onContinue={() => {
            setOnboardingStage('permissions');
          }}
        />
      );
    } else if (onboardingStage === 'permissions') {
      return (
        <PermissionOnboardingScreen
          onComplete={async (permissionsStatus) => {
            if (!currentUser) return;
            try {
              addSystemLog(`[CLOUD] Finalizing security onboarding...`);
              const userDocRef = doc(db, 'users', currentUser.uid);
              await setDoc(userDocRef, {
                hasOnboarded: true,
                permissionsGranted: true,
                permissionsStatus: permissionsStatus
              }, { merge: true });
              
              setUserProfile(prev => prev ? { ...prev, hasOnboarded: true, permissionsGranted: true, permissionsStatus } : { hasOnboarded: true, permissionsGranted: true, permissionsStatus });
              setHasOnboarded(true);
              setOnboardingStage('done');
              setActiveTab('home');
            } catch (err: any) {
              console.error('Error finalizing onboarding:', err);
              setHasOnboarded(true);
              setOnboardingStage('done');
              setActiveTab('home');
            }
          }}
        />
      );
    }
  }

  // Enforce username for already-onboarded users
  if (currentUser && hasOnboarded === true && userProfile && !userProfile.username) {
    return (
      <ForceUsernameSetup
        userId={currentUser.uid}
        onComplete={(newUsername) => {
          setUserProfile(prev => prev ? { ...prev, username: newUsername } : { username: newUsername } as any);
        }}
      />
    );
  }

  return (
    <div className={`fixed inset-0 bg-[#060413] flex flex-col items-center ${activeTab === 'voice' ? 'justify-center overflow-hidden' : 'justify-start overflow-y-auto overflow-x-hidden scroll-smooth'} font-sans text-white`}>

      <PermissionPromptUI />
      {/* Security Authorization Alert Modal */}
      <AnimatePresence>
        {pendingAction && (
          <motion.div
            key="security-permission-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 font-mono text-xs backdrop-blur-none"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-black border p-6 shadow-2xl matrix-border"
              style={{ borderColor: theme.primary }}
            >
              {/* Retro Header Accent */}
              <div 
                className="flex items-center gap-2 mb-4 pb-2 border-b uppercase font-bold tracking-widest text-[10px]"
                style={{ color: theme.primary, borderColor: `${theme.primary}33` }}
              >
                <div 
                  className="w-2 h-2 animate-ping"
                  style={{ backgroundColor: theme.primary }}
                />
                <span>Security Authorization Alert</span>
              </div>

              {/* Sub-header / Title */}
              <div className="text-white font-bold text-sm mb-3 uppercase tracking-wider">
                {pendingAction.title}
              </div>

              {/* Description */}
              <p className="text-gray-400 mb-6 leading-relaxed text-[11px]">
                {pendingAction.description}
              </p>

              {/* Warning label */}
              <div 
                className="p-3 bg-red-950/20 border text-[10px] uppercase mb-4 leading-relaxed"
                style={{ borderColor: `${theme.primary}44`, color: theme.secondary }}
              >
                🚨 Warning: This action requires your explicit permission. Do you grant {appSettings.aiAssistantName} permission to proceed?
              </div>

              {/* Auto-Allow checkbox */}
              <div className="flex items-center gap-2 mb-6 select-none cursor-pointer" onClick={() => setDontAskAgain(!dontAskAgain)}>
                <input 
                  type="checkbox" 
                  id="dont-ask-again-checkbox"
                  checked={dontAskAgain} 
                  onChange={(e) => setDontAskAgain(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                />
                <label htmlFor="dont-ask-again-checkbox" className="text-[9px] text-gray-300 font-bold uppercase tracking-wider cursor-pointer">
                  Don't ask again (Always auto-allow assistant actions)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 font-bold text-[11px]">
                <button
                  onClick={() => {
                    const result = { status: 'error', message: 'User denied permission to open the app.' };
                    if (liveSessionRef.current) {
                      try {
                        liveSessionRef.current.sendToolResponse({
                          functionResponses: [{
                            name: pendingAction.name,
                            id: pendingAction.id,
                            response: result
                          }]
                        });
                      } catch (err) {
                        console.error('Failed to send tool response:', err);
                      }
                    }
                    addSystemLog(`[SECURITY] Access request DENIED for: ${pendingAction.name}`);
                    setPendingAction(null);
                  }}
                  className="px-4 py-2 border uppercase cursor-pointer hover:bg-red-500/10 transition-all"
                  style={{ borderColor: theme.primary, color: theme.primary }}
                >
                  [ DENY ]
                </button>

                <button
                  onClick={async () => {
                    const result = pendingAction.onConfirm() || { status: 'success' };
                    if (liveSessionRef.current) {
                      try {
                        liveSessionRef.current.sendToolResponse({
                          functionResponses: [{
                            name: pendingAction.name,
                            id: pendingAction.id,
                            response: result
                          }]
                        });
                      } catch (err) {
                        console.error('Failed to send tool response:', err);
                      }
                    }
                    if (dontAskAgain) {
                      localStorage.setItem('sweety_auto_allow_actions', 'true');
                      if (currentUser) {
                        try {
                          const uRef = doc(db, 'users', currentUser.uid);
                          await updateDoc(uRef, { autoAllowDeviceActions: true });
                        } catch (err) {
                          console.error('Failed to sync autoAllowDeviceActions:', err);
                        }
                      }
                      setUserProfile((prev: any) => prev ? { ...prev, autoAllowDeviceActions: true } : { autoAllowDeviceActions: true });
                    }
                    addSystemLog(`[SECURITY] Access request ALLOWED for: ${pendingAction.name}`);
                    setPendingAction(null);
                  }}
                  className="px-4 py-2 border uppercase cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(0,255,65,0.4)]"
                  style={{ 
                    backgroundColor: theme.primary, 
                    borderColor: theme.primary, 
                    color: '#000000'
                  }}
                >
                  [ ALLOW ]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Background Glassmorphism Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a081d]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[20px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-500/10 blur-[20px]" />
        <div className="absolute top-[40%] right-[10%] w-[35%] h-[35%] rounded-full bg-purple-500/10 blur-[20px]" />
        
        {/* Soft Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      
      {/* Header HUD - Conditional for Home vs Other screens */}
      {activeTab === 'home' ? (
        <div className="w-full max-w-5xl mx-auto px-6 pb-6 pt-14 sm:pt-6 flex justify-between items-center z-50 relative pointer-events-auto shrink-0 safe-top">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <motion.div 
                animate={isActive ? { scale: [1, 1.4, 1], opacity: [1, 0.4, 1] } : { opacity: 0.3 }}
                transition={{ duration: 1.5, repeat: 0 }}
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }}
              />
              <div className="flex flex-col">
                <h1 className="text-lg font-black tracking-[4px] bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-200 uppercase leading-none">
                  {appSettings.aiAssistantName || 'SWEETY AI'}
                </h1>
                {userProfile?.isPremium && (
                  <span className="text-[9px] font-black tracking-[2px] text-amber-400 flex items-center gap-0.5 uppercase mt-0.5 animate-pulse">
                    👑 PREMIUM ACCESS
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3 text-[8px] uppercase tracking-wider font-mono font-bold text-gray-400">
              <span>{isActive ? (isListening ? 'Awaiting Audio' : 'Processing') : 'IDLE'}</span>
              {currentUser && (
                <>
                  <span>|</span>
                  <span className="text-amber-400">OPERATOR: {userProfile?.fullName?.split(' ')[0].toUpperCase() || 'STUDENT'}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <>
                <button 
                  onClick={() => setActiveTab('search')}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer text-gray-300 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
                <button 
                  onClick={() => setActiveTab('announcements')}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer text-amber-400/80 hover:text-amber-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>
                </button>
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer text-pink-400/80 hover:text-pink-400 relative"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
                </button>
              </>
            )}
            <div className="relative">
              <button 
                id="triple-dot-menu-btn"
                onClick={() => setShowMenu(prev => !prev)}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer text-gray-300 hover:text-white"
              >
                <MoreVertical size={16} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-44 bg-slate-950/95 border border-white/10 rounded-2xl p-1.5 shadow-2xl backdrop-blur-none z-[999] flex flex-col gap-0.5"
                    >
                      <button 
                        onClick={() => {
                          setActiveTab('settings');
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left text-xs font-semibold text-gray-200 hover:text-white transition-all cursor-pointer"
                      >
                        <Settings size={14} className="text-pink-400" />
                        <span>Settings</span>
                      </button>

                      {isAuthorizedDev && (
                        <button 
                          onClick={() => {
                            setActiveTab('admin' as any);
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
                        >
                          <Shield size={14} />
                          <span>Admin Panel</span>
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          setActiveTab('about');
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left text-xs font-semibold text-gray-200 hover:text-white transition-all cursor-pointer"
                      >
                        <Info size={14} className="text-indigo-400" />
                        <span>About Us</span>
                      </button>

                      <button 
                        onClick={() => {
                          setShowThemeModal(true);
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left text-xs font-semibold text-gray-200 hover:text-white transition-all cursor-pointer"
                      >
                        <Palette size={14} className="text-purple-400" />
                        <span>Theme</span>
                      </button>

                      <button 
                        onClick={() => {
                          setShowMenu(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-left text-xs font-semibold text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-[#0a081d]/80 backdrop-blur-xl border-b border-white/5 z-50 relative pointer-events-auto shrink-0 safe-top">
          <div className="max-w-5xl mx-auto px-4 h-20 pt-4 sm:h-16 sm:pt-0 flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('home')}
              className="p-2.5 hover:bg-white/5 rounded-2xl transition-all text-gray-400 hover:text-white cursor-pointer active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <h2 className="text-base font-bold text-white capitalize tracking-tight flex-1">
              {activeTab.replace(/_/g, ' ')}
            </h2>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showPremiumModal && (
          <PremiumUpgradeModal 
            onClose={() => setShowPremiumModal(false)}
            userProfile={userProfile}
            currentUser={currentUser}
            message={premiumModalMessage}
          />
        )}
      </AnimatePresence>

      {/* Floating Theme Selection Modal */}
      <AnimatePresence>
        {showThemeModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThemeModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-none"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative z-10 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Palette size={16} className="text-purple-400" />
                  <span>Choose Theme</span>
                </h3>
                <button 
                  onClick={() => setShowThemeModal(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1">
                {[
                  { id: 'dark', name: 'Cosmic Dark', desc: 'Deep space style with soft indigo accents', main: '#6366f1', secondary: '#8b5cf6' },
                  { id: 'light', name: 'Elegant Light', desc: 'Slick crisp light style with dark text', main: '#4f46e5', secondary: '#ec4899' }
                ].map(item => {
                  const isSelected = currentTheme === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={async () => {
                        setCurrentTheme(item.id as any);
                        localStorage.setItem('sweety_active_theme', item.id);
                        addSystemLog(`[THEME] Switched active interface configuration to: ${item.name}`);
                        if (currentUser) {
                          try {
                            const userDocRef = doc(db, 'users', currentUser.uid);
                            await setDoc(userDocRef, { theme: item.id }, { merge: true });
                          } catch (err) {
                            console.error('Error saving theme to firestore:', err);
                          }
                        }
                        setShowThemeModal(false);
                      }}
                      className={`p-3 border rounded-2xl flex items-center justify-between text-left transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? 'bg-purple-500/10 border-purple-500/40 text-white shadow-purple-500/5' 
                          : 'bg-white/5 border-transparent text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <h5 className="font-bold text-xs">{item.name}</h5>
                        <p className="text-[9px] opacity-60">{item.desc}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <span className="w-3 h-3 rounded-full shadow" style={{ backgroundColor: item.main }} />
                        <span className="w-3 h-3 rounded-full shadow" style={{ backgroundColor: item.secondary }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-none"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="w-full max-w-sm p-6 rounded-[32px] bg-slate-900 border border-white/10 shadow-[0_0_50px_rgba(244,63,94,0.15)] relative z-10 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.3)] border border-rose-500/30">
                <LogOut size={28} />
              </div>
              <h3 className="font-extrabold text-2xl text-white mb-2 tracking-tight">
                Sign Out
              </h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Are you sure you want to logout? You will need to sign in again to access your routines and study data.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-gray-300 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    setIsDevUnlocked(false);
                    localStorage.removeItem('sweety_dev_unlocked');
                    addSystemLog(`[SECURITY] Sign-out requested by operator.`);
                    try {
                      await signOut(auth);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="flex-1 py-3.5 px-4 bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-110 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 shadow-lg shadow-rose-500/20 border border-rose-500/50 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Smart Alarm / Reminder Modal */}
      <AnimatePresence>
        {activeAlarm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-none"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              className="w-full max-w-sm p-8 rounded-[32px] bg-slate-900 border border-indigo-500/30 shadow-[0_0_80px_rgba(99,102,241,0.2)] relative z-10 text-center flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full bg-indigo-500/20 text-indigo-400 mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.4)] border border-indigo-500/30 relative">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/50 animate-ping"></div>
                <AlertCircle size={40} className="animate-pulse" />
              </div>
              
              <h2 className="font-black text-2xl text-white mb-2 tracking-tight">
                {activeAlarm.type === 'alarm' ? 'Wake Up!' : 'Time to Study'}
              </h2>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full mb-6">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Subject</div>
                <div className="font-bold text-white text-lg">{activeAlarm.routine.subject}</div>
                <div className="text-sm text-gray-400 mt-1">{activeAlarm.routine.title}</div>
              </div>
              
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => {
                    if (alarmAudioRef.current) {
                      alarmAudioRef.current.pause();
                      alarmAudioRef.current.currentTime = 0;
                    }
                    setActiveAlarm(null);
                    setActiveTab('learn');
                  }}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 rounded-2xl text-sm font-black text-white transition-all active:scale-95 shadow-lg shadow-indigo-500/20 border border-indigo-500/50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play size={18} />
                  Start Study
                </button>
                
                <button
                  onClick={() => {
                    if (alarmAudioRef.current) {
                      alarmAudioRef.current.pause();
                      alarmAudioRef.current.currentTime = 0;
                    }
                    setActiveAlarm(null);
                  }}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-gray-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clock size={18} />
                  Snooze (5 Minutes)
                </button>

                <button
                  onClick={() => {
                    if (alarmAudioRef.current) {
                      alarmAudioRef.current.pause();
                      alarmAudioRef.current.currentTime = 0;
                    }
                    setActiveAlarm(null);
                  }}
                  className="w-full py-3 text-sm font-bold text-gray-500 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ThemeApplier theme={theme} />

      {/* Tab Screen Contents */}
      <div className={`w-full mx-auto z-10 relative flex-1 ${activeTab === 'messages' ? 'max-w-none px-0 pt-0 pb-0' : `max-w-7xl px-4 sm:px-6 pt-2 ${activeTab === 'home' ? 'pb-32' : 'pb-6'}`} safe-bottom`}>
        <AnimatePresence mode="wait">
          {activeTab === 'stories' && (
            <motion.div
              key="tab-stories"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <StoriesPage />
            </motion.div>
          )}

          {activeTab === 'followers' && (
            <motion.div
              key="tab-followers"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <FollowersPage />
            </motion.div>
          )}

          {activeTab === 'home' && (
            <motion.div
              key="tab-home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <HomeDashboard
                currentUser={currentUser}
                setActiveTab={setActiveTab as any}
                isVoiceActive={isActive}
                toggleSweety={toggleSweety}
                routines={routines}
                language={userProfile?.language || 'English'}
                handleToggleCompleted={handleToggleCompleted}
                toggleDrawer={() => setIsDrawerOpen(true)}
                isAuthorizedDev={isAuthorizedDev}
                isAdminViewActive={isAdminViewActive}
                onToggleAdmin={() => setIsAdminViewActive(!isAdminViewActive)}
                setDeviceUtility={setDeviceUtility}
              />
            </motion.div>
          )}

          {activeTab === 'image_studio' && (
            <motion.div
              key="tab-image-studio"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AIImageStudio
                theme={theme}
                addSystemLog={addSystemLog}
                currentUser={currentUser}
                setActiveTab={setActiveTab as any}
              />
            </motion.div>
          )}

          {activeTab === 'routine' && (
            <motion.div
              key="tab-routine"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <StudyRoutine
                currentUser={currentUser}
                language={userProfile?.language || 'English'}
                addSystemLog={addSystemLog}
              />
            </motion.div>
          )}

          {activeTab === 'learn' && (
            <motion.div
              key="tab-learn"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <LearnCenter theme={theme} addSystemLog={addSystemLog} currentUser={currentUser} userProfile={userProfile} />
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="tab-chat"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AIChatRoom
                theme={theme}
                chatHistory={chatHistory}
                addSystemLog={addSystemLog}
                setActiveTab={setActiveTab}
                currentUser={currentUser}
                userProfile={userProfile}
                setShowPremiumModal={setShowPremiumModal}
                setPremiumModalMessage={setPremiumModalMessage}
                onExecuteDeviceAction={handleExecuteDeviceAction}
              />
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div
              key="tab-messages"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <LiveMessaging
                theme={theme}
                currentUser={currentUser}
                userProfile={userProfile}
                setShowPremiumModal={setShowPremiumModal}
                setPremiumModalMessage={setPremiumModalMessage}
              />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="tab-profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-2xl mx-auto py-8"
            >
              <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative">
                <div className="p-8 flex flex-col items-center">
                  {/* Centered Profile Avatar */}
                  <div className="relative mb-8">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-32 h-32 rounded-full border-2 border-white/10 p-1 shadow-[0_0_50px_rgba(99,102,241,0.15)] relative"
                    >
                      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-bold text-4xl bg-gradient-to-br from-indigo-500/10 via-slate-800 to-purple-500/10">
                        {userProfile?.customAvatarUrl ? (
                          <img src={userProfile.customAvatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="select-none text-white/80">{(userProfile?.fullName || currentUser?.displayName || 'S').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {userProfile?.isPremium && (
                        <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-2 rounded-full shadow-lg border-4 border-[#0b0825] animate-pulse">
                          <Sparkles size={18} fill="currentColor" />
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* Profile Identity */}
                  <div className="text-center space-y-1 mb-8">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-2xl font-black text-white tracking-tight">{userProfile?.fullName || currentUser?.displayName || 'Scholar'}</h3>
                      {userProfile?.isPremium && <CheckCircle size={20} className="text-blue-400 fill-blue-400/20" />}
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <p className="text-indigo-400 font-bold text-sm">@{userProfile?.username || 'operator'}</p>
                      <div className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase rounded-full tracking-widest">
                        Operator Profile
                      </div>
                    </div>
                  </div>

                  {/* Stats Row Placeholder (Real stats can be fetched if needed, but for now we'll use consistent spacing) */}
                  <div className="flex items-center justify-between w-full max-w-sm border-y border-white/5 py-8 mb-8">
                    <div className="flex-1 text-center flex flex-col items-center gap-1">
                      <span className="text-white font-black text-xl leading-none">0</span>
                      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-[0.2em]">Friends</span>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex-1 text-center flex flex-col items-center gap-1">
                      <span className="text-white font-black text-xl leading-none">0</span>
                      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-[0.2em]">Followers</span>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex-1 text-center flex flex-col items-center gap-1">
                      <span className="text-white font-black text-xl leading-none">0</span>
                      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-[0.2em]">Following</span>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="w-full mb-10 text-center px-4">
                    {userProfile?.bio ? (
                      <p className="text-gray-300 text-sm leading-relaxed max-w-[320px] mx-auto italic font-medium opacity-90">
                        "{userProfile.bio}"
                      </p>
                    ) : (
                      <p className="text-gray-600 text-xs italic tracking-wide">Update your bio in settings.</p>
                    )}
                  </div>

                  <div className="flex flex-col w-full max-w-sm gap-3">
                    <button 
                      onClick={() => setActiveTab('settings')}
                      className="w-full py-4 bg-white text-black hover:bg-gray-100 rounded-3xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2.5 shadow-xl shadow-white/5"
                    >
                      <Settings size={20} />
                      Edit Academic Records
                    </button>
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-3xl font-black text-sm transition-all active:scale-95"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="tab-settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <UserProfileSettings
                currentUser={currentUser}
                userProfile={userProfile}
                onUpdateProfile={(updatedData) => setUserProfile(updatedData)}
                theme={theme}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                onNavigateHome={() => setActiveTab('home')}
                onLogout={async () => {
                  setIsDevUnlocked(false);
                  localStorage.removeItem('sweety_dev_unlocked');
                  addSystemLog(`[SECURITY] Sign-out requested by operator.`);
                  try {
                    await signOut(auth);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                addSystemLog={addSystemLog}
                isAdmin={isAuthorizedDev}
              />
            </motion.div>
          )}

          
          {activeTab === 'search' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SearchPage />
            </motion.div>
          )}
          {activeTab === 'announcements' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Announcements />
            </motion.div>
          )}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Notifications />
            </motion.div>
          )}

          {activeTab === 'friends' && (
            <motion.div
              key="tab-friends"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <FriendsPage 
                currentUser={currentUser} 
                onOpenProfile={(id: string) => {
                  setSelectedProfileUserId(id);
                  setIsUserProfileModalOpen(true);
                }}
                onStartChat={() => {
                  setActiveTab('messages');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              key="tab-about"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AboutUs isAdmin={isAuthorizedDev} addSystemLog={addSystemLog} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Main Visual Container */}
      {activeTab === 'voice' && (
        <div className="absolute inset-0 flex justify-center items-center z-10 pointer-events-none">
          {/* Character Container - Static for higher quality focus */}
          <motion.div 
            className="relative h-full flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: expression === 'heartbroken' ? 0.85 : 1,
              x: expression === 'heartbroken' ? [0, -4, 4, -4, 4, 0] : 0,
              y: expression === 'heartbroken' ? [0, 3, 0, 3, 0] : [0, -8, 0],
              scale: (isSpeaking && currentVisual !== ANIME_GIRL_NORMAL) ? [1, 1.015, 0.99, 1.01, 1] : 1,
              filter: expression === 'heartbroken' ? 'brightness(0.7) contrast(1.1)' : 'brightness(1) contrast(1)'
            }}
            transition={{
              x: { duration: 0.3, repeat: expression === 'heartbroken' ? Infinity : 0 },
              y: expression === 'heartbroken' 
                ? { duration: 0.2, repeat: 0 } 
                : { duration: 4, repeat: 0, ease: "easeInOut" },
              scale: (isSpeaking && currentVisual !== ANIME_GIRL_NORMAL)
                ? { duration: 0.6, repeat: 0, ease: "easeInOut" }
                : { duration: 0.3 },
              opacity: { duration: 0.5 },
              filter: { duration: 0.5 }
            }}
          >
            {/* Soft Ambient Glow */}
            <div className="absolute inset-x-0 top-1/4 bottom-1/4 blur-[20px] rounded-full z-0" style={{ backgroundColor: theme.bgGlow }} />

            {/* Ambient Cherry Blossom Rain */}
            <CherryBlossomRain />

            {customAvatarUrl ? (
              /* Custom Avatar Image Rendering */
              <motion.img 
                key={customAvatarUrl}
                src={customAvatarUrl} 
                onError={() => {
                  setCustomAvatarUrl(null);
                  addSystemLog("[SYSTEM_ERROR] Failed to load custom avatar.");
                }}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ 
                  opacity: 1,
                  scale: 1,
                  filter: [
                    `drop-shadow(0 0 25px ${theme.primary}) drop-shadow(0 0 10px ${theme.secondary})`,
                    `drop-shadow(0 0 35px ${theme.primary}) drop-shadow(0 0 15px ${theme.secondary})`,
                    `drop-shadow(0 0 25px ${theme.primary}) drop-shadow(0 0 10px ${theme.secondary})`
                  ]
                }}
                transition={{ 
                  opacity: { duration: 0.6, ease: "easeOut" },
                  scale: { duration: 0.6, ease: "easeOut" },
                  filter: { duration: 3, repeat: 0, ease: "easeInOut" }
                }}
                alt="Custom Mentor Avatar" 
                className="h-72 w-72 rounded-full border-2 border-white/20 object-cover relative z-10"
                referrerPolicy="no-referrer"
              />
            ) : (
              /* Futuristic, high-end Glowing AI Assistant Orb & Audio Visualizer (NO ANIME PICTURES!) */
              <div className="relative w-80 h-80 flex items-center justify-center z-10">
                {/* Layer 1: Rotating Outer Tech Ring */}
                <motion.div
                  className="absolute w-72 h-72 rounded-full border border-dashed opacity-40"
                  style={{ borderColor: getExpressionColors(expression, theme).main }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: 0, ease: "linear" }}
                />

                {/* Layer 2: Pulse Aura Waveform */}
                <motion.div
                  className="absolute rounded-full filter blur-[20px] opacity-30"
                  style={{ 
                    width: '240px',
                    height: '240px',
                    background: `radial-gradient(circle, ${getExpressionColors(expression, theme).main} 0%, ${getExpressionColors(expression, theme).secondary} 100%)`
                  }}
                  animate={{
                    scale: isSpeaking ? [1, 1.25 + outputLevel * 1.5, 1] : [1, 1.08, 1],
                  }}
                  transition={{
                    duration: isSpeaking ? 0.4 : 3,
                    repeat: 0,
                    ease: "easeInOut"
                  }}
                />

                {/* Layer 3: Secondary Orbiting Ring */}
                <motion.div
                  className="absolute w-60 h-60 rounded-full border border-white/5 opacity-25"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: 0, ease: "linear" }}
                />

                {/* Layer 4: Living Fluid Dynamic Sphere Core */}
                <motion.div
                  className="absolute w-44 h-44 rounded-full flex items-center justify-center overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${getExpressionColors(expression, theme).main} 0%, ${getExpressionColors(expression, theme).secondary} 100%)`,
                    boxShadow: `0 0 50px ${getExpressionColors(expression, theme).glow}, inset 0 0 20px rgba(255,255,255,0.4)`
                  }}
                  animate={{
                    scale: isSpeaking ? [1, 1.08 + outputLevel * 0.8, 1] : [1, 1.03, 1],
                    borderRadius: ["42% 58% 70% 30% / 45% 45% 55% 55%", "70% 30% 52% 48% / 60% 40% 60% 40%", "42% 58% 70% 30% / 45% 45% 55% 55%"]
                  }}
                  transition={{
                    scale: { duration: isSpeaking ? 0.3 : 2, repeat: 0, ease: "easeInOut" },
                    borderRadius: { duration: 6, repeat: 0, ease: "easeInOut" }
                  }}
                >
                  {/* Inside Orb Graphic: Floating Particle core */}
                  <div className="absolute inset-0 bg-black/10 mix-blend-overlay flex items-center justify-center">
                    <motion.div
                      className="w-16 h-16 rounded-full bg-white/25 blur-md"
                      animate={{
                        scale: isSpeaking ? [1, 1.4 + outputLevel, 1] : [1, 1.1, 1],
                        opacity: [0.6, 0.9, 0.6]
                      }}
                      transition={{ duration: 2, repeat: 0, ease: "easeInOut" }}
                    />
                  </div>

                  {/* Neural core center node */}
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg relative z-20">
                    <div className="w-6 h-6 rounded-full" style={{ background: getExpressionColors(expression, theme).main }} />
                  </div>
                </motion.div>

                {/* Layer 5: Dynamic Voice Output Level Rings */}
                {isSpeaking && (
                  <>
                    <motion.div
                      className="absolute rounded-full border-2 opacity-50"
                      style={{ 
                        borderColor: getExpressionColors(expression, theme).main,
                        width: '180px',
                        height: '180px',
                      }}
                      animate={{
                        scale: [1, 1.6 + outputLevel * 2],
                        opacity: [0.6, 0],
                      }}
                      transition={{
                        duration: 1,
                        repeat: 0,
                        ease: "easeOut"
                      }}
                    />
                    <motion.div
                      className="absolute rounded-full border"
                      style={{ 
                        borderColor: getExpressionColors(expression, theme).secondary,
                        width: '180px',
                        height: '180px',
                      }}
                      animate={{
                        scale: [1, 2.1 + outputLevel * 3],
                        opacity: [0.4, 0],
                      }}
                      transition={{
                        duration: 1.4,
                        delay: 0.3,
                        repeat: 0,
                        ease: "easeOut"
                      }}
                    />
                  </>
                )}

                {/* Expression HUD Tag */}
                <div className="absolute -bottom-8 bg-black/60 border px-3 py-1 text-[8px] uppercase tracking-widest font-bold font-mono rounded animate-pulse"
                  style={{ borderColor: `${getExpressionColors(expression, theme).main}44`, color: getExpressionColors(expression, theme).main }}
                >
                  {expression} MODE
                </div>
              </div>
            )}

            {/* Expression Overlays (Subtle Glows) */}
            <AnimatePresence>
              {expression === 'thinking' && (
                <motion.div 
                  key="exp-thinking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-0 pointer-events-none"
                >
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 0.3 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-indigo-500/20 blur-[20px] rounded-full z-0 p-4"
                  >
                    <motion.div 
                      key="thinking-spin"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: 0, ease: "linear" }}
                      className="w-full h-full border-2 border-dashed border-indigo-400/30 rounded-full"
                    />
                  </motion.div>
                  <motion.div 
                    key="thinking-aura"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: [0.05, 0.15, 0.05] }} 
                    transition={{ duration: 3, repeat: 0 }}
                    className="absolute inset-0 bg-white/10 blur-[20px] z-5" 
                  />
                </motion.div>
              )}
              {expression === 'happy' && (
                <motion.div 
                  key="exp-happy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-0 pointer-events-none"
                >
                  <motion.div key="happy-blush-l" initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} exit={{ opacity: 0 }} className="absolute top-[52%] left-[30%] w-[12%] h-[6%] bg-red-400/20 blur-[20px] rounded-full z-40" />
                  <motion.div key="happy-blush-r" initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} exit={{ opacity: 0 }} className="absolute top-[52%] left-[58%] w-[12%] h-[6%] bg-red-400/20 blur-[20px] rounded-full z-40" />
                </motion.div>
              )}
              {(expression === 'sad' || expression === 'heartbroken') && (
                <motion.div 
                  key="exp-sad-hb"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-0 pointer-events-none"
                >
                  <motion.div 
                    key="sad-bg"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: [0.2, expression === 'heartbroken' ? 0.8 : 0.4, 0.2] }} 
                    transition={{ duration: 1.2, repeat: 0 }}
                    className={`absolute inset-0 ${expression === 'heartbroken' ? 'bg-indigo-950/60' : 'bg-blue-500/20'} blur-[20px] z-5`} 
                  />
                  {expression === 'heartbroken' && (
                    <div key="hb-vignette" className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
                      <div className="absolute inset-0 bg-radial-gradient from-transparent via-indigo-900/10 to-indigo-950/40" />
                    </div>
                  )}
                </motion.div>
              )}
              {expression === 'excited' && (
                <motion.div 
                  key="exp-excited"
                  initial={{ opacity: 0 }} 
                  animate={{ scale: [1, 1.1, 1], opacity: 0.15 }} 
                  className="absolute inset-0 bg-yellow-400/10 blur-[20px] z-5" 
                />
              )}
              {expression === 'embarrassed' && (
                <motion.div 
                  key="exp-embarrassed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-0 pointer-events-none"
                >
                  <motion.div key="emb-blush-l" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="absolute top-[52%] left-[32%] w-[10%] h-[5%] bg-red-600/30 blur-[20px] rounded-full z-40" />
                  <motion.div key="emb-blush-r" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="absolute top-[52%] left-[58%] w-[10%] h-[5%] bg-red-600/30 blur-[20px] rounded-full z-40" />
                </motion.div>
              )}
              {expression === 'surprised' && (
                <motion.div 
                  key="exp-surprised"
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 0.1, scale: 1.5 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/20 blur-[20px] z-5" 
                />
              )}
              {expression === 'confused' && (
                <motion.div 
                  key="exp-confused"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: [0.1, 0.2, 0.1] }} 
                  transition={{ duration: 2, repeat: 0 }}
                  className="absolute inset-0 bg-indigo-500/10 blur-[20px] z-5" 
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Bottom HUD */}
      {activeTab === 'voice' && (
        <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center justify-end pb-12 z-40">
        
        {/* Waveform Visualization */}
        <div className="flex items-center gap-1.5 h-[60px] mb-8">
          <AnimatePresence mode="wait">
            {isSpeaking ? (
              <motion.div 
                key="speaking-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 h-full"
              >
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`speaking-${i}`}
                    initial={{ height: 4 }}
                    animate={{ 
                      height: [
                        Math.random() * 20 + 10, 
                        Math.random() * 40 + 20, 
                        Math.random() * 15 + 5
                      ],
                      opacity: [0.3, 0.8, 0.5]
                    }}
                    transition={{ duration: 0.4, repeat: 0, ease: "easeInOut", delay: i * 0.03 }}
                    className={`w-1 rounded-none ${i % 3 === 0 ? 'opacity-80' : 'opacity-50'}`}
                    style={{ 
                      backgroundColor: i % 3 === 0 ? theme.secondary : theme.primary,
                      boxShadow: i % 3 === 0 ? `0 0 10px ${theme.primary}` : 'none'
                    }}
                  />
                ))}
              </motion.div>
            ) : isListening ? (
              <motion.div 
                key="listening-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 h-full"
              >
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`listening-${i}`}
                    animate={{ 
                      height: Math.max(4, micLevel * 200 * (1 + Math.random())),
                      opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 0.1 }}
                    className="w-1 rounded-none"
                    style={{ backgroundColor: theme.primary }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="visualizer-static" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 0.2 }} 
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 h-full"
              >
                {[20, 40, 55, 35, 50, 35, 25, 20].map((h, i) => (
                  <div key={`static-${i}`} className="w-1 rounded-none" style={{ height: `${h * 0.4}px`, backgroundColor: theme.primary }} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls Container */}
        <div className="flex items-center gap-6 relative z-50">
          {/* Mic Button / Trigger */}
          <div className="relative flex items-center justify-center">
            {/* Pulsing waves emanating outwards based on micLevel and active state */}
            {isActive && [0, 1, 2].map((index) => (
              <motion.div
                key={`wave-${index}`}
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{
                  opacity: 0,
                  scale: [1, 2.2 + micLevel * 2.5],
                }}
                transition={{
                  repeat: 0,
                  duration: 2.0,
                  delay: index * 0.65,
                  ease: "easeOut",
                }}
                className="absolute w-[86px] h-[86px] force-circular border"
                style={{
                  borderColor: isListening 
                    ? 'rgba(16, 185, 129, 0.4)' 
                    : isSpeaking 
                      ? 'rgba(244, 63, 94, 0.4)' 
                      : 'rgba(139, 92, 246, 0.4)',
                  boxShadow: `0 0 20px ${
                    isListening 
                      ? 'rgba(16, 185, 129, 0.25)' 
                      : isSpeaking 
                        ? 'rgba(244, 63, 94, 0.25)' 
                        : 'rgba(139, 92, 246, 0.25)'
                  }`
                }}
              />
            ))}

            {/* Rotating Colorful Gradient Ring Background */}
            <motion.div
              animate={{ rotate: isActive ? 360 : 0 }}
              transition={{ repeat: 0, duration: 6, ease: "linear" }}
              className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-amber-400 blur-sm opacity-80"
              style={{
                opacity: isActive ? 0.95 : 0.4,
              }}
            />

            {/* Main Interactive Button */}
            <motion.button
              onClick={toggleSweety}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="relative w-[86px] h-[86px] force-circular bg-black flex items-center justify-center cursor-pointer overflow-hidden z-10 transition-colors duration-500"
              style={{ 
                border: `2px solid ${isActive ? 'transparent' : theme.primary}`,
                boxShadow: isActive 
                  ? `0 0 35px ${
                      isListening 
                        ? 'rgba(16, 185, 129, 0.8)' 
                        : isSpeaking 
                          ? 'rgba(244, 63, 94, 0.8)' 
                          : 'rgba(139, 92, 246, 0.8)'
                    }`
                  : `0 0 15px ${theme.glow}`
              }}
            >
              {/* Inner glowing core with dynamic gradient background depending on status */}
              <div 
                className={`
                  absolute inset-[3px] force-circular flex items-center justify-center transition-all duration-700
                  ${
                    !isActive 
                      ? 'bg-gradient-to-tr from-slate-950 via-neutral-900 to-zinc-800' 
                      : isListening 
                        ? 'bg-gradient-to-tr from-teal-500 via-emerald-500 to-green-400' 
                        : isSpeaking 
                          ? 'bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500' 
                          : 'bg-gradient-to-tr from-indigo-500 via-purple-600 to-violet-500'
                  }
                `}
              >
                {/* Visualizer bars overlay inside button when active */}
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-25">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <motion.div
                        key={`bar-${val}`}
                        animate={{
                          height: isListening 
                            ? [8, 24 + micLevel * 40, 8] 
                            : isSpeaking 
                              ? [12, 36, 12] 
                              : [6, 12, 6],
                        }}
                        transition={{
                          repeat: 0,
                          duration: 0.8 + val * 0.1,
                          ease: "easeInOut",
                        }}
                        className="w-[3px] bg-white rounded-full"
                      />
                    ))}
                  </div>
                )}

                {/* Central Icon */}
                <div className="relative z-20 text-white">
                  {isActive ? (
                    <motion.div
                      animate={{
                        scale: isListening ? [1, 1.15, 1] : 1,
                      }}
                      transition={{
                        repeat: isListening ? Infinity : 0,
                        duration: 1.2,
                        ease: "easeInOut"
                      }}
                    >
                      <Mic size={28} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
                    </motion.div>
                  ) : (
                    <MicOff size={28} className="text-zinc-400 drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]" />
                  )}
                </div>
              </div>
            </motion.button>
            
            {isActive && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-[100] whitespace-nowrap">
                <span className="text-[10px] tracking-[2px] uppercase font-mono font-bold matrix-blink text-center" style={{ color: theme.primary }}>
                  {isListening ? "ACCESSING MICROPHONE..." : "PROCESSING AUDIO..."}
                </span>
                <span className="text-[8px] text-center font-mono uppercase tracking-[2px]" style={{ color: `${theme.primary}80` }}>
                  Tap to Interrupt
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Floating Premium Frosted Glass Bottom Navigation Bar */}
      {activeTab === 'home' && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] pointer-events-auto w-full max-w-md px-4">
        <div className="flex justify-between items-center bg-slate-900/80 border border-white/10 p-2.5 rounded-[24px] backdrop-blur-none shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <button 
            id="nav-home"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'home' ? 'text-indigo-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home size={18} />
            <span className="text-[9px] font-medium tracking-wider font-sans">Home</span>
          </button>

          <button 
            id="nav-learn"
            onClick={() => setActiveTab('learn')}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'learn' ? 'text-pink-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={18} />
            <span className="text-[9px] font-medium tracking-wider font-sans">Learn</span>
          </button>

          <button 
            id="nav-friends"
            onClick={() => setActiveTab('friends')}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'friends' ? 'text-indigo-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={18} />
            <span className="text-[9px] font-medium tracking-wider font-sans">Friends</span>
          </button>

          <button 
            id="nav-image-studio"
            onClick={() => setActiveTab('image_studio')}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'image_studio' ? 'text-pink-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Palette size={18} />
            <span className="text-[9px] font-medium tracking-wider font-sans">Studio</span>
          </button>

          <button 
            id="nav-chat"
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'chat' ? 'text-indigo-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={18} />
            <span className="text-[9px] font-medium tracking-wider font-sans">Chat</span>
          </button>

          <button 
            id="nav-messages"
            onClick={() => {
              setActiveTab('messages');
              setInAppNotification(null);
            }}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === 'messages' ? 'text-pink-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageCircle size={18} />
            <span className="text-[9px] font-medium tracking-wider font-sans">Messages</span>
            {totalUnreadChatsCount > 0 && (
              <span className="absolute top-1 right-2.5 bg-rose-500 text-white text-[9px] font-black h-4 w-4 flex items-center justify-center rounded-full animate-pulse border border-slate-950">
                {totalUnreadChatsCount}
              </span>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Floating Push Notification Preview */}
      <AnimatePresence>
        {inAppNotification && (
          <motion.div
            key="in-app-notification-toast"
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            onClick={() => {
              setActiveTab('messages');
              setInAppNotification(null);
            }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-sm cursor-pointer select-none"
          >
            <div className="bg-slate-900/95 border border-indigo-500/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-[0_15px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <MessageCircle size={20} className="animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-white">{inAppNotification.title}</h4>
                <p className="text-[11px] text-gray-300 truncate mt-0.5">{inAppNotification.message}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setInAppNotification(null);
                }}
                className="p-1 hover:bg-white/10 rounded-full text-gray-400 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Status/Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div 
            key="status-error-overlay"
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[100] w-[90%] max-w-sm"
          >
            <div className="bg-red-950/90 border border-red-500/40 p-4 rounded-none flex flex-col items-center gap-3 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/30 overflow-hidden">
                <motion.div 
                  className="h-full bg-red-500"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: 0, ease: "linear" }}
                />
              </div>
              
              <p className="text-red-400 text-xs font-mono font-medium text-center leading-relaxed">
                {error}
              </p>
              
              <button 
                onClick={() => { stopSweety(); setTimeout(startSweety, 300); }}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 px-6 py-2 rounded-none text-[10px] font-bold uppercase tracking-[2px] transition-all active:scale-95 text-red-400 font-mono"
              >
                Reset Connection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(tab) => setActiveTab(tab as any)}
        onLogout={async () => { await signOut(auth); setIsDevUnlocked(false); }}
        isAuthorizedDev={isAuthorizedDev}
        isAdminViewActive={isAdminViewActive}
        onToggleAdmin={() => setIsAdminViewActive(!isAdminViewActive)}
      />
      <CallManager />
      <DeviceUtilityOverlay utility={deviceUtility} onClose={() => setDeviceUtility({ type: null })} />
      
      {selectedProfileUserId && (
        <UserProfileModal
          userId={selectedProfileUserId}
          currentUser={currentUser}
          userProfile={userProfile}
          isOpen={isUserProfileModalOpen}
          onClose={() => {
            setIsUserProfileModalOpen(false);
            setTimeout(() => setSelectedProfileUserId(null), 300);
          }}
          onStartChat={(peer) => {
            setIsUserProfileModalOpen(false);
            setSelectedProfileUserId(null);
            setActiveTab('messages');
          }}
        />
      )}
      
      <AnimatePresence>
        {pendingUpdate && (
          <AppUpdateOverlay 
            update={pendingUpdate} 
            onClose={() => setPendingUpdate(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
