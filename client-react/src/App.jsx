import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useDispatch } from 'react-redux';
import useAuth from './hooks/useAuth';
import { checkAuth as checkAuthAction } from './store/authSlice';
import useTheme from './hooks/useTheme';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import DashboardLayout from './layouts/DashboardLayout';
import PrivateRoute from './components/PrivateRoute';
import GsapPageTransition from './components/GsapPageTransition';
import GsapToastEnhancer from './components/GsapToastEnhancer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import IdleTimer from './components/IdleTimer';
import { ThemeProvider } from './context/ThemeContext';

// Lazy load heavy components
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const Clients = lazy(() => import('./pages/Clients'));
const AllClients = lazy(() => import('./pages/AllClients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const AddClient = lazy(() => import('./pages/AddClient'));
const ClientTypeSelection = lazy(() => import('./pages/ClientTypeSelection'));
const EWasteCategorySelection = lazy(() => import('./features/ewaste/pages/EWasteCategorySelection'));
const WasteTypeSelection = lazy(() => import('./pages/WasteTypeSelection'));
const EditClient = lazy(() => import('./pages/EditClient'));
const ClientGroupSearch = lazy(() => import('./pages/ClientGroupSearch'));
const ClientConnect = lazy(() => import('./pages/ClientConnect'));
const ClientConnectDetail = lazy(() => import('./pages/ClientConnectDetail'));
const ClientValidation = lazy(() => import('./pages/ClientValidation'));
const PlantProcess = lazy(() => import('./pages/PlantProcess'));
const EWasteProcess = lazy(() => import('./features/ewaste/pages/EWasteProcess'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const LoginLogs = lazy(() => import('./pages/LoginLogs'));
const CompanyManagement = lazy(() => import('./pages/CompanyManagement'));
const KPIDashboard = lazy(() => import('./pages/KPIDashboard'));
const ViewClient = lazy(() => import('./pages/ViewClient'));

const LoadingFallback = () => (
  <div className="theme-page-spinner-shell flex min-h-screen items-center justify-center">
    <div
      className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2"
      style={{
        borderTopColor: 'var(--brand-primary)',
        borderBottomColor: 'var(--brand-primary)',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
      }}
    />
  </div>
);

const DashboardIndexRedirect = () => {
  const { user } = useAuth();
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;

  if (roleName === 'SUPER ADMIN') return <Navigate to="client-connect" replace />;
  if (roleName === 'CLIENT' && user?.linkedClient?._id) {
    return <Navigate to={`client/${user.linkedClient._id}`} replace />;
  }

  return <DashboardHome />;
};

const withPageTransition = (element, transitionKey, className = '') => (
  <GsapPageTransition transitionKey={transitionKey} className={className}>
    {element}
  </GsapPageTransition>
);

function App() {
  const dispatch = useDispatch();
  const { antTheme, isDark, resolvedTheme } = useTheme();

  useEffect(() => {
    dispatch(checkAuthAction());
  }, [dispatch]);

  return (
    <ConfigProvider
      theme={{
        ...antTheme,
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GsapToastEnhancer />
        <ToastContainer position="top-right" autoClose={3000} theme={resolvedTheme} />
        {/* 10 minutes = 600000 ms */}
        <IdleTimer timeout={600000} />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              path="/login"
              element={withPageTransition(<Login />, 'login-page', 'min-h-screen')}
            />
            <Route
              path="/register"
              element={withPageTransition(<Register />, 'register-page', 'min-h-screen')}
            />
            <Route
              path="/forgot-password"
              element={withPageTransition(
                <ForgotPassword />,
                'forgot-password-page',
                'min-h-screen',
              )}
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
            <Route index element={<DashboardIndexRedirect />} />
            <Route path="all-clients" element={<AllClients />} />
            <Route path="clients" element={<Clients />} />
            <Route path="client-connect" element={<ClientConnect />} />
            <Route path="client-connect/:id" element={<ClientConnectDetail />} />
            <Route path="client/:id" element={<ClientDetail />} />
            <Route path="client/:id/edit" element={<AddClient />} />
            <Route path="client/:id/audit" element={<AddClient />} />
            <Route path="add-client" element={<WasteTypeSelection />} />
            <Route path="add-client/plastic" element={<ClientTypeSelection />} />
            <Route path="add-client/ewaste" element={<EWasteCategorySelection />} />
            <Route path="add-client/:type" element={<AddClient />} />
            <Route path="group-search" element={<ClientGroupSearch />} />
            <Route path="client/:id/validate" element={<ClientValidation />} />
            <Route path="client/:clientId/process-plant/:type/:itemId" element={<PlantProcess />} />
            <Route path="client/:clientId/process-ewaste/:type/:itemId" element={<EWasteProcess />} />
            <Route path="profile" element={<DashboardHome />} />
            <Route
              path="admin"
              element={
                <PrivateRoute requiredRole="ADMIN">
                  <AdminPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="admin/companies"
              element={
                <PrivateRoute requiredRole="ADMIN">
                  <CompanyManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="admin/kpi"
              element={
                <PrivateRoute requiredRole="ADMIN">
                  <KPIDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="admin/view-client/:id"
              element={
                <PrivateRoute requiredRole="ADMIN">
                  <ViewClient />
                </PrivateRoute>
              }
            />
            <Route
              path="admin/login-logs"
              element={
                <PrivateRoute requiredRole="ADMIN">
                  <LoginLogs />
                </PrivateRoute>
              }
            />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ConfigProvider>
  );
}

const AppWithTheme = () => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

export default AppWithTheme;
