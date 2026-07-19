import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, doc, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc 
} from 'firebase/firestore';
import { 
  MessageSquare, Users, Flag, ShieldAlert, Trash2, ShieldCheck, UserMinus, 
  UserCheck, Activity, BarChart2, Calendar, AlertTriangle, ChevronRight, CheckCircle, Search 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function MessagingManager() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'stats' | 'reports' | 'conversations' | 'users'>('stats');

  const [confirmModal, setConfirmModal] = useState<{
    type: 'suspend' | 'unsuspend' | 'delete_conv';
    id: string;
    label: string;
    action: () => void;
  } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setLoading(true);

    // 1. Listen for conversations
    const unsubConvs = onSnapshot(collection(db, 'conversations'), (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Listen for reports
    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubReports = onSnapshot(qReports, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Listen for users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubConvs();
      unsubReports();
      unsubUsers();
    };
  }, []);

  // Suspend/Unsuspend user action
  const handleSuspendToggle = async (userId: string, currentSuspended: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        suspended: !currentSuspended,
        suspendedAt: !currentSuspended ? new Date().toISOString() : null
      });
      showToast(
        !currentSuspended ? 'User suspended successfully.' : 'User unsuspended successfully.',
        'success'
      );
      setConfirmModal(null);
    } catch (err) {
      console.error(err);
      showToast('Action failed.', 'error');
    }
  };

  // Delete Conversation action
  const handleDeleteConversation = async (convId: string) => {
    try {
      // 1. Delete main document
      await deleteDoc(doc(db, 'conversations', convId));

      // 2. Clear subcollection messages (we can query first or let it clear, 
      // Firestore client can delete each doc)
      const msgsRef = collection(db, 'conversations', convId, 'messages');
      const snap = await getDocs(msgsRef);
      const batchPromises = snap.docs.map(d => deleteDoc(doc(db, 'conversations', convId, 'messages', d.id)));
      await Promise.all(batchPromises);

      showToast('Conversation and all logs purged successfully.', 'success');
      setConfirmModal(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete conversation.', 'error');
    }
  };

  const getReportedUserLabel = (reportedUserId: string) => {
    const found = users.find(u => u.id === reportedUserId);
    return found ? `${found.fullName || found.displayName} (${found.email || 'No email'})` : reportedUserId;
  };

  const getReporterLabel = (reporterId: string) => {
    const found = users.find(u => u.id === reporterId);
    return found ? found.fullName || found.displayName : reporterId;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
        <span>Compiling activity metrics...</span>
      </div>
    );
  }

  // Stats calculation
  const totalConvs = conversations.length;
  const activeUsersCount = users.filter(u => u.online).length;
  const totalReportsCount = reports.length;
  const suspendedUsersCount = users.filter(u => u.suspended).length;

  return (
    <div className="space-y-8 animate-fade-in text-white">
      
      {/* Header and navigation tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="text-pink-500" /> Messaging Management
          </h2>
          <p className="text-gray-400 text-sm">Monitor peer chats, review safety reports, and manage compliance guidelines.</p>
        </div>

        <div className="flex bg-slate-900 border border-white/10 p-1 rounded-2xl select-none">
          <button 
            onClick={() => setTab('stats')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              tab === 'stats' ? 'bg-pink-500 text-slate-950 shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Stats & Metrics
          </button>
          <button 
            onClick={() => setTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all relative ${
              tab === 'reports' ? 'bg-pink-500 text-slate-950 shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Reports
            {reports.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                {reports.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setTab('conversations')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              tab === 'conversations' ? 'bg-pink-500 text-slate-950 shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Conversations
          </button>
          <button 
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              tab === 'users' ? 'bg-pink-500 text-slate-950 shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Users Status
          </button>
        </div>
      </div>

      {/* Grid of basic summary counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Conversations</span>
            <p className="text-2xl font-black text-white mt-1">{totalConvs}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Activity size={22} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Active Online</span>
            <p className="text-2xl font-black text-white mt-1">{activeUsersCount}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
            <Flag size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Reports Filed</span>
            <p className="text-2xl font-black text-white mt-1">{totalReportsCount}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Suspended Users</span>
            <p className="text-2xl font-black text-white mt-1">{suspendedUsersCount}</p>
          </div>
        </div>
      </div>

      {/* Primary tab views content */}
      <div className="bg-slate-900/40 border border-white/10 rounded-[28px] overflow-hidden p-6 md:p-8">
        
        {/* STATS VIEW */}
        {tab === 'stats' && (
          <div className="space-y-8">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold">Activity Metrics</h3>
              <p className="text-xs text-gray-400">Deep structural statistics of the peer messaging networks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <BarChart2 size={14} /> Usage Ratios
                </h4>
                <div className="space-y-3 bg-white/5 border border-white/5 p-5 rounded-2xl">
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5 text-gray-300">
                      <span>Suspension compliance rate</span>
                      <span>{users.length > 0 ? ((users.length - suspendedUsersCount) / users.length * 100).toFixed(1) : 100}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${users.length > 0 ? ((users.length - suspendedUsersCount) / users.length * 100) : 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5 text-gray-300">
                      <span>Online activity ratio</span>
                      <span>{users.length > 0 ? (activeUsersCount / users.length * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${users.length > 0 ? (activeUsersCount / users.length * 100) : 0}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5 text-gray-300">
                      <span>Safety Reports filed ratio</span>
                      <span>{conversations.length > 0 ? (reports.length / conversations.length * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${conversations.length > 0 ? (reports.length / conversations.length * 100) : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <Activity size={14} /> Recent Incidents Timeline
                </h4>
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-3 max-h-[160px] overflow-y-auto">
                  {reports.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">No safety incidents reported on the platform.</p>
                  ) : (
                    reports.slice(0, 4).map(rep => (
                      <div key={rep.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <span className="text-rose-400 font-bold truncate pr-3">Reason: {rep.reason}</span>
                        <span className="text-[10px] font-mono text-gray-500 shrink-0">
                          {rep.createdAt ? new Date(rep.createdAt).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS VIEW */}
        {tab === 'reports' && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold">Safety Incident Reports</h3>
              <p className="text-xs text-gray-400">Review, analyze, and process user-filed reports for platform abuse.</p>
            </div>

            {reports.length === 0 ? (
              <div className="text-center py-16 text-gray-500 space-y-2">
                <ShieldCheck size={40} className="mx-auto text-emerald-500/40" />
                <p className="text-sm font-bold text-gray-400">Pristine Safety Records</p>
                <p className="text-xs">No users have filed any safety or abuse complaints yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(rep => {
                  const reportedUser = users.find(u => u.id === rep.reportedUserId);
                  const isSuspended = reportedUser?.suspended || false;

                  return (
                    <div key={rep.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 relative">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-2.5">
                        <div className="text-xs">
                          <span className="text-gray-400 mr-1.5">Reporter:</span>
                          <strong className="text-indigo-400">{getReporterLabel(rep.reporterId)}</strong>
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">
                          {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : ''}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Reported Target</p>
                          <strong className="text-pink-400">{getReportedUserLabel(rep.reportedUserId)}</strong>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Report Reason</p>
                          <p className="text-white font-medium bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-lg inline-block text-[11px] leading-relaxed">
                            {rep.reason}
                          </p>
                        </div>
                      </div>

                      {rep.reportedMessageContent && (
                        <div className="p-3 bg-black/30 border border-white/5 rounded-xl text-xs space-y-1">
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Reported Message Content:</span>
                          <p className="italic text-gray-400">"{rep.reportedMessageContent}"</p>
                        </div>
                      )}

                      {/* Admin action controls */}
                      <div className="flex justify-end gap-2.5 pt-2 border-t border-white/5">
                        {rep.conversationId && (
                          <button 
                            onClick={() => setConfirmModal({
                              type: 'delete_conv',
                              id: rep.conversationId,
                              label: 'Purge entire conversation logs permanently?',
                              action: () => handleDeleteConversation(rep.conversationId)
                            })}
                            className="bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 hover:border-rose-500/20 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Trash2 size={12} /> Purge Conversation
                          </button>
                        )}

                        <button 
                          onClick={() => setConfirmModal({
                            type: isSuspended ? 'unsuspend' : 'suspend',
                            id: rep.reportedUserId,
                            label: isSuspended ? 'Reinstate user profile?' : 'Suspend user profile from accessing the app?',
                            action: () => handleSuspendToggle(rep.reportedUserId, isSuspended)
                          })}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border cursor-pointer flex items-center gap-1.5 ${
                            isSuspended 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white shadow-md'
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <UserCheck size={12} /> Unsuspend User
                            </>
                          ) : (
                            <>
                              <UserMinus size={12} /> Suspend Abusive User
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CONVERSATIONS VIEW */}
        {tab === 'conversations' && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold">Active Communication Channels</h3>
              <p className="text-xs text-gray-400">Overview of active communication maps. Admins can audit and purge channels.</p>
            </div>

            {conversations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No active conversations.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conversations.map(conv => (
                  <div key={conv.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono text-gray-500 break-all pr-2">ID: {conv.id}</span>
                        <button 
                          onClick={() => setConfirmModal({
                            type: 'delete_conv',
                            id: conv.id,
                            label: 'Purge this entire conversation logs permanently?',
                            action: () => handleDeleteConversation(conv.id)
                          })}
                          className="p-2 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded-xl transition-colors shrink-0"
                          title="Purge Conversation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Participants</span>
                        <div className="text-xs flex flex-wrap gap-2">
                          {conv.participants?.map((pid: string) => {
                            const found = users.find(u => u.id === pid);
                            return (
                              <span key={pid} className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-medium border border-indigo-500/10">
                                {found ? found.fullName || found.displayName : pid}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {conv.lastMessage && (
                        <div className="text-xs pt-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Latest Message</span>
                          <p className="text-gray-300 truncate mt-0.5">"{conv.lastMessage.content}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* USERS VIEW */}
        {tab === 'users' && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold">User Access Status</h3>
              <p className="text-xs text-gray-400">Suspend or reinstate user access permissions.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="p-4 font-bold text-gray-400">User Identity</th>
                    <th className="p-4 font-bold text-gray-400">Email Address</th>
                    <th className="p-4 font-bold text-gray-400">Presence Status</th>
                    <th className="p-4 font-bold text-gray-400">Sanction State</th>
                    <th className="p-4 font-bold text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isSuspended = u.suspended || false;
                    return (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-black">{u.fullName || u.displayName || u.name || 'Unknown'}</td>
                        <td className="p-4 text-gray-400 font-mono">{u.email || u.id}</td>
                        <td className="p-4">
                          {u.online ? (
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10">Online</span>
                          ) : (
                            <span className="text-gray-500">Offline</span>
                          )}
                        </td>
                        <td className="p-4">
                          {isSuspended ? (
                            <span className="text-rose-400 font-black bg-rose-500/15 px-2.5 py-0.5 rounded-md border border-rose-500/10">Suspended</span>
                          ) : (
                            <span className="text-emerald-400 font-medium">Clear</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setConfirmModal({
                              type: isSuspended ? 'unsuspend' : 'suspend',
                              id: u.id,
                              label: isSuspended ? 'Reinstate user profile?' : 'Suspend user profile from accessing the app?',
                              action: () => handleSuspendToggle(u.id, isSuspended)
                            })}
                            className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isSuspended 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white'
                            }`}
                          >
                            {isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/10 p-6 md:p-8 rounded-[28px] w-full max-w-sm shadow-2xl text-center space-y-5 text-white"
            >
              <AlertTriangle className="text-rose-500 mx-auto" size={36} />
              <div className="space-y-1">
                <h3 className="font-black text-sm text-white">Security Action Confirmation</h3>
                <p className="text-xs text-gray-400">{confirmModal.label}</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmModal.action}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating toast alert */}
      <div className="fixed bottom-5 right-5 z-[10000] pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 pointer-events-auto text-xs font-black ${
                toast.type === 'success' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
              }`}
            >
              <CheckCircle size={14} className="shrink-0" />
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
