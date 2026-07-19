import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

old_block = """  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen for incoming calls
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', auth.currentUser.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && !activeCall) {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setActiveCall(callData);
      }
    });

    // Listen for outgoing calls
    const qOutgoing = query(
      collection(db, 'calls'),
      where('callerId', '==', auth.currentUser.uid),
      where('status', 'in', ['ringing', 'accepted'])
    );

    const unsubscribeOutgoing = onSnapshot(qOutgoing, (snapshot) => {
      if (!snapshot.empty) {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
        setActiveCall(callData);
        
        if (callData.status === 'ended' || callData.status === 'rejected') {
          cleanupCall();
        } else if (callData.status === 'accepted' && peerInstance.current && !callInstance.current) {
          // Outgoing call got accepted, establish WebRTC connection
          startWebRTCConnection(callData);
        }
      } else {
        cleanupCall();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeOutgoing();
    };
  }, [activeCall]);"""

new_block = """  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const q = query(collection(db, 'calls'), where('receiverId', '==', uid));
    const qOutgoing = query(collection(db, 'calls'), where('callerId', '==', uid));

    const handleCallUpdate = (callData: any) => {
      if (callData.status === 'ringing' || callData.status === 'accepted') {
        setActiveCall(callData);
        if (callData.status === 'accepted' && callData.callerId === uid && peerInstance.current && !callInstance.current) {
          startWebRTCConnection(callData);
        }
      } else {
        cleanupCall();
      }
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const active = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).find((c: any) => c.status === 'ringing' || c.status === 'accepted');
      if (active) handleCallUpdate(active);
      else setActiveCall(prev => (prev && prev.receiverId === uid) ? null : prev);
    });

    const unsubscribeOutgoing = onSnapshot(qOutgoing, (snapshot) => {
      const active = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).find((c: any) => c.status === 'ringing' || c.status === 'accepted');
      if (active) handleCallUpdate(active);
      else setActiveCall(prev => (prev && prev.callerId === uid) ? null : prev);
    });

    return () => {
      unsubscribe();
      unsubscribeOutgoing();
    };
  }, []);"""

content = content.replace(old_block, new_block)

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)
