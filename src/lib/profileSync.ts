import { db } from '../firebase';
import { doc, getDocs, updateDoc, collection, query, where, setDoc } from 'firebase/firestore';

export const syncUserProfile = async (userId: string, newProfile: any) => {
  // Update the user document itself
  await setDoc(doc(db, 'users', userId), newProfile, { merge: true });

  // Update conversations where the user is a participant
  try {
    const qConvs = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));
    const snap = await getDocs(qConvs);
    for (const d of snap.docs) {
       const conv = d.data();
       if (conv.participantDetails && conv.participantDetails[userId]) {
         const updatedDetails = {
           ...conv.participantDetails[userId],
           fullName: newProfile.fullName || conv.participantDetails[userId].fullName,
           username: newProfile.username || conv.participantDetails[userId].username,
           customAvatarUrl: newProfile.customAvatarUrl !== undefined ? newProfile.customAvatarUrl : conv.participantDetails[userId].customAvatarUrl,
           email: newProfile.email || conv.participantDetails[userId].email
         };
         await updateDoc(doc(db, 'conversations', d.id), {
           [`participantDetails.${userId}`]: updatedDetails
         });
       }
    }
  } catch (err) {
    console.error("Failed to sync conversations:", err);
  }
};
