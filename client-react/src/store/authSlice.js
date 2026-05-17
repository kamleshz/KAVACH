import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { clearAccessToken, setAccessToken } from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

const AUTH_STORAGE_KEY = 'epr-kavach-auth-user';

const readCachedUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.ME);
      if (response.data?.success) {
        return { user: response.data.data };
      }
      return { user: null };
    } catch (error) {
      const status = error?.response?.status;
      if (status === 503 && attempt < maxAttempts) {
        await sleep(300 * attempt);
        continue;
      }
      return rejectWithValue(error?.response?.data?.message || 'Authentication check failed');
    }
  }

  return rejectWithValue('Authentication check failed');
});

export const verifyLoginOtp = createAsyncThunk('auth/verifyLoginOtp', async ({ email, otp, photo, location }, { rejectWithValue }) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.VERIFY_OTP, { email, otp, photo, location });
    if (response.data?.success) {
      if (response.data?.data?.accessToken) {
        setAccessToken(response.data.data.accessToken);
      }
      return { user: response.data.data.user };
    }
    return rejectWithValue(response.data?.message || 'OTP verification failed');
  } catch (error) {
    const data = error?.response?.data;
    const message =
      (data && typeof data === 'object' ? data.message : undefined) ||
      (typeof data === 'string' ? data : undefined) ||
      error?.message ||
      'OTP verification failed';
    return rejectWithValue(message);
  }
});

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    if (response.data?.success) {
        if (response.data.data.requireOtp) {
            return { requireOtp: true, email: response.data.data.email };
        }
      if (response.data?.data?.accessToken) {
        setAccessToken(response.data.data.accessToken);
      }
      return { user: response.data.data.user };
    }
    return rejectWithValue(response.data?.message || 'Login failed');
  } catch (error) {
    const data = error?.response?.data;
    const message =
      (data && typeof data === 'object' ? data.message : undefined) ||
      (typeof data === 'string' ? data : undefined) ||
      error?.message ||
      'Login failed';
    return rejectWithValue(message);
  }
});

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error?.response?.data || { message: 'Registration failed' });
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post(API_ENDPOINTS.AUTH.LOGOUT);
  } catch {
  }
  clearAccessToken();
  return { user: null };
});

const initialState = {
  user: readCachedUser(),
  loading: !readCachedUser(),
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = !state.user;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.error = action.payload || action.error.message;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.requireOtp) {
            // Do not set user yet
        } else {
            state.user = action.payload.user;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.error = action.payload || action.error.message;
      })
      .addCase(verifyLoginOtp.pending, (state) => {
        state.error = null;
        state.loading = true;
      })
      .addCase(verifyLoginOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(verifyLoginOtp.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.error = action.payload || action.error.message;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
      });
  },
});

export const { clearAuthError, setUser } = authSlice.actions;
export default authSlice.reducer;
