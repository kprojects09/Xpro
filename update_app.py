import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

dev_instructions = """
DEVELOPER INFO:
If the user asks who developed you (e.g., "Who is your developer?", "Who made you?", "Who built you?", "তোমার ডেভেলপার কে?", "তোমাকে কে তৈরি করেছে?"), respond naturally and consistently in the user's language:
- English: "I was developed by Krish and his team."
- Bengali: "আমাকে কৃষ্ণ (Krish) এবং তার টিম ডেভেলপ করেছে।"
- Hindi: "मुझे Krish और उनकी टीम ने विकसित किया है।"
"""

content = content.replace("VOICE & PROSODY:", dev_instructions + "\nVOICE & PROSODY:")

content = content.replace("Made by Krish Watermark", "Made by Krish Watermark")
content = content.replace("Made by Krish", "Developed by Krish and Team")

with open('src/App.tsx', 'w') as f:
    f.write(content)
