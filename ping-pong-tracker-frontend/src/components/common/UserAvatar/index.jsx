import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import profileImageService from '../../../services/profileImageService';

const UserAvatar = ({ 
  user, 
  size = 32, 
  className = '', 
  showOnlineStatus = false,
  useFirestoreData = false // New prop to enable real-time Firestore updates
}) => {
  const [imageError, setImageError] = useState(false);
  const [firestoreUser, setFirestoreUser] = useState(null);

  // Listen to Firestore user document for real-time updates
  useEffect(() => {
    if (!useFirestoreData || !user?.uid) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setFirestoreUser({ id: doc.id, ...doc.data() });
      }
    });

    return () => unsubscribe();
  }, [user?.uid, useFirestoreData]);

  // Use Firestore data if available, otherwise fall back to auth user
  const userData = useFirestoreData && firestoreUser ? firestoreUser : user;

  // Get user's avatar URL using the profile image service
  const avatarUrl = useFirestoreData && firestoreUser 
    ? profileImageService.getCurrentAvatarURL(firestoreUser)
    : (userData?.photoURL || userData?.avatarUrl);

  // Get user's display name or email for alt text
  const displayName = userData?.displayName || userData?.name || userData?.email || 'User';

  // Get initials for fallback
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(displayName);

  const handleImageError = () => {
    setImageError(true);
  };

  // If no avatar URL or image failed to load, show initials
  const showInitials = !avatarUrl || imageError;

  return (
    <div 
      className={`user-avatar position-relative ${className}`}
      style={{ width: size, height: size }}
    >
      {!showInitials ? (
        /* Profile Image */
        <img
          src={avatarUrl}
          alt={`${displayName}'s avatar`}
          className="rounded-circle"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}
          onError={handleImageError}
        />
      ) : (
        /* Fallback with initials */
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#5C6BC0',
            fontSize: size > 40 ? '1rem' : '0.8rem',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {initials}
        </div>
      )}

      {/* Online status indicator */}
      {showOnlineStatus && (
        <div
          className="position-absolute rounded-circle bg-success border border-white"
          style={{
            width: size * 0.25,
            height: size * 0.25,
            bottom: 0,
            right: 0,
            borderWidth: '2px !important'
          }}
        ></div>
      )}
    </div>
  );
};

export default UserAvatar;