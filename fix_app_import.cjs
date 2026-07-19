const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  "import { doc, getDoc, setDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';",
  "import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';"
);
fs.writeFileSync('src/App.tsx', code);

let adminCode = fs.readFileSync('src/components/AdminPanel/index.tsx', 'utf-8');
adminCode = adminCode.replace(
  "CheckCircle} from 'lucide-react';",
  "CheckCircle, Crown} from 'lucide-react';"
);
fs.writeFileSync('src/components/AdminPanel/index.tsx', adminCode);
