import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { handleFirestoreError, OperationType } from './lib/firebaseHelpers';", "import { handleFirestoreError, OperationType } from './lib/firebaseHelpers';\nimport { syncUserProfile } from './lib/profileSync';")

content = content.replace("await setDoc(userDocRef, {\n              hasOnboarded: true\n            }, { merge: true });", "await syncUserProfile(currentUser.uid, { hasOnboarded: true });")
content = content.replace("await setDoc(userDocRef, payload, { merge: true });", "await syncUserProfile(currentUser.uid, payload);")
content = content.replace("await setDoc(userDocRef, {\n              email: user.email || '',\n              role: userRole,\n              hasOnboarded: false,\n              createdAt: new Date().toISOString()\n            }, { merge: true });", "await syncUserProfile(user.uid, {\n              email: user.email || '',\n              role: userRole,\n              hasOnboarded: false,\n              createdAt: new Date().toISOString()\n            });")

with open('src/App.tsx', 'w') as f:
    f.write(content)
