import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, doc, deleteDoc, getDoc, limit, orderBy } from 'firebase/firestore';
import { Trash2, Users, UserPlus, FileText, AlertTriangle } from 'lucide-react';

export function FriendshipManager() {
  const [friendships, setFriendships] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubFriendships = onSnapshot(query(collection(db, 'friendships'), limit(50)), (snap) => {
      setFriendships(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubRequests = onSnapshot(query(collection(db, 'friend_requests'), limit(50)), (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => r.reportedId));
    });

    setLoading(false);
    return () => {
      unsubFriendships();
      unsubRequests();
      unsubReports();
    };
  }, []);

  const handleDeleteFriendship = async (id: string) => {
    if (window.confirm('Delete this friendship?')) {
      await deleteDoc(doc(db, 'friendships', id));
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm('Delete this request?')) {
      await deleteDoc(doc(db, 'friend_requests', id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-2 text-indigo-400">
            <Users size={20} />
            <h3 className="font-bold text-sm uppercase tracking-wider">Friendships</h3>
          </div>
          <p className="text-3xl font-black">{friendships.length}</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Active Connections</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-2 text-amber-400">
            <UserPlus size={20} />
            <h3 className="font-bold text-sm uppercase tracking-wider">Requests</h3>
          </div>
          <p className="text-3xl font-black">{requests.length}</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Pending Requests</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-2 text-rose-400">
            <AlertTriangle size={20} />
            <h3 className="font-bold text-sm uppercase tracking-wider">Reports</h3>
          </div>
          <p className="text-3xl font-black">{reports.length}</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">Social Issues</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Friendships List */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Users size={18} className="text-indigo-400" />
            Active Friendships
          </h2>
          <div className="space-y-3">
            {friendships.map(f => (
              <div key={f.id} className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl flex items-center justify-between">
                <div className="text-xs">
                  <p className="font-bold text-gray-300">Users: {f.userIds?.join(', ')}</p>
                  <p className="text-[10px] text-gray-500">Established: {new Date(f.createdAt?.seconds * 1000).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => handleDeleteFriendship(f.id)}
                  className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {friendships.length === 0 && <p className="text-center py-10 text-gray-600 text-sm italic">No active friendships.</p>}
          </div>
        </div>

        {/* Pending Requests List */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <UserPlus size={18} className="text-amber-400" />
            Pending Requests
          </h2>
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl flex items-center justify-between">
                <div className="text-xs">
                  <p className="font-bold text-gray-300">From {r.senderId} to {r.receiverId}</p>
                  <p className="text-[10px] text-gray-500">Sent: {new Date(r.createdAt?.seconds * 1000).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => handleDeleteRequest(r.id)}
                  className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {requests.length === 0 && <p className="text-center py-10 text-gray-600 text-sm italic">No pending requests.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
