import re

with open('src/lib/firebaseHelpers.ts', 'r') as f:
    content = f.read()

old_block1 = """  // Update both users' friends array
  await updateDoc(doc(db, 'users', senderId), {
    friends: arrayUnion(receiverId)
  });
  await updateDoc(doc(db, 'users', receiverId), {
    friends: arrayUnion(senderId)
  });"""

new_block1 = """"""

old_block2 = """  // Update both users' friends array
  const { arrayRemove } = await import('firebase/firestore');
  await updateDoc(doc(db, 'users', userId1), {
    friends: arrayRemove(userId2)
  });
  await updateDoc(doc(db, 'users', userId2), {
    friends: arrayRemove(userId1)
  });"""

new_block2 = """"""

content = content.replace(old_block1, new_block1).replace(old_block2, new_block2)

with open('src/lib/firebaseHelpers.ts', 'w') as f:
    f.write(content)
