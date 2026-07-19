const fs = require('fs');

// Fix 1: AdminPanel index.tsx Users duplicate import
let adminCode = fs.readFileSync('src/components/AdminPanel/index.tsx', 'utf-8');
adminCode = adminCode.replace("Users, BookOpen", "Users as UsersIcon, BookOpen");
adminCode = adminCode.replace("icon: Users,", "icon: UsersIcon,");
fs.writeFileSync('src/components/AdminPanel/index.tsx', adminCode);

// Fix 2: App.tsx theme properties
let appCode = fs.readFileSync('src/App.tsx', 'utf-8');
appCode = appCode.replace(
  "isLight: aboutSettings?.themeType === 'light',",
  "isLight: aboutSettings?.themeType === 'light',\n    secondary: '#8b5cf6',\n    bgGlow: '#00000000',\n    glow: 'rgba(236,72,153,0.5)',"
);
fs.writeFileSync('src/App.tsx', appCode);

