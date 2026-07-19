import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

# Add ref for ringtone audio
content = content.replace("const callInstance = useRef<any>(null);", "const callInstance = useRef<any>(null);\n  const ringtoneRef = useRef<HTMLAudioElement | null>(null);")

# Start/stop ringtone
effect = """
  useEffect(() => {
    if (activeCall?.status === 'ringing' && isIncoming) {
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
  }, [activeCall?.status, isIncoming]);
"""

content = content.replace("const cleanupCall = () => {", effect + "\n  const cleanupCall = () => {")

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)
