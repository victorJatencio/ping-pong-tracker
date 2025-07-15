import React, { createContext, useState, useEffect, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useDispatch } from "react-redux";
import { apiSlice } from "../store/slices/apiSlice";
import { firebaseListenerManager } from "../utils/firebaseListenerManager";

// Create the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dispatch = useDispatch();

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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log(
        "AuthContext: User created successfully:",
        userCredential.user.uid
      );

      // Update user profile with name
      console.log("AuthContext: Updating user profile...");
      await updateProfile(userCredential.user, {
        displayName: name,
      });
      console.log("AuthContext: Profile updated successfully");

      // Create user document in Firestore
      console.log("AuthContext: Creating user document in Firestore...");
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        useDefaultAvatar: true, // Default avatar setting
        createdAt: serverTimestamp(),
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

      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log(
        "AuthContext: User logged in successfully:",
        userCredential.user.uid
      );

      return userCredential.user;
    } catch (error) {
      console.error("AuthContext: Login failed:", error);
      if (isMounted.current) setError(error.message);
      throw error;
    }
  };

  // ✅ ENHANCED LOGOUT WITH COMPREHENSIVE CLEANUP
  const logout = async () => {
    try {
      console.log("[" + new Date().toISOString() + "] Starting comprehensive logout process...");
      
      // Set logout state to prevent new listeners
      setIsLoggingOut(true);
      
      // ✅ STEP 1: Clean up ALL Firebase listeners across the entire app
      console.log("[" + new Date().toISOString() + "] Cleaning up Firebase listeners...");
      await firebaseListenerManager.cleanupAll();
      
      // ✅ STEP 2: Clear all RTK Query cache and subscriptions
      console.log("[" + new Date().toISOString() + "] Clearing RTK Query cache...");
      dispatch(apiSlice.util.resetApiState());
      
      // ✅ STEP 3: Add delay to ensure all cleanup is complete
      console.log("[" + new Date().toISOString() + "] Waiting for cleanup to complete...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ✅ STEP 4: Set loading state to prevent new queries
      if (isMounted.current) setLoading(true);
      
      // ✅ STEP 5: Finally sign out
      console.log("[" + new Date().toISOString() + "] Signing out from Firebase Auth...");
      await signOut(auth);

      console.log("[" + new Date().toISOString() + "] User signed out successfully");
    } catch (error) {
      console.error("[" + new Date().toISOString() + "] Error signing out:", error);
    } finally {
      // Reset logout state
      setIsLoggingOut(false);
      if (isMounted.current) setLoading(false);
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
        throw new Error("No authenticated user");
      }

      await updateProfile(currentUser, profileData);

      // Update user document in Firestore if needed
      if (profileData.displayName) {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            name: profileData.displayName,
          },
          { merge: true }
        );
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

  // ✅ ENHANCED AUTH STATE LISTENER WITH BETTER ERROR HANDLING
  useEffect(() => {
    console.log("AuthContext: Setting up auth state listener...");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(
        "AuthContext: Auth state changed, user:",
        user ? user.uid : "null"
      );

      if (!isMounted.current) {
        console.log("AuthContext: Component unmounted, skipping state update");
        return;
      }

      // Skip Firestore calls during logout process
      if (isLoggingOut) {
        console.log("AuthContext: Logout in progress, skipping Firestore calls");
        if (isMounted.current) {
          setCurrentUser(user);
          setLoading(false);
        }
        return;
      }

      if (user) {
        console.log(
          "AuthContext: User is authenticated, fetching additional data..."
        );
        
        // ✅ ENHANCED ERROR HANDLING for Firestore access
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && isMounted.current) {
            console.log("AuthContext: User document found, combining data");

            // Combine auth user with Firestore data
            setCurrentUser({
              ...user,
              ...userDoc.data(),
            });
          } else if (isMounted.current) {
            console.log(
              "AuthContext: No user document found, using auth data only"
            );
            setCurrentUser(user);
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user data:", error);
          
          // ✅ HANDLE ALL FIREBASE ERRORS GRACEFULLY
          if (error.code === 'permission-denied') {
            console.log('🔒 AuthContext: Permission denied fetching user data - using auth data only');
          } else if (error.code === 'unavailable') {
            console.log('🌐 AuthContext: Firebase unavailable - using auth data only');
          } else if (error.code === 'unauthenticated') {
            console.log('🔒 AuthContext: Unauthenticated error - using auth data only');
          }
          
          // Fall back to auth data only
          if (isMounted.current) setCurrentUser(user);
        }
      } else {
        console.log("AuthContext: User is not authenticated");
        if (isMounted.current) {
          setCurrentUser(null);
          // Clear any remaining RTK Query cache when user becomes null
          dispatch(apiSlice.util.resetApiState());
        }
      }

      if (isMounted.current) {
        console.log("AuthContext: Setting loading to false");
        setLoading(false);
      }
    });

    // Cleanup subscription
    return () => {
      console.log("AuthContext: Cleaning up auth state listener");
      unsubscribe();
    };
  }, [dispatch, isLoggingOut]);

  // Log current user state changes
  useEffect(() => {
    console.log(
      "AuthContext: Current user state:",
      currentUser ? currentUser.uid : "null"
    );
    console.log("AuthContext: Loading state:", loading);
    console.log("AuthContext: Active Firebase listeners:", firebaseListenerManager.getActiveCount());
  }, [currentUser, loading]);

  // Helper function to check if user is authenticated
  const isAuthenticated = () => {
    return auth.currentUser !== null && currentUser !== null && !isLoggingOut;
  };

  // Context value
  const value = {
    currentUser,
    loading,
    error,
    isLoggingOut,
    register,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    isAuthenticated,
    firebaseListenerManager, // Expose for components to use
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
