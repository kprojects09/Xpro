const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingForm.tsx', 'utf-8');

// Replace handleComplete and add state
code = code.replace(
  "  const handleComplete = () => {",
  "  const [isSaving, setIsSaving] = useState(false);\n  const handleComplete = async () => {\n    if (isSaving) return;\n    setIsSaving(true);"
);

code = code.replace(
  "    onComplete({\n      fullName,",
  "    try {\n      await onComplete({\n        fullName,"
);

code = code.replace(
  "      hasOnboarded: true\n    });\n  };",
  "      hasOnboarded: true\n    });\n    } catch (err) {\n      setIsSaving(false);\n    }\n  };"
);

code = code.replace(
  "Save Profile",
  "{isSaving ? 'Saving...' : 'Save Profile'}"
);

code = code.replace(
  "disabled={isSaving} ",
  ""
);

code = code.replace(
  "<button onClick={handleComplete} className=\"py-3.5 px-8 bg-gradient-to-r",
  "<button onClick={handleComplete} disabled={isSaving} className=\"py-3.5 px-8 bg-gradient-to-r"
);

// Reduce blur to fix performance
code = code.replace(/blur-\[120px\]/g, "blur-[60px] md:blur-[80px]");
code = code.replace(/backdrop-blur-xl/g, "backdrop-blur-sm");

fs.writeFileSync('src/components/OnboardingForm.tsx', code);
