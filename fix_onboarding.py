import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("onboardedStatus = data.hasOnboarded === true;", "onboardedStatus = data.hasOnboarded === true || !!data.fullName;")

with open('src/App.tsx', 'w') as f:
    f.write(content)
