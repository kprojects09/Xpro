const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

let lines = code.split('\n');
let startIdx = lines.findIndex(l => l.includes("{(activeTab as any) === 'admin' && ("));
if (startIdx !== -1) {
  let endIdx = startIdx;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].includes('</motion.div>')) {
      endIdx = i + 1;
      break;
    }
  }
  lines.splice(startIdx, endIdx - startIdx + 1);
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
