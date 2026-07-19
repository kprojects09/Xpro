import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { uploadFile, deleteFile } from '../../lib/storageHelper';
import { Upload, X, File, Image as ImageIcon, FileText, Video, Headphones, CheckCircle, Trash2, Edit } from 'lucide-react';

export function ContentManager() {
  const [activeTab, setActiveTab] = useState('notes');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    class: '',
    board: '',
    stream: '',
    subject: '',
    chapter: '',
    topic: '',
    fileUrl: '',
    fileName: '',
  });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const tabs = [
    { id: 'classes', label: 'Classes', collection: 'admin_classes', icon: FileText, accept: '' },
    { id: 'subjects', label: 'Subjects', collection: 'admin_subjects', icon: FileText, accept: '' },
    { id: 'chapters', label: 'Chapters', collection: 'admin_chapters', icon: FileText, accept: '' },
    { id: 'notes', label: 'Notes', collection: 'admin_notes', icon: FileText, accept: '.pdf,.doc,.docx,.txt' },
    { id: 'pdfs', label: 'PDFs', collection: 'admin_pdfs', icon: File, accept: '.pdf' },
    { id: 'images', label: 'Images', collection: 'admin_images', icon: ImageIcon, accept: 'image/*' },
    { id: 'videos', label: 'Videos', collection: 'admin_videos', icon: Video, accept: 'video/*' },
    { id: 'audio', label: 'Audio', collection: 'admin_audio', icon: Headphones, accept: 'audio/*' },
    { id: 'mock_tests', label: 'Mock Tests', collection: 'admin_mock_tests', icon: FileText, accept: '.pdf,.zip' },
    { id: 'pyq', label: 'Previous Year Questions', collection: 'admin_pyq', icon: FileText, accept: '.pdf' },
    { id: 'assignments', label: 'Assignments', collection: 'admin_assignments', icon: FileText, accept: '.pdf,.doc,.docx' },
    { id: 'quizzes', label: 'Quizzes', collection: 'admin_quizzes', icon: CheckCircle, accept: '.pdf,.json' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab)!;

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, currentTab.collection), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching data, using blank", err);
      // Fallback
      setData([]);
      setLoading(false);
    });
    return () => unsub();
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let finalFileUrl = formData.fileUrl;
      let finalFileName = formData.fileName;

      if (fileToUpload) {
        const ext = fileToUpload.name.split('.').pop();
        const path = `admin_content/${activeTab}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        finalFileUrl = await uploadFile(fileToUpload, path, (p) => setUploadProgress(p));
        finalFileName = fileToUpload.name;
      }

      await addDoc(collection(db, currentTab.collection), {
        ...formData,
        fileUrl: finalFileUrl,
        fileName: finalFileName,
        createdAt: new Date().toISOString()
      });

      setIsFormOpen(false);
      setFormData({ title: '', class: '', board: '', stream: '', subject: '', chapter: '', topic: '', fileUrl: '', fileName: '' });
      setFileToUpload(null);
      setUploadProgress(0);
    } catch (err) {
      console.error(err);
      alert("Failed to upload content");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, currentTab.collection, item.id));
      // Try to delete the file if it's from our storage
      if (item.fileUrl && item.fileUrl.includes('firebasestorage')) {
        // We'd parse the path in a real app, but this requires parsing the tokenized URL.
        // For simplicity, we just delete the doc.
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Content Manager</h2>
        <button onClick={() => setIsFormOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm">
          <Upload size={18} /> Upload {currentTab.label}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {isFormOpen && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Upload to {currentTab.label}</h3>
            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Class</label>
                <input value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Board</label>
                <input value={formData.board} onChange={e => setFormData({...formData, board: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Stream</label>
                <input value={formData.stream} onChange={e => setFormData({...formData, stream: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Subject</label>
                <input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Chapter</label>
                <input value={formData.chapter} onChange={e => setFormData({...formData, chapter: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Topic</label>
                <input value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Select File</label>
                <input type="file" accept={currentTab.accept} onChange={e => setFileToUpload(e.target.files?.[0] || null)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30" />
              </div>
            </div>
            
            {uploading && (
              <div className="w-full bg-white/10 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-indigo-500 h-2 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
            
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button type="submit" disabled={uploading || (!fileToUpload && !formData.fileUrl)} className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold transition-all">
                {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Content'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {loading ? (
        <div className="text-center p-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>
      ) : data.length === 0 ? (
        <div className="text-center p-12 bg-white/5 border border-white/10 rounded-3xl text-gray-400">
          No {currentTab.label.toLowerCase()} found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(item => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDelete(item)} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
              </div>
              <h3 className="font-bold text-lg text-white mb-2 pr-16">{item.title}</h3>
              <div className="space-y-1 text-xs text-gray-400 mb-4">
                {item.class && <div><span className="font-semibold text-gray-300">Class:</span> {item.class}</div>}
                {item.subject && <div><span className="font-semibold text-gray-300">Subject:</span> {item.subject}</div>}
                {item.chapter && <div><span className="font-semibold text-gray-300">Chapter:</span> {item.chapter}</div>}
              </div>
              {item.fileUrl && (
                <a href={item.fileUrl} target="_blank" rel="noreferrer" download={item.fileName || true} className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold">
                  View / Download <Upload size={14} className="rotate-45" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
