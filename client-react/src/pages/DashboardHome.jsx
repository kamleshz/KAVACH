import KPIDashboard from './KPIDashboard';
import useAuth from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const DashboardHome = () => {
  const { user } = useAuth();
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;

  if (roleName === 'CLIENT' && user?.linkedClient?._id) {
    return <Navigate to={`/dashboard/client/${user.linkedClient._id}`} replace />;
  }

  return (
    <KPIDashboard mode={roleName === 'ADMIN' ? 'admin' : 'user'} />
  );
};

export default DashboardHome;
