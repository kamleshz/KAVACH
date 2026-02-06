import { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const response = await api.get(API_ENDPOINTS.AUTH.ME);
        if (response.data.success) {
          setUser(response.data.data);
        } else {
          localStorage.removeItem('accessToken');
        }
      } catch (error) {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    if (response.data.success) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
      setUser(response.data.data.user);
      return { success: true, user: response.data.data.user };
    }
    return { success: false, message: response.data.message };
  };

  const register = async (userData) => {
    const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
