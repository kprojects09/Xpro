import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, MessageSquare, ShieldAlert, Ban, Check, UserCheck, 
  Flag, Sparkles, UserPlus, UserMinus, Clock, CheckCircle, 
  Trash2, ShieldCheck, Heart, Users, Phone, Video, GraduationCap, Settings 
} from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { followUser, unfollowUser, isFollowing as checkIsFollowing, sendNotification, getFriendshipStatus, sendFriendRequest, cancelFriendRequest, acceptFriendRequest, rejectFriendRequest, unfriend, createCall } from '../lib/firebaseHelpers';

interface UserProfileModalProps {
  userId: string;
  currentUser: any;
  userProfile: any;
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (peerUser: any) => void;
  onOpenSettings?: () => void;
}

export function UserProfileModal({
  userId,
  currentUser,
  userProfile,
  isOpen,
  onClose,
  onStartChat,
  onOpenSettings
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'sent' | 'received' | 'friends'>('none');
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);

  useEffect(() => {
    if (!userId || !isOpen) return;

    const fetchCounts = async () => {
      try {
        const followersQuery = query(collection(db, 'follows'), where('followingId', '==', userId));
        const followingQuery = query(collection(db, 'follows'), where('followerId', '==', userId));
        const friendshipQuery = query(collection(db, 'friendships'), where('userIds', 'array-contains', userId));
        
        const [followersSnap, followingSnap, friendsSnap] = await Promise.all([
          getDocs(followersQuery), 
          getDocs(followingQuery),
          getDocs(friendshipQuery)
        ]);
        
        setFollowerCount(followersSnap.size);
        setFollowingCount(followingSnap.size);
        setFriendCount(friendsSnap.size);
      } catch (err) {
        console.error("Error fetching counts:", err);
      }
    };
    fetchCounts();

    setIsSelf(userId === currentUser.uid);
    setIsBlocked(userProfile?.blockedUsers?.includes(userId) || false);

    const checkStatus = async () => {
      const [following, friendStatus] = await Promise.all([
        checkIsFollowing(auth.currentUser?.uid || '', userId),
        getFriendshipStatus(auth.currentUser?.uid || '', userId)
      ]);
      setIsFollowing(following);
      setFriendshipStatus(friendStatus as any);
    };
    checkStatus();

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'users', userId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error('Error fetching public profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, isOpen, currentUser.uid, userProfile]);

  const handleFriendAction = async () => {
    if (!currentUser || !userId) return;
    const myId = currentUser.uid;
    const peerId = userId;

    try {
      if (friendshipStatus === 'none') {
        await sendFriendRequest(myId, peerId);
        setFriendshipStatus('sent');
      } else if (friendshipStatus === 'sent') {
        await cancelFriendRequest(myId, peerId);
        setFriendshipStatus('none');
      } else if (friendshipStatus === 'received') {
        await acceptFriendRequest(`${peerId}_${myId}`, peerId, myId);
        setFriendshipStatus('friends');
        setFriendCount(prev => prev + 1);
      } else if (friendshipStatus === 'friends') {
        if (window.confirm('Are you sure you want to unfriend this user?')) {
          await unfriend(myId, peerId);
          setFriendshipStatus('none');
          setFriendCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Friend action failed:', err);
    }
  };

  const handleToggleBlock = async () => {
    if (!currentUser || !userId) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      if (isBlocked) {
        await updateDoc(userRef, {
          blockedUsers: arrayRemove(userId)
        });
        setIsBlocked(false);
      } else {
        await updateDoc(userRef, {
          blockedUsers: arrayUnion(userId)
        });
        setIsBlocked(true);
      }
    } catch (err) {
      console.error('Failed to toggle block:', err);
    }
  };

  const handleToggleFollow = async () => {
    if (!auth.currentUser || !userId) return;
    if (isFollowing) {
      await unfollowUser(auth.currentUser.uid, userId);
      setIsFollowing(false);
    } else {
      await followUser(auth.currentUser.uid, userId);
      setIsFollowing(true);
      sendNotification(userId, 'follow', `${auth.currentUser.displayName || 'Someone'} started following you.`, 'New Follower');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim() || !currentUser || !userId) return;

    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.uid,
        reportedId: userId,
        reason: reportReason.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      setReportSubmitted(true);
      setReportReason('');
      setTimeout(() => {
        setReporting(false);
        setReportSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit report:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-[#0b0825] border border-white/10 sm:rounded-[32px] overflow-hidden shadow-2xl text-white relative flex flex-col h-full sm:h-auto sm:max-h-[90vh]"
        >
          {/* Close button - Absolute positioned */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all z-50 active:scale-90 border border-white/10"
          >
            <X size={20} />
          </button>

          <div className="px-6 pb-12 pt-8 relative overflow-y-auto custom-scrollbar flex-1 overscroll-contain">
            {loading ? (
              <div className="pt-24 py-12 flex flex-col justify-center items-center gap-4">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm font-medium animate-pulse">Synchronizing academic data...</p>
              </div>
            ) : !profile ? (
              <div className="pt-16 py-12 flex flex-col justify-center items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <ShieldAlert size={36} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Record Unavailable</h3>
                  <p className="text-xs text-gray-400 max-w-[240px] mx-auto leading-relaxed">
                    This scholarly identity has been archived or does not exist within the current registry.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-4 px-8 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-black rounded-2xl transition-all border border-white/10 active:scale-95"
                >
                  RETURN TO NETWORK
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* Centered Profile Avatar */}
                <div className="relative mb-8 pt-4">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-32 h-32 rounded-full border-2 border-white/10 p-1 shadow-[0_0_50px_rgba(99,102,241,0.15)] relative"
                  >
                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-bold text-4xl bg-gradient-to-br from-indigo-500/10 via-slate-800 to-purple-500/10">
                      {profile.customAvatarUrl ? (
                        <img src={profile.customAvatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="select-none text-white/80">{(profile.fullName || profile.name || 'S').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {profile.isPremium && (
                      <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-2 rounded-full shadow-lg border-4 border-[#0b0825] animate-pulse">
                        <Sparkles size={18} fill="currentColor" />
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Profile Identity */}
                <div className="text-center space-y-1 mb-8">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-2xl font-black text-white tracking-tight">{profile.fullName || profile.name || 'Scholar'}</h3>
                    {profile.isPremium && <CheckCircle size={20} className="text-blue-400 fill-blue-400/20" />}
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-indigo-400 font-bold text-sm">@{profile.username || 'scholar'}</p>
                    {isSelf && (
                      <div className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase rounded-full tracking-widest">
                        Operator
                      </div>
                    )}
                  </div>
                </div>

                {/* Centered Stats Row */}
                <div className="flex items-center justify-between w-full max-w-sm border-y border-white/5 py-8 mb-8">
                  <div className="flex-1 text-center flex flex-col items-center gap-1">
                    <span className="text-white font-black text-xl leading-none">{friendCount}</span>
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-[0.2em]">Friends</span>
                  </div>
                  <div className="h-8 w-px bg-white/5" />
                  <div className="flex-1 text-center flex flex-col items-center gap-1">
                    <span className="text-white font-black text-xl leading-none">{followerCount}</span>
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-[0.2em]">Followers</span>
                  </div>
                  <div className="h-8 w-px bg-white/5" />
                  <div className="flex-1 text-center flex flex-col items-center gap-1">
                    <span className="text-white font-black text-xl leading-none">{followingCount}</span>
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-[0.2em]">Following</span>
                  </div>
                </div>

                {/* Bio Section */}
                <div className="w-full mb-10 text-center px-4">
                  {profile.bio ? (
                    <p className="text-gray-300 text-sm leading-relaxed max-w-[320px] mx-auto italic font-medium opacity-90">
                      "{profile.bio}"
                    </p>
                  ) : (
                    <p className="text-gray-600 text-xs italic tracking-wide">No bio available in records.</p>
                  )}
                </div>

                {/* Academic Context Badges */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2.5 transition-all hover:bg-white/10">
                    <Calendar size={14} className="text-indigo-400" />
                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-wider">
                      Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '2026'}
                    </span>
                  </div>
                  {profile.class && (
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2.5 transition-all hover:bg-white/10">
                      <GraduationCap size={14} className="text-purple-400" />
                      <span className="text-[11px] font-black text-gray-300 uppercase tracking-wider">{profile.class}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons Row */}
                {!isBlocked && (
                  <div className="flex flex-col w-full max-w-sm gap-4">
                    {!isSelf ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 w-full">
                          {friendshipStatus === 'friends' ? (
                            <button 
                              onClick={handleFriendAction}
                              className="flex items-center justify-center gap-2 py-4 px-6 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-3xl font-black text-sm transition-all active:scale-95 border border-emerald-500/20"
                            >
                              <Users size={18} />
                              Friends
                            </button>
                          ) : friendshipStatus === 'sent' ? (
                            <button 
                              onClick={handleFriendAction}
                              className="flex items-center justify-center gap-2 py-4 px-6 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-3xl font-black text-sm transition-all active:scale-95 border border-amber-500/20"
                            >
                              <Clock size={18} />
                              Pending
                            </button>
                          ) : friendshipStatus === 'received' ? (
                            <button 
                              onClick={handleFriendAction}
                              className="flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-sm shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                            >
                              <CheckCircle size={18} />
                              Accept
                            </button>
                          ) : (
                            <button 
                              onClick={handleFriendAction}
                              disabled={profile?.privacyFriendRequests === 'nobody'}
                              className="flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-3xl font-black text-sm shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                            >
                              <UserPlus size={18} />
                              Add Friend
                            </button>
                          )}

                          <button 
                            onClick={() => { onClose(); if (onStartChat) onStartChat(profile); }}
                            className="flex items-center justify-center gap-2 py-4 px-6 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-black text-sm transition-all active:scale-95 border border-white/10"
                          >
                            <MessageSquare size={18} />
                            Message
                          </button>
                        </div>

                        <button 
                          onClick={handleToggleFollow}
                          className={`w-full py-4 rounded-3xl font-black text-sm transition-all active:scale-95 border flex items-center justify-center gap-2 ${
                            isFollowing 
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20 shadow-lg shadow-purple-500/5' 
                            : 'bg-white text-black hover:bg-gray-100 border-white'
                          }`}
                        >
                          {isFollowing ? <Heart size={18} fill="currentColor" /> : <UserPlus size={18} />}
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => { onClose(); if (onOpenSettings) onOpenSettings(); }}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-3xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2.5"
                      >
                        <Settings size={20} />
                        Update Academic Profile
                      </button>
                    )}
                  </div>
                )}

                {/* Communication & Administrative Actions */}
                {!isSelf && !isBlocked && (
                  <div className="grid grid-cols-4 gap-4 mt-16 w-full max-w-sm">
                    <button 
                      onClick={() => setReporting(true)}
                      className="flex flex-col items-center gap-2 group transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-rose-500/10 group-hover:border-rose-500/20 group-hover:text-rose-400 transition-all active:scale-90 text-gray-500">
                        <Flag size={20} />
                      </div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-rose-400 transition-colors">Report</span>
                    </button>
                    <button 
                      onClick={handleToggleBlock}
                      className="flex flex-col items-center gap-2 group transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-rose-600/10 group-hover:border-rose-600/20 group-hover:text-rose-500 transition-all active:scale-90 text-gray-500">
                        <Ban size={20} />
                      </div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-rose-500 transition-colors">Block</span>
                    </button>
                    <button 
                      onClick={async () => {
                        if (!currentUser || !profile) return;
                        onClose();
                        await createCall(currentUser.uid, profile.id, 'voice');
                        await sendNotification(profile.id, 'call', `${currentUser.displayName || 'Someone'} is calling you...`);
                      }}
                      className="flex flex-col items-center gap-2 group transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 group-hover:text-emerald-400 transition-all active:scale-90 text-gray-500">
                        <Phone size={20} />
                      </div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Voice</span>
                    </button>
                    <button 
                      onClick={async () => {
                        if (!currentUser || !profile) return;
                        onClose();
                        await createCall(currentUser.uid, profile.id, 'video');
                        await sendNotification(profile.id, 'call', `${currentUser.displayName || 'Someone'} is calling you...`);
                      }}
                      className="flex flex-col items-center gap-2 group transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-sky-500/10 group-hover:border-sky-500/20 group-hover:text-sky-400 transition-all active:scale-90 text-gray-500">
                        <Video size={20} />
                      </div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-sky-400 transition-colors">Video</span>
                    </button>
                  </div>
                )}

                {/* Reporting Form Overlay */}
                {reporting && !reportSubmitted && !isSelf && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full mt-8 p-4 bg-rose-500/5 border border-rose-500/10 rounded-3xl"
                  >
                    <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-3 px-2 text-center">Identity Concern Report</h4>
                    <form onSubmit={handleReport} className="space-y-3">
                      <textarea
                        required
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Detailed reason for reporting (Spam, Harassment, Inappropriate)..."
                        className="w-full h-24 bg-[#0a081d] border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-rose-500 transition-all resize-none placeholder:text-gray-600"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setReporting(false)}
                          className="flex-1 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                        >
                          Submit Report
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {reportSubmitted && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center"
                  >
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle size={24} />
                    </div>
                    <h4 className="text-sm font-black text-white mb-1">Report Logged</h4>
                    <p className="text-[10px] text-gray-400 leading-relaxed max-w-[200px] mx-auto">Our academic administrators will review this record shortly.</p>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
