const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update imports
content = content.replace("import { Settings as UserProfileSettings } from './components/Settings';", 
  "import { Settings as UserProfileSettings } from './components/Settings';\nimport { AboutUs } from './components/AboutUs';\nimport { ThemeApplier } from './components/ThemeApplier';");
// Wait, maybe the import is still `UserProfileSettings` in App.tsx. Let me check.
