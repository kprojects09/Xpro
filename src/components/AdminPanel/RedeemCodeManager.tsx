import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Key, Plus, Trash2, Edit3, Check, X, RefreshCw, User, Calendar, Clock, Search, ShieldAlert, Copy, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RedeemCode {
  id: string;
  code: string;
  reward: string;
  description: string;
  expiryDate?: string;
  maxUses: number;
  perUserLimit: number;
  isPremium: boolean;
  isActive: boolean;
  activationCount: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  redeemedBy: Array<{
    userId: string;
    email: string;
    redeemedAt: string;
  }>;
}

export function RedeemCodeManager() {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired' | 'disabled' | 'used'>('all');
  
  // Form / Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [reward, setReward] = useState('Premium Membership');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [maxUses, setMaxUses] = useState(100);
  const [perUserLimit, setPerUserLimit] = useState(1);
  const [isPremium, setIsPremium] = useState(true);
  const [isActive, setIsActive] = useState(true);
  
  // Selected Code for Viewing Redemptions
  const [selectedCode, setSelectedCode] = useState<RedeemCode | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom UI notification/modal states to replace blocked alert/confirm popups
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const showSuccessToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const showErrorToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 3000);
  };

  useEffect(() => {
    const q = query(collection(db, 'redeem_codes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedCodes = snap.docs.map(d => ({ id: d.id, ...d.data() } as RedeemCode));
      setCodes(fetchedCodes);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching redeem codes:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCopy = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let segment1 = '';
    let segment2 = '';
    for (let i = 0; i < 4; i++) {
      segment1 += chars.charAt(Math.floor(Math.random() * chars.length));
      segment2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(`SW-${segment1}-${segment2}`);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setCode('');
    setReward('Premium Membership');
    setDescription('');
    setExpiryDate('');
    setMaxUses(100);
    setPerUserLimit(1);
    setIsPremium(true);
    setIsActive(true);
    setFormError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (item: RedeemCode) => {
    setEditingId(item.id);
    setCode(item.code);
    setReward(item.reward || 'Premium Membership');
    setDescription(item.description || '');
    setExpiryDate(item.expiryDate || '');
    setMaxUses(item.maxUses);
    setPerUserLimit(item.perUserLimit || 1);
    setIsPremium(item.isPremium ?? true);
    setIsActive(item.isActive ?? true);
    setFormError(null);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!code.trim()) {
      setFormError("Redeem Code is required!");
      return;
    }

    const uppercaseCode = code.trim().toUpperCase();

    const payload: any = {
      code: uppercaseCode,
      reward,
      description,
      expiryDate: expiryDate || null,
      maxUses,
      perUserLimit,
      isPremium,
      isActive,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'redeem_codes', editingId), payload);
        showSuccessToast('Redeem code updated successfully!');
      } else {
        const duplicate = codes.find(c => c.code === uppercaseCode);
        if (duplicate) {
          setFormError('A redeem code with this exact text already exists!');
          return;
        }

        const newDocRef = doc(db, 'redeem_codes', uppercaseCode);
        await setDoc(newDocRef, {
          ...payload,
          id: newDocRef.id,
          activationCount: 0,
          createdAt: new Date().toISOString(),
          createdBy: auth.currentUser?.email || 'Admin',
          redeemedBy: []
        });
        showSuccessToast('Redeem code created successfully!');
      }
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to save redeem code.');
    }
  };

  const handleDelete = async (id: string, codeStr: string) => {
    setConfirmDialog({
      title: 'Delete Redeem Code',
      message: `Are you sure you want to permanently delete redeem code "${codeStr}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'redeem_codes', id));
          showSuccessToast('Redeem code deleted.');
        } catch (err) {
          console.error(err);
          showErrorToast('Failed to delete redeem code.');
        }
        setConfirmDialog(null);
      }
    });
  };

  const toggleStatus = async (item: RedeemCode) => {
    try {
      await updateDoc(doc(db, 'redeem_codes', item.id), {
        isActive: !item.isActive
      });
      showSuccessToast(`Code ${!item.isActive ? 'enabled' : 'disabled'} successfully!`);
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to toggle code status.');
    }
  };

  const getCodeStatus = (c: RedeemCode): 'active' | 'expired' | 'disabled' | 'used' => {
    if (!c.isActive) return 'disabled';
    if (c.expiryDate) {
      const isPast = new Date(c.expiryDate).getTime() <= Date.now();
      if (isPast) return 'expired';
    }
    if (c.activationCount >= c.maxUses) return 'used';
    return 'active';
  };

  const filteredCodes = codes.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase()) || 
                          c.reward.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    const status = getCodeStatus(c);
    if (activeTab === 'all') return true;
    return status === activeTab;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Key className="text-amber-400" />
            Redeem Code Manager
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Create, configure, and track reward codes for your users.
          </p>
        </div>
        <button 
          onClick={handleOpenCreate} 
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-sm transition-all shrink-0 self-start sm:self-center"
        >
          <Plus size={18} /> New Code
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total</p>
          <p className="text-2xl font-black text-indigo-400 mt-1">{codes.length}</p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Active</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {codes.filter(c => getCodeStatus(c) === 'active').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Expired</p>
          <p className="text-2xl font-black text-rose-400 mt-1">
            {codes.filter(c => getCodeStatus(c) === 'expired').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Disabled</p>
          <p className="text-2xl font-black text-amber-500 mt-1">
            {codes.filter(c => getCodeStatus(c) === 'disabled').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Fully Used</p>
          <p className="text-2xl font-black text-pink-400 mt-1">
            {codes.filter(c => getCodeStatus(c) === 'used').length}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
          <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'expired', label: 'Expired' },
              { id: 'disabled', label: 'Disabled' },
              { id: 'used', label: 'Used' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-amber-500 text-slate-950 shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search code or reward..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                <th className="pb-4">Code & Reward</th>
                <th className="pb-4">Limits</th>
                <th className="pb-4">Uses</th>
                <th className="pb-4">Status</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" /></td></tr>
              ) : filteredCodes.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-500 italic">No codes found.</td></tr>
              ) : (
                filteredCodes.map(item => {
                  const status = getCodeStatus(item);
                  return (
                    <tr key={item.id} className="group hover:bg-white/5 transition-all">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-amber-400 text-base px-3 py-1 bg-black/60 rounded-lg border border-white/5">
                            {item.code}
                          </span>
                          <button onClick={() => handleCopy(item.code, item.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500">
                            {copiedId === item.id ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="mt-1.5">
                          <div className="font-bold text-white text-xs">{item.reward}</div>
                          {item.description && <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{item.description}</div>}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="text-xs text-gray-300">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Calendar size={12} className="text-indigo-400" />
                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'No Expiry'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-pink-400" />
                            {item.perUserLimit} per user
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-black text-white">
                          {item.activationCount} <span className="text-gray-500 font-normal">/ {item.maxUses}</span>
                        </div>
                        <div className="w-20 bg-black/40 h-1.5 rounded-full mt-1 border border-white/5 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" 
                            style={{ width: `${Math.min(100, (item.activationCount / item.maxUses) * 100)}%` }} 
                          />
                        </div>
                      </td>
                      <td className="py-4">
                        {status === 'active' && <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/20">Active</span>}
                        {status === 'expired' && <span className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase border border-rose-500/20">Expired</span>}
                        {status === 'disabled' && <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase border border-amber-500/20">Disabled</span>}
                        {status === 'used' && <span className="px-2 py-1 rounded-md bg-pink-500/10 text-pink-400 text-[10px] font-black uppercase border border-pink-500/20">Full</span>}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenEdit(item)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"><Edit3 size={16} /></button>
                          <button onClick={() => toggleStatus(item)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"><RefreshCw size={16} /></button>
                          <button onClick={() => handleDelete(item.id, item.code)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-xl bg-slate-950 border border-white/10 rounded-[2.5rem] overflow-hidden p-8 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-3"><Key className="text-amber-400" /> {editingId ? 'Edit Code' : 'New Redeem Code'}</h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                {formError && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-3"><AlertCircle size={16} /> {formError}</div>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Redeem Code</label>
                      <div className="flex gap-2 mt-1.5">
                        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="flex-1 bg-black/60 border border-white/10 rounded-2xl p-4 text-sm font-mono text-amber-400 focus:border-amber-500 outline-none transition-all" placeholder="SW-XXXX-XXXX" />
                        <button type="button" onClick={generateRandomCode} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><RefreshCw size={18} /></button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Reward Name</label>
                      <input value={reward} onChange={e => setReward(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-amber-500 outline-none transition-all" placeholder="e.g. 1 Year Premium" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Description</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-amber-500 outline-none transition-all resize-none h-24" placeholder="Offer details..." />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Expiry Date</label>
                      <input type="datetime-local" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Max Uses</label>
                        <input type="number" value={maxUses} onChange={e => setMaxUses(parseInt(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-amber-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">User Limit</label>
                        <input type="number" value={perUserLimit} onChange={e => setPerUserLimit(parseInt(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm mt-1.5 focus:border-amber-500 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold">Premium Code?</span>
                      <button type="button" onClick={() => setIsPremium(!isPremium)} className={`w-12 h-6 rounded-full p-1 transition-all ${isPremium ? 'bg-amber-500' : 'bg-white/10'}`}><div className={`w-4 h-4 rounded-full bg-slate-950 transition-all ${isPremium ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold">Is Active?</span>
                      <button type="button" onClick={() => setIsActive(!isActive)} className={`w-12 h-6 rounded-full p-1 transition-all ${isActive ? 'bg-emerald-500' : 'bg-white/10'}`}><div className={`w-4 h-4 rounded-full bg-slate-950 transition-all ${isActive ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 sticky bottom-0 bg-slate-950 py-4 border-t border-white/5">
                  <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-amber-500/10">
                    {editingId ? 'Update Code' : 'Create Redeem Code'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-5 right-5 z-[9999] space-y-2 pointer-events-none">
        <AnimatePresence>
          {successToast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-500 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm pointer-events-auto"><CheckCircle2 size={18} /> {successToast}</motion.div>}
          {errorToast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-rose-500 text-white font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm pointer-events-auto"><AlertCircle size={18} /> {errorToast}</motion.div>}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-950 border border-white/10 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl text-center">
              <ShieldAlert className="text-rose-500 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-black mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-gray-400 mb-8">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDialog(null)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-xs transition-all">Cancel</button>
                <button onClick={confirmDialog.onConfirm} className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-xs transition-all">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

