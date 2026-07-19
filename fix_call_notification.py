import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

old_effect = """  useEffect(() => {
    const incoming = activeCall?.receiverId === auth.currentUser?.uid && activeCall?.status === 'ringing';
    if (activeCall?.status === 'ringing' && incoming) {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('https://www.soundjay.com/phone/telephone-ring-04.mp3');
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(e => console.log('Audio play failed', e));
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    }
  }, [activeCall?.status, activeCall?.receiverId]);"""

new_effect = """  useEffect(() => {
    const incoming = activeCall?.receiverId === auth.currentUser?.uid && activeCall?.status === 'ringing';
    if (activeCall?.status === 'ringing' && incoming) {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('https://www.soundjay.com/phone/telephone-ring-04.mp3');
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(e => console.log('Audio play failed', e));
      
      if ('Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification(`Incoming ${activeCall.type} call from ${peerProfile?.fullName || 'someone'}`, {
          body: 'Click to answer or decline.',
          icon: '/sweety-logo.png' // Or peer profile avatar
        });
        notif.onclick = () => {
          window.focus();
        };
      }
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    }
  }, [activeCall?.status, activeCall?.receiverId, peerProfile]);"""

content = content.replace(old_effect, new_effect)

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)
