import re

with open('firestore.rules', 'r') as f:
    content = f.read()

old_block = """      match /messages/{messageId} {
        allow read: if isAdmin() || (isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants);
        allow create: if isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow update, delete: if isAdmin() || (isSignedIn() && request.auth.uid == resource.data.senderId);
      }"""

new_block = """      match /messages/{messageId} {
        allow read: if isAdmin() || (isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants);
        allow create: if isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow update: if isAdmin() || (isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants);
        allow delete: if isAdmin() || (isSignedIn() && request.auth.uid == resource.data.senderId);
      }"""

content = content.replace(old_block, new_block)

with open('firestore.rules', 'w') as f:
    f.write(content)
