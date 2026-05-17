import axios from "axios";
import { API_ENDPOINTS } from "./apiEndpoints";

export const API_URL = import.meta.env.VITE_API_URL || "";

const getCookieValue = (name) => {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.split("=");

    if (cookieName === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let isRefreshing = false;
let refreshPromise = null;
let inMemoryAccessToken = null;

// Variables to hold store and actions injected from main entry point
let store = null;
let logoutAction = null;

export const setupInterceptors = (_store, _logoutAction) => {
  store = _store;
  logoutAction = _logoutAction;
};

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
};

const isPublicAuthRoute = () => {
  if (typeof window === "undefined") return false;
  return ["/login", "/register", "/forgot-password"].includes(
    window.location.pathname,
  );
};

api.interceptors.request.use(
  (config) => {
    const next = config || {};
    next.withCredentials = true;
    next.headers = next.headers || {};
    const token = inMemoryAccessToken || getCookieValue("accessToken");
    if (token && !next.headers.Authorization && !next.headers.authorization) {
      next.headers.Authorization = `Bearer ${token}`;
    }
    return next;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || "";
      const isUserDetailsRequest = url.includes(API_ENDPOINTS.AUTH.ME);
      if (
        !(isUserDetailsRequest && isPublicAuthRoute()) &&
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
              if (res.data?.success) {
                if (res.data?.data?.accessToken) {
                  setAccessToken(res.data.data.accessToken);
                }
                return;
              } else {
                throw new Error("Failed to refresh session");
              }
            })
            .catch((refreshError) => {
              // Session expired
              if (store && logoutAction) {
                store.dispatch(logoutAction());
                // The router (PrivateRoute) will handle the redirection to login
                // We can dispatch a toast/notification here if needed,
                // but usually the logout action or the UI handles "You have been logged out"
              } else {
                // Fallback if store not injected
                window.location.href = "/login";
              }

              throw refreshError;
            })
            .finally(() => {
              isRefreshing = false;
            });
        }

        return refreshPromise.then(() => {
          return api(originalRequest);
        });
      }
    }

    if (status === 401) {
      // If 401 happens on a non-refreshable endpoint (or after failed refresh)
      if (store && logoutAction) {
        // Avoid dispatching logout multiple times if already logging out?
        // Redux state update is cheap enough.
        // Check if user is already null to avoid loop?
        const state = store.getState();
        if (state.auth.user) {
          store.dispatch(logoutAction());
        }
      } else {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
