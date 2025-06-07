// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useRef } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Create the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add this ref to track mounted state
  const isMounted = useRef(true);
  
  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Register a new user
  const register = async (name, email, password) => {
    try {
      if (isMounted.current) setError(null);
      
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        useDefaultAvatar: true, // Default avatar setting
        createdAt: serverTimestamp()
      });
      
      return userCredential.user;
    } catch (error) {
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Login existing user
  const login = async (email, password) => {
    try {
      if (isMounted.current) setError(null);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Logout user
  const logout = async () => {
    try {
      if (isMounted.current) setError(null);
      
      await signOut(auth);
    } catch (error) {
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Reset password
  const resetPassword = async (email) => {
    try {
      if (isMounted.current) setError(null);
      
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Update user profile
  const updateUserProfile = async (profileData) => {
    try {
      if (isMounted.current) setError(null);
      
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      await updateProfile(currentUser, profileData);
      
      // Update user document in Firestore if needed
      if (profileData.displayName) {
        await setDoc(doc(db, "users", currentUser.uid), {
          name: profileData.displayName
        }, { merge: true });
      }
      
      // Force refresh of user data
      if (isMounted.current) {
        setCurrentUser({ ...currentUser });
      }
      
      return true;
    } catch (error) {
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted.current) return; // Skip if component unmounted
      
      if (user) {
        // Get additional user data from Firestore if needed
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && isMounted.current) {
            // Combine auth user with Firestore data
            setCurrentUser({
              ...user,
              ...userDoc.data()
            });
          } else if (isMounted.current) {
            setCurrentUser(user);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          if (isMounted.current) setCurrentUser(user);
        }
      } else {
        if (isMounted.current) setCurrentUser(null);
      }
      
      if (isMounted.current) setLoading(false);
    });
    
    // Cleanup subscription
    return unsubscribe;
  }, []);
  
  // Context value
  const value = {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword,
    updateUserProfile
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
