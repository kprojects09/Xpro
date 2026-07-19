const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace("import { AdminDashboard } from './components/AdminDashboard';", "import { AdminDashboard } from './components/AdminPanel';");

fs.writeFileSync('src/App.tsx', code);
