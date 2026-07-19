import { getApiUrl } from "../lib/apiConfig";
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, doc, getDoc, setDoc, updateDoc, addDoc, onSnapshot, query, where, 
  orderBy, limit as limitDoc, getDocs, Timestamp, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  MessageSquare, Send, Image as ImageIcon, Paperclip, Mic, Smile, MoreVertical, 
  Copy, CornerUpRight, Trash, Edit3, X, ChevronLeft, Search, AlertTriangle, 
  Ban, Flag, Download, Play, Pause, Loader, User, Check, CheckCheck, Lock, 
  Info, ShieldAlert, ArrowLeft, Volume2, UserCheck, AlertCircle, CheckCircle, Smile as EmojiIcon,
  Phone, Video, Heart, ThumbsUp, Laugh, Frown, Angry, PartyPopper, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfileModal } from './UserProfileModal';
import { createCall, addReaction, handleFirestoreError, OperationType } from '../lib/firebaseHelpers';
import { permissionManager } from '../lib/permissionManager';

interface LiveMessagingProps {
  theme: any;
  currentUser: any;
  userProfile: any;
  setShowPremiumModal?: (show: boolean) => void;
  setPremiumModalMessage?: (msg: string) => void;
}

// Predefined quick emojis
const QUICK_EMOJIS = ['😊', '😂', '🔥', '👍', '❤️', '🙌', '✨', '😮', '😢', '🎉'];

