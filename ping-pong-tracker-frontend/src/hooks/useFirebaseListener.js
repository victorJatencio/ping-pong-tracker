import { useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useFirebaseListener = (listenerSetup, dependencies = []) => {
  const { isAuthenticated, firebaseListenerManager, isLoggingOut } = useContext(AuthContext);
  const unsubscribeRef = useRef(null);
  const listenerIdRef = useRef(`listener_${Date.now()}_${Math.random()}`);

  useEffect(() => {
    // Don't set up listeners if not authenticated or logging out
    if (!isAuthenticated() || isLoggingOut) {
      console.log('🔗 Skipping Firebase listener setup - not authenticated or logging out');
      return;
    }

    // Clean up existing listener
    if (unsubscribeRef.current) {
      console.log('🔗 Cleaning up existing listener before setting up new one');
      firebaseListenerManager.unregister(listenerIdRef.current);
      unsubscribeRef.current = null;
    }

    // Set up new listener
    try {
      console.log('🔗 Setting up Firebase listener:', listenerIdRef.current);
      const unsubscribe = listenerSetup();
      
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribeRef.current = unsubscribe;
        
        // Register with global manager
        firebaseListenerManager.register(listenerIdRef.current, unsubscribe);
      }
    } catch (error) {
      console.error('❌ Error setting up Firebase listener:', error);
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        console.log('🔗 Component cleanup - unregistering listener:', listenerIdRef.current);
        firebaseListenerManager.unregister(listenerIdRef.current);
        unsubscribeRef.current = null;
      }
    };
  }, [isAuthenticated(), isLoggingOut, ...dependencies]);

  // Return cleanup function for manual cleanup if needed
  return () => {
    if (unsubscribeRef.current) {
      firebaseListenerManager.unregister(listenerIdRef.current);
      unsubscribeRef.current = null;
    }
  };
};