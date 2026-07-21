import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { Image as ImageIcon, Plus, Trash2, Edit3, X, Zap, Calendar, ExternalLink, RefreshCw, Smartphone, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Banner Manager Component
export function BannerManager() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    imageUrl: '',
    gradient: 'from-pink-500 to-rose-500',
    buttonText: 'Join Now',
    animationType: 'pulse',
    deepLink: '',
    scheduleDate: new Date().toISOString().slice(0, 16),
    isActive: true
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'banners'), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error(error);
          alert('Upload failed: ' + error.message);
          setUploading(false);
          setUploadProgress(0);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setForm(prev => ({ ...prev, imageUrl: url }));
            setUploading(false);
            setUploadProgress(100);
            alert('Image uploaded successfully!');
          } catch (err: any) {
            console.error(err);
            alert('Failed to get download URL: ' + err.message);
            setUploading(false);
          }
        }
      );
    } catch (err: any) { 
      console.error(err); 
      alert('Upload failed: ' + (err.message || 'Unknown error'));
      setUploading(false); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, scheduleDate: new Date(form.scheduleDate).toISOString(), updatedAt: serverTimestamp() };
    if (editingId) await updateDoc(doc(db, 'banners', editingId), data);
    else await addDoc(collection(db, 'banners'), { ...data, createdAt: serverTimestamp() });
    setIsOpen(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3"><Zap className="text-amber-400" /> Banner Manager</h2>
          <p className="text-gray-400 text-sm">Design eye-catching banners for the home screen.</p>
        </div>
        <button onClick={() => { setEditingId(null); setIsOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"><Plus size={18} /> New Banner</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map(item => (
          <div key={item.id} className="bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden group">
            <div className={`h-48 relative overflow-hidden bg-gradient-to-br ${item.gradient}`}>
              {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover mix-blend-overlay opacity-80" />}
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="text-white text-xs font-black uppercase tracking-widest mb-1 opacity-70">Featured Offer</div>
                <h3 className="text-2xl font-black text-white">{item.buttonText}</h3>
                <div className="mt-4 flex gap-2">
                   <button onClick={() => { setForm({...item, scheduleDate: new Date(item.scheduleDate).toISOString().slice(0, 16)}); setEditingId(item.id); setIsOpen(true); }} className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all"><Edit3 size={18} /></button>
                   <button onClick={() => deleteDoc(doc(db, 'banners', item.id))} className="p-3 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 rounded-2xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
            <div className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <Calendar size={14} /> Scheduled: {new Date(item.scheduleDate).toLocaleDateString()}
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</div>
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
                <h3 className="text-xl font-black flex items-center gap-3"><Zap className="text-amber-400" /> {editingId ? 'Edit Banner' : 'New Banner'}</h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-4">
                  <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center gap-4 hover:bg-white/5 transition-all cursor-pointer group relative overflow-hidden">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                    {form.imageUrl ? <img src={form.imageUrl} alt="" className="w-full h-32 object-cover rounded-2xl" /> : (
                       <>
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="animate-spin text-amber-400" size={32} />
                            <span className="text-xs font-black">{uploadProgress}%</span>
                            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                              />
                            </div>
                          </div>
                        ) : <ImageIcon className="text-gray-500 group-hover:text-amber-400 transition-all" size={32} />}
                        {!uploading && (
                          <div className="text-center">
                            <p className="text-sm font-bold">Click to upload banner image</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Recommended: 1200 x 400px</p>
                          </div>
                        )}
                       </>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Button Text</label>
                      <input required value={form.buttonText} onChange={e => setForm({...form, buttonText: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Deep Link / URL</label>
                      <input value={form.deepLink} onChange={e => setForm({...form, deepLink: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-amber-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Gradient Theme</label>
                      <select value={form.gradient} onChange={e => setForm({...form, gradient: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-amber-500 outline-none transition-all">
                        <option value="from-pink-500 to-rose-500">Pink Rose</option>
                        <option value="from-amber-400 to-orange-500">Gold Sunset</option>
                        <option value="from-indigo-500 to-purple-600">Royal Purple</option>
                        <option value="from-emerald-400 to-cyan-500">Emerald Sea</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Schedule Date</label>
                      <input type="datetime-local" value={form.scheduleDate} onChange={e => setForm({...form, scheduleDate: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-amber-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-xs font-bold">Banner Active?</span>
                    <button type="button" onClick={() => setForm({...form, isActive: !form.isActive})} className={`w-12 h-6 rounded-full p-1 transition-all ${form.isActive ? 'bg-amber-500' : 'bg-white/10'}`}><div className={`w-4 h-4 rounded-full bg-slate-950 transition-all ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                  </div>
                </div>

                <div className="pt-4 sticky bottom-0 bg-slate-950 py-4 border-t border-white/5">
                  <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-amber-500/10">
                    {editingId ? 'Update Banner' : 'Publish Banner'}
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

// Update Manager Component
export function UpdateManager() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    versionName: '1.0.0',
    versionCode: 1,
    releaseNotes: '',
    updateType: 'optional',
    apkUrl: '',
    fileSize: 0
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'app_updates'), orderBy('createdAt', 'desc')), (snap) => {
      setUpdates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Basic size check (e.g. 100MB limit for safety in this environment)
    if (file.size > 100 * 1024 * 1024) {
      alert('File is too large. Maximum 100MB allowed.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `updates/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        }, 
        (error) => {
          console.error(error);
          alert('Upload failed: ' + error.message);
          setUploading(false);
          setUploadProgress(0);
        }, 
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setForm(prev => ({ ...prev, apkUrl: url, fileSize: file.size }));
            setUploading(false);
            setUploadProgress(100);
            alert('Package uploaded successfully!');
          } catch (err: any) {
            console.error(err);
            alert('Failed to get download URL: ' + err.message);
            setUploading(false);
          }
        }
      );
    } catch (err: any) { 
      console.error(err); 
      alert('Upload failed: ' + (err.message || 'Unknown error'));
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.apkUrl) {
      alert('Please upload an APK/AAB package first.');
      return;
    }
    
    try {
      await addDoc(collection(db, 'app_updates'), { 
        ...form, 
        versionCode: Number(form.versionCode) || 0,
        createdAt: serverTimestamp() 
      });
      setIsOpen(false);
      setForm({
        versionName: '1.0.0',
        versionCode: 1,
        releaseNotes: '',
        updateType: 'optional',
        apkUrl: '',
        fileSize: 0
      });
      alert('New version published successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to publish update: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3"><Smartphone className="text-indigo-400" /> App Update System</h2>
          <p className="text-gray-400 text-sm">Release new versions and manage mandatory updates.</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"><Plus size={18} /> New Release</button>
      </div>

      <div className="space-y-4">
        {updates.map((update, i) => (
          <div key={update.id} className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row gap-6 items-start md:items-center relative group">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${i === 0 ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-500'}`}>
              <Smartphone size={32} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-black">Version {update.versionName}</h3>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${update.updateType === 'force' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {update.updateType} Update
                </span>
                {i === 0 && <span className="text-[10px] font-black text-indigo-400 flex items-center gap-1"><CheckCircle2 size={12} /> LATEST</span>}
              </div>
              <p className="text-xs text-gray-400 line-clamp-1 italic mb-2">"{update.releaseNotes}"</p>
              <div className="flex gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                 <span>Code: {update.versionCode}</span>
                 <span>Size: {(update.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                 <span>Released: {update.createdAt?.toDate ? update.createdAt.toDate().toLocaleDateString() : 'Pending...'}</span>
              </div>
            </div>
            <div className="flex gap-2">
               <a href={update.apkUrl} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white" title="Download Package"><ExternalLink size={18} /></a>
               <button onClick={() => deleteDoc(doc(db, 'app_updates', update.id))} className="p-3 bg-white/5 hover:bg-rose-500/20 rounded-xl transition-all text-gray-400 hover:text-rose-400 opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
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
                <h3 className="text-xl font-black flex items-center gap-3"><Smartphone className="text-indigo-400" /> Release New Update</h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Version Name</label>
                    <input required value={form.versionName} onChange={e => setForm({...form, versionName: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-indigo-500 outline-none transition-all" placeholder="e.g. 2.4.1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Version Code</label>
                    <input required type="number" value={form.versionCode} onChange={e => setForm({...form, versionCode: parseInt(e.target.value)})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Release Notes</label>
                  <textarea required value={form.releaseNotes} onChange={e => setForm({...form, releaseNotes: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-indigo-500 outline-none transition-all h-32 resize-none" placeholder="What's new in this version..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Update Type</label>
                    <select value={form.updateType} onChange={e => setForm({...form, updateType: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-indigo-500 outline-none transition-all">
                      <option value="optional">Optional</option>
                      <option value="force">Mandatory (Force)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Package Upload (.apk / .aab)</label>
                    <div className="relative mt-1.5">
                      <input type="file" accept=".apk,.aab" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                      <div className={`p-4 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3 transition-all ${form.apkUrl ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400 font-bold' : 'border-white/10 hover:bg-white/5 text-gray-400'}`}>
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                             <RefreshCw className="animate-spin" size={18} />
                             <span className="text-[10px] font-black">{uploadProgress}%</span>
                             <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${uploadProgress}%` }}
                                  className="h-full bg-indigo-500"
                                />
                             </div>
                          </div>
                        ) : (form.apkUrl ? <CheckCircle2 size={18} /> : <Plus size={18} />)}
                        <span className="text-xs uppercase tracking-widest">{uploading ? 'Uploading...' : (form.apkUrl ? 'Ready to Deploy' : 'Select File')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 sticky bottom-0 bg-slate-950 py-4 border-t border-white/5">
                  <button disabled={!form.apkUrl || uploading} type="submit" className="w-full bg-indigo-500 disabled:opacity-50 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-500/10">
                    Deploy New Version
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
