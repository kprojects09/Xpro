const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// We will simplify the audio logic to just play/pause without setInterval fades.

code = code.replace(
  /const fadeOut = setInterval\(\(\) => \{[\s\S]*?clearInterval\(fadeOut\);\s*\}\s*\}, 150\);/g,
  "audio.volume = 0; audio.pause();"
);

code = code.replace(
  /const themeFadeIn = setInterval\(\(\) => \{[\s\S]*?clearInterval\(themeFadeIn\);\s*\}\s*\}, 200\);/g,
  "if (themeMusicRef.current) themeMusicRef.current.volume = 0.1;"
);

code = code.replace(
  /const fadeIn = setInterval\(\(\) => \{[\s\S]*?clearInterval\(fadeIn\);\s*\}\s*\}, 150\);/g,
  "audio.volume = 0.5;"
);

fs.writeFileSync('src/App.tsx', code);
