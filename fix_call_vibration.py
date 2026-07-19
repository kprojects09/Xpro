import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

old_play = "ringtoneRef.current.play().catch(e => console.log('Audio play failed', e));"
new_play = "ringtoneRef.current.play().catch(e => console.log('Audio play failed', e));\n      if ('vibrate' in navigator) navigator.vibrate([1000, 1000, 1000, 1000]);"

old_pause = """      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }"""
new_pause = """      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      if ('vibrate' in navigator) navigator.vibrate(0);"""

content = content.replace(old_play, new_play)
content = content.replace(old_pause, new_pause)

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)
