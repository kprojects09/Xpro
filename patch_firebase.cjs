const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf-8');
code = code.replace("import { getFirestore } from 'firebase/firestore';", "import { getFirestore } from 'firebase/firestore';\nimport { getStorage } from 'firebase/storage';");
code = code.replace("export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);", "export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);\nexport const storage = getStorage(app);");
fs.writeFileSync('src/firebase.ts', code);
