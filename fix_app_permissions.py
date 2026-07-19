import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { ForceUsernameSetup } from './components/ForceUsernameSetup';", "import { ForceUsernameSetup } from './components/ForceUsernameSetup';\nimport { PermissionPromptUI } from './components/PermissionPromptUI';")
content = content.replace("      {/* Security Authorization Alert Modal */}", "      <PermissionPromptUI />\n      {/* Security Authorization Alert Modal */}")

with open('src/App.tsx', 'w') as f:
    f.write(content)
