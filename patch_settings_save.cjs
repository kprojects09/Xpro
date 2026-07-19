const fs = require('fs');
let code = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

// Add onNavigateHome to interface
code = code.replace(
  "  isAdmin: boolean;\n}",
  "  isAdmin: boolean;\n  onNavigateHome?: () => void;\n}"
);

code = code.replace(
  "  isAdmin\n}:",
  "  isAdmin,\n  onNavigateHome\n}:"
);

// Add loading state
code = code.replace(
  "  const [profileSaved, setProfileSaved] = useState(false);",
  "  const [profileSaved, setProfileSaved] = useState(false);\n  const [isSaving, setIsSaving] = useState(false);\n  const [saveError, setSaveError] = useState('');"
);

// Update handleSaveProfile
code = code.replace(
  "  const handleSaveProfile = async () => {",
  "  const handleSaveProfile = async () => {\n    if (isSaving) return;\n    setIsSaving(true);\n    setSaveError('');\n"
);

// Add timeout promise wrapper and navigate home logic
const timeoutLogic = `
    const savePromise = async () => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, payload, { merge: true });
        addSystemLog(\`[PROFILE] Synced profile details to cloud.\`);
      }
      onUpdateProfile(payload);
    };

    try {
      // 10 second timeout for saving
      await Promise.race([
        savePromise(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
      ]);
      setProfileSaved(true);
      setTimeout(() => {
        setProfileSaved(false);
        if (onNavigateHome) onNavigateHome();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      if (err.message === "timeout") {
        setSaveError("Something went wrong. Please try again.");
      } else {
        setSaveError("Failed to save profile.");
      }
      setTimeout(() => setSaveError(''), 5000);
    } finally {
      setIsSaving(false);
    }
`;

// Replace try-catch block inside handleSaveProfile
code = code.replace(
  /    try \{\s*if \(currentUser\) \{\s*const userRef = doc\(db, 'users', currentUser\.uid\);\s*await setDoc\(userRef, payload, \{ merge: true \}\);\s*addSystemLog\(`\[PROFILE\] Synced profile details to cloud.`\);\s*\}\s*onUpdateProfile\(payload\);\s*setProfileSaved\(true\);\s*setTimeout\(\(\) => setProfileSaved\(false\), 2000\);\s*\} catch \(err: any\) \{\s*console\.error\(err\);\s*\}/s,
  timeoutLogic
);

// Fix button UI
code = code.replace(
  /            <button\s*onClick=\{handleSaveProfile\}\s*className=\{`py-2\.5 px-6 rounded-xl font-bold text-xs transition-all flex items-center gap-2 \$\{[\s\S]*?\}\`\}\s*>\s*\{profileSaved \? \(\s*<><Check size=\{14\} \/> Saved<\/>\s*\) : \(\s*'Save Profile'\s*\)\}\s*<\/button>/s,
  `
            <div className="flex flex-col items-end">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving || profileSaved}
              className={\`py-2.5 px-6 rounded-xl font-bold text-xs transition-all flex items-center gap-2 \${
                profileSaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 
                isSaving ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed' :
                'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:brightness-110 active:scale-95 shadow-lg shadow-purple-500/20'
              }\`}
            >
              {profileSaved ? (
                <><Check size={14} /> Saved</>
              ) : isSaving ? (
                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
              ) : (
                'Save Profile'
              )}
            </button>
            {saveError && <span className="text-[10px] text-rose-400 mt-1">{saveError}</span>}
            </div>
`
);

// Reduce expensive blur/glow
code = code.replace(/blur-\[50px\]/g, "blur-[30px]");
code = code.replace(/backdrop-blur-sm/g, "");

fs.writeFileSync('src/components/Settings.tsx', code);
