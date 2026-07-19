import re

with open('src/components/AIChatRoom.tsx', 'r') as f:
    content = f.read()

content = content.replace("'Sweety AI Study Session'", "`${appSettings.appName} Study Session`")
content = content.replace("'Sweety AI'", "appSettings.appName")
content = content.replace("<strong>Sweety AI Premium Co-Pilot</strong>", "<strong>{appSettings.appName} Premium Co-Pilot</strong>")
content = content.replace("Sweety AI Workspace.", "${appSettings.appName} Workspace.")
content = content.replace("Sweety AI Workspace", "{appSettings.appName} Workspace")
content = content.replace("<span>Sweety Assistant</span>", "<span>{appSettings.aiAssistantName} Assistant</span>")
content = content.replace(">Sweety Assistant<", ">{appSettings.aiAssistantName} Assistant<")
content = content.replace("Ask Sweety anything", "Ask {appSettings.aiAssistantName} anything")

with open('src/components/AIChatRoom.tsx', 'w') as f:
    f.write(content)
