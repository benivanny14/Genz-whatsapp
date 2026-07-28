import { configureStore, createSlice } from '@reduxjs/toolkit';

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    }
  }
});

// Chats Slice
const chatsSlice = createSlice({
  name: 'chats',
  initialState: {
    chats: [],
    activeChat: null,
    messages: {}
  },
  reducers: {
    setChats: (state, action) => {
      state.chats = action.payload;
    },
    setActiveChat: (state, action) => {
      state.activeChat = action.payload;
    },
    setMessages: (state, action) => {
      state.messages[action.payload.chatId] = action.payload.messages;
    },
    addMessage: (state, action) => {
      const { chatId, message } = action.payload;
      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      state.messages[chatId].push(message);
    }
  }
});

// Status Slice
const statusSlice = createSlice({
  name: 'status',
  initialState: {
    statuses: [],
    myStatuses: [],
    viewingStatus: null
  },
  reducers: {
    setStatuses: (state, action) => {
      state.statuses = action.payload;
    },
    setMyStatuses: (state, action) => {
      state.myStatuses = action.payload;
    },
    setViewingStatus: (state, action) => {
      state.viewingStatus = action.payload;
    },
    addStatus: (state, action) => {
      state.myStatuses.unshift(action.payload);
    }
  }
});

// UI Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: 'dark',
    language: 'en',
    notifications: true,
    soundEnabled: true
  },
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    toggleNotifications: (state) => {
      state.notifications = !state.notifications;
    },
    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled;
    }
  }
});

export const { setUser, logout } = authSlice.actions;
export const { setChats, setActiveChat, setMessages, addMessage } = chatsSlice.actions;
export const { setStatuses, setMyStatuses, setViewingStatus, addStatus } = statusSlice.actions;
export const { setTheme, setLanguage, toggleNotifications, toggleSound } = uiSlice.actions;

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    chats: chatsSlice.reducer,
    status: statusSlice.reducer,
    ui: uiSlice.reducer
  }
});

export default store;
