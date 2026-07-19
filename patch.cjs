const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  `  const [screen, setScreen] = useState<'welcome' | 'admin_login'>('welcome');`,
  `  const [screen, setScreen] = useState<'welcome' | 'admin_login'>('welcome');\n\n  if (screen === 'admin_login') {\n    return <AdminLogin onUnlock={(user) => { onUnlock(true, user); }} onCancel={() => setScreen('welcome')} />;\n  }`
);

// We need to remove the inline admin_login render block too
const blockToRemove = `          {/* Admin Login Screen */}
          {screen === 'admin_login' && (`;

let lines = code.split('\n');
let startIdx = lines.findIndex(l => l.includes("{/* Admin Login Screen */}"));
if (startIdx !== -1) {
  let endIdx = startIdx;
  let count = 0;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].includes('</motion.form>')) {
      endIdx = i + 1;
      break;
    }
  }
  lines.splice(startIdx, endIdx - startIdx + 1);
}

code = lines.join('\n');

// Also, the old system had `isDevUnlocked` mechanism. If unlocked, what does it do?
// Oh wait, `activeTab` handles the view. Let's make sure AdminDashboard is directly rendered if `isDevUnlocked`.
fs.writeFileSync('src/App.tsx', code);
