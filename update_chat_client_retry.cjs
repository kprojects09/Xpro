const fs = require('fs');

let chatCode = fs.readFileSync('src/components/AIChatRoom.tsx', 'utf-8');

const oldCatch = `        } catch (error: any) {
          console.error("Gemini API Error in Chat Screen:", error);
          updateAssistantMessage(\`Gemini API-te somossa holo: \${error?.message || 'Unauthorized API Key'}. Default server engine co-pilot diye try koro!\`);
        }`;

const newCatch = `        } catch (error: any) {
          console.error("Gemini API Error in Chat Screen:", error);
          const isRateLimited = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota');
          if (isRateLimited) {
            updateAssistantMessage("AI service is temporarily unavailable. Please try again later.");
          } else {
            updateAssistantMessage(\`Gemini API Error: \${error?.message || 'Unauthorized API Key'}\`);
          }
        }`;

chatCode = chatCode.replace(oldCatch, newCatch);

fs.writeFileSync('src/components/AIChatRoom.tsx', chatCode, 'utf-8');
console.log('done');
