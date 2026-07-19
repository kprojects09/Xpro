const fs = require('fs');

function updateAIChatRoom() {
  let code = fs.readFileSync('src/components/AIChatRoom.tsx', 'utf-8');
  
  // Remove localStorage and log
  code = code.replace(
    /const apiKey = appSettings\.customGeminiApiKey \|\| localStorage\.getItem\('custom_gemini_api_key'\);/g,
    `const apiKey = appSettings.customGeminiApiKey?.trim();
      const maskedKey = apiKey ? \`\${apiKey.substring(0, 4)}...\${apiKey.substring(apiKey.length - 4)}\` : 'None';
      console.log(\`[DEBUG] Fetched Gemini API Key from Admin Panel: \${maskedKey}\`);`
  );

  fs.writeFileSync('src/components/AIChatRoom.tsx', code, 'utf-8');
}

function updateApp() {
  let code = fs.readFileSync('src/App.tsx', 'utf-8');
  
  code = code.replace(
    /const customKey = appSettings\.customGeminiApiKey \|\| localStorage\.getItem\('custom_gemini_api_key'\);\s*const apiKey = \(customKey && customKey\.trim\(\)\) \|\| process\.env\.GEMINI_API_KEY;/g,
    `const customKey = appSettings.customGeminiApiKey?.trim();
      const maskedKey = customKey ? \`\${customKey.substring(0, 4)}...\${customKey.substring(customKey.length - 4)}\` : 'None';
      console.log(\`[DEBUG] Live Audio - Fetched Gemini API Key: \${maskedKey}\`);
      const apiKey = customKey || process.env.GEMINI_API_KEY;`
  );

  fs.writeFileSync('src/App.tsx', code, 'utf-8');
}

updateAIChatRoom();
updateApp();
console.log('done');
