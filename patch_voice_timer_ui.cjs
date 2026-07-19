const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = "<span>{isActive ? (isListening ? 'Awaiting Audio' : 'Processing') : 'STANDBY'}</span>";

const voiceTimeCode = `<span>{isActive ? (isListening ? 'Awaiting Audio' : 'Processing') : 'STANDBY'}</span>
            {activeTab === 'voice' && (!userProfile?.isPremium) && (
              <>
                <span>|</span>
                <span className="text-amber-400">
                  REMAINING VOICE TIME: {Math.max(0, Math.floor((freeVoiceTimeLimit - voiceTimeUsedToday) / 3600))}h {Math.max(0, Math.floor(((freeVoiceTimeLimit - voiceTimeUsedToday) % 3600) / 60))}m
                </span>
              </>
            )}`;

code = code.replace(target, voiceTimeCode);

fs.writeFileSync('src/App.tsx', code);
