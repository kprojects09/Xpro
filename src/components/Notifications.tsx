import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Bell, Trophy, Calendar, Sparkles, Mail, Crown, MessageCircle, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubGlobal: () => void = () => {};
    let unsubPersonal: () => void = () => {};
    let unsubRequests: () => void = () => {};
    
    let globalNotifs: any[] = [];
    let personalNotifs: any[] = [];
    let requestNotifs: any[] = [];

    const handleMerge = () => {
      const merged = [...globalNotifs, ...personalNotifs, ...requestNotifs].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setNotifications(merged);
      setLoading(false);
    };

    // 1. Fetch global admin notifications
    const globalQ = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'));
    unsubGlobal = onSnapshot(globalQ, (snap) => {
      globalNotifs = snap.docs.map(d => ({ id: d.id, isGlobal: true, ...d.data() }));
      handleMerge();
    }, (err) => {
      console.error("Global notifications error:", err);
      setLoading(false);
    });

    // 2. Fetch personal notifications if logged in
    const currentUser = auth.currentUser;
    if (currentUser) {
      const personalQ = query(collection(db, 'users', currentUser.uid, 'notifications'), orderBy('createdAt', 'desc'));
      unsubPersonal = onSnapshot(personalQ, (snap) => {
        personalNotifs = snap.docs.map(d => ({ id: d.id, isGlobal: false, ...d.data() }));
        handleMerge();
      }, (err) => {
        console.error("Personal notifications error:", err);
        handleMerge();
      });

      // 3. Fetch pending message requests
      const requestsQ = query(
        collection(db, 'conversations'),
        where('requestStatus', '==', 'pending'),
        where('requestReceiverId', '==', currentUser.uid)
      );
      unsubRequests = onSnapshot(requestsQ, (snap) => {
        requestNotifs = snap.docs.map(d => {
          const data = d.data();
          const peer = data.participants.find((p: any) => p.id === data.requestSenderId) || { fullName: 'Someone' };
          return {
            id: d.id, // the conversation id
            isMessageRequest: true,
            type: 'message_request',
            title: `Message Request from ${peer.fullName}`,
            message: data.requestMessage || 'Sent you a message request.',
            createdAt: data.updatedAt || data.createdAt,
            peerAvatar: peer.avatar
          };
        });
        handleMerge();
      });
    } else {
      setLoading(false);
    }

    return () => {
      unsubGlobal();
      unsubPersonal();
      unsubRequests();
    };
  }, []);

  const handleAcceptRequest = async (convId: string) => {
    try {
      await updateDoc(doc(db, 'conversations', convId), {
        requestStatus: 'accepted',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (convId: string) => {
    try {
      const cooldownDays = 7;
      const requestCooldownUntil = new Date(Date.now() + cooldownDays * 24 * 60 * 60 * 1000).toISOString();
      await updateDoc(doc(db, 'conversations', convId), {
        requestStatus: 'rejected',
        requestCooldownUntil,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pb-32 pt-14 md:pt-8 space-y-6 animate-fade-in relative z-10 safe-top">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-pink-500/20 text-pink-400 rounded-2xl flex items-center justify-center">
          <Bell size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Notifications</h1>
          <p className="text-gray-400 text-sm">Real-time personalized alerts, achievements, and system updates.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center p-12 bg-white/5 border border-white/10 rounded-3xl text-gray-400 flex flex-col items-center justify-center gap-2">
          <Bell className="text-gray-500" size={32} />
          <p className="text-sm font-medium">No activity yet</p>
          <p className="text-xs text-gray-500">Start learning to earn achievements and notifications.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {notifications.map(n => {
              const isPremiumGift = n.type === 'premium_granted';
              const isPremiumExpired = n.type === 'premium_expired';
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={n.id} 
                  className={`p-5 rounded-2xl border transition-all ${
                    isPremiumGift 
                      ? 'bg-gradient-to-r from-amber-500/15 to-yellow-600/10 border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.05)]' 
                      : isPremiumExpired
                      ? 'bg-rose-500/10 border-rose-500/20'
                      : 'bg-white/5 border-white/10'
                  } flex items-start gap-4`}
                >
                  <div className="mt-1">
                    {n.isMessageRequest ? (
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center overflow-hidden shrink-0 border border-indigo-500/30">
                        {n.peerAvatar ? (
                          <img src={n.peerAvatar} alt="Peer" className="w-full h-full object-cover" />
                        ) : (
                          <MessageCircle size={18} />
                        )}
                      </div>
                    ) : isPremiumGift ? (
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Crown size={18} className="animate-bounce" />
                      </div>
                    ) : isPremiumExpired ? (
                      <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                        <Bell size={18} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                        <Sparkles size={16} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className={`text-sm font-black ${isPremiumGift ? 'text-amber-300' : n.isMessageRequest ? 'text-indigo-300' : 'text-white'}`}>{n.title}</h3>
                      {n.createdAt && (
                        <div className="text-[10px] text-gray-500 font-mono whitespace-nowrap pl-2">
                          {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    {n.isMessageRequest ? (
                      <div className="mt-2 space-y-3">
                        <div className="p-2.5 bg-black/40 rounded-xl text-xs text-gray-300 italic border border-white/5 font-medium">
                          "{n.message}"
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAcceptRequest(n.id)}
                            className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1"
                          >
                            <Check size={14} /> Accept
                          </button>
                          <button 
                            onClick={() => handleRejectRequest(n.id)}
                            className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-300 text-xs mt-1.5 whitespace-pre-line leading-relaxed">{n.message || n.body}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
