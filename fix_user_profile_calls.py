import re

with open('src/components/UserProfileModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { MessageSquare, Clock, CheckCircle, UserCheck, UserPlus, Phone, Video, Ban, AlertTriangle, Check, Shield, UserMinus } from 'lucide-react';", "import { MessageSquare, Clock, CheckCircle, UserCheck, UserPlus, Phone, Video, Ban, AlertTriangle, Check, Shield, UserMinus } from 'lucide-react';\nimport { createCall, sendNotification } from '../lib/firebaseHelpers';")

old_voice = """                          <button
                            className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-white"
                          >
                            <Phone size={14} className="text-emerald-400" />
                            Voice
                          </button>"""

new_voice = """                          <button
                            onClick={async () => {
                              if (!currentUser || !profile) return;
                              onClose();
                              await createCall(currentUser.uid, profile.id, 'voice');
                              await sendNotification(profile.id, 'call', `${currentUser.displayName || 'Someone'} is calling you...`);
                            }}
                            disabled={isBlocked || !currentUser}
                            className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-white"
                          >
                            <Phone size={14} className="text-emerald-400" />
                            Voice
                          </button>"""

old_video = """                          <button
                            className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-white"
                          >
                            <Video size={14} className="text-purple-400" />
                            Video
                          </button>"""

new_video = """                          <button
                            onClick={async () => {
                              if (!currentUser || !profile) return;
                              onClose();
                              await createCall(currentUser.uid, profile.id, 'video');
                              await sendNotification(profile.id, 'call', `${currentUser.displayName || 'Someone'} is calling you...`);
                            }}
                            disabled={isBlocked || !currentUser}
                            className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-white"
                          >
                            <Video size={14} className="text-purple-400" />
                            Video
                          </button>"""

content = content.replace(old_voice, new_voice)
content = content.replace(old_video, new_video)

with open('src/components/UserProfileModal.tsx', 'w') as f:
    f.write(content)
