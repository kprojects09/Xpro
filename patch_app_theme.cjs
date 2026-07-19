const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const replacement = `
  const { aboutSettings } = useLiveSettings();
  
  // Use live settings for theme
  const theme = {
    name: aboutSettings?.themeType === 'amoled' ? 'AMOLED Black' : (aboutSettings?.themeType === 'light' ? 'Light Theme' : 'Cosmic Slate'),
    primary: aboutSettings?.primaryColor || '#ec4899',
    button: (aboutSettings?.primaryColor || '#ec4899') + '33', // Add transparency for button bg
    isLight: aboutSettings?.themeType === 'light',
  };
`;

code = code.replace("  const theme = THEMES[currentTheme];", replacement);

fs.writeFileSync('src/App.tsx', code);
