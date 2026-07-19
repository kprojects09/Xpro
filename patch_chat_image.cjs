const fs = require('fs');
let code = fs.readFileSync('src/components/AIChatRoom.tsx', 'utf-8');

code = code.replace(
  "onClick={() => handleSimulatedUpload('image')}",
  "onClick={() => fileInputRef.current?.click()}"
);

fs.writeFileSync('src/components/AIChatRoom.tsx', code);
