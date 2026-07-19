const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel/index.tsx', 'utf-8');

code = code.replace(
  "await setDoc(doc(collection(db, collectionName)), form);",
  "await setDoc(doc(collection(db, collectionName)), { ...form, createdAt: new Date().toISOString() });"
);

// Also change admin_announcements to announcements
code = code.replace(
  "collectionName=\"admin_announcements\"",
  "collectionName=\"announcements\""
);

fs.writeFileSync('src/components/AdminPanel/index.tsx', code);
