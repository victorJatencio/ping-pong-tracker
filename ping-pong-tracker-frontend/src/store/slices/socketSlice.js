import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isConnected: false,
    connectionError: null,
    lastConnected: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
};

const socketSlice = createSlice({
    name: 'socket',
    initialState,
    reducers: {
        setConnected: (state, action) => {
            state.isConnected = true;
            state.connectionError = null;
            state.lastConnected = new Date().toISOString();
            state.reconnectAttempts = 0;
        },
        setDisconnected: (state, action) => {
            state.isConnected = false;
            state.connectionError = action.payload?.error || null;
        },
        incrementReconnectAttempts: (state) => {
            state.reconnectAttempts += 1;
        },
        resetReconnectAttempts: (state) => {
            state.reconnectAttempts = 0;
        },
        setConnectionError: (state, action) => {
            state.connectionError = action.payload;
        }
    }
});

export const {
    setConnected,
    setDisconnected,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    setConnectionError
} = socketSlice.actions;

export default socketSlice.reducer;