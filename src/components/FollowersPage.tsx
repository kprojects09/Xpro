import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { User, UserPlus, Users, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function FollowersPage() {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      setUsers([]);
      
      try {
        const followsRef = collection(db, 'follows');
        const q = query(
          followsRef, 
          where(activeTab === 'followers' ? 'followingId' : 'followerId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        
        const targetIds = snapshot.docs.map(doc => 
          activeTab === 'followers' ? doc.data().followerId : doc.data().followingId
        );

        if (targetIds.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        // Fetch user details
        const userDetails = await Promise.all(targetIds.map(async (id) => {
          const userRef = doc(db, 'users', id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            return { id: userSnap.id, ...userSnap.data() };
          }
          return null;
        }));

        setUsers(userDetails.filter(u => u));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [activeTab]);

  return (
    <div className="p-6 text-white min-h-screen bg-[#060413]">
      <div className="flex items-center gap-3 mb-8">
        <Users className="text-indigo-500" size={32} />
        <h1 className="text-3xl font-black tracking-tight">Network</h1>
      </div>

      <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/10">
        <button 
          onClick={() => setActiveTab('followers')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'followers' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Followers
        </button>
        <button 
          onClick={() => setActiveTab('following')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'following' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Following
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
             className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"
           />
           <p className="text-gray-500 text-sm font-bold animate-pulse">Syncing Network...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {users.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10"
              >
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus size={24} className="text-gray-600" />
                </div>
                <p className="text-gray-400 font-bold">No {activeTab} yet.</p>
                <p className="text-gray-500 text-xs mt-1">Start exploring and connecting with others.</p>
              </motion.div>
            ) : (
              users.map((user, idx) => (
                <motion.div 
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all cursor-pointer shadow-sm"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xl overflow-hidden border border-white/10">
                      {user.customAvatarUrl ? (
                        <img src={user.customAvatarUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{(user.fullName || user.displayName || 'S').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {user.online && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-[#060413] rounded-full shadow-lg" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm text-white truncate">{user.fullName || user.displayName || 'Scholar'}</p>
                      {user.membership === 'premium' && (
                        <span className="bg-indigo-500/20 text-indigo-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border border-indigo-500/20">PRO</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold truncate mt-0.5 uppercase tracking-widest">
                      {user.username ? `@${user.username}` : user.email}
                    </p>
                  </div>

                  <ChevronRight size={18} className="text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
