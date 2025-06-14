import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Define the initial state
const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Create async thunk for fetching matches
export const fetchMatches = createAsyncThunk(
  'matches/fetchMatches',
  async (_, { rejectWithValue }) => {
    try {
      // Replace with your actual API call
      const response = await fetch('/api/matches');
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const matchesSlice = createSlice({
  name: 'matches',
  initialState,
  reducers: {
    // Standard reducer logic
    addMatch: (state, action) => {
      state.items.push(action.payload);
    },
    updateMatch: (state, action) => {
      const index = state.items.findIndex(match => match.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    deleteMatch: (state, action) => {
      state.items = state.items.filter(match => match.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types
    builder
      .addCase(fetchMatches.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMatches.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

// Export actions and reducer
export const { addMatch, updateMatch, deleteMatch } = matchesSlice.actions;
export default matchesSlice.reducer;
