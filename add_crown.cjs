const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel/index.tsx', 'utf-8');

code = code.replace(
  "CheckCircle} from 'lucide-react';",
  "CheckCircle, Crown} from 'lucide-react';"
);

fs.writeFileSync('src/components/AdminPanel/index.tsx', code);
