const fs = require('fs');

let chatCode = fs.readFileSync('src/components/AIChatRoom.tsx', 'utf-8');

chatCode = chatCode.replace(
  'updateAssistantMessage(`Server error: ${data.error}`);',
  'updateAssistantMessage(data.error === "AI service is temporarily unavailable. Please try again later." ? data.error : `Server error: ${data.error}`);'
);

chatCode = chatCode.replace(
  'updateAssistantMessage(`Server error: ${parsed.error}`);',
  'updateAssistantMessage(parsed.error === "AI service is temporarily unavailable. Please try again later." ? parsed.error : `Server error: ${parsed.error}`);'
);

fs.writeFileSync('src/components/AIChatRoom.tsx', chatCode, 'utf-8');
console.log('done');
