const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf-8');

code = code.replace(
  "<title>My Google AI Studio App</title>",
  "<title>Sweety AI</title>\n    <meta name=\"theme-color\" content=\"#0f172a\" />\n    <meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />\n    <meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\" />\n    <link rel=\"icon\" type=\"image/png\" href=\"https://cdn-icons-png.flaticon.com/512/11516/11516246.png\" />\n    <link rel=\"apple-touch-icon\" href=\"https://cdn-icons-png.flaticon.com/512/11516/11516246.png\" />"
);

fs.writeFileSync('index.html', code);
