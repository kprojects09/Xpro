import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Phone, PhoneOff, Video, Camera, CameraOff, Mic, MicOff, User } from 'lucide-react';", "import { Phone, PhoneOff, Video, Camera, CameraOff, Mic, MicOff, User } from 'lucide-react';\nimport { permissionManager } from '../lib/permissionManager';")

old_get_media = """  const getMediaStream = async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { facingMode: 'user' } : false,
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get media stream:', err);
      return null;
    }
  };"""

new_get_media = """  const getMediaStream = async (type: 'audio' | 'video') => {
    try {
      const p1 = await permissionManager.requestPermission('microphone', 'Microphone Access', 'Sweety needs microphone access so you can speak during the call.');
      if (!p1) return null;
      if (type === 'video') {
        const p2 = await permissionManager.requestPermission('camera', 'Camera Access', 'Sweety needs camera access for video calls.');
        if (!p2) return null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { facingMode: 'user' } : false,
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get media stream:', err);
      return null;
    }
  };"""

content = content.replace(old_get_media, new_get_media)

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)
