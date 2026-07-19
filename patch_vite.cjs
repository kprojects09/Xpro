const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf-8');

code = code.replace(
  "import react from '@vitejs/plugin-react';",
  "import react from '@vitejs/plugin-react';\nimport { VitePWA } from 'vite-plugin-pwa';"
);

code = code.replace(
  "plugins: [react(), tailwindcss()],",
  `plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Sweety AI',
          short_name: 'Sweety AI',
          description: 'Your Real-Time AI Study Partner',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: 'https://cdn-icons-png.flaticon.com/512/11516/11516246.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/11516/11516246.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })
    ],`
);

fs.writeFileSync('vite.config.ts', code);
