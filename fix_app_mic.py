import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { PermissionPromptUI } from './components/PermissionPromptUI';", "import { PermissionPromptUI } from './components/PermissionPromptUI';\nimport { permissionManager } from './lib/permissionManager';")

# Remove auto mic request
old_auto_req = """  // Request microphone permission immediately on load
  useEffect(() => {
    const requestMicrophonePermissionOnLoad = async () => {
      try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        // Release tracks immediately so the microphone indicator doesn't stay on until the session begins
        initialStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn("Initial microphone permission request on load failed or dismissed:", err);
      }
    };
    requestMicrophonePermissionOnLoad();
  }, []);"""

content = content.replace(old_auto_req, "")

# Add permissionManager to startSweety
old_start = """  const startSweety = async () => {
    try {
      setError(null);
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      await initAudio();
      
      const micPermission = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });"""

new_start = """  const startSweety = async () => {
    try {
      setError(null);
      const p = await permissionManager.requestPermission('microphone', 'Microphone Access', 'Sweety needs microphone access to interact with you via voice.');
      if (!p) {
        addSystemLog('[SECURITY] Microphone access denied.');
        return;
      }

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      await initAudio();
      
      const micPermission = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });"""

content = content.replace(old_start, new_start)

with open('src/App.tsx', 'w') as f:
    f.write(content)
