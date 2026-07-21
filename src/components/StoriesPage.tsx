import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Eye, Trash2, Loader2 } from 'lucide-react';
import { uploadStory, getStories, viewStory } from '../lib/firebaseHelpers';
import { auth, db } from '../firebase';
import { permissionManager } from '../lib/permissionManager';
import { doc, deleteDoc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';

export function StoriesPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = data.filter((s: any) => new Date(s.expiresAt) > new Date());
      setStories(filtered);
    });
    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && auth.currentUser) {
      const file = e.target.files[0];
      
      // Limit file size (e.g., 20MB for stories)
      if (file.size > 20 * 1024 * 1024) {
        alert("File is too large. Max size is 20MB.");
        e.target.value = '';
        return;
      }

      const p = await permissionManager.requestPermission('media', 'Photos and Media Access', 'XPRO AGENT needs access to your photos to upload a story.');
      if (!p) {
        e.target.value = '';
        return;
      }
      setIsUploading(true);
      setUploadProgress(1); // Set to 1 immediately to show activity
      try {
        console.log('[STORY] Starting upload for:', file.name);
        // We use a small timeout to ensure progress UI registers
        await new Promise(r => setTimeout(r, 100));
        
        await uploadStory(auth.currentUser.uid, file, (progress) => {
          // Floor the progress to avoid 100% before completion
          setUploadProgress(Math.max(Math.floor(progress), 1));
        });
        
        console.log("Story uploaded successfully.");
        setSelectedStory(null); // Reset viewer if open
      } catch (err: any) {
        console.error('[STORY] Upload failed:', err);
        alert(`Upload failed: ${err.message || 'Check your internet connection and try again'}`);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleViewStory = async (story: any) => {
    setSelectedStory(story);
    if (auth.currentUser && !story.viewers?.includes(auth.currentUser.uid)) {
      await viewStory(story.id, auth.currentUser.uid);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      setStories(stories.filter(s => s.id !== storyId));
      setSelectedStory(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="px-6 pb-6 pt-14 md:pt-6 text-white min-h-screen bg-[#060413] safe-top">
      <h1 className="text-3xl font-extrabold mb-6 flex items-center gap-3">
        Stories
        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-indigo-400">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
            <span>{Math.round(uploadProgress)}%</span>
          </div>
        )}
      </h1>
      
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        <label className="shrink-0 w-20 h-20 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
          <Plus size={30} className="text-gray-400" />
          <input type="file" className="hidden" onChange={handleUpload} accept="image/*,video/*" disabled={isUploading} />
        </label>
        
        {stories.map(story => (
          <div 
            key={story.id} 
            onClick={() => handleViewStory(story)}
            className="shrink-0 w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 p-0.5 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="w-full h-full rounded-full border-2 border-[#060413] overflow-hidden">
              {story.mediaURL.match(/\.(mp4|webm|ogg)$/i) ? (
                <video src={story.mediaURL} className="w-full h-full object-cover" />
              ) : (
                <img src={story.mediaURL} className="w-full h-full object-cover" alt="story" />
              )}
            </div>
          </div>
        ))}
      </div>

      {stories.length === 0 && !isUploading && (
        <div className="mt-20 text-center">
          <p className="text-gray-500 font-bold text-lg">No stories yet.</p>
          <p className="text-gray-600 text-sm mt-1">Share your special moments with classmates.</p>
        </div>
      )}

      <AnimatePresence>
        {selectedStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col safe-top safe-bottom"
          >
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold">
                   {selectedStory.userId.charAt(0).toUpperCase()}
                 </div>
                 <div>
                   <p className="text-sm font-bold">Classmate</p>
                   <p className="text-[10px] text-gray-500">{new Date(selectedStory.createdAt).toLocaleTimeString()}</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                {auth.currentUser?.uid === selectedStory.userId && (
                  <button onClick={() => handleDeleteStory(selectedStory.id)} className="p-2.5 hover:bg-white/10 rounded-full text-rose-400 active:scale-90 transition-all">
                    <Trash2 size={22} />
                  </button>
                )}
                <button onClick={() => setSelectedStory(null)} className="p-2.5 hover:bg-white/10 rounded-full text-white active:scale-90 transition-all">
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              {selectedStory.mediaURL.match(/\.(mp4|webm|ogg)$/i) ? (
                <video src={selectedStory.mediaURL} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" autoPlay controls />
              ) : (
                <img src={selectedStory.mediaURL} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="story content" />
              )}
            </div>

            <div className="p-6 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Eye size={14} />
                <span>{selectedStory.viewers?.length || 0} Viewers</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
