import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, UserMinus, Check, X, Search, 
  MessageSquare, Phone, Video, UserCheck, Clock, 
  Trash2, UserX, UserSearch, ShieldCheck, Sparkles 
} from 'lucide-react';
import { db, auth } from '../firebase';
import { 
  collection, query, where, onSnapshot, getDocs, 
  doc, getDoc, orderBy, limit 
} from 'firebase/firestore';
import { acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, unfriend, sendFriendRequest, handleFirestoreError, OperationType } from '../lib/firebaseHelpers';

interface FriendsPageProps {
  currentUser: any;
  onOpenProfile: (userId: string) => void;
  onStartChat: (peerUser: any) => void;
}

export function FriendsPage({ currentUser, onOpenProfile, onStartChat }: FriendsPageProps) {
  const [activeTab, setActiveTab] = useState<'friends' | 'suggestions' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'active'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to friendships
    const qFriends = query(
      collection(db, 'friendships'),
      where('userIds', 'array-contains', currentUser.uid)
    );
    const unsubFriends = onSnapshot(qFriends, async (snap) => {
      const friendIds = snap.docs.map(doc => {
        const data = doc.data();
        return data.userIds.find((id: string) => id !== currentUser.uid);
      });

      if (friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const friendData = await Promise.all(
        friendIds.map(async (id) => {
          const uSnap = await getDoc(doc(db, 'users', id));
          return { id: uSnap.id, ...uSnap.data() };
        })
      );
      setFriends(friendData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendships');
    });

    // Listen to following
    const qFollowing = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid));
    const unsubFollowing = onSnapshot(qFollowing, (snap) => {
      setFollowingIds(snap.docs.map(d => d.data().followingId));
    });

    // Listen to all users for suggestions
    const qUsers = query(collection(db, 'users'));
    const unsubSuggestions = onSnapshot(qUsers, async (snap) => {
      // Get current user's data for blocking checks
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userSnap.data() || {};
      const blockedUsers = userData.blockedUsers || [];
      
      // Get current friend IDs
      const friendIds = friends.map(f => f.id);
      
      const allUsers = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => {
          if (u.id === currentUser.uid) return false;
          if (u.isBanned || u.isDeleted) return false;
          if (blockedUsers.includes(u.id)) return false;
          if (friendIds.includes(u.id)) return false;
          return true;
        });

      const calcMutual = (targetUser: any) => {
        const targetFriendIds = targetUser.friends || [];
        return targetFriendIds.filter((id: string) => friendIds.includes(id)).length;
      };

      // Sort according to priority: 1. Active, 2. Newest, 3. Mutual Friends
      const sorted = allUsers.sort((a: any, b: any) => {
        if (sortBy === 'active') {
          // Priority 1: Active Users
          if (a.online !== b.online) return a.online ? -1 : 1;
        }
        
        // Priority 2: Newest Registered
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        if (dateB !== dateA) return dateB - dateA;

        // Priority 3: Mutual Friends
        const mutualA = calcMutual(a);
        const mutualB = calcMutual(b);
        return mutualB - mutualA;
      });

      // To prevent massive UI lag, slice to 100 max display
      setSuggestions(sorted.slice(0, 100));
    }, (error) => {
      console.error("Error fetching suggestions", error);
    });

    // Listen to requests
    const qReqIncoming = query(
      collection(db, 'friend_requests'),
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubReqIncoming = onSnapshot(qReqIncoming, async (snap) => {
      const reqData = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const uSnap = await getDoc(doc(db, 'users', data.senderId));
          return { id: d.id, sender: { id: uSnap.id, ...uSnap.data() }, ...data };
        })
      );
      setIncomingRequests(reqData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friend_requests (incoming)');
    });

    const qReqOutgoing = query(
      collection(db, 'friend_requests'),
      where('senderId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubReqOutgoing = onSnapshot(qReqOutgoing, async (snap) => {
      const reqData = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const uSnap = await getDoc(doc(db, 'users', data.receiverId));
          return { id: d.id, receiver: { id: uSnap.id, ...uSnap.data() }, ...data };
        })
      );
      setOutgoingRequests(reqData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friend_requests (outgoing)');
    });

    return () => {
      unsubFriends();
      unsubFollowing();
      unsubSuggestions();
      unsubReqIncoming();
      unsubReqOutgoing();
    };
  }, [currentUser, friends.length, sortBy]);

  const calculateMutualFriends = (targetUser: any) => {
    const targetFriendIds = targetUser.friends || [];
    const myFriendIds = friends.map(f => f.id);
    return targetFriendIds.filter((id: string) => myFriendIds.includes(id)).length;
  };

  const handleFollowAction = async (targetId: string, isFollowing: boolean) => {
    try {
      const { followUser, unfollowUser } = await import('../lib/firebaseHelpers');
      if (isFollowing) {
        await unfollowUser(currentUser.uid, targetId);
      } else {
        await followUser(currentUser.uid, targetId);
      }
    } catch (err) {
      console.error("Follow toggle failed:", err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        executeSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const executeSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      // Search by username
      const qUsername = query(
        collection(db, 'users'),
        where('username', '>=', searchQuery.toLowerCase()),
        where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      const snapUsername = await getDocs(qUsername);
      
      // Search by display name
      const qFullName = query(
        collection(db, 'users'),
        where('fullName', '>=', searchQuery),
        where('fullName', '<=', searchQuery + '\uf8ff'),
        limit(10)
      );
      const snapFullName = await getDocs(qFullName);

      const combined = [
        ...snapUsername.docs.map(d => ({ id: d.id, ...d.data() })),
        ...snapFullName.docs.map(d => ({ id: d.id, ...d.data() }))
      ];

      // De-duplicate and filter
      const unique = Array.from(new Map(combined.map(u => [u.id, u])).values())
        .filter((u: any) => u.id !== currentUser.uid);
      
      setSearchResults(unique);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const handleSendFriendRequest = async (receiverId: string) => {
    await sendFriendRequest(currentUser.uid, receiverId);
  };

  const handleAccept = async (reqId: string, senderId: string) => {
    await acceptFriendRequest(reqId, senderId, currentUser.uid);
  };

  const handleReject = async (reqId: string) => {
    await rejectFriendRequest(reqId);
  };

  const handleCancel = async (receiverId: string) => {
    await cancelFriendRequest(currentUser.uid, receiverId);
  };

  const handleUnfriend = async (peerId: string) => {
    if (window.confirm('Remove friend?')) {
      await unfriend(currentUser.uid, peerId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0825] text-white">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black">Social Network</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Connect with Scholars</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
          {(['friends', 'suggestions', 'requests', 'search'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                activeTab === tab 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'requests' && (incomingRequests.length > 0) && (
                <span className="mr-2 px-1.5 py-0.5 bg-rose-500 text-[10px] rounded-full">
                  {incomingRequests.length}
                </span>
              )}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-400">Total Friends ({friends.length})</h2>
                <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </div>
              </div>

              {friends.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                  <UserX size={48} className="mb-4" />
                  <p className="text-sm font-bold">No friends yet.</p>
                  <button 
                    onClick={() => setActiveTab('suggestions')}
                    className="mt-2 text-xs text-indigo-400 hover:underline"
                  >
                    Find some scholars
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {friends.map((friend) => (
                    <div key={friend.id} className="p-4 bg-white/5 border border-white/10 rounded-[24px] hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <button onClick={() => onOpenProfile(friend.id)} className="relative shrink-0">
                          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-white/5 group-hover:border-indigo-500/50 transition-all">
                            {friend.customAvatarUrl ? (
                              <img src={friend.customAvatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{(friend.fullName || friend.name || 'S').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0b0825] flex items-center justify-center p-0.5">
                            <div className="w-full h-full rounded-full bg-emerald-500 border border-[#0b0825]" />
                          </div>
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate">{friend.fullName || friend.name}</h3>
                          <p className="text-[10px] text-gray-500 font-bold truncate">@{friend.username}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <button 
                              onClick={() => onStartChat(friend)}
                              className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors"
                            >
                              <MessageSquare size={14} />
                            </button>
                            <button className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors">
                              <Phone size={14} />
                            </button>
                            <button className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors">
                              <Video size={14} />
                            </button>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleUnfriend(friend.id)}
                          className="p-2 text-gray-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <UserMinus size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'suggestions' && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm font-bold text-gray-400">People You May Know ({suggestions.length})</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <button 
                      onClick={() => setSortBy('newest')}
                      className={`text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'newest' ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                      Newest
                    </button>
                    <button 
                      onClick={() => setSortBy('active')}
                      className={`text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'active' ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                      Active
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('search')}
                  className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:underline"
                >
                  Advanced Search
                </button>
              </div>

              {suggestions.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                  <UserSearch size={48} className="mb-4" />
                  <p className="text-sm font-bold">No suggestions right now.</p>
                  <p className="text-[10px] text-gray-500 max-w-[200px] mt-2">Try searching for specific usernames or check back later.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {suggestions.map((user) => {
                    const isPending = outgoingRequests.some(r => r.receiverId === user.id);
                    const isRequested = incomingRequests.some(r => r.senderId === user.id);
                    const isFollowing = followingIds.includes(user.id);
                    const mutualCount = calculateMutualFriends(user);

                    return (
                      <div key={user.id} className="p-5 bg-white/5 border border-white/10 rounded-[32px] hover:bg-white/10 transition-all group relative overflow-hidden">
                        {/* Background Accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[40px] -mr-10 -mt-10 pointer-events-none" />
                        
                        <div className="flex items-start gap-4 relative z-10">
                          <button onClick={() => onOpenProfile(user.id)} className="shrink-0 relative">
                            <div className="w-16 h-16 rounded-[22px] bg-slate-800 flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-white/5 group-hover:border-indigo-500/50 transition-all shadow-xl">
                              {user.customAvatarUrl ? (
                                <img src={user.customAvatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{(user.fullName || user.name || 'S').charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            {user.online && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0a0a0a] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <h3 className="font-bold text-sm truncate flex items-center gap-1.5">
                                  {user.fullName || user.name}
                                  {user.isPremium && <Sparkles size={12} className="text-amber-400" />}
                                </h3>
                                <p className="text-[10px] text-indigo-400 font-bold truncate">@{user.username}</p>
                              </div>
                              {mutualCount > 0 && (
                                <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                  <p className="text-[9px] text-gray-500 font-bold">{mutualCount} Mutual</p>
                                </div>
                              )}
                            </div>
                            
                            {user.bio && (
                              <p className="text-[11px] text-gray-400 mt-2 line-clamp-2 leading-relaxed italic">
                                "{user.bio}"
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-4">
                              {isPending ? (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCancel(user.id); }}
                                  className="flex-1 py-2 bg-white/10 text-white text-[10px] font-bold rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-all border border-white/5"
                                >
                                  Cancel Request
                                </button>
                              ) : isRequested ? (
                                <div className="flex-1 flex gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); const req = incomingRequests.find(r => r.senderId === user.id); if (req) handleAccept(req.id, user.id); }}
                                    className="flex-1 py-2 bg-emerald-500 text-white text-[10px] font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                                  >
                                    Accept
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(user.id); }}
                                  className="flex-1 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-1.5"
                                >
                                  <UserPlus size={12} />
                                  Add Friend
                                </button>
                              )}
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleFollowAction(user.id, isFollowing); }}
                                className={`px-4 py-2 text-[10px] font-bold rounded-xl border transition-all ${
                                  isFollowing 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                    : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
                                }`}
                              >
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>

                              {user.privacyRequests !== 'nobody' && (
                                <button 
                                  onClick={() => onStartChat(user)}
                                  className="p-2 bg-white/5 text-gray-400 rounded-xl hover:text-indigo-400 transition-all border border-white/5"
                                >
                                  <MessageSquare size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Incoming */}
              <div>
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Incoming Requests ({incomingRequests.length})</h2>
                {incomingRequests.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">No incoming requests.</p>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map((req) => (
                      <div key={req.id} className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-4">
                        <button onClick={() => onOpenProfile(req.sender.id)} className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-base overflow-hidden">
                          {req.sender.customAvatarUrl ? (
                            <img src={req.sender.customAvatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(req.sender.fullName || req.sender.name || 'S').charAt(0).toUpperCase()}</span>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xs truncate">{req.sender.fullName || req.sender.name}</h3>
                          <p className="text-[10px] text-indigo-400 font-bold truncate">@{req.sender.username}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAccept(req.id, req.sender.id); }}
                            className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleReject(req.id); }}
                            className="p-2 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500/20"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing */}
              <div>
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Outgoing Requests ({outgoingRequests.length})</h2>
                {outgoingRequests.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">No outgoing requests.</p>
                ) : (
                  <div className="space-y-3">
                    {outgoingRequests.map((req) => (
                      <div key={req.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4">
                        <button onClick={() => onOpenProfile(req.receiver.id)} className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-base overflow-hidden">
                          {req.receiver.customAvatarUrl ? (
                            <img src={req.receiver.customAvatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(req.receiver.fullName || req.receiver.name || 'S').charAt(0).toUpperCase()}</span>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xs truncate">{req.receiver.fullName || req.receiver.name}</h3>
                          <p className="text-[10px] text-gray-500 font-bold truncate">@{req.receiver.username}</p>
                        </div>
                        <button 
                          onClick={() => handleCancel(req.receiverId)}
                          className="px-4 py-2 bg-white/5 text-[10px] font-bold rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                />
              </form>

              {loading && <div className="py-10 text-center text-xs text-gray-500 animate-pulse">Searching...</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((user) => {
                  const isFriend = friends.some(f => f.id === user.id);
                  const isPending = outgoingRequests.some(r => r.receiverId === user.id);
                  const isRequested = incomingRequests.some(r => r.senderId === user.id);
                  
                  return (
                    <div key={user.id} className="p-4 bg-white/5 border border-white/10 rounded-[32px] group hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <button onClick={() => onOpenProfile(user.id)} className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                          {user.customAvatarUrl ? (
                            <img src={user.customAvatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(user.fullName || user.name || 'S').charAt(0).toUpperCase()}</span>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate text-white">{user.fullName || user.name}</h3>
                          <p className="text-[10px] text-gray-400 font-bold truncate">@{user.username}</p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {isFriend ? (
                              <button className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1 cursor-default">
                                <Check size={10} /> Friends
                              </button>
                            ) : isPending ? (
                              <button onClick={(e) => { e.stopPropagation(); handleCancel(user.id); }} className="px-3 py-1 bg-white/10 text-white text-[9px] font-bold rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-all border border-white/5">
                                Pending
                              </button>
                            ) : isRequested ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); const req = incomingRequests.find(r => r.senderId === user.id); if (req) handleAccept(req.id, user.id); }}
                                className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-bold rounded-lg shadow-lg shadow-emerald-500/20"
                              >
                                Accept
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(user.id); }}
                                className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-bold rounded-lg hover:bg-indigo-500 transition-all"
                              >
                                Add Friend
                              </button>
                            )}
                            
                            {user.privacyRequests !== 'nobody' && (
                              <button 
                                onClick={() => onStartChat(user)}
                                className="p-1.5 bg-white/5 text-gray-400 rounded-lg hover:text-indigo-400 transition-all"
                              >
                                <MessageSquare size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
