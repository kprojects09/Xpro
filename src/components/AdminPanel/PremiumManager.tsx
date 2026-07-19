import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Crown, Zap, Search, Shield, User, Clock, Calendar, CheckCircle2, AlertCircle, RefreshCw, Eye, History, Plus, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PREMIUM_DURATIONS = [
  { label: '10 Minutes', value: 10 * 60 * 1000 },
  { label: '30 Minutes', value: 30 * 60 * 1000 },
  { label: '1 Hour', value: 60 * 60 * 1000 },
  { label: '6 Hours', value: 6 * 60 * 60 * 1000 },
  { label: '12 Hours', value: 12 * 60 * 60 * 1000 },
  { label: '1 Day', value: 24 * 60 * 60 * 1000 },
  { label: '3 Days', value: 3 * 24 * 60 * 60 * 1000 },
  { label: '7 Days', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '15 Days', value: 15 * 24 * 60 * 60 * 1000 },
  { label: '30 Days', value: 30 * 24 * 60 * 60 * 1000 },
  { label: '90 Days', value: 90 * 24 * 60 * 60 * 1000 },
  { label: '180 Days', value: 180 * 24 * 60 * 60 * 1000 },
  { label: '1 Year', value: 365 * 24 * 60 * 60 * 1000 },
  { label: 'Lifetime', value: -1 },
  { label: 'Custom Date & Time', value: -2 }
];

const PREMIUM_TYPES = ['Trial', 'Paid', 'Admin Gift'];

