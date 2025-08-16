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
import { deleteUser } from "firebase/auth";
import { useDeleteUserDataMutation } from "../store/slices/apiSlice";

// ✅ SIMPLE ERROR SUPPRESSION FOR LOGOUT
const originalConsoleError = console.error;
let isLoggingOutGlobal = false;

console.error = (...args) => {
  const errorMessage = args.join(" ");
  if (
    isLoggingOutGlobal &&
    (errorMessage.includes("permission-denied") ||
      errorMessage.includes("Missing or insufficient permissions") ||
      errorMessage.includes("Uncaught Error in snapshot listener"))
  ) {
    return; // Suppress Firebase permission errors during logout
  }
  originalConsoleError.apply(console, args);
};

// Create the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deleteUserData] = useDeleteUserDataMutation();
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
      if (isMounted.current) setError(null);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name,
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        useDefaultAvatar: true, // Default avatar setting
        createdAt: serverTimestamp(),
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
      if (error.code === 'auth/invalid-credential') {
        console.log("AuthContext: Invalid credentials provided"); // Less alarming log
        const friendlyError = "Invalid email or password. Please check your credentials and try again.";

        if (isMounted.current) setError(friendlyError);
        throw new Error(friendlyError);

      } else if (error.code === 'auth/user-not-found') {
        console.log("AuthContext: User not found");
        const friendlyError = "No account found with this email address.";
        if (isMounted.current) setError(friendlyError);
        throw new Error(friendlyError);

      } else if (error.code === 'auth/wrong-password') {
        console.log("AuthContext: Wrong password");
        const friendlyError = "Incorrect password. Please try again.";
        if (isMounted.current) setError(friendlyError);
        throw new Error(friendlyError);

      } else if (error.code === 'auth/too-many-requests') {
        console.log("AuthContext: Too many failed attempts");
        const friendlyError = "Too many failed login attempts. Please try again later.";
        if (isMounted.current) setError(friendlyError);
        throw new Error(friendlyError);

      } else {
        // For other errors, log them normally
        console.error("AuthContext: Login failed:", error);
        if (isMounted.current) setError(error.message);
        throw error;
      }
      // if (isMounted.current) setError(error.message);
      // throw error;
    }
  };

  // ✅ FIXED LOGOUT FUNCTION
  const logout = async () => {
    try {
      console.log("[" + new Date().toISOString() + "] Starting logout...");

      // ✅ FIXED: Use setter function instead of direct assignment
      setIsLoggingOut(true);
      isLoggingOutGlobal = true; // Enable error suppression

      // Brief delay before logout to let listeners settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Set loading state
      if (isMounted.current) setLoading(true);

      // Clear RTK Query cache
      dispatch(apiSlice.util.resetApiState());

      // Brief delay before Firebase signOut
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Sign out from Firebase
      await signOut(auth);

      console.log(
        "[" + new Date().toISOString() + "] User signed out successfully"
      );
    } catch (error) {
      console.error(
        "[" + new Date().toISOString() + "] Error during logout:",
        error
      );
    } finally {
      if (isMounted.current) setLoading(false);
      setIsLoggingOut(false);

      // Disable error suppression after logout
      setTimeout(() => {
        isLoggingOutGlobal = false;
      }, 1000);
    }
  };

  // Delete Account
  const deleteAccount = async () => {
    if (!currentUser?.uid) {
      throw new Error("No user logged in");
    }

    try {
      console.log(
        "🚀 AuthContext: Starting complete account deletion process..."
      );
      setLoading(true);

      // 1. Delete Firestore data first
      console.log("🗑️ AuthContext: Step 1 - Deleting Firestore data...");
      const firestoreResult = await deleteUserData(currentUser.uid).unwrap();
      console.log("✅ AuthContext: Firestore data deleted:", firestoreResult);

      // 2. Re-authenticate and delete user (if needed)
      console.log("🔥 AuthContext: Step 2 - Deleting Firebase Auth user...");

      // Get fresh user reference
      const user = auth.currentUser;
      if (user) {
        // Use the Firebase Auth deleteUser function
        await user.delete(); // ✅ Alternative: Use user.delete() method
        console.log("✅ AuthContext: Firebase Auth user deleted");
      }

      // 3. Clear local state
      console.log("🧹 AuthContext: Step 3 - Clearing local data...");
      setCurrentUser(null);
      localStorage.clear();
      sessionStorage.clear();

      if (dispatch) {
        dispatch(apiSlice.util.resetApiState());
      }

      console.log("🎉 AuthContext: Account deletion completed successfully!");
      return { success: true, message: "Account deleted successfully" };
    } catch (error) {
      console.error("❌ AuthContext: Error in deleteAccount:", error);
      throw error;
    } finally {
      setLoading(false);
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

  // Auth state listener
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
        console.log(
          "AuthContext: Logout in progress, skipping Firestore calls"
        );
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

          // Handle Firebase errors gracefully
          if (error.code === "permission-denied") {
            console.log(
              "🔒 AuthContext: Permission denied fetching user data - using auth data only"
            );
          } else if (error.code === "unavailable") {
            console.log(
              "🌐 AuthContext: Firebase unavailable - using auth data only"
            );
          } else if (error.code === "unauthenticated") {
            console.log(
              "🔒 AuthContext: Unauthenticated error - using auth data only"
            );
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
    deleteAccount,
    resetPassword,
    updateUserProfile,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
