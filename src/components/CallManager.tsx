import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, X, Mic, MicOff, Speaker, Camera, CameraOff, PhoneOff, Signal, RefreshCw } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { updateCallStatus } from '../lib/firebaseHelpers';
import Peer from 'peerjs';

export function CallManager() {
  const [activeCall, setActiveCall] = useState<any>(null);
  const [peerProfile, setPeerProfile] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const peerInstance = useRef<Peer | null>(null);
  const callInstance = useRef<any>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const notifiedCallIdRef = useRef<string | null>(null);
  const vibrateIntervalRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Initialize PeerJS
    const peer = new Peer(auth.currentUser.uid, {
      debug: 1,
    });
    
    peer.on('open', (id) => {
      console.log('PeerJS connected with ID:', id);
    });

    peer.on('call', (call) => {
      // Received an incoming WebRTC call
      callInstance.current = call;
      call.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });
      call.on('close', () => {
        handleEnd();
      });
    });

    peerInstance.current = peer;

    return () => {
      peer.destroy();
    };
  }, [auth.currentUser]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream, activeCall?.status]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    let interval: any;
    if (activeCall?.status === 'accepted') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  
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

  
  useEffect(() => {
    const incoming = activeCall?.receiverId === auth.currentUser?.uid && activeCall?.status === 'ringing';
    if (activeCall?.status === 'ringing' && incoming) {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('https://www.soundjay.com/phone/telephone-ring-04.mp3');
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(e => console.log('Audio play failed', e));
      if ('vibrate' in navigator) {
        navigator.vibrate([1000, 1000]);
        if (!vibrateIntervalRef.current) {
          vibrateIntervalRef.current = setInterval(() => {
            navigator.vibrate([1000, 1000]);
          }, 2000);
        }
      }
      
      if ('Notification' in window && Notification.permission === 'granted' && notifiedCallIdRef.current !== activeCall.id && peerProfile) {
        notifiedCallIdRef.current = activeCall.id;
        const notif = new Notification(`Incoming ${activeCall.type} call from ${peerProfile?.fullName || 'someone'}`, {
          body: 'Click to answer or decline.',
          icon: peerProfile?.customAvatarUrl || '/sweety-logo.png'
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
      if (vibrateIntervalRef.current) {
        clearInterval(vibrateIntervalRef.current);
        vibrateIntervalRef.current = null;
      }
      if ('vibrate' in navigator) navigator.vibrate(0);
      if (activeCall?.status !== 'ringing') {
        notifiedCallIdRef.current = null;
      }
    }
  }, [activeCall?.status, activeCall?.receiverId, peerProfile, activeCall?.id]);

  const cleanupCall = () => {
    setActiveCall(null);
    setDuration(0);
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    if (callInstance.current) {
      callInstance.current.close();
      callInstance.current = null;
    }
  };

  const getMediaStream = async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { facingMode: 'user' } : false,
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get media permissions', err);
      return null;
    }
  };

  const startWebRTCConnection = async (callData: any) => {
    const stream = localStream || await getMediaStream(callData.type);
    if (!stream || !peerInstance.current) return;
    
    // Call the receiver's Peer ID
    const call = peerInstance.current.call(callData.receiverId, stream);
    callInstance.current = call;
    
    call.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream);
    });
    call.on('close', () => {
      handleEnd();
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = async () => {
    if (!activeCall) return;
    
    const stream = await getMediaStream(activeCall.type);
    if (stream && callInstance.current) {
      callInstance.current.answer(stream);
    }
    
    await updateCallStatus(activeCall.id, 'accepted');
  };

  const handleReject = async () => {
    if (!activeCall) return;
    await updateCallStatus(activeCall.id, 'rejected');
    cleanupCall();
  };

  const handleEnd = async () => {
    if (!activeCall) return;
    if (activeCall.status === 'ringing' && activeCall.callerId === auth.currentUser?.uid) {
       // caller hung up before it was accepted
       import('../lib/firebaseHelpers').then(({ sendNotification }) => {
          sendNotification(activeCall.receiverId, 'missed_call', `You missed a ${activeCall.type} call from ${peerProfile?.fullName || peerProfile?.displayName || 'a user'}.`, 'Missed Call');
       });
    }
    await updateCallStatus(activeCall.id, 'ended');
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!localStream.getVideoTracks()[0]?.enabled);
    }
  };

  if (!activeCall) return null;

  const isIncoming = activeCall.receiverId === auth.currentUser?.uid && activeCall.status === 'ringing';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
      >
        <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6">
          
          <div className="flex flex-col items-center mb-6">
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
            <p className="text-gray-400 text-sm">
              {activeCall.status === 'ringing' ? (isIncoming ? 'Incoming call...' : 'Calling...') : `In Call - ${formatDuration(duration)}`}
            </p>
          </div>

          {activeCall.status === 'accepted' && (
            <div className="relative w-full bg-black/40 rounded-2xl aspect-video mb-6 flex items-center justify-center border border-white/5 overflow-hidden">
               {activeCall.type === 'video' ? (
                 <>
                   {remoteStream ? (
                     <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                   ) : (
                     <div className="flex flex-col items-center gap-2 text-gray-500 text-xs">
                       <RefreshCw size={24} className="animate-spin" />
                       Connecting video...
                     </div>
                   )}
                   {/* PiP Local Video */}
                   <div className="absolute bottom-4 right-4 w-24 sm:w-32 aspect-video bg-black rounded-lg overflow-hidden border border-white/20 shadow-lg">
                     {localStream && !isCameraOff ? (
                       <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center bg-gray-800">
                         <CameraOff size={16} className="text-gray-500" />
                       </div>
                     )}
                   </div>
                 </>
               ) : (
                 <div className="flex flex-col items-center gap-4">
                   <div className="flex gap-1 items-end h-8">
                      {[1,2,3,4,5].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ height: [8, 24, 8] }}
                          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                          className="w-1 bg-indigo-500 rounded-full"
                        />
                      ))}
                   </div>
                   <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
                     <Signal size={12} /> Stable Connection
                   </div>
                 </div>
               )}
            </div>
          )}

          <div className="flex justify-center items-center gap-6 mt-auto">
            {isIncoming && activeCall.status === 'ringing' ? (
              <>
                <button onClick={handleReject} className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg">
                  <PhoneOff size={24} />
                </button>
                <button onClick={handleAccept} className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg animate-pulse">
                  <Phone size={24} />
                </button>
              </>
            ) : (
              <>
                <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                {activeCall.type === 'video' && (
                  <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-rose-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                    {isCameraOff ? <CameraOff size={20} /> : <Camera size={20} />}
                  </button>
                )}
                <button onClick={handleEnd} className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg">
                  <PhoneOff size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
