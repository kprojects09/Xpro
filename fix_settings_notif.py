import re

with open('src/components/Settings.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { doc, setDoc, getDoc, updateDoc", "import { doc, setDoc, getDoc, updateDoc")
content = content.replace("import { syncUserProfile } from '../lib/profileSync';", "import { syncUserProfile } from '../lib/profileSync';\nimport { permissionManager } from '../lib/permissionManager';")

old_btn = """              <button 
                onClick={() => 'Notification' in window && Notification.requestPermission()}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold"
              >
                Allow
              </button>"""

new_btn = """              <button 
                onClick={() => permissionManager.requestPermission('notifications', 'Push Notifications', 'Sweety will send you alerts for missed calls, friend requests, and study reminders.')}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold"
              >
                Allow
              </button>"""

content = content.replace(old_btn, new_btn)

with open('src/components/Settings.tsx', 'w') as f:
    f.write(content)
