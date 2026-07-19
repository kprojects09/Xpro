const fs = require('fs');

// Fix App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf-8');
appCode = appCode.replace(
  "import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';",
  "import { collection, query, orderBy, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';"
);
// Make sure doc is imported if not already
if (!appCode.includes(" doc,")) {
  appCode = appCode.replace("updateDoc }", "updateDoc, doc }");
}
fs.writeFileSync('src/App.tsx', appCode);

// Fix AdminPanel index.tsx
let adminCode = fs.readFileSync('src/components/AdminPanel/index.tsx', 'utf-8');
// I need to add Crown to lucide-react import
adminCode = adminCode.replace(
  "CheckCircle} from 'lucide-react';",
  "CheckCircle, Crown} from 'lucide-react';"
);
// And I need to import PremiumManager
if (!adminCode.includes("import { PremiumManager }")) {
  adminCode = adminCode.replace(
    "import { Users } from './Users';",
    "import { Users } from './Users';\nimport { PremiumManager } from './PremiumManager';"
  );
}
fs.writeFileSync('src/components/AdminPanel/index.tsx', adminCode);

