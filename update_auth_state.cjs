const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldAuthHook = `    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        setupPushNotifications();`;

const newAuthHook = `    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        if (!user.emailVerified) {
          setIsAuthChecking(false);
          return;
        }
        setupPushNotifications();`;

code = code.replace(oldAuthHook, newAuthHook);

fs.writeFileSync('src/App.tsx', code, 'utf-8');
console.log('done');
