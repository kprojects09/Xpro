const fs = require('fs');
let code = fs.readFileSync('src/components/StudyRoutine.tsx', 'utf-8');

const hookToAdd = `
  const [adminRoutines, setAdminRoutines] = useState<any[]>([]);
  useEffect(() => {
    import('firebase/firestore').then(({ onSnapshot, collection }) => {
      const unsub = onSnapshot(collection(db, 'admin_routines'), snap => {
        setAdminRoutines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    });
  }, []);
`;

code = code.replace("  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());", hookToAdd + "\n  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());");

const renderAdminRoutines = `
      {/* Official Master Routines */}
      {adminRoutines.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4 flex items-center gap-2">
            <Sparkles size={16} /> Official Master Schedule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
            {adminRoutines.map(ar => (
              <div key={ar.id} className="bg-slate-900/50 border border-indigo-500/10 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{ar.title}</h4>
                  <div className="text-xs font-mono text-indigo-300 mt-1">{ar.time}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Clock size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
`;

// Insert the block below the header
code = code.replace(
  `{/* View Mode: Calendar & Routines List */}`,
  renderAdminRoutines + `\n\n      {/* View Mode: Calendar & Routines List */}`
);

fs.writeFileSync('src/components/StudyRoutine.tsx', code);
