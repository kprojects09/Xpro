import re

with open('src/lib/useLiveSettings.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "'Sweety AI is an advanced AI-powered educational platform designed to help students achieve their academic goals.'",
    "'This application was developed by Krish and his team with the goal of providing users with a modern AI-powered platform featuring an AI Assistant, Voice Assistant, Messaging, and other smart features. The team is committed to continuously improving the application with new updates, better performance, and enhanced security.'"
)

with open('src/lib/useLiveSettings.ts', 'w') as f:
    f.write(content)


with open('src/components/AboutUs.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '"Your intelligent companion for academic success and daily routines."',
    '"This application was developed by Krish and his team with the goal of providing users with a modern AI-powered platform featuring an AI Assistant, Voice Assistant, Messaging, and other smart features. The team is committed to continuously improving the application with new updates, better performance, and enhanced security."'
)

content = content.replace(
    '"Krishanu Majee"',
    '"Krish and Team"'
)

with open('src/components/AboutUs.tsx', 'w') as f:
    f.write(content)
