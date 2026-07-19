const fs = require('fs');
let code = fs.readFileSync('src/components/LearnCenter.tsx', 'utf-8');

if (!code.includes("import { collection, onSnapshot } from 'firebase/firestore';")) {
  code = code.replace("import { motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';\nimport { collection, onSnapshot } from 'firebase/firestore';\nimport { db } from '../firebase';");
}

const hookToAdd = `  const [adminNotes, setAdminNotes] = useState<any[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admin_notes'), (snap) => {
      setAdminNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);
`;

code = code.replace("  const [currentNote, setCurrentNote] = useState('');", hookToAdd + "\n  const [currentNote, setCurrentNote] = useState('');");

const replaceNotesRender = `
              {/* Admin Notes */}
              {adminNotes.length > 0 && (
                <div className="rounded-3xl p-5 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md shadow-2xl flex flex-col gap-3 mb-6">
                  <span className="font-bold text-xs uppercase tracking-wider text-indigo-400 border-b border-indigo-500/20 pb-2 flex items-center gap-2"><BookMarked size={14}/> Official Materials ({adminNotes.length})</span>
                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] scrollbar-thin">
                    {adminNotes.map((note: any) => (
                      <div key={note.id} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 relative group hover:border-white/20 transition-all">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white text-sm">{note.title}</h4>
                          {note.subject && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{note.subject}</span>}
                        </div>
                        {note.fileUrl && (
                          <a href={note.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold">
                            View Document <ArrowRight size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
`;

code = code.replace("{/* Saved Notes List */}", replaceNotesRender + "\n              {/* Saved Notes List */}");

fs.writeFileSync('src/components/LearnCenter.tsx', code);
