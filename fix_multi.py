import re

with open('src/components/FriendsPage.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'onClick=\{\(\) => \{\s*const req = incomingRequests\.find\(r => r\.senderId === user\.id\);\s*if \(req\) handleAccept\(req\.id, user\.id\);\s*\}\}',
    r'onClick={(e) => { e.stopPropagation(); const req = incomingRequests.find(r => r.senderId === user.id); if (req) handleAccept(req.id, user.id); }}',
    content
)

with open('src/components/FriendsPage.tsx', 'w') as f:
    f.write(content)
