const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf-8');
if (!appCode.includes("import { doc, getDoc, getDocs, setDoc, updateDoc")) {
  appCode = appCode.replace(
    "import { collection, query, orderBy, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';",
    "import { collection, query, orderBy, onSnapshot, limit, updateDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';"
  );
  
  appCode = appCode.replace(
    "import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';",
    "import { collection, query, orderBy, onSnapshot, limit, updateDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';"
  );
}
fs.writeFileSync('src/App.tsx', appCode);

let adminCode = fs.readFileSync('src/components/AdminPanel/index.tsx', 'utf-8');
adminCode = adminCode.replace(
  "CheckCircle} from 'lucide-react';",
  "CheckCircle, Crown} from 'lucide-react';"
);
adminCode = adminCode.replace(
  "CheckCircle, Crown, Crown} from 'lucide-react';",
  "CheckCircle, Crown} from 'lucide-react';"
);
fs.writeFileSync('src/components/AdminPanel/index.tsx', adminCode);
