import { useSelector, useDispatch } from 'react-redux';
import { 
  logout as logoutAction, 
  checkAuth as checkAuthAction, 
  login as loginAction,
  register as registerAction,
  verifyLoginOtp as verifyLoginOtpAction,
  setUser as setUserAction,
  clearAuthError as clearAuthErrorAction
} from '../store/authSlice';

/**
 * A hook to access authentication state and actions.
 * Wraps Redux selectors and actions for cleaner component code.
 * 
 * @returns {Object} - { user, isAuthenticated, loading, error, login, logout, checkAuth, register, verifyLoginOtp, setUser, clearAuthError, hasRole, isAdmin, isManager }
 */
const useAuth = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);

  const login = (credentials) => dispatch(loginAction(credentials));
  const logout = () => dispatch(logoutAction());
  const checkAuth = () => dispatch(checkAuthAction());
  const register = (data) => dispatch(registerAction(data));
  const verifyLoginOtp = (data) => dispatch(verifyLoginOtpAction(data));
  const setUser = (user) => dispatch(setUserAction(user));
  const clearAuthError = () => dispatch(clearAuthErrorAction());
  
  // Helper to check specific roles
  const hasRole = (roleName) => {
    if (!user) return false;
    const userRole = user.role?.name || user.role;
    return userRole === roleName;
  };

  const isAdmin = hasRole('ADMIN');
  const isManager = hasRole('MANAGER');

  return {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    register,
    verifyLoginOtp,
    setUser,
    clearAuthError,
    hasRole,
    isAdmin,
    isManager
  };
};

export default useAuth;
