import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, Users as UsersIcon, BookOpen, Layers, Book, FileText, File, HelpCircle, FileSignature, 
  Calendar, Megaphone, Bell, Image as ImageIcon, Cpu, Key, Palette, Settings, Info, School, 
  Database, BarChart, LogOut, Check, Edit3, Trash2, Plus, X, Menu, HardDrive, MapPin, AlignLeft, Shield, CheckCircle, Crown, MessageSquare, Smartphone, Newspaper, Link as LinkIcon} from 'lucide-react';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { FileManager } from './FileManager';
import { ContentManager } from './ContentManager';
import { AppControl } from './AppControl';
import { Users } from './Users';
import { PremiumManager } from './PremiumManager';
import { RedeemCodeManager } from './RedeemCodeManager';
import { MessagingManager } from './MessagingManager';
import { FriendshipManager } from './FriendshipManager';
import { AnnouncementManager } from './AnnouncementManager';
import { BannerManager, UpdateManager } from './PromotionManagers';
import { LinkPostManager, NewsFeedManager } from './ContentManagers';

// Generic CRUD Component for simple collections (classes, subjects, mock tests, Pyq etc. if needed to be manually managed)
function GenericCRUD({ title, collectionName, fields }: { title: string, collectionName: string, fields: any[] }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, collectionName), (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [collectionName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, collectionName, editingId), form);
      } else {
        await setDoc(doc(collection(db, collectionName)), { ...form, createdAt: new Date().toISOString() });
      }
      setIsFormOpen(false);
      setForm({});
      setEditingId(null);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if(window.confirm('Delete this item?')) {
      await deleteDoc(doc(db, collectionName, id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button onClick={() => { setForm({}); setEditingId(null); setIsFormOpen(true); }} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-colors">
          <Plus size={16} /> Add New
        </button>
      </div>

      {isFormOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">{editingId ? 'Edit Item' : 'New Item'}</h3>
            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            {fields.map(f => (
              <div key={f.name}>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{f.label}</label>
                <input required value={form[f.name] || ''} onChange={e => setForm({...form, [f.name]: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1 focus:border-indigo-500 outline-none transition-colors" />
              </div>
            ))}
            <div className="pt-2"><button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-bold transition-colors">Save Item</button></div>
          </form>
        </motion.div>
      )}

      {loading ? <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(item => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setForm(item); setEditingId(item.id); setIsFormOpen(true); }} className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500 hover:text-white transition-colors"><Edit3 size={16} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-colors"><Trash2 size={16} /></button>
              </div>
              {fields.map((f, i) => (
                <div key={f.name} className={i === 0 ? "font-bold text-lg mb-2 pr-16" : "text-sm text-gray-400 truncate mb-1"}>
                  {i !== 0 && <span className="font-semibold text-gray-500 mr-2">{f.label}:</span>}
                  {item[f.name]}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'app_control', label: 'App Control', icon: Settings, category: 'Main' },
  { id: 'premium_manager', label: 'Premium & Voice', icon: Crown, category: 'Main' },
  { id: 'redeem_codes', label: 'Redeem Codes', icon: Key, category: 'Main' },
  { id: 'content_manager', label: 'Course Content', icon: Layers, category: 'Main' },
  { id: 'file_manager', label: 'File Manager', icon: File, category: 'Main' },
  { id: 'users', label: 'Users', icon: UsersIcon, category: 'Main' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, category: 'CMS' },
  { id: 'banners', label: 'Banner Ads', icon: ImageIcon, category: 'CMS' },
  { id: 'app_updates', label: 'App Updates', icon: Smartphone, category: 'CMS' },
  { id: 'news_feed', label: 'News Feed', icon: Newspaper, category: 'CMS' },
  { id: 'link_posts', label: 'Link Manager', icon: LinkIcon, category: 'CMS' },
  { id: 'classes', label: 'Classes', icon: Layers, category: 'Organization' },
  { id: 'subjects', label: 'Subjects', icon: Book, category: 'Organization' },
  { id: 'chapters', label: 'Chapters', icon: BookOpen, category: 'Organization' },
  { id: 'routine', label: 'Routine', icon: Calendar, category: 'Features' },
  { id: 'notifications', label: 'Push Notifications', icon: Bell, category: 'Features' },
  { id: 'messaging_manager', label: 'Messaging Manager', icon: MessageSquare, category: 'Features' },
  { id: 'friendship_manager', label: 'Friendship Manager', icon: UsersIcon, category: 'Features' },
  { id: 'school_database', label: 'School Database', icon: School, category: 'Organization' },
  { id: 'analytics', label: 'Analytics', icon: BarChart, category: 'System' },
];

export function AdminDashboard({ onLogout, onClose }: { onLogout: () => void; currentUser?: any; onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState('app_control');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch(activeTab) {
      case 'app_control': return <AppControl />;
      case 'premium_manager': return <PremiumManager />;
      case 'redeem_codes': return <RedeemCodeManager />;
      case 'content_manager': return <ContentManager />;
      case 'announcements': return <AnnouncementManager />;
      case 'banners': return <BannerManager />;
      case 'app_updates': return <UpdateManager />;
      case 'news_feed': return <NewsFeedManager />;
      case 'link_posts': return <LinkPostManager />;
      case 'file_manager': return <FileManager />;
      case 'analytics': return <AnalyticsDashboard />;
      case 'messaging_manager': return <MessagingManager />;
      case 'friendship_manager': return <FriendshipManager />;
      case 'classes': return <GenericCRUD title="Classes" collectionName="admin_classes" fields={[{name:'name', label:'Class Name'}, {name:'description', label:'Description'}]} />;
      case 'subjects': return <GenericCRUD title="Subjects" collectionName="admin_subjects" fields={[{name:'name', label:'Subject Name'}, {name:'class', label:'Class'}]} />;
      case 'chapters': return <GenericCRUD title="Chapters" collectionName="admin_chapters" fields={[{name:'name', label:'Chapter Name'}, {name:'subject', label:'Subject'}]} />;
      case 'routine': return <GenericCRUD title="Routine" collectionName="admin_routines" fields={[{name:'title', label:'Title'}, {name:'time', label:'Time'}]} />;
      case 'notifications': return <GenericCRUD title="Notifications" collectionName="admin_notifications" fields={[{name:'title', label:'Title'}, {name:'body', label:'Body'}]} />;
      case 'users': return <Users />;
      case 'school_database': return <GenericCRUD title="School Database" collectionName="admin_schools" fields={[{name:'name', label:'School Name'}, {name:'state', label:'State'}, {name:'district', label:'District'}]} />;
      default: return <div className="p-6">Select an option from the sidebar.</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-[#060413] text-white">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 h-full overflow-y-auto border-r border-white/10 flex flex-col bg-slate-900 shadow-2xl z-20"
          >
            <div className="p-6 flex items-center justify-between sticky top-0 bg-slate-900 z-10 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center text-white">
                  <Shield size={18} />
                </div>
                <span className="font-bold text-lg tracking-tight">System<span className="text-pink-500">Admin</span></span>
              </div>
              <button className="md:hidden p-1 rounded-md hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 py-4 px-3 space-y-1">
              {['Main', 'Organization', 'CMS', 'Features', 'System'].map(category => (
                <div key={category} className="mb-6">
                  <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {category}
                  </div>
                  {NAV_ITEMS.filter(i => i.category === category).map(item => {
                    const active = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          active 
                             ? 'bg-pink-500/15 text-pink-400'
                             : 'hover:bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Icon size={18} className={active ? '' : 'opacity-70'} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 space-y-2">
              {onClose && (
                <button 
                  onClick={onClose}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-pink-400 hover:bg-pink-500/10 transition-all cursor-pointer font-bold"
                >
                  <LayoutDashboard size={18} />
                  User Mode
                </button>
              )}
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <LogOut size={18} />
                Logout Admin
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#060413]">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-none z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg transition-colors hover:bg-white/10 text-gray-400">
              <Menu size={20} />
            </button>
            <h1 className="font-semibold text-lg">{NAV_ITEMS.find(i => i.id === activeTab)?.label || 'Dashboard'}</h1>
          </div>
          <div className="flex items-center gap-4">
            {onClose && (
              <button 
                onClick={onClose}
                className="text-xs font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/30 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Switch to User Mode
              </button>
            )}
            <div className="flex items-center gap-3 text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <CheckCircle size={14} /> LIVE SYNC ACTIVE
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto pb-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
