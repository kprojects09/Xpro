import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { Megaphone, Plus, Trash2, Edit3, X, Image as ImageIcon, Video, FileText, Link as LinkIcon, Clock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Announcement {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  publishTime: string;
  createdAt: any;
}

export function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    pdfUrl: '',
    linkUrl: '',
    buttonText: 'View More',
    priority: 'medium' as any,
    publishTime: new Date().toISOString().slice(0, 16)
  });

  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(type);
    setUploadProgress(0);
    try {
      const storageRef = ref(storage, `announcements/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error(error);
          setUploading(null);
          setUploadProgress(0);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setForm(prev => ({ ...prev, [`${type}Url`]: url }));
          setUploading(null);
          setUploadProgress(100);
        }
      );
    } catch (err) {
      console.error(err);
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        publishTime: new Date(form.publishTime).toISOString(),
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), data);
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsOpen(false);
      setEditingId(null);
      setForm({
        title: '',
        description: '',
        imageUrl: '',
        videoUrl: '',
        pdfUrl: '',
        linkUrl: '',
        buttonText: 'View More',
        priority: 'medium',
        publishTime: new Date().toISOString().slice(0, 16)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      await deleteDoc(doc(db, 'announcements', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3">
            <Megaphone className="text-pink-500" />
            Announcement Manager
          </h2>
          <p className="text-gray-400 text-sm">Post rich media announcements to all users.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setIsOpen(true); }}
          className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-pink-500/20"
        >
          <Plus size={18} /> New Announcement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.map(item => (
          <div key={item.id} className="bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden group hover:border-pink-500/50 transition-all">
            {item.imageUrl && (
              <div className="h-40 overflow-hidden relative">
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    item.priority === 'urgent' ? 'bg-rose-500 text-white' :
                    item.priority === 'high' ? 'bg-amber-500 text-slate-950' :
                    'bg-indigo-500 text-white'
                  }`}>
                    {item.priority}
                  </span>
                </div>
              </div>
            )}
            <div className="p-6">
              {!item.imageUrl && (
                 <div className="mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    item.priority === 'urgent' ? 'bg-rose-500 text-white' :
                    item.priority === 'high' ? 'bg-amber-500 text-slate-950' :
                    'bg-indigo-500 text-white'
                  }`}>
                    {item.priority}
                  </span>
                </div>
              )}
              <h3 className="font-bold text-lg mb-2 line-clamp-1">{item.title}</h3>
              <p className="text-gray-400 text-sm line-clamp-3 mb-4">{item.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {item.videoUrl && <div className="p-2 bg-white/5 rounded-lg text-pink-400" title="Video Attachment"><Video size={14} /></div>}
                {item.pdfUrl && <div className="p-2 bg-white/5 rounded-lg text-amber-400" title="PDF Document"><FileText size={14} /></div>}
                {item.linkUrl && <div className="p-2 bg-white/5 rounded-lg text-indigo-400" title="External Link"><LinkIcon size={14} /></div>}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="text-[10px] text-gray-500 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Clock size={12} />
                  {new Date(item.publishTime).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setForm({ ...item, publishTime: new Date(item.publishTime).toISOString().slice(0, 16) } as any); setEditingId(item.id); setIsOpen(true); }}
                    className="p-2 bg-white/5 hover:bg-indigo-500 hover:text-white rounded-xl text-gray-400 transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl text-gray-400 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-slate-950 border border-white/10 rounded-[2.5rem] overflow-hidden p-8 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-3"><Megaphone className="text-pink-500" /> {editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Title</label>
                      <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-pink-500 outline-none transition-all" placeholder="Announcement headline..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Description</label>
                      <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-pink-500 outline-none transition-all h-32 resize-none" placeholder="Detailed message..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Priority</label>
                        <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-pink-500 outline-none transition-all">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Publish Date</label>
                        <input type="datetime-local" value={form.publishTime} onChange={e => setForm({...form, publishTime: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-pink-500 outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Media Attachments</label>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <label className="cursor-pointer group">
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'image')} />
                          <div className={`p-4 rounded-xl border border-dashed flex flex-col items-center gap-2 transition-all ${form.imageUrl ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:bg-white/5'}`}>
                            {uploading === 'image' ? (
                              <div className="flex flex-col items-center gap-1">
                                <RefreshCw size={14} className="animate-spin text-pink-500" />
                                <span className="text-[8px] font-black">{uploadProgress}%</span>
                              </div>
                            ) : <ImageIcon size={20} className={form.imageUrl ? 'text-emerald-400' : 'text-gray-500'} />}
                            <span className="text-[8px] font-bold uppercase tracking-widest">Image</span>
                          </div>
                        </label>
                        <label className="cursor-pointer group">
                          <input type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e, 'video')} />
                          <div className={`p-4 rounded-xl border border-dashed flex flex-col items-center gap-2 transition-all ${form.videoUrl ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:bg-white/5'}`}>
                            {uploading === 'video' ? (
                               <div className="flex flex-col items-center gap-1">
                                 <RefreshCw size={14} className="animate-spin text-pink-500" />
                                 <span className="text-[8px] font-black">{uploadProgress}%</span>
                               </div>
                            ) : <Video size={20} className={form.videoUrl ? 'text-emerald-400' : 'text-gray-500'} />}
                            <span className="text-[8px] font-bold uppercase tracking-widest">Video</span>
                          </div>
                        </label>
                        <label className="cursor-pointer group">
                          <input type="file" accept=".pdf" className="hidden" onChange={e => handleFileUpload(e, 'pdf')} />
                          <div className={`p-4 rounded-xl border border-dashed flex flex-col items-center gap-2 transition-all ${form.pdfUrl ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:bg-white/5'}`}>
                            {uploading === 'pdf' ? (
                               <div className="flex flex-col items-center gap-1">
                                 <RefreshCw size={14} className="animate-spin text-pink-500" />
                                 <span className="text-[8px] font-black">{uploadProgress}%</span>
                               </div>
                            ) : <FileText size={20} className={form.pdfUrl ? 'text-emerald-400' : 'text-gray-500'} />}
                            <span className="text-[8px] font-bold uppercase tracking-widest">PDF</span>
                          </div>
                        </label>
                      </div>

                      {form.imageUrl && <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle2 size={12} /> Image Uploaded</div>}
                      {form.videoUrl && <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle2 size={12} /> Video Uploaded</div>}
                      {form.pdfUrl && <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle2 size={12} /> PDF Uploaded</div>}
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">External Link URL</label>
                      <input value={form.linkUrl} onChange={e => setForm({...form, linkUrl: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-pink-500 outline-none transition-all" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Button Text</label>
                      <input value={form.buttonText} onChange={e => setForm({...form, buttonText: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-pink-500 outline-none transition-all" placeholder="e.g. Join Now" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 sticky bottom-0 bg-slate-950 py-4 border-t border-white/5">
                  <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-pink-500/10">
                    {editingId ? 'Update Announcement' : 'Publish Announcement'}
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
