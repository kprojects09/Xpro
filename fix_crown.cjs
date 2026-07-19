const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel/index.tsx', 'utf-8');
code = code.replace(/CheckCircle\s*\}/g, "CheckCircle, Crown}");
fs.writeFileSync('src/components/AdminPanel/index.tsx', code);
