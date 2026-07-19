const fs = require('fs');
let code = fs.readFileSync('src/components/CherryBlossomRain.tsx', 'utf-8');

code = code.replace(
  /export function CherryBlossomRain\(\) \{[\s\S]*?return \([\s\S]*?\);\n\}/,
  "export function CherryBlossomRain() { return null; }"
);

fs.writeFileSync('src/components/CherryBlossomRain.tsx', code);
