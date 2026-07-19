import re

with open('src/components/Settings.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { SearchableSelect } from './SearchableSelect';", "import { SearchableSelect } from './SearchableSelect';\nimport { useLiveSettings } from '../lib/useLiveSettings';")

content = content.replace(
    "export function Settings({ ",
    "export function Settings({ \n"
)

content = re.sub(
    r'export function Settings\(\{\n(.*?)\}: UserProfileSettingsProps\) \{',
    r'export function Settings({\n\g<1>}: UserProfileSettingsProps) {\n  const { appSettings } = useLiveSettings();',
    content,
    flags=re.DOTALL
)

with open('src/components/Settings.tsx', 'w') as f:
    f.write(content)
