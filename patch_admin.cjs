const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// We will inject the new imports
code = code.replace("import { AnalyticsDashboard } from './AnalyticsDashboard';", "import { AnalyticsDashboard } from './AnalyticsDashboard';\nimport { ContentManager } from './AdminPanel/ContentManager';\nimport { FileManager } from './AdminPanel/FileManager';");

// We will update the switch case for tabs
code = code.replace(
  "case 'analytics': return <AnalyticsDashboard />;",
  "case 'analytics': return <AnalyticsDashboard />;\n      case 'file_manager': return <FileManager />;\n      case 'content_manager': return <ContentManager />;"
);

// We need to add them to NAV_ITEMS
code = code.replace(
  "  { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, category: 'Main' },",
  "  { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, category: 'Main' },\n  { id: 'file_manager', label: 'File Manager', icon: File, category: 'Main' },\n  { id: 'content_manager', label: 'Content Manager', icon: Layers, category: 'Main' },"
);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
