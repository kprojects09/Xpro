const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const adminRender = `  if (isAuthorizedDev) {
    return <AdminDashboard onLogout={async () => { await signOut(auth); setIsDevUnlocked(false); }} />;
  }\n\n`;

code = code.replace(
  `  if (currentUser && hasOnboarded === false) {`,
  adminRender + `  if (currentUser && hasOnboarded === false) {`
);

fs.writeFileSync('src/App.tsx', code);
