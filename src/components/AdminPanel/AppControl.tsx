import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { uploadFile } from '../../lib/storageHelper';
import { Save, Upload, Edit3, Image as ImageIcon } from 'lucide-react';

export function AppControl() {
  const [data, setData] = useState({
    appName: "XPRO AGENT",
    shortName: "XPRO AGENT",
    primaryColor: "#6366f1",
    themeType: "dark",
    welcomeMessage: "Welcome to XPRO AGENT - Your Productivity Co-pilot",
    appLogoUrl: "",
    splashLogoUrl: "",
    splashBackgroundUrl: "",
    appDescription: "Your high-performance AI assistant for productivity, learning, and automation.",
    aiAssistantName: "XPRO AGENT",
    aiAssistantAvatarUrl: "",
    customGeminiApiKey: "",
    membershipBannerUrl: "",
    homeBannerUrl: "",
    aboutPageContent: "",
    contactEmail: "support@neostudy.ai",
    socialLinks: "",
    privacyPolicy: "",
    termsAndConditions: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingObj, setUploadingObj] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), snap => {
      if (snap.exists()) {
        setData(prev => ({ ...prev, ...snap.data() as any }));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'app'), data, { merge: true });
      await setDoc(doc(db, 'settings', 'about'), data, { merge: true }); // Backup
      alert("Settings saved successfully and synced live to all users!");
    } catch (e) {
      console.error(e);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setUploadingObj(prev => ({ ...prev, [fieldName]: true }));
    try {
      const url = await uploadFile(file, `admin_content/${fieldName}_${Date.now()}`);
      setData(prev => ({ ...prev, [fieldName]: url }));
    } catch (err) {
      console.error(err);
      alert(`Failed to upload ${fieldName}`);
    } finally {
      setUploadingObj(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const renderImageUpload = (label: string, fieldName: keyof typeof data) => (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
          {data[fieldName] ? <img src={data[fieldName] as string} alt={label} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-500" />}
        </div>
        <div className="flex-1">
          <label className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center gap-2 max-w-max">
            <Upload size={16} /> {uploadingObj[fieldName] ? 'Uploading...' : 'Upload Image'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, fieldName as string)} disabled={uploadingObj[fieldName]} />
          </label>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center sticky top-0 bg-slate-900 z-10 py-4 border-b border-white/10">
        <h2 className="text-2xl font-bold">App Customization</h2>
        <button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg disabled:opacity-50">
          <Save size={18} /> {saving ? 'Saving...' : 'Save & Sync Live'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Settings */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-400 mb-4 border-b border-white/10 pb-2">Core Branding</h3>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">App Name (Full)</label>
            <input 
              value={data.appName || ''} 
              onChange={e => setData({...data, appName: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">App Name (Short)</label>
            <input 
              value={data.shortName || ''} 
              onChange={e => setData({...data, shortName: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Theme Mode</label>
              <select 
                value={data.themeType || 'dark'} 
                onChange={e => setData({...data, themeType: e.target.value})}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 appearance-none"
              >
                <option value="dark">Dark Theme (Default)</option>
                <option value="light">Light Theme</option>
                <option value="amoled">AMOLED Black</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Primary Color</label>
              <div className="flex gap-2 mt-2">
                <input 
                  type="color" 
                  value={data.primaryColor || '#ec4899'} 
                  onChange={e => setData({...data, primaryColor: e.target.value})}
                  className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                />
                <input 
                  type="text" 
                  value={data.primaryColor || '#ec4899'} 
                  onChange={e => setData({...data, primaryColor: e.target.value})}
                  className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">App Description</label>
            <textarea 
              value={data.appDescription || ''} 
              onChange={e => setData({...data, appDescription: e.target.value})} 
              className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 resize-none" 
            />
          </div>
        </div>

        {/* Assets & Images */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-pink-400 mb-4 border-b border-white/10 pb-2">Logos & Banners</h3>
          {renderImageUpload("App Logo", "appLogoUrl")}
          {renderImageUpload("Splash Screen Logo", "splashLogoUrl")}
          {renderImageUpload("Splash Background", "splashBackgroundUrl")}
          {renderImageUpload("Home Top Banner", "homeBannerUrl")}
          {renderImageUpload("Membership Banner", "membershipBannerUrl")}
        </div>

        {/* AI Assistant Settings */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-purple-400 mb-4 border-b border-white/10 pb-2">AI Assistant Identity</h3>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Assistant Name</label>
            <input 
              value={data.aiAssistantName || ''} 
              onChange={e => setData({...data, aiAssistantName: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Welcome Text</label>
            <input 
              value={data.welcomeMessage || ''} 
              onChange={e => setData({...data, welcomeMessage: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Gemini API Key</label>
            <input 
              type="password"
              value={data.customGeminiApiKey || ''} 
              onChange={e => setData({...data, customGeminiApiKey: e.target.value})} 
              placeholder="Enter optional fallback API key"
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
            />
          </div>
          {renderImageUpload("AI Assistant Avatar", "aiAssistantAvatarUrl")}
        </div>

        {/* Legal & About Info */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-teal-400 mb-4 border-b border-white/10 pb-2">About Us & Legal</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Email</label>
              <input 
                value={data.contactEmail || ''} 
                onChange={e => setData({...data, contactEmail: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Phone</label>
              <input 
                value={data.phone || ''} 
                onChange={e => setData({...data, phone: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Developer Name</label>
              <input 
                value={data.devName || ''} 
                onChange={e => setData({...data, devName: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Website URL</label>
              <input 
                value={data.website || ''} 
                onChange={e => setData({...data, website: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Version Info</label>
              <input 
                value={data.version || ''} 
                onChange={e => setData({...data, version: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Copyright Text</label>
              <input 
                value={data.copyright || ''} 
                onChange={e => setData({...data, copyright: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">About Page Content</label>
            <textarea 
              value={data.aboutPageContent || ''} 
              onChange={e => setData({...data, aboutPageContent: e.target.value})} 
              className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 resize-none" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Privacy Policy URL</label>
            <input 
              value={data.privacyPolicy || ''} 
              onChange={e => setData({...data, privacyPolicy: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Terms & Conditions URL</label>
            <input 
              value={data.termsAndConditions || ''} 
              onChange={e => setData({...data, termsAndConditions: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
