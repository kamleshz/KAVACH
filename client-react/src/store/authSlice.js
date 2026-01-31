import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  const token = localStorage.getItem('accessToken');
  if (!token) return { user: null };

  try {
    const response = await api.get(API_ENDPOINTS.AUTH.ME);
    if (response.data?.success) {
      return { user: response.data.data };
    }
    localStorage.removeItem('accessToken');
    return { user: null };
  } catch (error) {
    localStorage.removeItem('accessToken');
    return rejectWithValue(error?.response?.data?.message || 'Authentication check failed');
  }
});

export const verifyLoginOtp = createAsyncThunk('auth/verifyLoginOtp', async ({ email, otp, photo, location }, { rejectWithValue }) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.VERIFY_OTP, { email, otp, photo, location });
    if (response.data?.success) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
      return { user: response.data.data.user };
    }
    return rejectWithValue(response.data?.message || 'OTP verification failed');
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || 'OTP verification failed');
  }
});

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    if (response.data?.success) {
        if (response.data.data.requireOtp) {
            return { requireOtp: true, email: response.data.data.email };
        }
      localStorage.setItem('accessToken', response.data.data.accessToken);
      return { user: response.data.data.user };
    }
    return rejectWithValue(response.data?.message || 'Login failed');
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || 'Login failed');
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
  localStorage.removeItem('accessToken');
  return { user: null };
});

const initialState = {
  user: null,
  loading: true,
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
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
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
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        if (action.payload.requireOtp) {
            // Do not set user yet
        } else {
            state.user = action.payload.user;
        }
      })
      .addCase(login.rejected, (state, action) => {
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
        state.user = null;
      });
  },
});

export const { clearAuthError, setUser } = authSlice.actions;
export default authSlice.reducer;

