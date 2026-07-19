import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('Click to restart Sweety!', 'Click to restart ${appSettings.aiAssistantName}!')
content = content.replace('Sweety ektu busy ache', '${appSettings.aiAssistantName} ektu busy ache')
content = content.replace('Sweety ekhon rest nicche', '${appSettings.aiAssistantName} ekhon rest nicche')
content = content.replace('Sweety-r sathe jogajog', '${appSettings.aiAssistantName}-r sathe jogajog')
content = content.replace('Sweety busy ache', '${appSettings.aiAssistantName} busy ache')
content = content.replace('grant Sweety permission', 'grant {appSettings.aiAssistantName} permission')

with open('src/App.tsx', 'w') as f:
    f.write(content)
