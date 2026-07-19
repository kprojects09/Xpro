const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /                <button\s*onClick=\{([^}]*)\}\s*className="text-xs text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest font-semibold text-center mt-3 cursor-pointer"\s*>\s*System Admin Panel\s*<\/button>/g,
  ""
);

fs.writeFileSync('src/App.tsx', code);
