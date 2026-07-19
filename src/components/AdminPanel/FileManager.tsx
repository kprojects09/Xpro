import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { uploadFile, deleteFile } from '../../lib/storageHelper';
import { Upload, X, File, Image as ImageIcon, Video, FileText, FileArchive, Trash2, Download, Copy, Check } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

export function FileManager() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'admin_files'), orderBy('uploadedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    
    setUploading(true);
    setProgress(0);
    
    try {
      const path = `uploads/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path, (p) => setProgress(p));
      
      await addDoc(collection(db, 'admin_files'), {
        name: file.name,
        path: path,
        url: url,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      });
      
    } catch (err) {
      console.error(err);
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (fileId: string, path: string) => {
    if (!window.confirm("Delete this file permanently?")) return;
    try {
      await deleteFile(path);
      await deleteDoc(doc(db, 'admin_files', fileId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete file.");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="text-pink-400" size={24} />;
    if (type.startsWith('video/')) return <Video className="text-indigo-400" size={24} />;
    if (type.includes('pdf')) return <FileText className="text-rose-400" size={24} />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="text-emerald-400" size={24} />;
    return <File className="text-gray-400" size={24} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10">
        <div>
          <h2 className="text-2xl font-bold">File Manager</h2>
          <p className="text-sm text-gray-400 mt-1">Upload and manage raw files in Cloud Storage</p>
        </div>
        
        <div className="relative">
          <input 
            type="file" 
            onChange={handleFileUpload} 
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <button disabled={uploading} className="bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg disabled:opacity-50">
            <Upload size={18} /> {uploading ? `Uploading ${Math.round(progress)}%` : 'Upload New File'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>
      ) : files.length === 0 ? (
        <div className="text-center p-12 bg-white/5 border border-white/10 rounded-3xl text-gray-400">
          No files uploaded yet.
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="p-4 font-bold text-gray-400">File</th>
                <th className="p-4 font-bold text-gray-400 hidden md:table-cell">Size</th>
                <th className="p-4 font-bold text-gray-400 hidden sm:table-cell">Date</th>
                <th className="p-4 font-bold text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg">{getFileIcon(file.type)}</div>
                    <div className="truncate max-w-[150px] sm:max-w-xs font-medium text-white">{file.name}</div>
                  </td>
                  <td className="p-4 text-gray-400 hidden md:table-cell">{formatSize(file.size)}</td>
                  <td className="p-4 text-gray-400 hidden sm:table-cell">{new Date(file.uploadedAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => copyToClipboard(file.url, file.id)} className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-all" title="Copy Link">
                        {copiedId === file.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <a href={file.url} target="_blank" rel="noreferrer" className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all" title="Download">
                        <Download size={16} />
                      </a>
                      <button onClick={() => handleDelete(file.id, file.path)} className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
