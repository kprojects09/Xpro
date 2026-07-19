import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Megaphone, Pin } from 'lucide-react';
import { motion } from 'motion/react';

export function Announcements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-32 animate-fade-in relative z-10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center">
          <Megaphone size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Announcements</h1>
          <p className="text-gray-400 text-sm">Important updates and notices from the administration.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto"></div></div>
      ) : announcements.length === 0 ? (
        <div className="text-center p-12 bg-white/5 border border-white/10 rounded-3xl text-gray-400">
          No content available.
        </div>
      ) : (
        <div className="grid gap-4">
          {announcements.map(a => (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={a.id} className={`p-6 rounded-3xl border flex gap-4 \${a.isPinned ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
              <div className="mt-1">
                {a.isPinned ? <Pin size={20} className="text-amber-400" /> : <Megaphone size={20} className="text-gray-500" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{a.title}</h3>
                <p className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{a.content}</p>
                {a.createdAt && (
                  <div className="text-xs text-gray-500 mt-4 font-mono">{new Date(a.createdAt).toLocaleString()}</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
