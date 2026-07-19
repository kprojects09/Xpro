import re

with open('src/components/CallManager.tsx', 'r') as f:
    content = f.read()

# Add state for peerProfile
content = content.replace("const [activeCall, setActiveCall] = useState<any>(null);", "const [activeCall, setActiveCall] = useState<any>(null);\n  const [peerProfile, setPeerProfile] = useState<any>(null);")

# Fetch peer profile when activeCall is set
effect = """
  useEffect(() => {
    if (activeCall && auth.currentUser) {
      const peerId = activeCall.callerId === auth.currentUser.uid ? activeCall.receiverId : activeCall.callerId;
      import('firebase/firestore').then(({ getDoc, doc }) => {
         getDoc(doc(db, 'users', peerId)).then(snap => {
           if (snap.exists()) {
             setPeerProfile(snap.data());
           }
         });
      });
    } else {
      setPeerProfile(null);
    }
  }, [activeCall?.id]);
"""
content = content.replace("const cleanupCall = () => {", effect + "\n  const cleanupCall = () => {")

# Update UI
ui_old = """          <div className="flex flex-col items-center mb-6">
            {!remoteStream && (
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 relative">
                {activeCall.type === 'video' ? <Video size={32} className="text-indigo-400" /> : <Phone size={32} className="text-indigo-400" />}
                {activeCall.status === 'ringing' && (
                  <span className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping" />
                )}
              </div>
            )}
            <h2 className="text-xl font-black text-white">
              {activeCall.type === 'video' ? 'Video Call' : 'Voice Call'}
            </h2>
            <p className="text-sm text-gray-400">
              {activeCall.status === 'ringing' && isIncoming ? 'Incoming...' : 
               activeCall.status === 'ringing' ? 'Calling...' : 
               formatDuration(duration)}
            </p>
          </div>"""

ui_new = """          <div className="flex flex-col items-center mb-6">
            {!remoteStream && (
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-indigo-500 flex items-center justify-center mb-4 relative overflow-hidden">
                {peerProfile?.customAvatarUrl ? (
                  <img src={peerProfile.customAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-indigo-400" />
                )}
                {activeCall.status === 'ringing' && (
                  <span className="absolute inset-0 rounded-full border-4 border-indigo-500 animate-ping" />
                )}
              </div>
            )}
            <h2 className="text-2xl font-black text-white">
              {peerProfile?.fullName || peerProfile?.displayName || 'Scholar'}
            </h2>
            <p className="text-sm text-indigo-300 font-bold mb-2">
              @{peerProfile?.username || 'user'}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold px-3 py-1 bg-white/10 rounded-full">
              {activeCall.type === 'video' ? <Video size={14} className="text-purple-400" /> : <Phone size={14} className="text-emerald-400" />}
              {activeCall.type === 'video' ? 'Video Call' : 'Voice Call'}
            </div>
            <p className="text-sm text-gray-400 mt-3">
              {activeCall.status === 'ringing' && isIncoming ? 'Incoming call...' : 
               activeCall.status === 'ringing' ? 'Calling...' : 
               formatDuration(duration)}
            </p>
          </div>"""

content = content.replace(ui_old, ui_new)
content = content.replace("import { Phone, PhoneOff, Video, Camera, CameraOff, Mic, MicOff } from 'lucide-react';", "import { Phone, PhoneOff, Video, Camera, CameraOff, Mic, MicOff, User } from 'lucide-react';")

with open('src/components/CallManager.tsx', 'w') as f:
    f.write(content)
