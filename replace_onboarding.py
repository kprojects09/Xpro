import re

with open('src/components/OnboardingForm.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { SearchableSelect } from './SearchableSelect';", "import { SearchableSelect } from './SearchableSelect';\nimport { useLiveSettings } from '../lib/useLiveSettings';")

content = content.replace(
    "  const { states, getDistrictsForState, getBlocksForDistrict, getSchoolsForBlock, loading: locationsLoading } = useLocationData();",
    "  const { states, getDistrictsForState, getBlocksForDistrict, getSchoolsForBlock, loading: locationsLoading } = useLocationData();\n  const { appSettings } = useLiveSettings();"
)

content = content.replace("Welcome to Sweety AI", "Welcome to {appSettings.appName}")

with open('src/components/OnboardingForm.tsx', 'w') as f:
    f.write(content)
