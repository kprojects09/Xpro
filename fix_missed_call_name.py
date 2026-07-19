import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

content = content.replace("sendNotification(activeCall.receiverId, 'missed_call', `Missed ${activeCall.type} call`, 'Missed Call');", "sendNotification(activeCall.receiverId, 'missed_call', `You missed a ${activeCall.type} call from ${peerProfile?.fullName || peerProfile?.displayName || 'a user'}.`, 'Missed Call');")

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)
