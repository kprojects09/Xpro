const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldUnlock = `      if (!isSignUp || userCredential.user.emailVerified) {
        setTimeout(() => {
          onUnlock(false, userCredential.user);
        }, 1000);
      }`;

const newUnlock = `      if (userCredential.user.emailVerified) {
        setTimeout(() => {
          onUnlock(false, userCredential.user);
        }, 1000);
      }`;

code = code.replace(oldUnlock, newUnlock);
fs.writeFileSync('src/App.tsx', code, 'utf-8');
console.log('done');
