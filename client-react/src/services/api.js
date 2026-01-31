import axios from 'axios';
import { API_ENDPOINTS } from './apiEndpoints';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let isRefreshing = false;
let refreshPromise = null;

// Variables to hold store and actions injected from main entry point
let store = null;
let logoutAction = null;

export const setupInterceptors = (_store, _logoutAction) => {
  store = _store;
  logoutAction = _logoutAction;
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || '';
      if (
        !url.includes(API_ENDPOINTS.AUTH.LOGIN) &&
        !url.includes(API_ENDPOINTS.AUTH.VERIFY_OTP) &&
        !url.includes(API_ENDPOINTS.AUTH.FORGOT_PASSWORD) &&
        !url.includes(API_ENDPOINTS.AUTH.VERIFY_FORGOT_OTP) &&
        !url.includes(API_ENDPOINTS.AUTH.RESET_PASSWORD) &&
        !url.includes(API_ENDPOINTS.AUTH.REFRESH_TOKEN)
      ) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = api
            .post(API_ENDPOINTS.AUTH.REFRESH_TOKEN)
            .then((res) => {
              if (res.data?.success && res.data.data?.accessToken) {
                localStorage.setItem('accessToken', res.data.data.accessToken);
              } else {
                throw new Error('Failed to refresh session');
              }
            })
            .catch((refreshError) => {
              // Session expired
              localStorage.removeItem('accessToken');
              
              if (store && logoutAction) {
                store.dispatch(logoutAction());
                // The router (PrivateRoute) will handle the redirection to login
                // We can dispatch a toast/notification here if needed, 
                // but usually the logout action or the UI handles "You have been logged out"
              } else {
                // Fallback if store not injected
                window.location.href = '/login';
              }
              
              throw refreshError;
            })
            .finally(() => {
              isRefreshing = false;
            });
        }

        return refreshPromise.then(() => {
          const token = localStorage.getItem('accessToken');
          if (token) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }
    }

    if (status === 401) {
      // If 401 happens on a non-refreshable endpoint (or after failed refresh)
      localStorage.removeItem('accessToken');
      
      if (store && logoutAction) {
         // Avoid dispatching logout multiple times if already logging out? 
         // Redux state update is cheap enough.
         // Check if user is already null to avoid loop?
         const state = store.getState();
         if (state.auth.user) {
             toast.error('Session expired. Please login again.');
             store.dispatch(logoutAction());
         }
      } else {
         window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
