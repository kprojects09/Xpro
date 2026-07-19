const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingForm.tsx', 'utf-8');

code = code.replace(
  "  const [isSaving, setIsSaving] = useState(false);",
  "  const [isSaving, setIsSaving] = useState(false);\n  const [saveError, setSaveError] = useState('');"
);

const originalTryCatch = `    try {
      await onComplete({
        fullName,
      class: studentClass,
      board,
      stream,
      country,
      state,
      district,
      block,
      school: schoolName,
      subjects: finalSubjects.filter(Boolean),
      theme,
      language,
      avatarIndex,
      hasOnboarded: true
    });
    } catch (err) {
      setIsSaving(false);
    }`;

const newTryCatch = `    try {
      setSaveError('');
      const payload = {
        fullName,
        class: studentClass,
        board,
        stream,
        country,
        state,
        district,
        block,
        school: schoolName,
        subjects: finalSubjects.filter(Boolean),
        theme,
        language,
        avatarIndex,
        hasOnboarded: true
      };
      await Promise.race([
        onComplete(payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
      ]);
      // isSaving is kept true because it navigates away
    } catch (err: any) {
      setIsSaving(false);
      if (err.message === "timeout") {
        setSaveError("Something went wrong. Please try again.");
      } else {
        setSaveError("Failed to save profile.");
      }
      setTimeout(() => setSaveError(''), 5000);
    }`;

code = code.replace(originalTryCatch, newTryCatch);

// Also add a loading spinner to the button
code = code.replace(
  "{isSaving ? 'Saving...' : 'Save Profile'}",
  "{isSaving ? <><div className=\"w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin\"></div> Saving...</> : 'Save Profile'}"
);

// Display error below button
code = code.replace(
  "                  <button onClick={handleComplete} disabled={isSaving} className=\"py-3.5 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all text-white flex items-center gap-2\">\n                    <Check size={16} />\n                    {isSaving ? <><div className=\"w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin\"></div> Saving...</> : 'Save Profile'}\n                  </button>\n                </div>",
  "                  <div className=\"flex flex-col items-end gap-1\">\n                  <button onClick={handleComplete} disabled={isSaving} className={`py-3.5 px-8 rounded-2xl font-bold transition-all text-white flex items-center gap-2 ${isSaving ? 'bg-gray-500/50 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95'}`}>\n                    {!isSaving && <Check size={16} />}\n                    {isSaving ? <><div className=\"w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin\"></div> Saving...</> : 'Save Profile'}\n                  </button>\n                  {saveError && <span className=\"text-rose-400 text-[10px]\">{saveError}</span>}\n                  </div>\n                </div>"
);


fs.writeFileSync('src/components/OnboardingForm.tsx', code);
