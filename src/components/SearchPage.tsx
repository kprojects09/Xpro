import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit as limitDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, File, Video, FileText, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

export function SearchPage() {
  const [queryStr, setQueryStr] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // For global search, we fetch all relevant collections.
  // In a real app with large data, we'd use Algolia or specialized indexing.
  const handleSearch = async () => {
    if (!queryStr.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    
    const collectionsToSearch = [
      { name: 'admin_classes', type: 'Class', icon: FileText },
      { name: 'admin_subjects', type: 'Subject', icon: FileText },
      { name: 'admin_pdfs', type: 'PDF', icon: File },
      { name: 'admin_videos', type: 'Video', icon: Video },
      { name: 'admin_notes', type: 'Note', icon: FileText },
      { name: 'announcements', type: 'Announcement', icon: FileText },
      { name: 'admin_notifications', type: 'Notification', icon: FileText }
    ];

    try {
      const allResults: any[] = [];
      const qLower = queryStr.toLowerCase();

      for (const col of collectionsToSearch) {
        const q = query(collection(db, col.name), limitDoc(30)); // Limit to 30 per collection for performance
        const snap = await getDocs(q);
        snap.forEach(doc => {
          const data = doc.data();
          const searchableText = `${data.title || ''} ${data.name || ''} ${data.description || ''} ${data.content || ''} ${data.message || ''}`.toLowerCase();
          
          if (searchableText.includes(qLower)) {
            allResults.push({
              id: doc.id,
              ...data,
              __type: col.type,
              __icon: col.icon
            });
          }
        });
      }
      setResults(allResults.slice(0, 50)); // Return top 50 matches overall
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [queryStr]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pb-32 pt-14 md:pt-8 space-y-6 animate-fade-in relative z-10 safe-top">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
        <input 
          autoFocus
          value={queryStr}
          onChange={e => setQueryStr(e.target.value)}
          placeholder="Search classes, subjects, notes, videos, announcements..."
          className="w-full bg-slate-900/80 border border-white/20 rounded-3xl py-4 pl-14 pr-6 text-lg text-white placeholder-gray-500 shadow-xl focus:border-indigo-500 transition-all outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-10"><div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"></div></div>
      ) : queryStr.trim() && results.length === 0 ? (
        <div className="text-center p-12 bg-white/5 border border-white/10 rounded-3xl text-gray-400">
          No results found for "{queryStr}".
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r, i) => {
            const Icon = r.__icon;
            return (
              <motion.div initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} transition={{delay: i * 0.05}} key={`${r.__type}-${r.id}`} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-white/10 cursor-pointer transition-all">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-lg">{r.title || r.name}</h3>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded uppercase font-mono tracking-wider">{r.__type}</span>
                    </div>
                    {(r.description || r.content || r.message) && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">{r.description || r.content || r.message}</p>
                    )}
                  </div>
                </div>
                {r.fileUrl && (
                  <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl hover:bg-indigo-500/20 whitespace-nowrap">
                    View Resource
                  </a>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  );
}
