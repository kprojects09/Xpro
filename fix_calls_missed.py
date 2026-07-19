import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

old_block = """  const handleEnd = async () => {
    if (!activeCall) return;
    await updateCallStatus(activeCall.id, 'ended');
    cleanupCall();
  };"""

new_block = """  const handleEnd = async () => {
    if (!activeCall) return;
    if (activeCall.status === 'ringing' && activeCall.callerId === auth.currentUser?.uid) {
       // caller hung up before it was accepted
       import('../lib/firebaseHelpers').then(({ sendNotification }) => {
          sendNotification(activeCall.receiverId, 'missed_call', `Missed ${activeCall.type} call`, 'Missed Call');
       });
    }
    await updateCallStatus(activeCall.id, 'ended');
    cleanupCall();
  };"""

content = content.replace(old_block, new_block)

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)
