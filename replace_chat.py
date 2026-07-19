import re

with open('src/components/AIChatRoom.tsx', 'r') as f:
    content = f.read()

content = content.replace("Ami Sweety,", "Ami ${appSettings.aiAssistantName},")
content = content.replace('"Sweety AI"', '`${appSettings.appName}`')

with open('src/components/AIChatRoom.tsx', 'w') as f:
    f.write(content)
