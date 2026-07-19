import re

with open('src/components/StudyRoutine.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Trash2, Edit2, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, Circle, MoreVertical, X, CalendarDays, GripVertical, AlertTriangle } from 'lucide-react';", "import { Trash2, Edit2, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, Circle, MoreVertical, X, CalendarDays, GripVertical, AlertTriangle } from 'lucide-react';\nimport { permissionManager } from '../lib/permissionManager';")

old_eff = """    // Check Notification Permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }"""

new_eff = """    // Check Notification Permissions
    if ('Notification' in window && Notification.permission === 'default') {
      permissionManager.requestPermission('notifications', 'Push Notifications', 'Sweety needs notification access to remind you about your upcoming study routines.');
    }"""

content = content.replace(old_eff, new_eff)

with open('src/components/StudyRoutine.tsx', 'w') as f:
    f.write(content)
