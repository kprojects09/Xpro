import re

with open('src/components/PremiumUpgradeModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("import confetti from 'canvas-confetti';", "import confetti from 'canvas-confetti';\nimport { useLiveSettings } from '../lib/useLiveSettings';")

content = content.replace("export function PremiumUpgradeModal({ onClose, userProfile, currentUser, message }: PremiumUpgradeModalProps) {", "export function PremiumUpgradeModal({ onClose, userProfile, currentUser, message }: PremiumUpgradeModalProps) {\n  const { appSettings } = useLiveSettings();")

content = content.replace("Sweety Premium", "{appSettings.appName} Premium")

with open('src/components/PremiumUpgradeModal.tsx', 'w') as f:
    f.write(content)
