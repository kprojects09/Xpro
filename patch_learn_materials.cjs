const fs = require('fs');
let code = fs.readFileSync('src/components/LearnCenter.tsx', 'utf-8');

const hookToAdd = `
  const [materials, setMaterials] = useState<any>({
    pdfs: [],
    videos: [],
    images: [],
    audio: [],
    mock_tests: [],
    pyq: []
  });

  useEffect(() => {
    const cols = ['admin_pdfs', 'admin_videos', 'admin_images', 'admin_audio', 'admin_mock_tests', 'admin_pyq'];
    const unsubs = cols.map(c => 
      onSnapshot(collection(db, c), snap => {
        setMaterials((prev: any) => ({
          ...prev,
          [c.replace('admin_', '')]: snap.docs.map(d => ({ id: d.id, ...d.data() }))
        }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);
`;

code = code.replace("  const [adminNotes, setAdminNotes] = useState<any[]>([]);", hookToAdd + "\n  const [adminNotes, setAdminNotes] = useState<any[]>([]);");

const renderMaterials = `
        {/* --- STUDY MATERIALS --- */}
        {learnTab === 'materials' && (
          <motion.div
            key="materials"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/10 pb-4">
              <BookOpen className="text-indigo-400" /> Official Study Materials
            </h3>
            
            {Object.entries(materials).map(([type, items]: [string, any]) => items.length > 0 && (
              <div key={type} className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <h4 className="font-bold text-sm uppercase tracking-wider text-indigo-400 mb-4">{type.replace('_', ' ')} ({items.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item: any) => (
                    <div key={item.id} className="p-4 bg-slate-900/50 border border-white/5 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-white">{item.title}</h5>
                        {item.subject && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{item.subject}</span>}
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        {item.class && <div>Class: {item.class}</div>}
                        {item.chapter && <div>Chapter: {item.chapter}</div>}
                      </div>
                      {item.fileUrl && (
                        <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 mt-2">
                          Access Resource <ArrowRight size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
`;

code = code.replace("{/* --- SUBJECT NOTES --- */}", renderMaterials + "\n        {/* --- SUBJECT NOTES --- */}");

fs.writeFileSync('src/components/LearnCenter.tsx', code);
