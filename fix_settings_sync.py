import re

with open('src/components/Settings.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { doc, setDoc, getDoc, updateDoc", "import { syncUserProfile } from '../lib/profileSync';\nimport { doc, setDoc, getDoc, updateDoc")
content = content.replace("await setDoc(userRef, payload, { merge: true });", "await syncUserProfile(currentUser.uid, payload);")

with open('src/components/Settings.tsx', 'w') as f:
    f.write(content)

with open('src/components/ForceUsernameSetup.tsx', 'r') as f:
    content2 = f.read()

content2 = content2.replace("import { collection, query, where, getDocs, doc, setDoc, limit } from 'firebase/firestore';", "import { collection, query, where, getDocs, doc, setDoc, limit } from 'firebase/firestore';\nimport { syncUserProfile } from '../lib/profileSync';")

content2 = content2.replace("const userRef = doc(db, 'users', userId);\n      await setDoc(userRef, { \n        username: clean,\n        lastUsernameChange: new Date().toISOString()\n      }, { merge: true });", "await syncUserProfile(userId, { \n        username: clean,\n        lastUsernameChange: new Date().toISOString()\n      });")

with open('src/components/ForceUsernameSetup.tsx', 'w') as f:
    f.write(content2)

with open('src/components/OnboardingForm.tsx', 'r') as f:
    content3 = f.read()

content3 = content3.replace("import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';", "import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';\nimport { syncUserProfile } from '../lib/profileSync';")

content3 = content3.replace("await setDoc(doc(db, 'users', userId), payload, { merge: true });", "await syncUserProfile(userId, payload);")

with open('src/components/OnboardingForm.tsx', 'w') as f:
    f.write(content3)

