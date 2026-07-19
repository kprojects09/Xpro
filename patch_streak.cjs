const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf-8');

code = code.replace(
  "    while (true) {\n      const currentStr = currentCheck.toISOString().split('T')[0];\n      if (completedDates.includes(currentStr)) {\n        streakCount++;\n        currentCheck.setDate(currentCheck.getDate() - 1);\n      } else {\n        break;\n      }\n    }",
  "    while (streakCount < 1000) {\n      const currentStr = currentCheck.toISOString().split('T')[0];\n      if (completedDates.includes(currentStr)) {\n        streakCount++;\n        currentCheck.setDate(currentCheck.getDate() - 1);\n      } else {\n        break;\n      }\n    }"
);

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
