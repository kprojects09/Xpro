const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "const activeTabRef = useRef(activeTab);\n  \n  const [activeTab, setActiveTab] = useState",
  "const [activeTab, setActiveTab] = useState"
);

code = code.replace(
  "const [activeTab, setActiveTab] = useState<'home' | 'learn' | 'chat' | 'voice' | 'profile' | 'image_studio' | 'routine' | 'settings' | 'about' | 'search' | 'announcements' | 'notifications'>('home');",
  "const [activeTab, setActiveTab] = useState<'home' | 'learn' | 'chat' | 'voice' | 'profile' | 'image_studio' | 'routine' | 'settings' | 'about' | 'search' | 'announcements' | 'notifications'>('home');\n  const activeTabRef = useRef(activeTab);"
);

fs.writeFileSync('src/App.tsx', code);
