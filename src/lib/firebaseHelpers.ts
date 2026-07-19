import { getApiUrl } from "../lib/apiConfig";
import { uploadFile } from "./storageHelper";
import { auth, db, storage } from '../firebase';
import { doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs, serverTimestamp, addDoc, orderBy, limit, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't necessarily want to re-throw and crash the app if it's just a background listener
  return errInfo;
}

export const followUser = async (followerId: string, followingId: string) => {
  const followId = `${followerId}_${followingId}`;
  await setDoc(doc(db, 'follows', followId), {
    followerId,
    followingId,
    status: 'accepted',
    createdAt: serverTimestamp(),
  });
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  const followId = `${followerId}_${followingId}`;
  await deleteDoc(doc(db, 'follows', followId));
};

export const isFollowing = async (followerId: string, followingId: string) => {
  const followId = `${followerId}_${followingId}`;
  const docSnap = await getDoc(doc(db, 'follows', followId));
  return docSnap.exists();
};


export const uploadStory = async (userId: string, file: File, onProgress?: (p: number) => void) => {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `stories/${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  
  const mediaURL = await uploadFile(file, path, onProgress);
  
  await addDoc(collection(db, 'stories'), {
    userId,
    mediaURL,
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    viewers: [],
  });
};

export const editMessage = async (conversationId: string, messageId: string, newContent: string) => {
  await setDoc(doc(db, 'conversations', conversationId, 'messages', messageId), { content: newContent, edited: true }, { merge: true });
};

export const deleteMessage = async (conversationId: string, messageId: string, forEveryone: boolean) => {
  const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  if (forEveryone) {
    await deleteDoc(messageRef);
  } else {
    // Basic implementation for everyone for now
    await deleteDoc(messageRef);
  }
};

export const viewStory = async (storyId: string, userId: string) => {
  const storyRef = doc(db, 'stories', storyId);
  await updateDoc(storyRef, {
    viewers: arrayUnion(userId)
  });
};

export const getStories = async () => {
  const storiesRef = collection(db, 'stories');
  const q = query(storiesRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addReaction = async (conversationId: string, messageId: string, userId: string, reaction: string) => {
  const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const messageSnap = await getDoc(messageRef);
  const data = messageSnap.data();
  const reactions = data?.reactions || {};
  
  if (!reactions[reaction]) {
    reactions[reaction] = [];
  }
  if (!reactions[reaction].includes(userId)) {
    reactions[reaction].push(userId);
  } else {
    // Toggle off if already reacted
    reactions[reaction] = reactions[reaction].filter((id: string) => id !== userId);
    if (reactions[reaction].length === 0) delete reactions[reaction];
  }
  
  await setDoc(messageRef, { reactions }, { merge: true });
};

export const createGroup = async (name: string, ownerId: string, members: string[]) => {
  const groupRef = await addDoc(collection(db, 'groups'), {
    name,
    ownerId,
    members: [ownerId, ...members],
    createdAt: serverTimestamp(),
  });
  return groupRef.id;
};

export const createCall = async (callerId: string, receiverId: string, type: 'voice' | 'video') => {
  const callRef = await addDoc(collection(db, 'calls'), {
    callerId,
    receiverId,
    type,
    status: 'ringing',
    createdAt: serverTimestamp(),
  });
  return callRef.id;
};

export const updateCallStatus = async (callId: string, status: 'accepted' | 'rejected' | 'ended') => {
  await updateDoc(doc(db, 'calls', callId), { status, endedAt: status === 'ended' ? serverTimestamp() : null });
};

export const sendNotification = async (userId: string, type: string, message: string, title: string = 'System Update') => {
  // 1. Save to Firestore for in-app notification list
  await addDoc(collection(db, 'users', userId, 'notifications'), {
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });

  // 2. Trigger real push notification via server
  try {
    await fetch(getApiUrl('/api/send-push'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        body: message,
        data: { type }
      })
    });
  } catch (err) {
    console.error('Failed to trigger push notification:', err);
  }
};

// Friend System Helpers
export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  const requestId = `${senderId}_${receiverId}`;
  await setDoc(doc(db, 'friend_requests', requestId), {
    senderId,
    receiverId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  await sendNotification(receiverId, 'friend_request', 'You have a new friend request.', 'Friend Request');
};

export const cancelFriendRequest = async (senderId: string, receiverId: string) => {
  const requestId = `${senderId}_${receiverId}`;
  await deleteDoc(doc(db, 'friend_requests', requestId));
};

export const acceptFriendRequest = async (requestId: string, senderId: string, receiverId: string) => {
  const friendshipId = [senderId, receiverId].sort().join('_');
  await setDoc(doc(db, 'friendships', friendshipId), {
    userIds: [senderId, receiverId],
    createdAt: serverTimestamp(),
  });
  


  await deleteDoc(doc(db, 'friend_requests', requestId));
  await sendNotification(senderId, 'friend_accepted', 'Your friend request was accepted.', 'Friend Request Accepted');
};

export const rejectFriendRequest = async (requestId: string) => {
  await deleteDoc(doc(db, 'friend_requests', requestId));
};

export const unfriend = async (userId1: string, userId2: string) => {
  const friendshipId = [userId1, userId2].sort().join('_');
  await deleteDoc(doc(db, 'friendships', friendshipId));


};

export const getFriendshipStatus = async (userId1: string, userId2: string) => {
  if (!userId1 || !userId2) return 'none';
  const friendshipId = [userId1, userId2].sort().join('_');
  const friendSnap = await getDoc(doc(db, 'friendships', friendshipId));
  if (friendSnap.exists()) return 'friends';

  const req1 = await getDoc(doc(db, 'friend_requests', `${userId1}_${userId2}`));
  if (req1.exists()) return 'sent';

  const req2 = await getDoc(doc(db, 'friend_requests', `${userId2}_${userId1}`));
  if (req2.exists()) return 'received';

  return 'none';
};
