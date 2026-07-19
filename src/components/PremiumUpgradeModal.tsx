import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Check, X, Sparkles, MessageSquare, Zap, Clock, Key, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLiveSettings } from '../lib/useLiveSettings';

interface PremiumUpgradeModalProps {
  onClose: () => void;
  userProfile: any;
  currentUser: any;
  message?: string;
}

export function PremiumUpgradeModal({ onClose, userProfile, currentUser, message }: PremiumUpgradeModalProps) {
  const { appSettings } = useLiveSettings();
  const [redeemCode, setRedeemCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Calculate dynamic countdown/remaining time for active premium
  useEffect(() => {
    if (!userProfile?.isPremium || !userProfile?.premiumExpiresAt) {
      setTimeLeft('');
      return;
    }

    const calculateTimeLeft = () => {
      const expiry = new Date(userProfile.premiumExpiresAt).getTime();
      const diff = expiry - Date.now();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m remaining`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeLeft(`${minutes}m remaining`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [userProfile?.isPremium, userProfile?.premiumExpiresAt]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { doc, getDoc, updateDoc, setDoc, addDoc, collection, arrayUnion } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const uppercaseCode = redeemCode.trim().toUpperCase();
      const codeRef = doc(db, 'redeem_codes', uppercaseCode);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        throw new Error('Invalid Redeem Code. Please verify and try again.');
      }

      const codeData = codeSnap.data();
      
      if (codeData.isEnabled === false) {
        throw new Error('This Redeem Code is currently disabled.');
      }

      if (codeData.isRevoked === true) {
        throw new Error('This Redeem Code has been revoked.');
      }

      const alreadyRedeemed = codeData.redeemedBy?.some((r: any) => r.userId === currentUser?.uid);
      if (alreadyRedeemed) {
        throw new Error('You have already redeemed this code!');
      }

      if (codeData.isSingleUse && codeData.activationCount >= 1) {
        throw new Error('This single-use code has already been redeemed.');
      }

      if (codeData.activationCount >= codeData.maxActivations) {
        throw new Error('This code has reached its maximum activation limit.');
      }

      let premiumExpiresAt: string | null = null;
      const now = new Date();

      switch (codeData.validityType) {
        case '1_day': premiumExpiresAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(); break;
        case '7_days': premiumExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); break;
        case '15_days': premiumExpiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(); break;
        case '30_days': premiumExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); break;
        case '90_days': premiumExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); break;
        case '180_days': premiumExpiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(); break;
        case '365_days': premiumExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(); break;
        case 'lifetime': premiumExpiresAt = null; break;
        case 'custom_date':
          if (codeData.customExpiryDate) {
            const customExpiry = new Date(codeData.customExpiryDate);
            if (customExpiry.getTime() <= now.getTime()) {
              throw new Error('This code\'s validity period has already expired.');
            }
            premiumExpiresAt = customExpiry.toISOString();
          } else {
            throw new Error('Invalid custom validity date configuration.');
          }
          break;
        default:
          premiumExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      const redeemRecord = {
        userId: currentUser?.uid,
        email: currentUser?.email,
        redeemedAt: now.toISOString()
      };

      await updateDoc(codeRef, {
        activationCount: (codeData.activationCount || 0) + 1,
        redeemedBy: arrayUnion(redeemRecord)
      });

      const userRef = doc(db, 'users', currentUser?.uid);
      await setDoc(userRef, {
        isPremium: true,
        premiumType: 'Redeem Code',
        premiumPlan: codeData.validityType,
        premiumGrantedAt: now.toISOString(),
        premiumExpiresAt,
        redeemedCode: uppercaseCode
      }, { merge: true });

      await addDoc(collection(db, 'users', currentUser?.uid, 'premium_history'), {
        action: 'Redeemed Code',
        type: 'Redeem Code',
        code: uppercaseCode,
        actionDate: now.toISOString(),
        expiresAt: premiumExpiresAt,
        grantedBy: 'Redeem Code System'
      });

      // Success
      setSuccess('Premium Membership Activated Successfully!');
      setRedeemCode('');
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

    } catch (err: any) {
      setError(err.message || 'An error occurred during redemption. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if premium is active (both flag is true and has not expired)
  const isPremiumActive = () => {
    if (!userProfile) return false;
    if (userProfile.isPremium !== true) return false;
    if (!userProfile.premiumExpiresAt) return true; // Lifetime
    return new Date(userProfile.premiumExpiresAt).getTime() > Date.now();
  };

  // Check if premium is expired
  const isPremiumExpired = () => {
    if (!userProfile) return false;
    if (userProfile.isPremium !== true && userProfile.premiumExpiresAt) {
      return new Date(userProfile.premiumExpiresAt).getTime() <= Date.now();
    }
    if (userProfile.isPremium === true && userProfile.premiumExpiresAt) {
      return new Date(userProfile.premiumExpiresAt).getTime() <= Date.now();
    }
    return false;
  };

  const activeStatus = isPremiumActive();
  const expiredStatus = isPremiumExpired();

  return (
    <div className="fixed inset-0 z-[5000] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 relative">
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-950 to-[#04020a] border border-amber-500/25 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] z-10"
        >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20 text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 relative">
              <div className="absolute inset-0 bg-amber-500/25 rounded-full blur-xl animate-pulse" />
              <Crown size={32} className="text-amber-400 relative z-10 animate-bounce" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {appSettings.appName} Premium
            </h2>
            <p className="text-gray-400 text-xs md:text-sm mt-1 max-w-md">
              {message || "Unlock elite study tools, unlimited AI Voice assistance, zero hourly constraints, and AI Image Studio features."}
            </p>
          </div>

          {/* Premium Status Banner */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-black uppercase tracking-wider text-gray-400">Premium Status</div>
              <div className="flex items-center gap-2">
                {activeStatus ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Active</span>
                  </>
                ) : expiredStatus ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Expired</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Not Active</span>
                  </>
                )}
              </div>
            </div>

            {activeStatus && (
              <div className="text-right space-y-1">
                <div className="text-xs font-black uppercase tracking-wider text-amber-400">Validity Period</div>
                <div className="text-xs text-white font-mono bg-amber-500/15 border border-amber-500/20 px-3 py-1.5 rounded-xl font-bold">
                  {userProfile?.premiumExpiresAt 
                    ? new Date(userProfile.premiumExpiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Lifetime ⭐'
                  }
                </div>
                {timeLeft && <div className="text-[10px] text-gray-400 font-mono mt-1">{timeLeft}</div>}
              </div>
            )}
          </div>

          {/* Redeem Code Section */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
              <Key size={14} className="text-amber-400" /> Activate Premium Membership
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Enter your valid Redeem Code below to unlock Premium benefits instantly. Premium can only be activated via code.
            </p>

            <form onSubmit={handleRedeem} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text"
                  placeholder="Enter Redeem Code (e.g. SW-EXAM-XXXX)"
                  value={redeemCode}
                  onChange={e => {
                    setRedeemCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  disabled={loading}
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono tracking-widest uppercase focus:outline-none focus:border-amber-400/50"
                  required
                />
                <button 
                  type="submit"
                  disabled={loading || !redeemCode.trim()}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-slate-950 font-black text-sm px-6 py-3 rounded-xl transition-all shrink-0 flex items-center justify-center gap-1.5 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Activate Premium'}
                </button>
              </div>

              {/* Status alerts */}
              <AnimatePresence mode="wait">
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl text-emerald-400 text-xs leading-relaxed"
                  >
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" />
                    <div>{success}</div>
                  </motion.div>
                )}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 p-3.5 rounded-xl text-rose-400 text-xs leading-relaxed"
                  >
                    <AlertTriangle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                    <div>{error}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Premium Benefits checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Exclusive Premium Benefits</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {[
                { title: "Unlimited AI Voice Assistant", desc: "No daily limit constraint" },
                { title: "Zero Chat Limits", desc: "Send unlimited study messages" },
                { title: "Access to AI Studio", desc: "Generate gorgeous high-res images" },
                { title: "Priority Study Assistance", desc: "Fast low-latency responses" },
                { title: "Image & File Analysis", desc: "Upload books, PDFs, and homework" },
                { title: "Premium Theme Access", desc: "Unlock beautiful dashboard presets" }
              ].map((b, i) => (
                <div key={i} className="flex gap-2.5 items-start p-2 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                  <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={10} className="text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-200">{b.title}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
