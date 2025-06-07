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
      console.log("AuthContext: Starting registration for:", email);
      if (isMounted.current) setError(null);
      
      // Create user in Firebase Authentication
      console.log("AuthContext: Creating user in Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("AuthContext: User created successfully:", userCredential.user.uid);
      
      // Update user profile with name
      console.log("AuthContext: Updating user profile...");
      await updateProfile(userCredential.user, {
        displayName: name
      });
      console.log("AuthContext: Profile updated successfully");
      
      // Create user document in Firestore
      console.log("AuthContext: Creating user document in Firestore...");
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        useDefaultAvatar: true, // Default avatar setting
        createdAt: serverTimestamp()
      });
      console.log("AuthContext: User document created successfully");
      
      return userCredential.user;
    } catch (error) {
      console.error("AuthContext: Registration failed:", error);
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Login existing user
  const login = async (email, password) => {
    try {
      console.log("AuthContext: Starting login for:", email);
      if (isMounted.current) setError(null);
      
      console.log("AuthContext: Calling signInWithEmailAndPassword...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("AuthContext: Login successful, user:", userCredential.user.uid);
      console.log("AuthContext: User email verified:", userCredential.user.emailVerified);

      return userCredential.user;
    } catch (error) {
      console.error("AuthContext: Login failed:", error);
      console.error("AuthContext: Error code:", error.code);
      console.error("AuthContext: Error message:", error.message);
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Logout user
  const logout = async () => {
    try {
      console.log("AuthContext: Starting logout...");
      if (isMounted.current) setError(null);
      
      await signOut(auth);
      console.log("AuthContext: Logout successful");
    } catch (error) {
      console.error("AuthContext: Logout failed:", error);
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Reset password
  const resetPassword = async (email) => {
    try {
      console.log("AuthContext: Starting password reset for:", email);
      if (isMounted.current) setError(null);
      
      await sendPasswordResetEmail(auth, email);
      console.log("AuthContext: Password reset email sent");
    } catch (error) {
      console.error("AuthContext: Password reset failed:", error);
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Update user profile
  const updateUserProfile = async (profileData) => {
    try {
      console.log("AuthContext: Starting profile update...");
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
      
      console.log("AuthContext: Profile update successful");
      return true;
    } catch (error) {
      console.error("AuthContext: Profile update failed:", error);
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };
  
  // Listen for auth state changes
  useEffect(() => {
    console.log("AuthContext: Setting up auth state listener...");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthContext: Auth state changed, user:", user ? user.uid : 'null');

      if (!isMounted.current) {
        console.log("AuthContext: Component unmounted, skipping state update"); 
        return;
      } // Skip if component unmounted
      
      if (user) {
        console.log("AuthContext: User is authenticated, fetching additional data...");
        // Get additional user data from Firestore if needed
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && isMounted.current) {
            console.log("AuthContext: User document found, combining data");

            // Combine auth user with Firestore data
            setCurrentUser({
              ...user,
              ...userDoc.data()
            });
          } else if (isMounted.current) {
            console.log("AuthContext: No user document found, using auth data only");
            setCurrentUser(user);
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user data:", error);
          console.error("Error fetching user data:", error);
          if (isMounted.current) setCurrentUser(user);
        }
      } else {
        console.log("AuthContext: User is not authenticated");
        if (isMounted.current) setCurrentUser(null);
      }
      
      if (isMounted.current) {
        console.log("AuthContext: Setting loading to false");
        setLoading(false)
      };
    });
    
    // Cleanup subscription
    return () => {
      console.log("AuthContext: Cleaning up auth state listener");
      unsubscribe();
    } ;
  }, []);

  // Log current user state changes
  useEffect(() => {
    console.log("AuthContext: Current user state:", currentUser ? currentUser.uid : 'null');
    console.log("AuthContext: Loading state:", loading);
  }, [currentUser, loading]);
  
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