export function PremiumManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  // Modal / Selection State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [premiumHistory, setPremiumHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Custom UI notification/modal states to replace blocked alert/confirm popups
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const showSuccessToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const showErrorToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 3000);
  };
  
  // Form State
  const [selectedDuration, setSelectedDuration] = useState(PREMIUM_DURATIONS[7].value); // Default 7 Days
  const [customDateTime, setCustomDateTime] = useState('');
  const [premiumType, setPremiumType] = useState('Admin Gift');

  useEffect(() => {
    // Fetch global settings
    const unsubSettings = onSnapshot(doc(db, 'admin_settings', 'global'), (snap) => {
      if (snap.exists()) {
        setGlobalSettings(snap.data());
      }
    });

    // Fetch users (with Premium fields)
    const q = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(q, (snap) => {
      const fetchedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(fetchedUsers);
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubUsers();
    };
  }, []);

  // Sync premium history of selected user in real-time
  useEffect(() => {
    if (!selectedUser) {
      setPremiumHistory([]);
      return;
    }

    setHistoryLoading(true);
    const historyRef = collection(db, 'users', selectedUser.id, 'premium_history');
    const q = query(historyRef, orderBy('actionDate', 'desc'));
    
    const unsubHistory = onSnapshot(q, (snap) => {
      const historyList = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setPremiumHistory(historyList);
      setHistoryLoading(false);
    }, (err) => {
      console.error("Error reading premium history:", err);
      setHistoryLoading(false);
    });

    return () => unsubHistory();
  }, [selectedUser]);

  const handleUpdateFreeLimit = async (seconds: number) => {
    try {
      await setDoc(doc(db, 'admin_settings', 'global'), { freeVoiceTimeLimit: seconds }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const calculateExpiry = () => {
    if (selectedDuration === -1) return null; // Lifetime
    if (selectedDuration === -2) {
      return customDateTime ? new Date(customDateTime) : null;
    }
    return new Date(Date.now() + selectedDuration);
  };

  const handleGrantOrExtendPremium = async (user: any) => {
    const expiresAt = calculateExpiry();
    const actionType = user.isPremium ? 'Extended' : 'Granted';
    const expiresAtStr = expiresAt ? expiresAt.toISOString() : null;

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isPremium: true,
        premiumType,
        premiumGrantedAt: new Date().toISOString(),
        premiumExpiresAt: expiresAtStr,
        grantedBy: auth.currentUser?.email || 'Administrator'
      });

      // Log in premium history subcollection
      await addDoc(collection(db, 'users', user.id, 'premium_history'), {
        action: actionType,
        type: premiumType,
        actionDate: new Date().toISOString(),
        expiresAt: expiresAtStr,
        grantedBy: auth.currentUser?.email || 'Administrator'
      });

      // Send personalized in-app notification doc to user's personal notifications subcollection
      const durationLabel = selectedDuration === -2 
        ? 'Custom Duration' 
        : PREMIUM_DURATIONS.find(d => d.value === selectedDuration)?.label || 'Premium';

      let notifTitle = 'Congratulations Premium Activated';
      let notifMsg = '';

      if (selectedDuration === -1) {
        notifMsg = `You have received Lifetime Premium.\n\nActivated by: ${auth.currentUser?.email || 'Administrator'}`;
      } else {
        const formattedExpiry = expiresAt ? expiresAt.toLocaleString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : 'Never';
        notifMsg = `Your Premium Membership has been activated.\n\nDuration: ${durationLabel}\nActivated by: ${auth.currentUser?.email || 'Administrator'}\nExpiry: ${formattedExpiry}`;
      }

      await addDoc(collection(db, 'users', user.id, 'notifications'), {
        title: notifTitle,
        message: notifMsg,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'premium_granted'
      });

      // Update local state if needed
      setSelectedUser(prev => prev ? { ...prev, isPremium: true, premiumType, premiumExpiresAt: expiresAtStr } : null);
      showSuccessToast(`Premium status successfully updated for ${user.fullName || user.displayName || 'User'}!`);
    } catch (e) {
      console.error(e);
      showErrorToast('Failed to update premium status');
    }
  };

  const handleRevokePremium = async (user: any) => {
    setConfirmDialog({
      title: 'Revoke Premium Access',
      message: `Are you sure you want to revoke Premium for ${user.fullName || user.displayName || 'this user'}?`,
      onConfirm: async () => {
        try {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, {
            isPremium: false,
            premiumType: null,
            premiumPlan: null,
            premiumExpiresAt: null
          });

          await addDoc(collection(db, 'users', user.id, 'premium_history'), {
            action: 'Revoked',
            actionDate: new Date().toISOString(),
            revokedBy: auth.currentUser?.email || 'Administrator'
          });

          await addDoc(collection(db, 'users', user.id, 'notifications'), {
            title: 'Premium Membership Expired',
            message: 'Your Premium Membership has expired. Renew to continue enjoying Premium features.',
            createdAt: new Date().toISOString(),
            read: false,
            type: 'premium_expired'
          });

          setSelectedUser(prev => prev ? { ...prev, isPremium: false, premiumType: null, premiumExpiresAt: null } : null);
          showSuccessToast('Premium access revoked.');
        } catch (e) {
          console.error(e);
          showErrorToast('Failed to revoke premium status');
        }
        setConfirmDialog(null);
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.id?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats Calculations
  const totalPremiumUsers = users.filter(u => u.isPremium).length;
  const lifetimePremiumUsers = users.filter(u => u.isPremium && !u.premiumExpiresAt).length;
  
  const nowTime = Date.now();
  const activePremiumUsers = users.filter(u => {
    if (!u.isPremium) return false;
    if (!u.premiumExpiresAt) return true; // Lifetime
    return new Date(u.premiumExpiresAt).getTime() > nowTime;
  }).length;

  const expiringTodayCount = users.filter(u => {
    if (!u.isPremium || !u.premiumExpiresAt) return false;
    const expiry = new Date(u.premiumExpiresAt).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    return expiry > nowTime && (expiry - nowTime) < oneDay;
  }).length;

  const expiringThisWeekCount = users.filter(u => {
    if (!u.isPremium || !u.premiumExpiresAt) return false;
    const expiry = new Date(u.premiumExpiresAt).getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return expiry > nowTime && (expiry - nowTime) < oneWeek;
  }).length;

  const recentlyGrantedList = [...users]
    .filter(u => u.isPremium && u.premiumGrantedAt)
    .sort((a, b) => new Date(b.premiumGrantedAt).getTime() - new Date(a.premiumGrantedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <Crown className="text-amber-400" />
          Premium Manager
        </h2>
        <p className="text-gray-400 text-sm mt-1">Configure global trial allowances and manage real-time premium subscriptions securely.</p>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Total Premium</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{totalPremiumUsers}</p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Active Premium</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{activePremiumUsers}</p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Lifetime Users</p>
          <p className="text-2xl font-black text-violet-400 mt-1">{lifetimePremiumUsers}</p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Expiring Today</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{expiringTodayCount}</p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Expiring This Week</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{expiringThisWeekCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Middle Column: User Management Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="text-pink-400" /> User Directory
            </h3>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by Name, Email, or ID..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="pb-3 font-semibold">User Details</th>
                  <th className="pb-3 font-semibold">User ID</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 italic">No matching users found</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const isUserPremium = user.isPremium === true;
                    return (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3">
                          <div className="font-medium text-white">{user.fullName || user.displayName || 'Unknown'}</div>
                          <div className="text-xs text-gray-400">{user.email || 'No email'}</div>
                        </td>
                        <td className="py-3 text-xs text-gray-400 font-mono select-all max-w-[120px] truncate" title={user.id}>
                          {user.id}
                        </td>
                        <td className="py-3">
                          {isUserPremium ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 uppercase tracking-wider">
                              <Crown size={10} /> Premium
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 uppercase tracking-wider">
                              Free
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => setSelectedUser(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors"
                          >
                            <Eye size={12} /> Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Free Voice configuration & Recent Premium updates */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="text-indigo-400" /> Free Voice Limit
            </h3>
            <p className="text-sm text-gray-400 mb-4">Set the daily free allowance for non-premium user voice assistant usage (in seconds).</p>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                value={globalSettings.freeVoiceTimeLimit || 7200}
                onChange={(e) => handleUpdateFreeLimit(Number(e.target.value))}
                className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 w-32 text-white font-mono focus:outline-none focus:border-indigo-400/50"
              />
              <span className="text-gray-400 text-sm">Seconds</span>
            </div>
            <div className="mt-3 text-amber-400 text-xs font-mono bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 w-fit">
              = {Math.floor((globalSettings.freeVoiceTimeLimit || 7200) / 3600)}h {Math.floor(((globalSettings.freeVoiceTimeLimit || 7200) % 3600) / 60)}m
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <History size={14} className="text-amber-400" /> Recently Granted Premium
            </h3>
            {recentlyGrantedList.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No recently granted users</p>
            ) : (
              <div className="space-y-3">
                {recentlyGrantedList.map(u => (
                  <div key={u.id} className="flex justify-between items-center text-xs p-2.5 bg-white/5 border border-white/5 rounded-xl">
                    <div>
                      <div className="font-bold text-white">{u.fullName || u.displayName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Granted On: {u.premiumGrantedAt ? new Date(u.premiumGrantedAt).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <span className="text-[9px] font-mono bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">{u.premiumType || 'Gift'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Detailed Member Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-slate-950 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col p-6 md:p-8"
            >
              <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    {selectedUser.isPremium ? <Crown className="text-amber-400 animate-pulse" /> : <User className="text-gray-400" />}
                    User Profile Management
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-1">ID: {selectedUser.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-sm font-bold px-3"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Profile Detail & Actions */}
                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-gray-400">User Information</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">Name:</span> <strong className="text-white">{selectedUser.fullName || selectedUser.displayName || 'N/A'}</strong></div>
                      <div className="flex justify-between"><span className="text-gray-400">Email:</span> <strong className="text-white">{selectedUser.email || 'N/A'}</strong></div>
                      <div className="flex justify-between"><span className="text-gray-400">Theme Preference:</span> <strong className="text-white uppercase">{selectedUser.theme || 'Default'}</strong></div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Subscription:</span> 
                        <strong className={`px-2 py-0.5 rounded text-xs ${selectedUser.isPremium ? 'text-amber-400 bg-amber-400/10' : 'text-gray-400 bg-white/10'}`}>
                          {selectedUser.isPremium ? 'PREMIUM MEMBER' : 'FREE USER'}
                        </strong>
                      </div>
                      {selectedUser.isPremium && (
                        <>
                          <div className="flex justify-between"><span className="text-gray-400">Premium Type:</span> <strong className="text-amber-300 font-bold">{selectedUser.premiumType || 'Paid'}</strong></div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Expiry Time:</span> 
                            <strong className="text-white">
                              {selectedUser.premiumExpiresAt ? new Date(selectedUser.premiumExpiresAt).toLocaleString() : '⭐ Lifetime Premium'}
                            </strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-400" /> Subscription Actions
                    </h4>
                    
                    {/* Grant / Extend Form */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Select Duration</label>
                        <select 
                          value={selectedDuration}
                          onChange={(e) => setSelectedDuration(Number(e.target.value))}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          {PREMIUM_DURATIONS.map(d => <option key={d.label} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>

                      {selectedDuration === -2 && (
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Custom Expiry Date & Time</label>
                          <input 
                            type="datetime-local"
                            value={customDateTime}
                            onChange={(e) => setCustomDateTime(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Select Premium Type</label>
                        <div className="flex gap-2">
                          {PREMIUM_TYPES.map(type => (
                            <button 
                              key={type}
                              type="button"
                              onClick={() => setPremiumType(type)}
                              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border ${premiumType === type ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25'}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        {selectedUser.isPremium ? (
                          <>
                            <button 
                              onClick={() => handleGrantOrExtendPremium(selectedUser)}
                              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                            >
                              Extend Premium
                            </button>
                            <button 
                              onClick={() => handleRevokePremium(selectedUser)}
                              className="px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-xs hover:bg-rose-500/20 transition-colors"
                            >
                              Revoke
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleGrantOrExtendPremium(selectedUser)}
                            className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-colors"
                          >
                            Grant Premium Access
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Premium History */}
                <div className="flex flex-col bg-white/5 border border-white/10 rounded-2xl p-4 overflow-hidden h-[450px]">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-white/5 pb-3 mb-3">
                    <History size={14} className="text-purple-400" /> Premium log history
                  </h4>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
                    {historyLoading ? (
                      <div className="flex items-center justify-center h-full"><div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full" /></div>
                    ) : premiumHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 text-xs italic p-4">
                        No previous Premium transaction log history found for this user
                      </div>
                    ) : (
                      premiumHistory.map(item => (
                        <div key={item.id} className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className={`font-black uppercase tracking-wider ${item.action === 'Revoked' ? 'text-rose-400' : 'text-emerald-400'}`}>{item.action}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{item.actionDate ? new Date(item.actionDate).toLocaleString() : ''}</span>
                          </div>
                          {item.action !== 'Revoked' && (
                            <>
                              <div className="text-gray-400">Type: <strong className="text-white">{item.type || 'N/A'}</strong></div>
                              <div className="text-gray-400">Expires: <strong className="text-white">{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '⭐ Lifetime'}</strong></div>
                            </>
                          )}
                          <div className="text-gray-400">By: <strong className="text-white">{item.grantedBy || item.revokedBy || 'N/A'}</strong></div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-[9999] space-y-2 pointer-events-none">
        <AnimatePresence>
          {successToast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto text-sm"
            >
              <CheckCircle2 size={16} />
              <span>{successToast}</span>
            </motion.div>
          )}
          {errorToast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-rose-500 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto text-sm"
            >
              <AlertCircle size={16} />
              <span>{errorToast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldAlert className="text-amber-400" />
                  {confirmDialog.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