export function LiveMessaging({ 
  theme, 
  currentUser, 
  userProfile,
  setShowPremiumModal,
  setPremiumModalMessage
}: LiveMessagingProps) {
  const isPremium = userProfile?.isPremium === true;
  // Navigation & Conversation States
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgLimit, setMsgLimit] = useState(30);
  const [hasMoreMsgs, setHasMoreMsgs] = useState(true);
  
  // Searching & Contacts
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [msgSearchTerm, setMsgSearchTerm] = useState('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);

  // Active User Presence cache
  const [peerPresence, setPeerPresence] = useState<any>(null);

  // Input & Message State
  const [inputMessage, setInputMessage] = useState('');
  const [replyToMsg, setReplyToMsg] = useState<any | null>(null);
  const [editingMsg, setEditingMsg] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [msgDropdownId, setMsgDropdownId] = useState<string | null>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recIntervalRef = useRef<any>(null);

  // Forward State
  const [forwardMsg, setForwardMsg] = useState<any | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);

  // Dialogs & Toasts
  const [reportData, setReportData] = useState<{ type: 'user' | 'message', id: string, content?: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [alertToast, setAlertToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Media Previews
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Audio note playback cache
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Cooldown / Anti-spam tracking
  const lastSendTimeRef = useRef<number>(0);

  // Version 3.7 - Public Profile and Requests states
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'requests'>('chats');
  const [requestSegment, setRequestSegment] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setAlertToast({ message, type });
    setTimeout(() => setAlertToast(null), 3000);
  };

  // --- CONNECTION & OFFLINE QUEUE STATES & METHODS ---
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`offline_msgs_${currentUser?.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const saveOfflineQueue = (newQueue: any[]) => {
    setOfflineQueue(newQueue);
    try {
      localStorage.setItem(`offline_msgs_${currentUser?.uid}`, JSON.stringify(newQueue));
    } catch (e) {
      console.error("Failed to write offline queue to localStorage:", e);
    }
  };

  const addAdminLog = async (action: string, errorDetails: string) => {
    const path = 'admin_connection_logs';
    try {
      await addDoc(collection(db, path), {
        userId: currentUser?.uid || 'anonymous',
        userEmail: currentUser?.email || 'unknown',
        action,
        errorDetails,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const flushOfflineQueue = async (currentQueue: any[]) => {
    if (currentQueue.length === 0 || !currentUser) return;
    
    // Create copy to work with
    const queueToFlush = [...currentQueue];
    await addAdminLog('flushing_offline_queue', `Restored connection. Flushing ${queueToFlush.length} queued messages.`);
    
    let updatedQueue = [...queueToFlush];
    
    for (const msg of queueToFlush) {
      try {
        const payload: any = {
          senderId: msg.senderId,
          content: msg.content,
          type: msg.type,
          timestamp: msg.timestamp || new Date().toISOString(),
          seenBy: msg.seenBy || [currentUser.uid],
          deletedFor: msg.deletedFor || []
        };
        
        if (msg.mediaUrl) payload.mediaUrl = msg.mediaUrl;
        if (msg.mediaName) payload.mediaName = msg.mediaName;
        if (msg.mediaSize) payload.mediaSize = msg.mediaSize;
        if (msg.replyTo) payload.replyTo = msg.replyTo;
        
        // Write message to Firestore
        const msgRef = doc(db, 'conversations', msg.convId, 'messages', msg.id);
        await setDoc(msgRef, payload);
        
        // Update unread count for peer
        const peerId = msg.peerId;
        const convRef = doc(db, 'conversations', msg.convId);
        const convSnap = await getDoc(convRef);
        
        let updatedUnreadCount: any = {};
        if (convSnap.exists()) {
          const convData = convSnap.data();
          updatedUnreadCount = { ...(convData.unreadCount || {}) };
        }
        updatedUnreadCount[peerId] = (updatedUnreadCount[peerId] || 0) + 1;
        
        // Parent conversation doc update
        const parentUpdate: any = {
          lastMessage: {
            id: msg.id,
            senderId: currentUser.uid,
            content: msg.type === 'text' ? msg.content : `[${msg.type.toUpperCase()}] ${msg.mediaName || ''}`,
            type: msg.type,
            timestamp: new Date().toISOString()
          },
          unreadCount: updatedUnreadCount,
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(convRef, parentUpdate);
        
        // Remove successfully sent message from queue
        updatedQueue = updatedQueue.filter(qMsg => qMsg.id !== msg.id);
        saveOfflineQueue(updatedQueue);
      } catch (err: any) {
        console.error(`Failed to flush offline message ${msg.id}:`, err);
        break;
      }
    }
    
    if (updatedQueue.length === 0) {
      showToast('All offline messages synchronized successfully!', 'success');
      await addAdminLog('flush_success', 'All queued offline messages have been successfully synchronized.');
    }
  };

  const checkConnectionAndConnect = async () => {
    if (!currentUser) return;
    
    if (!window.navigator.onLine) {
      setConnectionStatus('disconnected');
      setConnectionError('No Internet Connection');
      return;
    }
    
    // Default to connecting while verifying
    setConnectionStatus('connecting');
    setConnectionError(null);

    try {
      // Validate authentication token before establishing connection
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        setConnectionStatus('error');
        setConnectionError('Authentication Expired');
        await addAdminLog('auth_validation_failed', 'User authentication token was empty or expired.');
        return;
      }
      
      // Test active firestore capability to ensure server availability
      await getDoc(doc(db, 'users', currentUser.uid));
      
      // Flush offline messages if any exist
      const savedQueue = localStorage.getItem(`offline_msgs_${currentUser.uid}`);
      const parsedQueue = savedQueue ? JSON.parse(savedQueue) : [];
      if (parsedQueue.length > 0) {
        await flushOfflineQueue(parsedQueue);
      }

      setConnectionStatus('connected');
    } catch (err: any) {
      console.warn('Silent connection health check warning:', err);
      
      if (err.code === 'permission-denied') {
        setConnectionStatus('error');
        setConnectionError('Authentication Expired');
        await addAdminLog('connection_failed', `Auth check failed: ${err.message || err.toString()}`);
      } else if (err.code === 'unavailable' || !window.navigator.onLine) {
        setConnectionStatus('disconnected');
        setConnectionError('No Internet Connection');
      } else {
        // Keep as connected, just log the background warning
        await addAdminLog('connection_warning', `Background ping failed: ${err.message || err.toString()}`);
      }
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    checkConnectionAndConnect();

    const handleOnline = () => {
      checkConnectionAndConnect();
    };
    const handleOffline = () => {
      setConnectionStatus('disconnected');
      setConnectionError('No Internet Connection');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const reconnectInterval = setInterval(() => {
      if (connectionStatus !== 'connected') {
        checkConnectionAndConnect();
      }
    }, 12000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(reconnectInterval);
    };
  }, [currentUser]);

  // 1. Listen for active conversations
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const convList: any[] = snap.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data };
      });
      // Sort in-memory by updatedAt desc
      convList.sort((a, b) => {
        const tA = a.updatedAt ? (a.updatedAt.seconds ? a.updatedAt.seconds * 1000 : new Date(a.updatedAt).getTime()) : 0;
        const tB = b.updatedAt ? (b.updatedAt.seconds ? b.updatedAt.seconds * 1000 : new Date(b.updatedAt).getTime()) : 0;
        return tB - tA;
      });
      setConversations(convList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'conversations');
    });

    return () => unsub();
  }, [currentUser]);

  // 2. Listen for messages when active conversation shifts
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      setActiveConv(null);
      setPeerPresence(null);
      return;
    }

    let unsubPeer: (() => void) | null = null;
    let currentPeerId: string | null = null;

    // Get conversation data
    const convRef = doc(db, 'conversations', activeConvId);
    const unsubConv = onSnapshot(convRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveConv({ id: snap.id, ...data });

        // Listen to active peer's presence (REAL-TIME!)
        const peerId = data.participants.find((p: string) => p !== currentUser.uid);
        if (peerId && peerId !== currentPeerId) {
          if (unsubPeer) unsubPeer();
          currentPeerId = peerId;
          const peerRef = doc(db, 'users', peerId);
          unsubPeer = onSnapshot(peerRef, (peerSnap) => {
            if (peerSnap.exists()) {
              setPeerPresence({ id: peerSnap.id, ...peerSnap.data() });
            }
          }, (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${peerId} (presence)`);
          });
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `conversations/${activeConvId}`);
    });

    // Get messages
    const msgsQuery = query(
      collection(db, 'conversations', activeConvId, 'messages'),
      orderBy('timestamp', 'desc'),
      limitDoc(msgLimit)
    );

    const unsubMsgs = onSnapshot(msgsQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.reverse();
      
      // Merge with offline messages for this conversation
      const currentOffline = offlineQueue.filter((m: any) => m.convId === activeConvId);
      setMessages([...list, ...currentOffline]);
      setHasMoreMsgs(snap.docs.length === msgLimit);

      // Trigger automatic Mark As Seen
      markMessagesAsSeen(activeConvId, list);
    }, (err: any) => {
      handleFirestoreError(err, OperationType.LIST, `conversations/${activeConvId}/messages`);
      if (err.code === 'permission-denied') {
        showToast('Access denied to messages. Please refresh or try another chat.', 'error');
      }
    });

    return () => {
      unsubConv();
      unsubMsgs();
    };
  }, [activeConvId, msgLimit, offlineQueue]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConv?.typing]);

  // Manage Typing indicator state
  const handleTypingStatus = (typingState: boolean) => {
    if (!activeConvId || !currentUser || connectionStatus !== 'connected' || !window.navigator.onLine) return;
    updateDoc(doc(db, 'conversations', activeConvId), {
      [`typing.${currentUser.uid}`]: typingState
    }).catch(() => {});
  };

  const typingTimeoutRef = useRef<any>(null);
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    handleTypingStatus(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStatus(false);
    }, 2000);
  };

  // Mark all unread messages as seen
  const markMessagesAsSeen = async (convId: string, msgs: any[]) => {
    if (!currentUser || connectionStatus !== 'connected' || !window.navigator.onLine) return;
    try {
      // Find unseen messages sent by the peer
      const peerMsgs = msgs.filter(m => m.senderId !== currentUser.uid && (!m.seenBy || !m.seenBy.includes(currentUser.uid)));
      
      const batchPromises = peerMsgs.map(m => {
        return updateDoc(doc(db, 'conversations', convId, 'messages', m.id), {
          seenBy: arrayUnion(currentUser.uid)
        });
      });

      await Promise.all(batchPromises);

      // Reset conversation unread counter
      await updateDoc(doc(db, 'conversations', convId), {
        [`unreadCount.${currentUser.uid}`]: 0
      });
    } catch (err) {
      console.error('Failed to mark seen status:', err);
    }
  };

  // Start new chat with another user
  const startConversation = async (peer: any) => {
    if (!currentUser) {
      showToast('You must be signed in to message.', 'error');
      return;
    }
    if (!peer || !peer.id) {
      console.error('StartConversation: Peer or PeerID missing', peer);
      showToast('Invalid user selected.', 'error');
      return;
    }

    // Check Block Status
    if (userProfile?.blockedUsers?.includes(peer.id)) {
      alert("You have blocked this user. Please unblock them in settings to chat.");
      return;
    }
    if (peer.blockedUsers?.includes(currentUser.uid)) {
      alert("You cannot message this user.");
      return;
    }

    // Check privacy settings
    if (peer.privacyRequests === 'nobody') {
      alert("This user has disabled message requests from everyone.");
      return;
    }

    // Standard P2P key: sorted user IDs
    const convId = currentUser.uid < peer.id 
      ? `${currentUser.uid}_${peer.id}` 
      : `${peer.id}_${currentUser.uid}`;

    try {
      if (!window.navigator.onLine) {
        showToast('No Internet Connection. Please check your network.', 'error');
        return;
      }

      const convRef = doc(db, 'conversations', convId);
      const convSnap = await getDoc(convRef);

      if (convSnap.exists()) {
        const cData = convSnap.data();
        if (cData.requestStatus === 'rejected') {
          const cooldownUntil = cData.requestCooldownUntil;
          if (cooldownUntil && new Date() < new Date(cooldownUntil)) {
            const remTime = new Date(cooldownUntil).getTime() - Date.now();
            const remDays = Math.ceil(remTime / (1000 * 60 * 60 * 24));
            alert(`Your chat request was declined by the user. You can try again in ${remDays} days.`);
            return;
          } else {
            // Cooldown expired! Reset to pending
            await updateDoc(convRef, {
              requestStatus: 'pending',
              requestSenderId: currentUser.uid,
              requestReceiverId: peer.id,
              requestMessage: '',
              updatedAt: new Date().toISOString()
            });
          }
        }
      } else {
        const newConv = {
          participants: [currentUser.uid, peer.id],
          requestStatus: 'pending',
          requestSenderId: currentUser.uid,
          requestReceiverId: peer.id,
          requestMessage: '',
          participantDetails: {
            [currentUser.uid]: {
              fullName: userProfile?.fullName || userProfile?.displayName || 'Scholar',
              customAvatarUrl: userProfile?.customAvatarUrl || null,
              username: userProfile?.username || '',
              email: currentUser.email || ''
            },
            [peer.id]: {
              fullName: peer.fullName || peer.name || peer.displayName || 'User',
              customAvatarUrl: peer.customAvatarUrl || null,
              username: peer.username || '',
              email: peer.email || ''
            }
          },
          unreadCount: {
            [currentUser.uid]: 0,
            [peer.id]: 0
          },
          typing: {
            [currentUser.uid]: false,
            [peer.id]: false
          },
          recordingVoice: {
            [currentUser.uid]: false,
            [peer.id]: false
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(convRef, newConv);
      }

      setActiveConvId(convId);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      console.error('Failed to start conversation:', err);
      if (err.code === 'permission-denied') {
        showToast('Access Denied. Ensure you are signed in correctly. Please refresh.', 'error');
      } else if (err.code === 'unavailable') {
        showToast('Chat service unavailable. Retrying...', 'error');
      } else {
        showToast('Failed to connect to chat. Please try again.', 'error');
      }
    }
  };

  // Search users in Firestore
  const handleUserSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      
      let normalizedSearch = cleanQuery;
      if (normalizedSearch.startsWith('@')) {
        normalizedSearch = normalizedSearch.substring(1);
      }
      
      const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => {
          if (u.id === currentUser?.uid) return false;
          if (u.suspended === true || u.banned === true || u.deleted === true) return false;
          if (userProfile?.blockedUsers?.includes(u.id)) return false;
          if (u.blockedUsers?.includes(currentUser?.uid)) return false;

          const name = (u.fullName || u.displayName || u.name || '').toLowerCase();
          const usernameVal = (u.username || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          
          return name.includes(normalizedSearch) || usernameVal.includes(normalizedSearch) || email.includes(normalizedSearch);
        });

      setSearchResults(results);
    } catch (err) {
      console.error('Search users error:', err);
      showToast('Error searching users.', 'error');
    } finally {
      setSearchingUsers(false);
    }
  };

  // Instant typing search with debounce
  useEffect(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      handleUserSearch();
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentUser?.uid, userProfile?.blockedUsers]);

  // Media Attachment Upload
  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const p = await permissionManager.requestPermission('media', 'Photos and Media Access', 'Sweety needs access to your media so you can send attachments in chat.');
    if (!p) {
      e.target.value = '';
      return;
    }

    // Check size (20MB max limit)
    if (file.size > 20 * 1024 * 1024) {
      showToast('File size must be less than 20MB.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        
        // Upload to server Express API
        const response = await fetch(getApiUrl('/api/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            base64Data
          })
        });

        if (!response.ok) throw new Error('Upload failed');
        const fileInfo = await response.json();

        // Send message with uploaded media URL
        await sendMessage(
          mediaType === 'image' ? 'shared an image' : `shared a file: ${file.name}`,
          mediaType,
          fileInfo.url,
          file.name,
          file.size
        );
        showToast('Attachment shared successfully!', 'success');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Failed to upload file.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Voice Note Recording Flow
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlobObj = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(audioBlobObj);
        await uploadVoiceNote(audioBlobObj);
      };

      recorder.start();
      setIsRecording(true);
      setRecDuration(0);

      // Set recording presence
      if (activeConvId) {
        updateDoc(doc(db, 'conversations', activeConvId), {
          [`recordingVoice.${currentUser.uid}`]: true
        });
      }

      recIntervalRef.current = setInterval(() => {
        setRecDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone access denied:', err);
      showToast('Microphone access is required to record voice notes.', 'error');
    }
  };

  const stopVoiceRecording = (cancel = false) => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    clearInterval(recIntervalRef.current);
    setIsRecording(false);

    if (activeConvId) {
      updateDoc(doc(db, 'conversations', activeConvId), {
        [`recordingVoice.${currentUser.uid}`]: false
      });
    }

    if (cancel) {
      // Discard stream chunks
      mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
      setAudioBlob(null);
      showToast('Voice message discarded.', 'success');
    } else {
      mediaRecorderRef.current.stop();
    }
    
    // Stop tracks
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
  };

  const uploadVoiceNote = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        
        const response = await fetch(getApiUrl('/api/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `voice_note_${Date.now()}.webm`,
            mimeType: 'audio/webm',
            base64Data
          })
        });

        if (!response.ok) throw new Error('Voice note upload failed');
        const fileInfo = await response.json();

        await sendMessage('Sent a voice note 🎙️', 'voice', fileInfo.url, 'Voice Note', blob.size);
        showToast('Voice note shared!', 'success');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Voice upload failed:', err);
      showToast('Failed to share voice message.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Core Send Message Action
  const sendMessage = async (
    text: string, 
    type: 'text' | 'image' | 'voice' | 'file' = 'text', 
    mediaUrl?: string,
    mediaName?: string,
    mediaSize?: number
  ) => {
    if (!activeConvId || !currentUser) return;

    // Anti-Spam Check: maximum 3 messages per second
    const nowTime = Date.now();
    if (nowTime - lastSendTimeRef.current < 333 && type === 'text') {
      showToast('Sending too fast! Please pause a moment.', 'error');
      return;
    }
    lastSendTimeRef.current = nowTime;

    const trimmedMsg = text.trim();
    if (!trimmedMsg && !mediaUrl) return;

    // Check if peer has blocked current user
    const peerId = activeConv.participants.find((p: string) => p !== currentUser.uid);
    if (activeConv.blockedBy?.includes(peerId)) {
      showToast('You cannot message this user.', 'error');
      return;
    }

    // Version 3.7 - Message Request Check
    if (activeConv.requestStatus === 'pending') {
      if (activeConv.requestSenderId === currentUser.uid) {
        if (activeConv.requestMessage) {
          showToast('You can only send one message. Waiting for acceptance.', 'error');
          return;
        }
      } else if (activeConv.requestReceiverId === currentUser.uid) {
        showToast('Please accept the message request before replying.', 'error');
        return;
      }
    }

    // Premium limits check: free users are limited to 100 messages daily
    const isPremium = userProfile?.isPremium === true;
    if (!isPremium) {
      const todayStr = new Date().toISOString().split('T')[0];
      const liveMessageUsage = userProfile?.liveMessageUsage;
      const currentCount = (liveMessageUsage && liveMessageUsage.date === todayStr) ? (liveMessageUsage.count || 0) : 0;
      
      if (currentCount >= 100) {
        if (setPremiumModalMessage && setShowPremiumModal) {
          setPremiumModalMessage("You have reached today's free limit of 100 peer-to-peer messages. Upgrade to Premium for unlimited chat!");
          setShowPremiumModal(true);
        } else {
          showToast("You have reached today's limit of 100 free messages. Upgrade to Premium for unlimited chat!", 'error');
        }
        return;
      }
    }

    if (connectionStatus !== 'connected' || !window.navigator.onLine) {
      // Unsent offline message queueing
      const tempMsgId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const offlineMsg = {
        id: tempMsgId,
        convId: activeConvId,
        peerId,
        senderId: currentUser.uid,
        content: trimmedMsg,
        type,
        timestamp: new Date().toISOString(),
        seenBy: [currentUser.uid],
        deletedFor: [],
        isOffline: true,
        mediaUrl: mediaUrl || null,
        mediaName: mediaName || null,
        mediaSize: mediaSize || null,
        replyTo: replyToMsg ? {
          id: replyToMsg.id,
          senderId: replyToMsg.senderId,
          content: replyToMsg.content,
          type: replyToMsg.type
        } : null
      };

      const newQueue = [...offlineQueue, offlineMsg];
      saveOfflineQueue(newQueue);

      // Reset Inputs locally
      if (type === 'text') setInputMessage('');
      setReplyToMsg(null);
      handleTypingStatus(false);
      
      showToast('No Internet Connection. Message queued for automatic delivery.', 'error');
      return;
    }

    try {
      if (!activeConv || !activeConv.participants) {
        console.error('Active conversation data missing');
        showToast('Chat data is still loading. Please wait.', 'error');
        return;
      }

      const messagesRef = collection(db, 'conversations', activeConvId, 'messages');
      const msgId = doc(messagesRef).id;

      const payload: any = {
        senderId: currentUser.uid,
        content: trimmedMsg,
        type,
        timestamp: new Date().toISOString(),
        seenBy: [currentUser.uid],
        deletedFor: []
      };

      if (mediaUrl) payload.mediaUrl = mediaUrl;
      if (mediaName) payload.mediaName = mediaName;
      if (mediaSize) payload.mediaSize = mediaSize;
      if (replyToMsg) {
        payload.replyTo = {
          id: replyToMsg.id,
          senderId: replyToMsg.senderId,
          content: replyToMsg.content,
          type: replyToMsg.type
        };
      }

      // Add to Firestore
      await setDoc(doc(db, 'conversations', activeConvId, 'messages', msgId), payload);

      // Increment free user daily live message counter
      if (!isPremium) {
        const todayStr = new Date().toISOString().split('T')[0];
        const liveMessageUsage = userProfile?.liveMessageUsage;
        const currentCount = (liveMessageUsage && liveMessageUsage.date === todayStr) ? (liveMessageUsage.count || 0) : 0;
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            liveMessageUsage: {
              date: todayStr,
              count: currentCount + 1
            }
          });
        } catch (err: any) {
          console.error("Failed to update daily live message limit:", err);
          if (err.code === 'permission-denied') {
            console.warn('Permission denied for user profile update. Continuing message delivery.');
          }
        }
      }

      // Increment Peer's Unread Count
      const updatedUnreadCount = { ...(activeConv.unreadCount || {}) };
      updatedUnreadCount[peerId] = (updatedUnreadCount[peerId] || 0) + 1;

      // Update Conversation Parent Document
      const parentUpdate: any = {
        lastMessage: {
          id: msgId,
          senderId: currentUser.uid,
          content: type === 'text' ? trimmedMsg : `[${type.toUpperCase()}] ${mediaName || ''}`,
          type,
          timestamp: new Date().toISOString()
        },
        unreadCount: updatedUnreadCount,
        updatedAt: new Date().toISOString()
      };

      if (activeConv.requestStatus === 'pending' && activeConv.requestSenderId === currentUser.uid) {
        parentUpdate.requestMessage = type === 'text' ? trimmedMsg : `[Media Attachment]`;
      }

      await updateDoc(doc(db, 'conversations', activeConvId), parentUpdate);

      // Trigger Notification
      if (peerId) {
        import('../lib/firebaseHelpers').then(({ sendNotification }) => {
          sendNotification(peerId, 'message', `${userProfile.fullName || 'Classmate'} sent you a message.`);
        });
      }

      // Reset Inputs
      if (type === 'text') setInputMessage('');
      setReplyToMsg(null);
      handleTypingStatus(false);

    } catch (err: any) {
      console.error('Failed to send message:', err);
      if (err.code === 'permission-denied') {
        showToast('Message delivery failed: Permission Denied. Are you still a participant of this chat?', 'error');
      } else {
        showToast('Message delivery failed. Please check your connection.', 'error');
      }
    }
  };

  // Edit Message Action
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMsg || !inputMessage.trim() || !activeConvId) return;

    try {
      const msgRef = doc(db, 'conversations', activeConvId, 'messages', editingMsg.id);
      await updateDoc(msgRef, {
        content: inputMessage.trim(),
        edited: true,
        editedAt: new Date().toISOString()
      });

      // Update parent lastMessage if this was the last message
      if (activeConv?.lastMessage?.id === editingMsg.id) {
        await updateDoc(doc(db, 'conversations', activeConvId), {
          'lastMessage.content': inputMessage.trim() + ' (edited)'
        });
      }

      setInputMessage('');
      setEditingMsg(null);
      showToast('Message edited successfully!');
    } catch (err) {
      console.error('Edit error:', err);
      showToast('Failed to edit message.', 'error');
    }
  };

  // Delete Message Actions
  const deleteMessage = async (msg: any, type: 'me' | 'everyone') => {
    if (!activeConvId) return;

    try {
      const msgRef = doc(db, 'conversations', activeConvId, 'messages', msg.id);

      if (type === 'me') {
        // Add to deletedFor list
        await updateDoc(msgRef, {
          deletedFor: arrayUnion(currentUser.uid)
        });
        showToast('Message deleted for you.');
      } else {
        // Delete for everyone
        await updateDoc(msgRef, {
          content: 'This message was deleted.',
          deletedForEveryone: true,
          mediaUrl: null,
          mediaName: null
        });

        if (activeConv?.lastMessage?.id === msg.id) {
          await updateDoc(doc(db, 'conversations', activeConvId), {
            'lastMessage.content': 'This message was deleted.',
            'lastMessage.type': 'text'
          });
        }
        showToast('Message deleted for everyone.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete message.', 'error');
    }
  };

  // Block / Unblock peer
  const toggleBlockUser = async () => {
    if (!activeConv || !currentUser) return;
    const peerId = activeConv.participants.find((p: string) => p !== currentUser.uid);

    const isBlocked = activeConv.blockedBy?.includes(currentUser.uid);
    try {
      await updateDoc(doc(db, 'conversations', activeConv.id), {
        blockedBy: isBlocked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
      showToast(isBlocked ? 'User unblocked.' : 'User blocked.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to complete action.', 'error');
    }
  };

  // Report message or user
  const fileReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim() || !reportData) return;

    try {
      const reportPayload = {
        reporterId: currentUser.uid,
        reportedUserId: reportData.type === 'user' ? reportData.id : activeConvPresence()?.id || '',
        reportedMessageId: reportData.type === 'message' ? reportData.id : null,
        reportedMessageContent: reportData.type === 'message' ? reportData.content : null,
        conversationId: activeConvId,
        reason: reportReason.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'reports'), reportPayload);
      showToast('Safety report filed successfully. Our moderators will review this context.', 'success');
      setReportData(null);
      setReportReason('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reports');
      showToast('Report submission failed.', 'error');
    }
  };

  // Message Copying helper
  const copyMessageText = (msg: any) => {
    navigator.clipboard.writeText(msg.content);
    showToast('Copied text to clipboard!');
  };

  // Forwarding Messages mechanics
  const handleForward = async (targetConv: any) => {
    if (!forwardMsg) return;
    try {
      const destId = targetConv.id;
      const messagesRef = collection(db, 'conversations', destId, 'messages');
      const msgId = doc(messagesRef).id;

      const payload: any = {
        senderId: currentUser.uid,
        content: `[Forwarded] ${forwardMsg.content}`,
        type: forwardMsg.type,
        timestamp: new Date().toISOString(),
        seenBy: [currentUser.uid],
        deletedFor: []
      };

      if (forwardMsg.mediaUrl) payload.mediaUrl = forwardMsg.mediaUrl;
      if (forwardMsg.mediaName) payload.mediaName = forwardMsg.mediaName;
      if (forwardMsg.mediaSize) payload.mediaSize = forwardMsg.mediaSize;

      await setDoc(doc(db, 'conversations', destId, 'messages', msgId), payload);

      // Get peer ID
      const peerId = targetConv.participants.find((p: string) => p !== currentUser.uid);
      const updatedUnreadCount = { ...(targetConv.unreadCount || {}) };
      updatedUnreadCount[peerId] = (updatedUnreadCount[peerId] || 0) + 1;

      await updateDoc(doc(db, 'conversations', destId), {
        lastMessage: {
          id: msgId,
          senderId: currentUser.uid,
          content: `[Forwarded] ${forwardMsg.type === 'text' ? forwardMsg.content : `[${forwardMsg.type.toUpperCase()}] ${forwardMsg.mediaName || ''}`}`,
          type: forwardMsg.type,
          timestamp: new Date().toISOString()
        },
        unreadCount: updatedUnreadCount,
        updatedAt: new Date().toISOString()
      });

      showToast('Message forwarded successfully!');
      setForwardMsg(null);
      setShowForwardModal(false);
    } catch (err) {
      console.error(err);
      showToast('Forwarding failed.', 'error');
    }
  };

  // Peer metadata helper
  const activeConvPresence = () => {
    if (!activeConv || !currentUser) return null;
    const peerId = activeConv.participants.find((p: string) => p !== currentUser.uid);
    return peerPresence && peerPresence.id === peerId ? peerPresence : null;
  };

  const getPeerDetails = (conv: any) => {
    if (!conv || !currentUser) return { fullName: 'Scholar', avatar: null, online: false, email: '', username: null, id: '' };
    
    if (conv.type === 'group') {
      return {
        id: conv.id,
        fullName: conv.groupName || 'Unnamed Group',
        avatar: conv.groupAvatar || null,
        email: 'Group Chat',
        username: 'group'
      };
    }

    const peerId = conv.participants.find((p: string) => p !== currentUser.uid);
    const details = conv.participantDetails?.[peerId];
    return {
      id: peerId,
      fullName: details?.fullName || 'Scholar',
      avatar: details?.customAvatarUrl || null,
      email: details?.email || '',
      username: details?.username || null
    };
  };

  // Clean formatted time
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (timeStr: string) => {
    if (!timeStr) return 'Offline';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const startCall = async (type: 'voice' | 'video') => {
    if (!activeConv || !currentUser) return;
    const peerId = getPeerDetails(activeConv).id;
    try {
      await createCall(currentUser.uid, peerId, type);
      import('../lib/firebaseHelpers').then(({ sendNotification }) => {
        sendNotification(peerId, 'call', `${userProfile.fullName || 'Classmate'} is calling you...`);
      });
      showToast(`Starting ${type} call...`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to start call.', 'error');
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!activeConvId || !currentUser) return;
    try {
      await addReaction(activeConvId, messageId, currentUser.uid, emoji);
    } catch (err) {
      console.error(err);
    }
  };
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !currentUser) return;
    try {
      const messagesRef = collection(db, 'conversations');
      const convId = doc(messagesRef).id;
      
      const payload: any = {
        type: 'group',
        groupName: groupName.trim(),
        participants: [currentUser.uid, ...selectedMembers],
        ownerId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: {
          content: 'Group created',
          senderId: currentUser.uid,
          timestamp: new Date().toISOString(),
          type: 'text'
        }
      };

      await setDoc(doc(db, 'conversations', convId), payload);
      showToast('Group created successfully!');
      setIsCreatingGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      setActiveConvId(convId);
    } catch (err) {
      console.error(err);
      showToast('Failed to create group.', 'error');
    }
  };

  const getFilteredConversations = () => {
    return conversations.filter(c => {
      // 1. Sidebar tab filter
      const isPending = c.requestStatus === 'pending';
      const isRejected = c.requestStatus === 'rejected';
      const isAccepted = c.requestStatus === 'accepted';
      
      if (sidebarTab === 'chats') {
        // Active chats: accepted, legacy (no requestStatus field), or sent requests that are pending
        if (isPending && c.requestSenderId === currentUser.uid) {
          // Keep sent requests in chats view so the sender can see it as "Sent"
        } else if (isPending) {
          return false; // hide received pending requests from standard chats!
        }
        if (isRejected) return false; // hide declined requests from active chats
      } else {
        // Requests tab
        if (requestSegment === 'pending') {
          // received pending requests
          if (!isPending || c.requestReceiverId !== currentUser.uid) return false;
        } else if (requestSegment === 'rejected') {
          if (!isRejected) return false;
        } else {
          // accepted
          if (!isAccepted) return false;
        }
      }

      // 2. Search query filter
      if (searchTerm && searchTerm !== 'search') {
        const peer = getPeerDetails(c);
        let searchClean = searchTerm.toLowerCase().trim();
        if (searchClean.startsWith('@')) {
          searchClean = searchClean.substring(1);
        }
        const matchedName = peer.fullName.toLowerCase().includes(searchClean);
        const matchedUsername = (peer.username || '').toLowerCase().includes(searchClean);
        const matchedMsg = c.lastMessage?.content?.toLowerCase().includes(searchClean);
        return matchedName || matchedUsername || matchedMsg;
      }

      return true;
    });
  };

  // Audio notes individual control handlers
  const togglePlayAudio = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioElementsRef.current[msgId]?.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any existing playbacks
      if (playingAudioId && audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }

      if (!audioElementsRef.current[msgId]) {
        const audio = new Audio(url);
        audio.onended = () => setPlayingAudioId(null);
        audioElementsRef.current[msgId] = audio;
      }

      audioElementsRef.current[msgId].play();
      setPlayingAudioId(msgId);
    }
  };

  return (
    <div className="w-full h-[100dvh] md:h-[85vh] max-w-7xl mx-auto flex flex-col md:flex-row bg-slate-950/80 md:border md:border-white/10 md:rounded-[32px] overflow-hidden relative z-10 backdrop-blur-md shadow-2xl animate-fade-in text-white -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full -mt-2 sm:mt-0">
      
      {/* 1. Left Sidebar - Chat & Contact Discovery */}
      <div className={`w-full md:w-[350px] border-r border-white/10 flex flex-col ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header Area */}
        <div className="px-4 pb-4 pt-12 sm:pt-4 border-b border-white/10 space-y-3 shrink-0 safe-top">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <MessageSquare className="text-indigo-400" /> Live Chat
            </h2>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setSearchTerm(searchTerm === 'search' ? '' : 'search');
              }}
              className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"
              title="Add New Chat"
            >
              <Search size={20} />
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 group">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm === 'search' ? '' : searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            <button 
              onClick={() => setIsCreatingGroup(true)}
              className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 hover:bg-indigo-500/20 transition-all shrink-0"
              title="Create New Group"
            >
              <Users size={18} />
            </button>
          </div>

          {/* Connection Status Banner */}
          {connectionStatus !== 'connected' && (
            <div className={`px-3 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2 border transition-all ${
              connectionStatus === 'disconnected' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              connectionStatus === 'connecting' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse' :
              'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {connectionStatus === 'disconnected' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span>Offline — Messages Queued</span>
                </>
              )}
              {connectionStatus === 'connecting' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                  <span>🔄 Reconnecting to Network...</span>
                </>
              )}
              {connectionStatus === 'error' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>⚠️ {connectionError}. Retrying...</span>
                    <button 
                      onClick={() => checkConnectionAndConnect()}
                      className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[9px] uppercase tracking-tighter"
                    >
                      Retry Now
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tabs: Chats & Requests */}
          <div className="flex border-b border-white/5 pb-1">
            <button
              onClick={() => setSidebarTab('chats')}
              className={`flex-1 pb-2 text-xs font-black tracking-wider uppercase border-b-2 transition-all ${
                sidebarTab === 'chats' 
                  ? 'border-indigo-500 text-indigo-300' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setSidebarTab('requests')}
              className={`flex-1 pb-2 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'requests' 
                  ? 'border-indigo-500 text-indigo-300' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>Requests</span>
              {conversations.filter(c => c.requestStatus === 'pending' && c.requestReceiverId === currentUser.uid).length > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {conversations.filter(c => c.requestStatus === 'pending' && c.requestReceiverId === currentUser.uid).length}
                </span>
              )}
            </button>
          </div>

          {/* Sub-Segments if Requests Tab is active */}
          {sidebarTab === 'requests' && (
            <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
              {(['pending', 'accepted', 'rejected'] as const).map(seg => (
                <button
                  key={seg}
                  onClick={() => setRequestSegment(seg)}
                  className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    requestSegment === seg
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {seg}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Search results panel (Discovery) */}
        <AnimatePresence>
          {searchTerm === 'search' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-900 border-b border-white/10 overflow-hidden shrink-0"
            >
              <form onSubmit={handleUserSearch} className="p-4 flex gap-2">
                <input 
                  type="text"
                  required
                  placeholder="Enter username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                />
                <button 
                  type="submit" 
                  disabled={searchingUsers}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0"
                >
                  {searchingUsers ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="max-h-[180px] overflow-y-auto px-4 pb-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Search Results</p>
                  {searchResults.map(peer => (
                    <div 
                      key={peer.id}
                      onClick={() => setSelectedProfileUserId(peer.id)}
                      className="flex items-center gap-3 p-2 hover:bg-white/5 border border-white/5 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {peer.customAvatarUrl ? (
                          <img src={peer.customAvatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{(peer.fullName || peer.name || 'S').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{peer.fullName || peer.name || 'Scholar'}</p>
                        {peer.username ? (
                          <p className="text-[9px] text-indigo-400 font-bold truncate">@{peer.username}</p>
                        ) : (
                          <p className="text-[10px] text-gray-400 truncate">{peer.email || ''}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversations Scrollable list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 select-none">
          {conversations.length === 0 ? (
            <div className="text-center py-20 text-gray-500 space-y-2">
              <MessageSquare className="mx-auto text-gray-600" size={32} />
              <p className="text-xs font-bold">No chats yet</p>
              <p className="text-[10px]">Search for classmates above to begin!</p>
            </div>
          ) : getFilteredConversations().length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-xs">No matching chats found.</div>
          ) : (
            getFilteredConversations().map(conv => {
              const peer = getPeerDetails(conv);
              const active = conv.id === activeConvId;
              const unread = conv.unreadCount?.[currentUser.uid] || 0;
              const isTyping = conv.typing?.[peer.id];
              const isRecordingVoice = conv.recordingVoice?.[peer.id];

              return (
                <div 
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    active ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Peer Avatar */}
                  <div 
                    className="relative shrink-0 select-none cursor-pointer hover:scale-105 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProfileUserId(peer.id);
                    }}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-gray-300 flex items-center justify-center font-bold text-sm overflow-hidden shadow-md">
                      {peer.avatar ? (
                        <img src={peer.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{peer.fullName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {/* Real-time Online Indicator dot */}
                    {peerPresence?.id === peer.id && peerPresence?.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full shadow-lg"></span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-xs font-black text-gray-100 truncate">{peer.fullName}</h4>
                      {conv.lastMessage?.timestamp && (
                        <span className="text-[9px] text-gray-500 font-mono">{formatTime(conv.lastMessage.timestamp)}</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex-1 text-[11px] truncate text-gray-400">
                        {isTyping ? (
                          <span className="text-pink-400 font-bold animate-pulse">typing...</span>
                        ) : isRecordingVoice ? (
                          <span className="text-pink-400 font-bold animate-pulse">recording voice...</span>
                        ) : (
                          <span>{conv.lastMessage?.content || 'Start a new chat'}</span>
                        )}
                      </div>
                      
                      {unread > 0 && (
                        <span className="shrink-0 ml-2 bg-pink-500 text-white text-[9px] font-black h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full shadow-md animate-bounce">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right Workspace - Conversation Board */}
      <div className={`flex-1 flex flex-col h-full bg-slate-950/20 ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
        {activeConvId && activeConv ? (
          <>
            {/* Header Area */}
            <div className="px-4 pb-4 pt-12 sm:pt-4 border-b border-white/10 flex items-center justify-between bg-slate-900/40 sticky top-0 shrink-0 select-none z-20 safe-top">
              <div className="flex items-center gap-3">
                {/* Back link on Mobile */}
                <button 
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden p-2.5 hover:bg-white/5 rounded-2xl text-gray-400 active:scale-90 transition-all"
                >
                  <ArrowLeft size={20} />
                </button>

                {/* Peer Info */}
                <div 
                  className="relative shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setSelectedProfileUserId(getPeerDetails(activeConv).id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold overflow-hidden shadow-sm">
                    {getPeerDetails(activeConv).avatar ? (
                      <img src={getPeerDetails(activeConv).avatar!} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{getPeerDetails(activeConv).fullName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {peerPresence?.id === getPeerDetails(activeConv).id && peerPresence?.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full shadow-md"></span>
                  )}
                </div>

                <div 
                  className="cursor-pointer"
                  onClick={() => setSelectedProfileUserId(getPeerDetails(activeConv).id)}
                >
                  <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                    {getPeerDetails(activeConv).fullName}
                    {activeConv.blockedBy?.includes(currentUser.uid) && (
                      <span className="text-[9px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-rose-500/10">
                        <Ban size={8} /> Blocked
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                    {activeConv.typing?.[getPeerDetails(activeConv).id] ? (
                      <span className="text-pink-400 font-bold animate-pulse">typing...</span>
                    ) : activeConv.recordingVoice?.[getPeerDetails(activeConv).id] ? (
                      <span className="text-pink-400 font-bold animate-pulse">recording voice note...</span>
                    ) : peerPresence?.online ? (
                      <span className="text-emerald-400 font-bold">Online</span>
                    ) : (
                      <span className="text-gray-500">Last seen {formatLastSeen(peerPresence?.lastSeen)}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action options */}
              <div className="flex items-center gap-1.5 relative">
                {/* Search in chat */}
                <button 
                  onClick={() => startCall('voice')}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white"
                  title="Voice Call"
                >
                  <Phone size={18} />
                </button>
                <button 
                  onClick={() => startCall('video')}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white"
                  title="Video Call"
                >
                  <Video size={18} />
                </button>
                <button 
                  onClick={() => setShowMsgSearch(!showMsgSearch)}
                  className={`p-2 rounded-xl transition-colors ${showMsgSearch ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-white/5 text-gray-400'}`}
                  title="Search inside Chat"
                >
                  <Search size={18} />
                </button>

                <button 
                  onClick={toggleBlockUser}
                  className={`p-2 rounded-xl hover:bg-white/5 transition-colors ${activeConv.blockedBy?.includes(currentUser.uid) ? 'text-rose-400' : 'text-gray-400 hover:text-white'}`}
                  title={activeConv.blockedBy?.includes(currentUser.uid) ? 'Unblock User' : 'Block User'}
                >
                  <Ban size={18} />
                </button>

                <button 
                  onClick={() => setReportData({ type: 'user', id: getPeerDetails(activeConv).id })}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-rose-400 transition-colors"
                  title="Report User"
                >
                  <Flag size={18} />
                </button>
              </div>
            </div>

            {/* Message In-Chat Search Bar */}
            <AnimatePresence>
              {showMsgSearch && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-900 border-b border-white/10 px-4 py-2.5 flex items-center gap-2"
                >
                  <Search size={12} className="text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search words inside chat..." 
                    value={msgSearchTerm}
                    onChange={(e) => setMsgSearchTerm(e.target.value)}
                    className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none"
                  />
                  {msgSearchTerm && (
                    <button onClick={() => setMsgSearchTerm('')} className="p-1 hover:bg-white/10 rounded-full text-gray-400">
                      <X size={12} />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Board List */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-900/15"
            >
              {/* Pagination triggers */}
              {hasMoreMsgs && (
                <div className="text-center">
                  <button 
                    onClick={() => setMsgLimit(prev => prev + 30)}
                    className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-wider text-gray-400 transition-all cursor-pointer"
                  >
                    Load Older Messages
                  </button>
                </div>
              )}

              {activeConv.requestStatus === 'pending' && activeConv.requestReceiverId === currentUser.uid && (
                <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
                  <div className="bg-indigo-950/40 border border-indigo-500/30 p-8 rounded-[2rem] text-center space-y-6 w-full max-w-md shadow-2xl">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-2xl text-indigo-400 overflow-hidden shrink-0 shadow-inner">
                        {getPeerDetails(activeConv).avatar ? (
                          <img src={getPeerDetails(activeConv).avatar!} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{getPeerDetails(activeConv).fullName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-black text-indigo-100">Message Request from {getPeerDetails(activeConv).fullName}</h4>
                      {getPeerDetails(activeConv).username && (
                        <p className="text-xs text-indigo-300/70 font-medium">@{getPeerDetails(activeConv).username}</p>
                      )}
                    </div>
                    
                    {activeConv.requestMessage ? (
                      <div className="p-4 bg-black/40 rounded-2xl text-sm text-gray-200 mx-auto italic border border-white/5 font-medium shadow-inner">
                        "{activeConv.requestMessage}"
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No message preview available.</p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                      <button 
                        type="button"
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'conversations', activeConvId), {
                              requestStatus: 'accepted',
                              updatedAt: new Date().toISOString()
                            });
                            showToast('Request accepted! Chat is now active.', 'success');
                          } catch (err) {
                            console.error(err);
                          }
                        }} 
                        className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 font-bold text-sm rounded-xl transition-all text-white shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        Accept Request
                      </button>
                      <button 
                        type="button"
                        onClick={async () => {
                          try {
                            const cooldownDays = 7;
                            const requestCooldownUntil = new Date(Date.now() + cooldownDays * 24 * 60 * 60 * 1000).toISOString();
                            await updateDoc(doc(db, 'conversations', activeConvId), {
                              requestStatus: 'rejected',
                              requestCooldownUntil,
                              updatedAt: new Date().toISOString()
                            });
                            showToast('Request declined.', 'error');
                            setActiveConvId(null);
                          } catch (err) {
                            console.error(err);
                          }
                        }} 
                        className="flex-1 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-sm rounded-xl transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="text-center py-24 text-gray-500 space-y-1">
                  <MessageSquare className="mx-auto text-gray-600 mb-2 animate-bounce" size={28} />
                  <p className="text-xs font-bold text-gray-400">Secure Peer Encrypted Session</p>
                  <p className="text-[10px]">Start of complete message sequence with {getPeerDetails(activeConv).fullName}.</p>
                </div>
              ) : (
                messages
                  .filter(m => {
                    // Filter "delete for me" messages
                    if (m.deletedFor?.includes(currentUser.uid)) return false;
                    // Filter search matching
                    if (msgSearchTerm && m.type === 'text') {
                      return m.content.toLowerCase().includes(msgSearchTerm.toLowerCase());
                    }
                    return true;
                  })
                  .map((msg, index, arr) => {
                    const isMe = msg.senderId === currentUser.uid;
                    const peer = getPeerDetails(activeConv);
                    const showDropdown = msgDropdownId === msg.id;

                    // Display date header if different from previous message date
                    const prevMsg = index > 0 ? arr[index - 1] : null;
                    const showDateHeader = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateHeader && (
                          <div className="text-center py-3">
                            <span className="px-3 py-1 rounded-full bg-white/5 text-[9px] font-bold text-gray-500 uppercase tracking-widest border border-white/5">
                              {new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}

                        <div className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                          
                          {/* Chat bubble element */}
                          <div className="space-y-1 relative group">
                            
                            {/* Reply tag context */}
                            {msg.replyTo && (
                              <div className={`text-[10px] p-2 rounded-t-2xl border-l-2 bg-white/5 max-w-sm truncate flex items-center gap-1.5 text-gray-400 ${
                                isMe ? 'border-indigo-400 rounded-r-2xl' : 'border-pink-500 rounded-l-2xl'
                              }`}>
                                <CornerUpRight size={10} className="shrink-0" />
                                <span>{msg.replyTo.senderId === currentUser.uid ? 'You' : peer.fullName}: {msg.replyTo.content}</span>
                              </div>
                            )}

                            {/* Main Body block */}
                            <div className={`p-3.5 rounded-3xl relative shadow-md transition-all ${
                              msg.replyTo ? 'rounded-t-none' : ''
                            } ${
                              isMe 
                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                            }`}>
                              
                              {/* Media Types */}
                              {msg.type === 'image' && msg.mediaUrl && (
                                <div className="mb-2 rounded-xl overflow-hidden cursor-pointer max-w-sm border border-white/5 relative group/img">
                                  <img 
                                    src={msg.mediaUrl} 
                                    alt="" 
                                    onClick={() => setSelectedImage(msg.mediaUrl)}
                                    className="max-h-[220px] w-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                    referrerPolicy="referrer" 
                                  />
                                </div>
                              )}

                              {msg.type === 'voice' && msg.mediaUrl && (
                                <div className="mb-2 flex items-center gap-3 bg-black/20 p-2.5 rounded-2xl min-w-[200px]">
                                  <button 
                                    onClick={() => togglePlayAudio(msg.id, msg.mediaUrl!)}
                                    className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/25 transition-colors shrink-0"
                                  >
                                    {playingAudioId === msg.id ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1">
                                      <Volume2 size={12} className="text-gray-400" />
                                      <span className="text-[9px] font-mono font-bold text-gray-400">Audio note</span>
                                    </div>
                                    {msg.mediaSize && (
                                      <span className="text-[8px] font-mono text-gray-500">{(msg.mediaSize / 1024).toFixed(1)} KB</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {msg.type === 'file' && msg.mediaUrl && (
                                <div className="mb-2 flex items-center gap-3 bg-black/25 p-3 rounded-2xl border border-white/10 max-w-sm">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                    <Paperclip size={18} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{msg.mediaName || 'Attached Document'}</p>
                                    {msg.mediaSize && (
                                      <span className="text-[9px] font-mono text-gray-400">{(msg.mediaSize / 1024).toFixed(1)} KB</span>
                                    )}
                                  </div>
                                  <button 
                                    onClick={() => {
                                      import('../lib/downloadHelper').then(({ downloadAndOpenFile }) => {
                                        downloadAndOpenFile(msg.mediaUrl!, msg.mediaName || 'download');
                                      });
                                    }}
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                  >
                                    <Download size={14} />
                                  </button>
                                </div>
                              )}

                              {/* Text content */}
                              <p className="text-xs leading-relaxed whitespace-pre-wrap select-text break-words">
                                {msg.content}
                              </p>

                              {/* Reactions display */}
                              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) => (
                                    <button 
                                      key={emoji}
                                      onClick={() => toggleReaction(msg.id, emoji)}
                                      className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-all ${
                                        users.includes(currentUser.uid) 
                                          ? 'bg-indigo-500/20 border-indigo-500/40 text-white' 
                                          : 'bg-black/20 border-white/5 text-gray-400'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span className="font-mono">{users.length}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Metadata Line */}
                              <div className="flex items-center justify-end gap-1 mt-1.5 text-[8px] font-mono text-gray-400 select-none">
                                {msg.edited && <span>edited</span>}
                                <span>{formatTime(msg.timestamp)}</span>
                                {isMe && (
                                  msg.isOffline ? (
                                    <span className="flex items-center gap-1 text-[8px] text-gray-500 font-sans italic">
                                      <Loader size={8} className="animate-spin shrink-0" />
                                      Sending
                                    </span>
                                  ) : msg.seenBy && msg.seenBy.includes(peer.id) ? (
                                    <div className="flex items-center gap-0.5" title="Seen">
                                      <CheckCheck size={11} className="text-emerald-400 shrink-0" />
                                      <span className="text-[8px] text-emerald-400 font-sans">Seen</span>
                                    </div>
                                  ) : peerPresence?.online === true ? (
                                    <div className="flex items-center gap-0.5" title="Delivered">
                                      <CheckCheck size={11} className="text-gray-400 shrink-0" />
                                      <span className="text-[8px] text-gray-400 font-sans">Delivered</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-0.5" title="Sent">
                                      <Check size={11} className="text-gray-500 shrink-0" />
                                      <span className="text-[8px] text-gray-500 font-sans">Sent</span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Dropdown Options Button */}
                            {!msg.deletedForEveryone && (
                              <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                                isMe ? '-left-8' : '-right-8'
                              }`}>
                                <button 
                                  onClick={() => setMsgDropdownId(showDropdown ? null : msg.id)}
                                  className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                                >
                                  <MoreVertical size={14} />
                                </button>
                              </div>
                            )}

                            {/* Dropdown panel */}
                            <AnimatePresence>
                              {showDropdown && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className={`absolute top-10 bg-slate-900 border border-white/10 p-1.5 rounded-2xl w-40 shadow-2xl z-[50] ${
                                    isMe ? 'right-0' : 'left-0'
                                  }`}
                                >
                                  <div className="flex items-center gap-1 p-1 mb-1 border-b border-white/5 overflow-x-auto no-scrollbar">
                                    {QUICK_EMOJIS.map(emoji => (
                                      <button 
                                        key={emoji}
                                        onClick={() => { toggleReaction(msg.id, emoji); setMsgDropdownId(null); }}
                                        className="p-1 hover:bg-white/10 rounded-lg text-sm"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                  <button 
                                    onClick={() => { setReplyToMsg(msg); setMsgDropdownId(null); }}
                                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-white/5 text-[11px] flex items-center gap-2"
                                  >
                                    <CornerUpRight size={12} /> Reply
                                  </button>
                                  {msg.type === 'text' && (
                                    <button 
                                      onClick={() => { copyMessageText(msg); setMsgDropdownId(null); }}
                                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-white/5 text-[11px] flex items-center gap-2"
                                    >
                                      <Copy size={12} /> Copy
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => { setForwardMsg(msg); setShowForwardModal(true); setMsgDropdownId(null); }}
                                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-white/5 text-[11px] flex items-center gap-2"
                                  >
                                    <CornerUpRight size={12} /> Forward
                                  </button>
                                  {isMe && msg.type === 'text' && (
                                    <button 
                                      onClick={() => { setEditingMsg(msg); setInputMessage(msg.content); setMsgDropdownId(null); }}
                                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-white/5 text-[11px] text-indigo-400 flex items-center gap-2"
                                    >
                                      <Edit3 size={12} /> Edit
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => { deleteMessage(msg, 'me'); setMsgDropdownId(null); }}
                                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-white/5 text-[11px] text-rose-400 flex items-center gap-2"
                                  >
                                    <Trash size={12} /> Delete for Me
                                  </button>
                                  {isMe && (
                                    <button 
                                      onClick={() => { deleteMessage(msg, 'everyone'); setMsgDropdownId(null); }}
                                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-white/5 text-[11px] text-rose-500 font-bold flex items-center gap-2"
                                    >
                                      <Trash size={12} /> Delete for Everyone
                                    </button>
                                  )}
                                  {!isMe && (
                                    <button 
                                      onClick={() => { setReportData({ type: 'message', id: msg.id, content: msg.content }); setMsgDropdownId(null); }}
                                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-white/5 text-[11px] text-amber-500 flex items-center gap-2"
                                    >
                                      <Flag size={12} /> Report Message
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Status banner context */}
            {replyToMsg && (
              <div className="p-3 bg-indigo-500/10 border-t border-indigo-500/20 flex justify-between items-center text-xs text-indigo-300">
                <div className="flex items-center gap-2">
                  <CornerUpRight size={14} />
                  <span>Replying to <strong>{replyToMsg.senderId === currentUser.uid ? 'yourself' : getPeerDetails(activeConv).fullName}</strong>: {replyToMsg.content}</span>
                </div>
                <button onClick={() => setReplyToMsg(null)} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Editing Status banner context */}
            {editingMsg && (
              <div className="p-3 bg-amber-500/10 border-t border-amber-500/20 flex justify-between items-center text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <Edit3 size={14} />
                  <span>Editing message: {editingMsg.content}</span>
                </div>
                <button onClick={() => { setEditingMsg(null); setInputMessage(''); }} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* 3. Input Console area */}
            <div className="p-4 border-t border-white/10 bg-slate-900/40 shrink-0">
              {activeConv.blockedBy?.includes(currentUser.uid) || activeConv.blockedBy?.includes(getPeerDetails(activeConv).id) ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-xs flex items-center justify-center gap-2 font-bold">
                  <Lock size={14} /> 
                  <span>This chat is locked because a participant blocked the channel.</span>
                </div>
              ) : activeConv.requestStatus === 'pending' && activeConv.requestReceiverId === currentUser.uid ? (
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-300 text-center text-xs flex flex-col items-center justify-center gap-1.5 py-6">
                  <ShieldAlert size={18} className="text-indigo-400" />
                  <span className="font-bold">Pending Message Request</span>
                  <span className="text-[10px] text-gray-500 max-w-xs">Please accept or reject the request to continue.</span>
                </div>
              ) : activeConv.requestStatus === 'pending' && activeConv.requestSenderId === currentUser.uid && activeConv.requestMessage ? (
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-300 text-center text-xs flex flex-col items-center justify-center gap-1.5 py-6">
                  <CheckCircle size={18} className="text-indigo-400" />
                  <span className="font-bold">Message request sent to {getPeerDetails(activeConv).fullName}!</span>
                  <span className="text-[10px] text-gray-500 max-w-xs">Waiting for them to accept. No additional messages can be sent.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {!isPremium && (
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold tracking-wide border-b border-white/5 pb-2">
                      <span className="flex items-center gap-1">
                        <AlertCircle size={10} className="text-amber-400" />
                        <span>Daily Free messaging: {100 - ((userProfile?.liveMessageUsage?.date === new Date().toISOString().split('T')[0]) ? (userProfile.liveMessageUsage.count || 0) : 0)}/100 remaining today</span>
                      </span>
                      {setShowPremiumModal && (
                        <button 
                          type="button" 
                          onClick={() => {
                            if (setPremiumModalMessage) setPremiumModalMessage("Upgrade to Premium for unlimited peer-to-peer messaging, priority AI assistance, and premium features!");
                            setShowPremiumModal(true);
                          }}
                          className="text-amber-400 hover:underline cursor-pointer font-extrabold uppercase transition-all"
                        >
                          Get Premium
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Emoji Quick Picker List */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 select-none scrollbar-none">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white text-xs shrink-0"
                    >
                      <EmojiIcon size={14} />
                    </button>
                    {QUICK_EMOJIS.map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => setInputMessage(p => p + emoji)}
                        className="text-sm p-1 hover:scale-125 transition-transform shrink-0"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Main Input Form */}
                  <form onSubmit={editingMsg ? handleEditSave : (e) => { e.preventDefault(); sendMessage(inputMessage); }} className="flex items-center gap-2">
                    
                    {/* Attachment trigger */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="p-2.5 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white cursor-pointer transition-colors">
                        <ImageIcon size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAttachment(e, 'image')} />
                      </label>
                      <label className="p-2.5 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white cursor-pointer transition-colors">
                        <Paperclip size={18} />
                        <input type="file" className="hidden" onChange={(e) => handleAttachment(e, 'file')} />
                      </label>
                    </div>

                    {/* Chat Text Input field */}
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        value={inputMessage}
                        onChange={onInputChange}
                        onBlur={() => handleTypingStatus(false)}
                        placeholder="Type your message..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-10 py-3 text-xs focus:outline-none focus:border-indigo-500/50 text-white"
                      />
                      
                      {/* Voice Recorder control */}
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        {isRecording ? (
                          <div className="flex items-center gap-2 bg-rose-500 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-white shrink-0 animate-pulse">
                            <span>{recDuration}s</span>
                            <button type="button" onClick={() => stopVoiceRecording(true)} className="hover:bg-white/20 p-0.5 rounded" title="Discard">
                              <X size={10} />
                            </button>
                            <button type="button" onClick={() => stopVoiceRecording(false)} className="bg-white/20 hover:bg-white/40 p-0.5 rounded" title="Send">
                              <Check size={10} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            onClick={startVoiceRecording}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="Record voice note"
                          >
                            <Mic size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                      type="submit"
                      disabled={isUploading || (!inputMessage.trim())}
                      className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-30 rounded-2xl text-slate-950 font-black flex items-center justify-center transition-all cursor-pointer"
                    >
                      {isUploading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none text-gray-500 space-y-4">
            <div className="w-20 h-20 bg-indigo-500/5 text-indigo-400/40 rounded-[24px] border border-white/5 flex items-center justify-center">
              <MessageSquare size={40} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Your Peer Conversations</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">Select a classmate from the sidebar or click the search icon to start a new real-time secure session.</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Global Full-screen Image Viewer Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/95 z-[999] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-5 right-5 p-3 hover:bg-white/10 rounded-full text-white z-50">
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              referrerPolicy="referrer" 
            />
          </div>
        )}
      </AnimatePresence>

      {/* 4. Forward Message Modal */}
      <AnimatePresence>
        {showForwardModal && forwardMsg && (
          <div className="fixed inset-0 bg-black/80 z-[800] flex items-center justify-center p-4 backdrop-blur-sm select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/10 p-6 rounded-[28px] w-full max-w-md shadow-2xl space-y-4 text-white"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-black text-sm flex items-center gap-2 text-white">
                  <CornerUpRight className="text-pink-400" /> Forward Message
                </h3>
                <button onClick={() => { setForwardMsg(null); setShowForwardModal(false); }} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl text-[11px] text-gray-400 truncate">
                {forwardMsg.content}
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Send to:</p>
                {conversations.map(c => {
                  const peer = getPeerDetails(c);
                  return (
                    <div 
                      key={c.id}
                      onClick={() => handleForward(c)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs overflow-hidden">
                          {peer.avatar ? <img src={peer.avatar} alt="" className="object-cover w-full h-full" referrerPolicy="no-referrer" /> : <span>{peer.fullName.charAt(0)}</span>}
                        </div>
                        <span className="text-xs font-black">{peer.fullName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">Forward</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Report Dialog Modal */}
      <AnimatePresence>
        {reportData && (
          <div className="fixed inset-0 bg-black/80 z-[900] flex items-center justify-center p-4 backdrop-blur-sm select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/10 p-6 md:p-8 rounded-[28px] w-full max-w-md shadow-2xl space-y-5 text-white"
            >
              <div className="space-y-2 text-center">
                <ShieldAlert className="text-amber-400 mx-auto" size={32} />
                <h3 className="text-base font-black">Submit Safety Report</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Help us keep the chat platform safe. Our administrators will review the reported {reportData.type} and conversation logs securely.
                </p>
              </div>

              <form onSubmit={fileReport} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Reason for reporting</label>
                  <textarea 
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Specify context (abuse, spam, harassment, inappropriate media...)"
                    rows={4}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="flex gap-2.5">
                  <button 
                    type="button" 
                    onClick={() => { setReportData(null); setReportReason(''); }}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    File Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating alert toasts */}
      <div className="fixed bottom-5 right-5 z-[9999] pointer-events-none">
        <AnimatePresence>
          {alertToast && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto text-xs font-black ${
                alertToast.type === 'success' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
              }`}
            >
              {alertToast.type === 'success' ? <CheckCircle className="shrink-0" size={14} /> : <AlertCircle className="shrink-0" size={14} />}
              <span>{alertToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. User Public Profile Modal (Version 3.7) */}
      {selectedProfileUserId && (
        <UserProfileModal 
          userId={selectedProfileUserId}
          currentUser={currentUser}
          userProfile={userProfile}
          isOpen={!!selectedProfileUserId}
          onClose={() => setSelectedProfileUserId(null)}
          onStartChat={async (peer) => {
            setSelectedProfileUserId(null);
            await startConversation(peer);
          }}
        />
      )}

      {/* 6. Group Creation Modal */}
      <AnimatePresence>
        {isCreatingGroup && (
          <div className="fixed inset-0 bg-black/80 z-[900] flex items-center justify-center p-4 backdrop-blur-sm select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/10 p-6 md:p-8 rounded-[28px] w-full max-w-md shadow-2xl space-y-5 text-white"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Users className="text-indigo-400" /> Create New Group
                </h3>
                <button onClick={() => setIsCreatingGroup(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Group Name</label>
                  <input 
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Study Group Alpha"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Members ({selectedMembers.length})</label>
                  <div className="max-h-[200px] overflow-y-auto space-y-1.5 p-2 bg-black/20 rounded-2xl border border-white/5 no-scrollbar">
                    {conversations.map(c => {
                      if (c.type === 'group') return null;
                      const peer = getPeerDetails(c);
                      const isSelected = selectedMembers.includes(peer.id);
                      return (
                        <div 
                          key={c.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMembers(prev => prev.filter(id => id !== peer.id));
                            } else {
                              setSelectedMembers(prev => [...prev, peer.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                            isSelected ? 'bg-indigo-500/20 border-indigo-500/30' : 'hover:bg-white/5 border-transparent'
                          } border`}
                        >
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-xs overflow-hidden">
                               {peer.avatar ? <img src={peer.avatar} className="object-cover w-full h-full" alt="" /> : <span>{peer.fullName.charAt(0)}</span>}
                             </div>
                             <span className="text-xs font-bold">{peer.fullName}</span>
                          </div>
                          {isSelected && <CheckCircle size={14} className="text-indigo-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                  className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-30 rounded-2xl text-slate-950 font-black flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <Users size={18} /> Create Group Session
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
