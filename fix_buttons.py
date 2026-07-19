import re

with open('src/components/FriendsPage.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "onClick={() => handleCancel(user.id)}",
    "onClick={(e) => { e.stopPropagation(); handleCancel(user.id); }}"
)

content = content.replace(
    "onClick={() => handleSendFriendRequest(user.id)}",
    "onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(user.id); }}"
)

content = content.replace(
    "onClick={() => handleFollowAction(user.id, isFollowing)}",
    "onClick={(e) => { e.stopPropagation(); handleFollowAction(user.id, isFollowing); }}"
)

content = content.replace(
    "onClick={() => {\\n                                      const req = incomingRequests.find(r => r.senderId === user.id);\\n                                      if (req) handleAccept(req.id, user.id);\\n                                    }}",
    "onClick={(e) => { e.stopPropagation(); const req = incomingRequests.find(r => r.senderId === user.id); if (req) handleAccept(req.id, user.id); }}"
)

content = content.replace(
    "onClick={() => handleAccept(req.id, req.sender.id)}",
    "onClick={(e) => { e.stopPropagation(); handleAccept(req.id, req.sender.id); }}"
)

content = content.replace(
    "onClick={() => handleReject(req.id)}",
    "onClick={(e) => { e.stopPropagation(); handleReject(req.id); }}"
)

with open('src/components/FriendsPage.tsx', 'w') as f:
    f.write(content)

