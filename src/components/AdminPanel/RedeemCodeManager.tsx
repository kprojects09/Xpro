import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Key, Plus, Trash2, Edit3, Check, X, RefreshCw, User, Calendar, Clock, Search, ShieldAlert, Copy, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RedeemCode {
  id: string;
  code: string;
  validityType: '1_day' | '7_days' | '15_days' | '30_days' | '90_days' | '180_days' | '365_days' | 'lifetime' | 'custom_date';
  customExpiryDate?: string;
  isSingleUse: boolean;
  maxActivations: number;
  activationCount: number;
  isEnabled: boolean;
  isRevoked: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  redeemedBy: Array<{
    userId: string;
    email: string;
    redeemedAt: string;
  }>;
}

const VALIDITY_PRESETS = [
  { value: '1_day', label: '1 Day' },
  { value: '7_days', label: '7 Days' },
  { value: '15_days', label: '15 Days' },
  { value: '30_days', label: '30 Days' },
  { value: '90_days', label: '90 Days' },
  { value: '180_days', label: '180 Days' },
  { value: '365_days', label: '365 Days' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'custom_date', label: 'Custom Date & Time' }
];

export function RedeemCodeManager() {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired' | 'disabled' | 'used'>('all');
  
  // Form / Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [validityType, setValidityType] = useState<RedeemCode['validityType']>('30_days');
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [isSingleUse, setIsSingleUse] = useState(false);
  const [maxActivations, setMaxActivations] = useState(10);
  const [isEnabled, setIsEnabled] = useState(true);
  
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
    setValidityType('30_days');
    setCustomExpiryDate('');
    setIsSingleUse(false);
    setMaxActivations(10);
    setIsEnabled(true);
    setFormError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (item: RedeemCode) => {
    setEditingId(item.id);
    setCode(item.code);
    setValidityType(item.validityType);
    setCustomExpiryDate(item.customExpiryDate || '');
    setIsSingleUse(item.isSingleUse);
    setMaxActivations(item.maxActivations);
    setIsEnabled(item.isEnabled);
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

    // Validity constraints
    if (validityType === 'custom_date' && !customExpiryDate) {
      setFormError("Custom expiry date is required for Custom Date & Time validity!");
      return;
    }

    const payload: Partial<RedeemCode> = {
      code: uppercaseCode,
      validityType,
      customExpiryDate: validityType === 'custom_date' ? customExpiryDate : null as any,
      isSingleUse: isSingleUse,
      maxActivations: isSingleUse ? 1 : maxActivations,
      isEnabled,
      updatedAt: new Date().toISOString() as any
    };

    try {
      if (editingId) {
        // Edit mode
        await updateDoc(doc(db, 'redeem_codes', editingId), payload);
        showSuccessToast('Redeem code updated successfully!');
      } else {
        // Check if code already exists in DB
        const duplicate = codes.find(c => c.code === uppercaseCode);
        if (duplicate) {
          setFormError('A redeem code with this exact text already exists!');
          return;
        }

        // New code creation
        const newDocRef = doc(db, 'redeem_codes', payload.code);
        await setDoc(newDocRef, {
          ...payload,
          id: newDocRef.id,
          activationCount: 0,
          isRevoked: false,
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
        isEnabled: !item.isEnabled
      });
      showSuccessToast(`Code ${!item.isEnabled ? 'enabled' : 'disabled'} successfully!`);
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to toggle code status.');
    }
  };

  const handleRevokeCode = async (item: RedeemCode) => {
    const action = item.isRevoked ? 'unrevoke' : 'revoke';
    setConfirmDialog({
      title: `${item.isRevoked ? 'Unrevoke' : 'Revoke'} Redeem Code`,
      message: `Are you sure you want to ${action} code "${item.code}"?`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'redeem_codes', item.id), {
            isRevoked: !item.isRevoked
          });
          showSuccessToast(`Code successfully ${!item.isRevoked ? 'revoked' : 'unrevoked'}!`);
        } catch (err) {
          console.error(err);
          showErrorToast('Failed to update revoke status.');
        }
        setConfirmDialog(null);
      }
    });
  };

  // Helper to determine status category of a code
  const getCodeStatus = (c: RedeemCode): 'active' | 'expired' | 'disabled' | 'used' => {
    if (c.isRevoked || !c.isEnabled) return 'disabled';
    if (c.validityType === 'custom_date' && c.customExpiryDate) {
      const isPast = new Date(c.customExpiryDate).getTime() <= Date.now();
      if (isPast) return 'expired';
    }
    if (c.activationCount >= c.maxActivations) return 'used';
    return 'active';
  };

  const filteredCodes = codes.filter(c => {
    // Search filter
    const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase()) || 
                          c.createdBy.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    // Tab category filter
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
            Redeem Code Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Create, configure, search, edit, revoke, and track secure custom activation codes for Premium memberships.
          </p>
        </div>
        <button 
          onClick={handleOpenCreate} 
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-sm transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 self-start sm:self-center"
        >
          <Plus size={18} /> Create Redeem Code
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold">Total Codes</p>
          <p className="text-2xl font-black text-indigo-400 mt-1">{codes.length}</p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold">Active</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {codes.filter(c => getCodeStatus(c) === 'active').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold">Expired</p>
          <p className="text-2xl font-black text-rose-400 mt-1">
            {codes.filter(c => getCodeStatus(c) === 'expired').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold">Disabled/Revoked</p>
          <p className="text-2xl font-black text-amber-500 mt-1">
            {codes.filter(c => getCodeStatus(c) === 'disabled').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-semibold">Fully Used</p>
          <p className="text-2xl font-black text-pink-400 mt-1">
            {codes.filter(c => getCodeStatus(c) === 'used').length}
          </p>
        </div>
      </div>

      {/* Main View Area */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
          {/* Sub-Tabs / Filters */}
          <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl self-start">
            {[
              { id: 'all', label: 'All Codes' },
              { id: 'active', label: 'Active' },
              { id: 'expired', label: 'Expired' },
              { id: 'disabled', label: 'Disabled/Revoked' },
              { id: 'used', label: 'Fully Used' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id 
                    ? 'bg-amber-500 text-slate-950 font-black' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by Code or Creator..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        {/* Redeem Code Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="pb-4 font-bold uppercase text-xs tracking-wider">Redeem Code</th>
                <th className="pb-4 font-bold uppercase text-xs tracking-wider">Validity Period</th>
                <th className="pb-4 font-bold uppercase text-xs tracking-wider text-center">Uses</th>
                <th className="pb-4 font-bold uppercase text-xs tracking-wider">Status</th>
                <th className="pb-4 font-bold uppercase text-xs tracking-wider">Date Created</th>
                <th className="pb-4 font-bold uppercase text-xs tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" /></td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 italic">No matching redeem codes found.</td>
                </tr>
              ) : (
                filteredCodes.map(item => {
                  const status = getCodeStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-all">
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white tracking-widest font-mono text-base bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                            {item.code}
                          </span>
                          <button 
                            onClick={() => handleCopy(item.code, item.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Copy code"
                          >
                            {copiedId === item.id ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                        {item.isRevoked && <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md font-bold mt-1 inline-block uppercase">Revoked</span>}
                      </td>
                      <td className="py-4">
                        <div className="font-bold text-white">
                          {VALIDITY_PRESETS.find(v => v.value === item.validityType)?.label || item.validityType}
                        </div>
                        {item.validityType === 'custom_date' && item.customExpiryDate && (
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            Expires: {new Date(item.customExpiryDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        <div className="font-black text-amber-400 text-base">
                          {item.activationCount} <span className="text-xs font-normal text-gray-500">/ {item.isSingleUse ? '1' : item.maxActivations}</span>
                        </div>
                        {item.redeemedBy && item.redeemedBy.length > 0 && (
                          <button
                            onClick={() => setSelectedCode(item)}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline mt-1 block mx-auto"
                          >
                            View Redemptions ({item.redeemedBy.length})
                          </button>
                        )}
                      </td>
                      <td className="py-4">
                        {status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        )}
                        {status === 'expired' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                            Expired
                          </span>
                        )}
                        {status === 'disabled' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                            Disabled
                          </span>
                        )}
                        {status === 'used' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-full">
                            Fully Used
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-xs text-gray-400 font-mono">
                        <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] opacity-75">By: {item.createdBy.split('@')[0]}</div>
                      </td>
                      <td className="py-4 text-right space-x-1">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 rounded-xl text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 transition-all inline-flex"
                          title="Edit Code"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleRevokeCode(item)}
                          className={`p-2 rounded-xl transition-all inline-flex ${
                            item.isRevoked 
                              ? 'text-emerald-400 hover:bg-emerald-400/10' 
                              : 'text-rose-400 hover:bg-rose-400/10'
                          }`}
                          title={item.isRevoked ? "Unrevoke Code" : "Revoke Code"}
                        >
                          <ShieldAlert size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, item.code)}
                          className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all inline-flex"
                          title="Delete Code"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation/Edit Dialog Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-950 border border-white/10 rounded-3xl overflow-hidden p-6 md:p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Key className="text-amber-400" />
                  {editingId ? 'Edit Redeem Code' : 'Create Redeem Code'}
                </h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {formError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {/* Code Field */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-1.5">Redeem Code</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="e.g. SW-EXAM-PREP"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3.5 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                      disabled={!!editingId}
                      required
                    />
                    {!editingId && (
                      <button 
                        type="button"
                        onClick={generateRandomCode}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                      >
                        <RefreshCw size={14} /> Generate
                      </button>
                    )}
                  </div>
                </div>

                {/* Validity presets */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-1.5">Validity Duration (Grants Premium)</label>
                  <select 
                    value={validityType}
                    onChange={e => setValidityType(e.target.value as any)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {VALIDITY_PRESETS.map(preset => (
                      <option key={preset.value} value={preset.value}>{preset.label}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Date Picker (if custom_date validity) */}
                {validityType === 'custom_date' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-1.5">Custom Expiry Date & Time</label>
                    <input 
                      type="datetime-local"
                      value={customExpiryDate}
                      onChange={e => setCustomExpiryDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                )}

                {/* Single Use Toggle */}
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div>
                    <div className="text-sm font-bold text-white">Single-Use Code</div>
                    <div className="text-xs text-gray-400 mt-0.5">Can only be redeemed by one user in total.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSingleUse(!isSingleUse)}
                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${isSingleUse ? 'bg-amber-400' : 'bg-white/10'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all duration-300 ${isSingleUse ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Max Activations (disabled if single-use) */}
                {!isSingleUse && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-1.5">Maximum Activations (Users Count Limit)</label>
                    <input 
                      type="number"
                      min={1}
                      max={9999}
                      value={maxActivations}
                      onChange={e => setMaxActivations(parseInt(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                )}

                {/* Enable toggle */}
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div>
                    <div className="text-sm font-bold text-white">Code Enabled</div>
                    <div className="text-xs text-gray-400 mt-0.5">Allow users to redeem this code immediately.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEnabled(!isEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${isEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Submit */}
                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-4 rounded-2xl font-black text-sm transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  >
                    {editingId ? 'Update Code Settings' : 'Create Redeem Code'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewing Redemptions Detailed Dialog Modal */}
      <AnimatePresence>
        {selectedCode && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedCode(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-slate-950 border border-white/10 rounded-3xl overflow-hidden p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <User className="text-indigo-400" />
                    Code Redemptions
                  </h3>
                  <div className="text-xs text-gray-400 mt-1 font-mono">Code: <strong className="text-amber-400 font-bold">{selectedCode.code}</strong></div>
                </div>
                <button onClick={() => setSelectedCode(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
                {selectedCode.redeemedBy.length === 0 ? (
                  <p className="text-gray-500 text-center italic py-8 text-sm">Nobody has redeemed this code yet.</p>
                ) : (
                  selectedCode.redeemedBy.map((r, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-sm">
                      <div>
                        <div className="font-bold text-white">{r.email}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">UID: {r.userId}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-indigo-400 font-bold flex items-center gap-1.5 justify-end">
                          <Clock size={12} /> Redeemed
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{new Date(r.redeemedAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-[9999] space-y-2 pointer-events-none">
        <AnimatePresence>
          {successToast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto text-sm"
            >
              <CheckCircle2 size={16} />
              <span>{successToast}</span>
            </motion.div>
          )}
          {errorToast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-rose-500 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto text-sm"
            >
              <AlertCircle size={16} />
              <span>{errorToast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldAlert className="text-amber-400" />
                  {confirmDialog.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
