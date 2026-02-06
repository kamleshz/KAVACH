import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuth from './hooks/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import AddClient from './pages/AddClient';
import ClientTypeSelection from './pages/ClientTypeSelection';
import EWasteCategorySelection from './pages/EWasteCategorySelection';
import WasteTypeSelection from './pages/WasteTypeSelection';
import EditClient from './pages/EditClient';
import ClientGroupSearch from './pages/ClientGroupSearch';
import ClientValidation from './pages/ClientValidation';
import PlantProcess from './pages/PlantProcess';
import EWasteProcess from './pages/EWasteProcess';
import DocumentViewer from './pages/DocumentViewer';
import AdminPanel from './pages/AdminPanel';
import LoginLogs from './pages/LoginLogs';
import CompanyManagement from './pages/CompanyManagement';
import KPIDashboard from './pages/KPIDashboard';
import ViewClient from './pages/ViewClient';
import PrivateRoute from './components/PrivateRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastContainer position="top-right" autoClose={3000} />
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
          <Route path="client/:id/document/:docId" element={<DocumentViewer />} />
          <Route path="document-viewer" element={<DocumentViewer />} />
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
    </Router>
  );
}

export default App;
