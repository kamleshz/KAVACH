import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

const AUTH_STORAGE_KEY = 'epr-kavach-auth-user';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: { warnAfter: 128 },
      serializableCheck: { warnAfter: 128 },
    }),
});

let previousUserSnapshot = null;

store.subscribe(() => {
  const nextUser = store.getState()?.auth?.user ?? null;
  if (nextUser === previousUserSnapshot) return;
  previousUserSnapshot = nextUser;

  if (typeof window === 'undefined') return;

  try {
    if (nextUser) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures and continue using in-memory auth state.
  }
});

