import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Newspaper, Plus, Trash2, Edit3, X, Image as ImageIcon, FileText, Link as LinkIcon, MessageSquare, ThumbsUp, Heart, Share2, MoreVertical, Search, Globe, Lock, CheckCircle2, Send, Video, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Link Post Manager
export function LinkPostManager() {
  const [links, setLinks] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    url: '',
    type: 'whatsapp' as any
  });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'link_posts'), orderBy('createdAt', 'desc')), (snap) => {
      setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) await updateDoc(doc(db, 'link_posts', editingId), { ...form, updatedAt: serverTimestamp() });
    else await addDoc(collection(db, 'link_posts'), { ...form, clicksCount: 0, createdAt: serverTimestamp() });
    setIsOpen(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3"><LinkIcon className="text-blue-400" /> Link Manager</h2>
          <p className="text-gray-400 text-sm">Post and track external resource links.</p>
        </div>
        <button onClick={() => { setEditingId(null); setIsOpen(true); }} className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"><Plus size={18} /> New Link</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {links.map(item => (
          <div key={item.id} className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 hover:border-blue-500/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
               <div className={`p-3 rounded-2xl ${item.type === 'telegram' ? 'bg-sky-500/20 text-sky-400' : item.type === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400' : item.type === 'youtube' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-gray-400'}`}>
                 {item.type === 'telegram' ? <Send size={20} /> : item.type === 'whatsapp' ? <MessageSquare size={20} /> : item.type === 'youtube' ? <Video size={20} /> : <LinkIcon size={20} />}
               </div>
               <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => { setForm(item); setEditingId(item.id); setIsOpen(true); }} className="p-2 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white"><Edit3 size={16} /></button>
                 <button onClick={() => deleteDoc(doc(db, 'link_posts', item.id))} className="p-2 hover:bg-rose-500/20 rounded-xl text-gray-500 hover:text-rose-400"><Trash2 size={16} /></button>
               </div>
            </div>
            <h3 className="font-black text-lg mb-1 truncate">{item.title}</h3>
            <p className="text-gray-500 text-xs line-clamp-2 mb-4">{item.description || 'No description provided.'}</p>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                <Globe size={12} /> {item.clicksCount} Clicks
              </div>
              <a href={item.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1.5 transition-all">
                Open Link <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-slate-950 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[90vh]">
               <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-3"><LinkIcon className="text-blue-400" /> {editingId ? 'Edit Link' : 'Post New Link'}</h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Title</label>
                  <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-blue-500 outline-none transition-all" placeholder="Resource name..." />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-blue-500 outline-none transition-all h-24 resize-none" placeholder="Short summary..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Type</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-blue-500 outline-none transition-all">
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telegram">Telegram</option>
                      <option value="youtube">YouTube</option>
                      <option value="drive">Google Drive</option>
                      <option value="facebook">Facebook</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">URL</label>
                    <input required type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-blue-500 outline-none transition-all" placeholder="https://..." />
                  </div>
                </div>
                <div className="pt-4 sticky bottom-0 bg-slate-950 py-4 border-t border-white/5">
                  <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-500/10">
                    {editingId ? 'Update Link' : 'Post Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// News Feed Manager
export function NewsFeedManager() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    text: '',
    mediaUrls: [] as string[],
    fileUrls: [] as string[]
  });
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'news_feed'), orderBy('createdAt', 'desc')), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'media' | 'file') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(type);
    try {
      const urls = await Promise.all(Array.from(files).map(async (file: File) => {
        const storageRef = ref(storage, `news_feed/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      }));
      setForm(prev => ({ ...prev, [`${type}Urls`]: [...(prev as any)[`${type}Urls`], ...urls] }));
    } catch (err) { console.error(err); } finally { setUploading(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, authorId: 'admin', commentCount: 0, likes: [], updatedAt: serverTimestamp() };
    if (editingId) await updateDoc(doc(db, 'news_feed', editingId), data);
    else await addDoc(collection(db, 'news_feed'), { ...data, createdAt: serverTimestamp() });
    setIsOpen(false);
    setEditingId(null);
    setForm({ text: '', mediaUrls: [], fileUrls: [] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3"><Newspaper className="text-emerald-400" /> News Feed</h2>
          <p className="text-gray-400 text-sm">Post updates, photos, and files to the community.</p>
        </div>
        <button onClick={() => { setEditingId(null); setIsOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"><Plus size={18} /> New Post</button>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
        {posts.map(item => (
          <div key={item.id} className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 space-y-4">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center font-bold">A</div>
                 <div>
                   <div className="text-sm font-black flex items-center gap-1.5">System Admin <CheckCircle2 size={12} className="text-blue-400" /></div>
                   <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}</div>
                 </div>
               </div>
               <div className="flex gap-1">
                 <button onClick={() => { setForm(item); setEditingId(item.id); setIsOpen(true); }} className="p-2 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white"><Edit3 size={16} /></button>
                 <button onClick={() => deleteDoc(doc(db, 'news_feed', item.id))} className="p-2 hover:bg-rose-500/20 rounded-xl text-gray-500 hover:text-rose-400"><Trash2 size={16} /></button>
               </div>
             </div>
             <p className="text-gray-300 text-sm whitespace-pre-wrap">{item.text}</p>
             
             {item.mediaUrls?.length > 0 && (
               <div className={`grid gap-2 mt-4 ${item.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                 {item.mediaUrls.map((url: string, i: number) => (
                   <img key={i} src={url} alt="" className="w-full h-48 object-cover rounded-2xl" />
                 ))}
               </div>
             )}

             <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><ThumbsUp size={16} /> {item.likes?.length || 0}</div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><MessageSquare size={16} /> {item.commentCount || 0}</div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><Share2 size={16} /> Share</div>
             </div>
          </div>
        ))}
      </div>

       <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-xl bg-slate-950 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[90vh]">
               <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-3"><Newspaper className="text-emerald-400" /> {editingId ? 'Edit Post' : 'Create Post'}</h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                <div>
                   <textarea required value={form.text} onChange={e => setForm({...form, text: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-3xl p-6 text-sm focus:border-emerald-500 outline-none transition-all h-40 resize-none" placeholder="What's happening?" />
                </div>

                <div className="flex flex-wrap gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                   <label className="cursor-pointer group flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-400 transition-all text-xs font-bold text-gray-400">
                     <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'media')} />
                     {uploading === 'media' ? <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <ImageIcon size={16} />}
                     Photos
                   </label>
                   <label className="cursor-pointer group flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-400 transition-all text-xs font-bold text-gray-400">
                     <input type="file" multiple className="hidden" onChange={e => handleFileUpload(e, 'file')} />
                     {uploading === 'file' ? <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" /> : <FileText size={16} />}
                     Files
                   </label>
                </div>

                {form.mediaUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {form.mediaUrls.map((url, i) => (
                      <div key={i} className="relative group">
                         <img src={url} alt="" className="w-full h-16 object-cover rounded-lg" />
                         <button type="button" onClick={() => setForm({...form, mediaUrls: form.mediaUrls.filter((_, idx) => idx !== i)})} className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 sticky bottom-0 bg-slate-950 py-4 border-t border-white/5">
                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-emerald-500/10">
                    {editingId ? 'Update Post' : 'Post to Feed'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

