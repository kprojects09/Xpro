const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "Sweety AI          </h1>",
  "{aboutSettings?.appName || 'Sweety AI'}          </h1>"
);

fs.writeFileSync('src/App.tsx', code);
