import re

with open('src/lib/firebaseHelpers.ts', 'r') as f:
    content = f.read()

old_block = """export const updateCallStatus = async (callId: string, status: 'accepted' | 'rejected' | 'ended') => {
  await setDoc(doc(db, 'calls', callId), { status, endedAt: status === 'ended' ? serverTimestamp() : null }, { merge: true });
};"""

new_block = """export const updateCallStatus = async (callId: string, status: 'accepted' | 'rejected' | 'ended') => {
  await updateDoc(doc(db, 'calls', callId), { status, endedAt: status === 'ended' ? serverTimestamp() : null });
};"""

content = content.replace(old_block, new_block)

with open('src/lib/firebaseHelpers.ts', 'w') as f:
    f.write(content)
