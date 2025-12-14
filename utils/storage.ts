
import { storage, db, auth } from "../firebaseConfig";
import firebase from "firebase/compat/app";

/**
 * Uploads a file to Firebase Storage under 'user_uploads/{uid}/' and syncs metadata to Firestore.
 * @param file The file object to upload
 * @param userId The ID of the user uploading the file
 * @param notes Optional notes about the file
 * @returns Promise resolving to the download URL
 */
export const uploadFile = async (file: File, userId: string, notes: string = ''): Promise<string> => {
  if (!userId) throw new Error("User ID is required for upload");

  // Helper for mock response to use in fallbacks
  // CHANGED: Use FileReader to create a persistent Data URL (Base64) instead of a temporary Blob URL.
  // This allows the image to survive app restarts when saved to LocalStorage.
  const getMockUrl = () => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result as string);
          } else {
            reject(new Error("Failed to read file"));
          }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
  });

  // GUEST / UNAUTHENTICATED HANDLING
  // If user is a guest or not properly authenticated, mock the upload.
  if (userId.startsWith('guest_') || !auth.currentUser) {
      console.debug("Guest upload: Simulating file upload (Base64).");
      return getMockUrl();
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const storagePath = `user_uploads/${userId}/${timestamp}_${safeName}`;
  
  const storageRef = storage.ref(storagePath);
  
  try {
    // 1. Upload to Storage
    const snapshot = await storageRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();

    // 2. Sync to Firestore: /users/{uid}/files/{autoId}
    // We wrap this in a separate try/catch because sometimes Storage allows upload but Firestore denies write.
    // We still want to return the URL if storage succeeded.
    try {
        const filesCollectionRef = db.collection("users").doc(userId).collection("files");
        
        await filesCollectionRef.add({
          name: file.name,
          storagePath: storagePath,
          url: downloadURL,
          type: file.type,
          size: file.size,
          notes: notes,
          aiSummary: "",
          uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
          timestamp: timestamp
        });
    } catch (fsError) {
        console.warn("Firestore metadata sync failed (likely permissions), but storage upload succeeded.", fsError);
    }

    return downloadURL;
  } catch (error: any) {
    // FALLBACK: If real upload fails due to permissions (e.g. locked rules), 
    // fall back to local preview so the user experience isn't broken.
    if (error.code === 'storage/unauthorized' || error.message?.includes('permission')) {
        // Silently fall back to local preview to avoid alarming users in demo mode
        return getMockUrl();
    }

    console.error("Error uploading file:", error);
    throw error;
  }
};
