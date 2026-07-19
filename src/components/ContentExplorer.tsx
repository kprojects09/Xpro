import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { History, Edit3, 
  Folder, BookOpen, Layers, FileText, Video, Image as ImageIcon, Headphones, 
  CheckCircle, FileQuestion, ArrowLeft, Download, Eye, ExternalLink, Megaphone, Bell
} from 'lucide-react';

interface ContentExplorerProps {
  currentUser: any;
  userProfile: any;
}

export function ContentExplorer({ currentUser, userProfile }: ContentExplorerProps) {
  const [viewState, setViewState] = useState<{
    level: 'classes' | 'subjects' | 'chapters' | 'types' | 'content';
    selectedClass?: string;
    selectedSubject?: string;
    selectedChapter?: string;
    selectedType?: string;
  }>({ level: 'classes' });

  // Data states
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial classes
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'admin_classes'), snap => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch subjects when class is selected
  useEffect(() => {
    if (viewState.level === 'subjects' && viewState.selectedClass) {
      setLoading(true);
      // We assume subjects have a 'class' string field matching the class name
      // Admin uses text inputs for these fields in ContentManager.
      // So we'll fetch all and filter in memory if the schema isn't strict.
      const unsub = onSnapshot(collection(db, 'admin_subjects'), snap => {
        const allSubjects = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const filtered = allSubjects.filter(s => s.class === viewState.selectedClass);
        setSubjects(filtered.length > 0 ? filtered : allSubjects); // Fallback to all if strict matching fails
        setLoading(false);
      });
      return () => unsub();
    }
  }, [viewState.level, viewState.selectedClass]);

  // Fetch chapters when subject is selected
  useEffect(() => {
    if (viewState.level === 'chapters' && viewState.selectedSubject) {
      setLoading(true);
      const unsub = onSnapshot(collection(db, 'admin_chapters'), snap => {
        const allChapters = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const filtered = allChapters.filter(c => c.subject === viewState.selectedSubject);
        setChapters(filtered.length > 0 ? filtered : allChapters); // Fallback
        setLoading(false);
      });
      return () => unsub();
    }
  }, [viewState.level, viewState.selectedSubject]);

  // Fetch content when type is selected
  useEffect(() => {
    if (viewState.level === 'content' && viewState.selectedType && viewState.selectedChapter) {
      setLoading(true);
      let collectionName = '';
      switch(viewState.selectedType) {
        case 'Notes': collectionName = 'admin_notes'; break;
        case 'PDF Library': collectionName = 'admin_pdfs'; break;
        case 'Videos': collectionName = 'admin_videos'; break;
        case 'Images': collectionName = 'admin_images'; break;
        case 'Previous Year Questions': collectionName = 'admin_pyq'; break;
        case 'Mock Tests': collectionName = 'admin_mock_tests'; break;
        case 'Quizzes': collectionName = 'admin_quizzes'; break;
        case 'Assignments': collectionName = 'admin_assignments'; break;
        default: collectionName = 'admin_pdfs';
      }
      
      const unsub = onSnapshot(collection(db, collectionName), snap => {
        const allContent = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        // Filter by chapter (case insensitive, trimmed)
        const filtered = allContent.filter(c => 
          c.chapter && c.chapter.trim().toLowerCase() === viewState.selectedChapter?.trim().toLowerCase()
        );
        setContent(filtered);
        setLoading(false);
      });
      return () => unsub();
    }
  }, [viewState.level, viewState.selectedType, viewState.selectedChapter]);

  const CONTENT_TYPES = [
    { id: 'Notes', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'PDF Library', icon: BookOpen, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { id: 'Videos', icon: Video, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { id: 'Images', icon: ImageIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'Previous Year Questions', icon: History, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'Mock Tests', icon: CheckCircle, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { id: 'Quizzes', icon: FileQuestion, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { id: 'Assignments', icon: Edit3, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-32 max-w-5xl mx-auto w-full p-4 md:p-8">
      {/* Header and Back Button */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        {viewState.level !== 'classes' && (
          <button 
            onClick={() => {
              if (viewState.level === 'subjects') setViewState({ level: 'classes' });
              else if (viewState.level === 'chapters') setViewState({ ...viewState, level: 'subjects' });
              else if (viewState.level === 'types') setViewState({ ...viewState, level: 'chapters' });
              else if (viewState.level === 'content') setViewState({ ...viewState, level: 'types' });
            }}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h2 className="text-2xl font-black text-white">Study Content</h2>
          <div className="text-xs text-gray-400 mt-1 font-mono uppercase flex items-center gap-2">
            {viewState.selectedClass && <span>{viewState.selectedClass}</span>}
            {viewState.selectedSubject && <span>/ {viewState.selectedSubject}</span>}
            {viewState.selectedChapter && <span>/ {viewState.selectedChapter}</span>}
            {viewState.selectedType && <span>/ {viewState.selectedType}</span>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-indigo-400">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <span className="font-bold text-sm tracking-widest uppercase">Loading Content...</span>
        </div>
      ) : (
        <div className="relative min-h-[400px]">
          {/* LEVEL 1: CLASSES */}
          {viewState.level === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white/5 rounded-3xl border border-white/10">No classes found. Admin needs to add classes.</div>
              ) : (
                classes.map(c => (
                  <div key={c.id} onClick={() => setViewState({ level: 'subjects', selectedClass: c.title })} className="p-6 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-indigo-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-500/20 group">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                      <Layers size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white mb-1">{c.title}</h3>
                    {c.description && <p className="text-xs text-gray-400 line-clamp-2">{c.description}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* LEVEL 2: SUBJECTS */}
          {viewState.level === 'subjects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white/5 rounded-3xl border border-white/10">No subjects found for this class.</div>
              ) : (
                subjects.map(s => (
                  <div key={s.id} onClick={() => setViewState({ ...viewState, level: 'chapters', selectedSubject: s.title })} className="p-6 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-pink-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-pink-500/20 group">
                    <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center text-pink-400 mb-4 group-hover:scale-110 transition-transform">
                      <BookOpen size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white mb-1">{s.title}</h3>
                  </div>
                ))
              )}
            </div>
          )}

          {/* LEVEL 3: CHAPTERS */}
          {viewState.level === 'chapters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chapters.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white/5 rounded-3xl border border-white/10">No chapters found for this subject.</div>
              ) : (
                chapters.map(c => (
                  <div key={c.id} onClick={() => setViewState({ ...viewState, level: 'types', selectedChapter: c.title })} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                      <Folder size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{c.title}</h3>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">{viewState.selectedSubject}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* LEVEL 4: TYPES */}
          {viewState.level === 'types' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {CONTENT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <div key={type.id} onClick={() => setViewState({ ...viewState, level: 'content', selectedType: type.id })} className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 hover:border-white/30 cursor-pointer transition-all hover:bg-white/5 flex flex-col items-center justify-center text-center gap-3">
                    <div className={`w-14 h-14 ${type.bg} ${type.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                      <Icon size={28} />
                    </div>
                    <span className="font-bold text-xs text-white uppercase tracking-wider">{type.id}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* LEVEL 5: CONTENT */}
          {viewState.level === 'content' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white/5 rounded-3xl border border-white/10">No content available in this section.</div>
              ) : (
                content.map(item => (
                  <div key={item.id} className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-lg text-white mb-2 pr-8">{item.title}</h3>
                        <div className="bg-white/10 px-2 py-1 rounded-md text-[10px] font-mono text-gray-300 uppercase shrink-0">
                          {viewState.selectedType}
                        </div>
                      </div>
                      {item.topic && <p className="text-xs text-gray-400 mb-2">Topic: {item.topic}</p>}
                      {item.description && <p className="text-sm text-gray-300 mb-4">{item.description}</p>}
                    </div>
                    {item.fileUrl && (
                      <a href={item.fileUrl} target="_blank" rel="noreferrer" className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors self-start">
                        <Download size={14} /> Open / Download
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
