const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel/index.tsx', 'utf-8');

code = code.replace(
  "import { Users as UsersIcon",
  "import { PremiumManager } from './PremiumManager';\nimport { Users as UsersIcon"
);

code = code.replace(
  "{ id: 'app_control', label: 'App Control', icon: Settings, category: 'Main' },",
  "{ id: 'app_control', label: 'App Control', icon: Settings, category: 'Main' },\n  { id: 'premium_manager', label: 'Premium & Voice', icon: Crown, category: 'Main' },"
);

code = code.replace(
  "case 'app_control': return <AppControl />;",
  "case 'app_control': return <AppControl />;\n      case 'premium_manager': return <PremiumManager />;"
);

// We need to import Crown
code = code.replace(
  "import { Menu",
  "import { Menu, Crown"
);

fs.writeFileSync('src/components/AdminPanel/index.tsx', code);
