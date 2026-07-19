import re

with open('src/components/LiveMessaging.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { createCall, addReaction, handleFirestoreError, OperationType } from '../lib/firebaseHelpers';", "import { createCall, addReaction, handleFirestoreError, OperationType } from '../lib/firebaseHelpers';\nimport { permissionManager } from '../lib/permissionManager';")

old_start_voice = """  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };"""

new_start_voice = """  const startVoiceRecording = async () => {
    try {
      const p = await permissionManager.requestPermission('microphone', 'Microphone Access', 'Sweety needs microphone access to record voice messages.');
      if (!p) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };"""

content = content.replace(old_start_voice, new_start_voice)

with open('src/components/LiveMessaging.tsx', 'w') as f:
    f.write(content)
