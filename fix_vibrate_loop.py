import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

content = content.replace("const notifiedCallIdRef = useRef<string | null>(null);", "const notifiedCallIdRef = useRef<string | null>(null);\n  const vibrateIntervalRef = useRef<any>(null);")

old_play = """      ringtoneRef.current.play().catch(e => console.log('Audio play failed', e));
      if ('vibrate' in navigator) navigator.vibrate([1000, 1000, 1000, 1000]);"""

new_play = """      ringtoneRef.current.play().catch(e => console.log('Audio play failed', e));
      if ('vibrate' in navigator) {
        navigator.vibrate([1000, 1000]);
        if (!vibrateIntervalRef.current) {
          vibrateIntervalRef.current = setInterval(() => {
            navigator.vibrate([1000, 1000]);
          }, 2000);
        }
      }"""

old_pause = """      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      if ('vibrate' in navigator) navigator.vibrate(0);"""

new_pause = """      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      if (vibrateIntervalRef.current) {
        clearInterval(vibrateIntervalRef.current);
        vibrateIntervalRef.current = null;
      }
      if ('vibrate' in navigator) navigator.vibrate(0);"""

content = content.replace(old_play, new_play)
content = content.replace(old_pause, new_pause)

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)
