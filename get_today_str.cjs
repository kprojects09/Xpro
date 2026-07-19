const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
const match = code.match(/function getTodayStr\(\) \{[\s\S]*?\}/);
console.log(match ? match[0] : 'Not found');
