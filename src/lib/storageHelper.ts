import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export async function uploadFile(file: File, path: string, onProgress?: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // If it's a firebase storage URL, we need to extract the path to delete it
    if (fileUrl.includes('firebasestorage')) {
      const decodedUrl = decodeURIComponent(fileUrl);
      const urlPath = decodedUrl.split('/o/')[1].split('?alt=')[0];
      const fileRef = ref(storage, urlPath);
      await deleteObject(fileRef);
    }
  } catch (err) {
    console.error("Error deleting file:", err);
  }
}
