import re

with open('src/components/AboutUs.tsx', 'r') as f:
    content = f.read()

content = content.replace("data.logoUrl ?", "data.appLogoUrl || data.logoUrl ?")
content = content.replace("src={data.logoUrl}", "src={data.appLogoUrl || data.logoUrl}")

with open('src/components/AboutUs.tsx', 'w') as f:
    f.write(content)
