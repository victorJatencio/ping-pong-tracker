import { createSlice } from '@reduxjs/toolkit';

/**
 * UI Slice - Manages global UI state including modals, notifications, etc.
 * Following industry standards for centralized UI state management
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    // Modal states
    modals: {
      matchCreation: {
        isOpen: false,
        data: null, // For passing data to modal if needed
      },
      scoreUpdate: {
        isOpen: false,
        data: null,
      },
      // Future modals can be added here
    },
    
    // Other UI states can be added here
    notifications: {
      show: false,
      message: '',
      type: 'info', // 'success', 'error', 'warning', 'info'
    },
    
    loading: {
      global: false,
    },
  },
  reducers: {
    // Match Creation Modal Actions
    openMatchCreationModal: (state, action) => {
      state.modals.matchCreation.isOpen = true;
      state.modals.matchCreation.data = action.payload || null;
    },
    closeMatchCreationModal: (state) => {
      state.modals.matchCreation.isOpen = false;
      state.modals.matchCreation.data = null;
    },
    
    // Score Update Modal Actions
    openScoreUpdateModal: (state, action) => {
      state.modals.scoreUpdate.isOpen = true;
      state.modals.scoreUpdate.data = action.payload || null;
    },
    closeScoreUpdateModal: (state) => {
      state.modals.scoreUpdate.isOpen = false;
      state.modals.scoreUpdate.data = null;
    },
    
    // Notification Actions
    showNotification: (state, action) => {
      state.notifications.show = true;
      state.notifications.message = action.payload.message;
      state.notifications.type = action.payload.type || 'info';
    },
    hideNotification: (state) => {
      state.notifications.show = false;
      state.notifications.message = '';
      state.notifications.type = 'info';
    },
    
    // Global Loading Actions
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
  },
});

// Export actions
export const {
  openMatchCreationModal,
  closeMatchCreationModal,
  openScoreUpdateModal,
  closeScoreUpdateModal,
  showNotification,
  hideNotification,
  setGlobalLoading,
} = uiSlice.actions;

// Export selectors for easy access
export const selectMatchCreationModal = (state) => state.ui.modals.matchCreation;
export const selectScoreUpdateModal = (state) => state.ui.modals.scoreUpdate;
export const selectNotifications = (state) => state.ui.notifications;
export const selectGlobalLoading = (state) => state.ui.loading.global;

// Export reducer
export default uiSlice.reducer;