import re

with open('src/components/HomeDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Routine, AppLanguage } from '../types';", "import { Routine, AppLanguage } from '../types';\nimport { useLiveSettings } from '../lib/useLiveSettings';")

# Find the start of HomeDashboard component
content = content.replace(
    "export function HomeDashboard({",
    "export function HomeDashboard({\n  currentUser,"
) # Oops wait, better to use regex.

with open('src/components/HomeDashboard.tsx', 'w') as f:
    f.write(content)
