const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

// For /api/chat
serverCode = serverCode.replace(
  'const { contents, systemInstruction } = req.body;',
  'const { contents, systemInstruction, customApiKey } = req.body;'
);

serverCode = serverCode.replace(
  '      const apiKey = process.env.GEMINI_API_KEY;',
  '      const apiKey = customApiKey || process.env.GEMINI_API_KEY;'
);

// For /chat
serverCode = serverCode.replace(
  'const { prompt, history, systemInstruction } = req.body;',
  'const { prompt, history, systemInstruction, customApiKey } = req.body;'
);

fs.writeFileSync('server.ts', serverCode, 'utf-8');
console.log('done');
