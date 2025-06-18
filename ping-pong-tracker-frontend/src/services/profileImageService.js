import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

class ProfileImageService {
  /**
   * Upload profile image to Firebase Storage
   * @param {File} file - Image file to upload
   * @param {string} userId - User's UID
   * @returns {Promise<string>} Download URL of uploaded image
   */
  async uploadProfileImage(file, userId) {
    try {
      // Validate file
      if (!file) throw new Error('No file provided');
      if (!file.type.startsWith('image/')) throw new Error('File must be an image');
      if (file.size > 100 * 1024) throw new Error('File size must be less than 100KB');

      // Create storage reference
      const timestamp = Date.now();
      const fileName = `profile_${timestamp}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, `profile-images/${userId}/${fileName}`);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update user document with new photo URL
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        photoURL: downloadURL,
        useDefaultAvatar: false,
        updatedAt: new Date()
      });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  }

  /**
   * Switch to default avatar
   * @param {string} userId - User's UID
   */
  async useDefaultAvatar(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        useDefaultAvatar: true,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error switching to default avatar:', error);
      throw error;
    }
  }

  /**
   * Switch back to uploaded photo
   * @param {string} userId - User's UID
   */
  async useUploadedPhoto(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        useDefaultAvatar: false,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error switching to uploaded photo:', error);
      throw error;
    }
  }

  /**
   * Generate default avatar URL
   * @param {string} name - User's name
   * @returns {string} Default avatar URL
   */
  getDefaultAvatarURL(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5C6BC0&color=fff&size=200&bold=true`;
  }

  /**
   * Get current avatar URL for user
   * @param {Object} user - User object
   * @returns {string} Avatar URL
   */
  getCurrentAvatarURL(user) {
    if (user.useDefaultAvatar || !user.photoURL) {
      const name = user.name || user.displayName || user.email || 'User';
      return this.getDefaultAvatarURL(name);
    }
    return user.photoURL;
  }
}

export const profileImageService = new ProfileImageService();
export default profileImageService;