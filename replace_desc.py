import re

with open('src/components/AboutUs.tsx', 'r') as f:
    content = f.read()

content = content.replace("{data.description}", "{data.aboutPageContent || data.appDescription || data.description}")

with open('src/components/AboutUs.tsx', 'w') as f:
    f.write(content)
