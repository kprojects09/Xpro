import re

with open('src/components/LiveMessaging.tsx', 'r') as f:
    content = f.read()

old_block = """    // Get conversation data
    const convRef = doc(db, 'conversations', activeConvId);
    const unsubConv = onSnapshot(convRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveConv({ id: snap.id, ...data });

        // Listen to active peer's presence (REAL-TIME!)
        const peerId = data.participants.find((p: string) => p !== currentUser.uid);
        if (peerId) {
          const peerRef = doc(db, 'users', peerId);
          const unsubPeer = onSnapshot(peerRef, (peerSnap) => {
            if (peerSnap.exists()) {
              setPeerPresence({ id: peerSnap.id, ...peerSnap.data() });
            }
          }, (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${peerId} (presence)`);
          });
          return () => unsubPeer();
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `conversations/${activeConvId}`);
    });"""

new_block = """    let unsubPeer: (() => void) | null = null;
    let currentPeerId: string | null = null;

    // Get conversation data
    const convRef = doc(db, 'conversations', activeConvId);
    const unsubConv = onSnapshot(convRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveConv({ id: snap.id, ...data });

        // Listen to active peer's presence (REAL-TIME!)
        const peerId = data.participants.find((p: string) => p !== currentUser.uid);
        if (peerId && peerId !== currentPeerId) {
          if (unsubPeer) unsubPeer();
          currentPeerId = peerId;
          const peerRef = doc(db, 'users', peerId);
          unsubPeer = onSnapshot(peerRef, (peerSnap) => {
            if (peerSnap.exists()) {
              setPeerPresence({ id: peerSnap.id, ...peerSnap.data() });
            }
          }, (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${peerId} (presence)`);
          });
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `conversations/${activeConvId}`);
    });"""

content = content.replace(old_block, new_block)

return_block = """    return () => {
      unsubConv();
      unsubMsgs();
      if (activeConvId) {
        setMessages([]);
      }
    };"""

new_return_block = """    return () => {
      unsubConv();
      if (unsubPeer) unsubPeer();
      unsubMsgs();
      if (activeConvId) {
        setMessages([]);
      }
    };"""

content = content.replace(return_block, new_return_block)

with open('src/components/LiveMessaging.tsx', 'w') as f:
    f.write(content)
