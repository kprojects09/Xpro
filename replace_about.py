import re

with open('src/components/AboutUs.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';", "import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';\nimport { useLiveSettings } from '../lib/useLiveSettings';")

# replace useEffect
content = re.sub(
    r'  useEffect\(\(\) => \{.*?\n  \}, \[\]\);',
    r'''  const { appSettings } = useLiveSettings();
  
  useEffect(() => {
    setData(prev => ({ ...prev, ...appSettings }));
    setEditData(prev => ({ ...prev, ...appSettings }));
  }, [appSettings]);''',
    content,
    flags=re.DOTALL
)

# replace handleSave
content = content.replace(
    "await setDoc(doc(db, 'settings', 'about'), editData);",
    "await setDoc(doc(db, 'settings', 'about'), editData, { merge: true });\n      await setDoc(doc(db, 'settings', 'app'), editData, { merge: true });"
)

with open('src/components/AboutUs.tsx', 'w') as f:
    f.write(content)
