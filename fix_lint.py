import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

# Fix isIncoming used before declaration
content = content.replace("if (activeCall?.status === 'ringing' && isIncoming) {", "const incoming = activeCall?.receiverId === auth.currentUser?.uid && activeCall?.status === 'ringing';\n    if (activeCall?.status === 'ringing' && incoming) {")
content = content.replace("}, [activeCall?.status, isIncoming]);", "}, [activeCall?.status, activeCall?.receiverId]);")

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)

with open('src/components/UserProfileModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("acceptFriendRequest, rejectFriendRequest, unfriend } from '../lib/firebaseHelpers';", "acceptFriendRequest, rejectFriendRequest, unfriend, createCall } from '../lib/firebaseHelpers';")

with open('src/components/UserProfileModal.tsx', 'w') as f:
    f.write(content)

