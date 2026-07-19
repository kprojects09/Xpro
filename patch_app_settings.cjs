const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "              <UserProfileSettings\n                currentUser={currentUser}\n                userProfile={userProfile}\n                onUpdateProfile={(updatedData) => setUserProfile(updatedData)}\n                theme={theme}\n                currentTheme={currentTheme}\n                setCurrentTheme={setCurrentTheme}\n                onLogout={async () => {",
  "              <UserProfileSettings\n                currentUser={currentUser}\n                userProfile={userProfile}\n                onUpdateProfile={(updatedData) => setUserProfile(updatedData)}\n                theme={theme}\n                currentTheme={currentTheme}\n                setCurrentTheme={setCurrentTheme}\n                onNavigateHome={() => setActiveTab('home')}\n                onLogout={async () => {"
);

fs.writeFileSync('src/App.tsx', code);
