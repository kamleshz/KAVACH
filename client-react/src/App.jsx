import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import useAuth from './hooks/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import DashboardLayout from './layouts/DashboardLayout';
import PrivateRoute from './components/PrivateRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import IdleTimer from './components/IdleTimer';

// Lazy load heavy components
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const AddClient = lazy(() => import('./pages/AddClient'));
const ClientTypeSelection = lazy(() => import('./pages/ClientTypeSelection'));
const EWasteCategorySelection = lazy(() => import('./features/ewaste/pages/EWasteCategorySelection'));
const WasteTypeSelection = lazy(() => import('./pages/WasteTypeSelection'));
const EditClient = lazy(() => import('./pages/EditClient'));
const ClientGroupSearch = lazy(() => import('./pages/ClientGroupSearch'));
const ClientValidation = lazy(() => import('./pages/ClientValidation'));
const PlantProcess = lazy(() => import('./pages/PlantProcess'));
const EWasteProcess = lazy(() => import('./features/ewaste/pages/EWasteProcess'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const LoginLogs = lazy(() => import('./pages/LoginLogs'));
const CompanyManagement = lazy(() => import('./pages/CompanyManagement'));
const KPIDashboard = lazy(() => import('./pages/KPIDashboard'));
const ViewClient = lazy(() => import('./pages/ViewClient'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
  </div>
);

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastContainer position="top-right" autoClose={3000} />
      {/* 10 minutes = 600000 ms */}
      <IdleTimer timeout={600000} />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
          <Route index element={<DashboardHome />} />
          <Route path="clients" element={<Clients />} />
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
  );
}

export default App;
