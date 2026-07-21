import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Info, Edit3, Save, X, Globe, Mail, Phone, Code, Shield } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useLiveSettings } from '../lib/useLiveSettings';

export function AboutUs({ isAdmin, addSystemLog }: { isAdmin: boolean; addSystemLog: (l: string) => void }) {
  const [data, setData] = useState({
    appName: "XPRO AGENT",
    logoUrl: "",
    description: "This application was developed by Krish and his team with the goal of providing users with a high-performance AI-powered platform featuring an AI Assistant, Productivity Tools, and other smart features.",
    devName: "Krish and Team",
    email: "krishanumajeeff@gmail.com",
    phone: "",
    website: "https://krishanumajee.com",
    socialLinks: "",
    version: "4.0.0",
    copyright: "© 2026 XPRO AGENT. All rights reserved."
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const { appSettings } = useLiveSettings();
  
  useEffect(() => {
    if (appSettings) {
      const merged = {
        ...data,
        ...appSettings,
        email: appSettings.contactEmail || appSettings.email || data.email,
        description: appSettings.aboutPageContent || appSettings.appDescription || appSettings.description || data.description,
      };
      setData(merged);
      setEditData(merged);
    }
  }, [appSettings]);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'about'), editData, { merge: true });
      await setDoc(doc(db, 'settings', 'app'), editData, { merge: true });
      setData(editData);
      setIsEditing(false);
      addSystemLog("[ADMIN] Updated About Us configuration");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 pb-32">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Info className="text-pink-400" />
          About Us
        </h2>
        {isAdmin && !isEditing && (
          <button onClick={() => { setEditData(data); setIsEditing(true); }} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl hover:bg-white/20 text-sm font-bold transition-all">
            <Edit3 size={16} /> Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 bg-white/5 border border-white/10 p-6 rounded-3xl">
          {Object.keys(data).map(k => (
            <div key={k} className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{k}</label>
              {k === 'description' ? (
                <textarea 
                  value={(editData as any)[k]} 
                  onChange={e => setEditData({...editData, [k]: e.target.value})}
                  className="bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm text-white w-full h-24"
                />
              ) : (
                <input 
                  type="text" 
                  value={(editData as any)[k]} 
                  onChange={e => setEditData({...editData, [k]: e.target.value})}
                  className="bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm text-white w-full"
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <button onClick={handleSave} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all">
              <Save size={18} /> Save Changes
            </button>
            <button onClick={() => setIsEditing(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all">
              <X size={18} /> Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[20px] pointer-events-none rounded-full" />
          
          <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-pink-500 to-indigo-500 rounded-full flex items-center justify-center p-1 shadow-[0_0_40px_rgba(236,72,153,0.3)] mb-6">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center overflow-hidden border-2 border-slate-950">
              {data.appLogoUrl || data.logoUrl ? <img src={data.appLogoUrl || data.logoUrl} className="w-full h-full object-cover" /> : <Shield className="w-10 h-10 text-pink-400" />}
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400 mb-2">{data.appName}</h1>
          <div className="inline-block bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-mono text-gray-400 mb-6">
            Version {data.version}
          </div>
          
          <p className="text-gray-300 leading-relaxed mb-8 max-w-md mx-auto">{data.aboutPageContent || data.appDescription || data.description}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-indigo-400 mb-1"><Code size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Developer</span></div>
              <div className="text-white font-medium">{data.devName}</div>
            </div>
            
            {(data.email || data.phone) && (
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-pink-400 mb-1"><Mail size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Contact</span></div>
                {data.email && <div className="text-white font-medium text-sm truncate">{data.email}</div>}
                {data.phone && <div className="text-gray-400 text-sm mt-1">{data.phone}</div>}
              </div>
            )}
            
            {data.website && (
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-emerald-400 mb-1"><Globe size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Website</span></div>
                <a href={data.website} target="_blank" rel="noreferrer" className="text-emerald-300 font-medium text-sm truncate hover:underline">{data.website}</a>
              </div>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 text-xs text-gray-500 font-mono">
            {data.copyright}
          </div>
        </motion.div>
      )}
    </div>
  );
}
