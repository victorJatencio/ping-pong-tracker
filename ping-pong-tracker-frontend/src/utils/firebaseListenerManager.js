export class FirebaseListenerManager {
  constructor() {
    this.listeners = new Map();
    this.isCleaningUp = false;
  }

  // Register a Firebase listener
  register(id, unsubscribeFunction) {
    console.log(`🔗 Registering Firebase listener: ${id}`);
    this.listeners.set(id, unsubscribeFunction);
    
    // Return cleanup function
    return () => {
      this.unregister(id);
    };
  }

  // Unregister a specific listener
  unregister(id) {
    if (this.listeners.has(id)) {
      console.log(`🔗 Unregistering Firebase listener: ${id}`);
      const unsubscribe = this.listeners.get(id);
      try {
        unsubscribe();
      } catch (error) {
        console.error(`❌ Error unregistering listener ${id}:`, error);
      }
      this.listeners.delete(id);
    }
  }

  // Clean up ALL listeners (called before logout)
  async cleanupAll() {
    if (this.isCleaningUp) {
      console.log('🔗 Cleanup already in progress, skipping...');
      return;
    }

    this.isCleaningUp = true;
    console.log(`🔗 Cleaning up ${this.listeners.size} Firebase listeners...`);
    
    const cleanupPromises = Array.from(this.listeners.entries()).map(([id, unsubscribe]) => {
      return new Promise((resolve) => {
        try {
          console.log(`🔗 Cleaning up listener: ${id}`);
          unsubscribe();
          resolve();
        } catch (error) {
          console.error(`❌ Error cleaning up listener ${id}:`, error);
          resolve(); // Don't fail the entire cleanup
        }
      });
    });

    await Promise.all(cleanupPromises);
    this.listeners.clear();
    
    // Add delay to ensure all listeners are fully cleaned up
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.isCleaningUp = false;
    console.log('✅ All Firebase listeners cleaned up');
  }

  // Get count of active listeners
  getActiveCount() {
    return this.listeners.size;
  }
}

// Create global instance
export const firebaseListenerManager = new FirebaseListenerManager();