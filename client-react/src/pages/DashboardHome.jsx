import KPIDashboard from './KPIDashboard';
import useAuth from '../hooks/useAuth';

const DashboardHome = () => {
  const { user } = useAuth();
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;

  return (
    <KPIDashboard mode={roleName === 'ADMIN' ? 'admin' : 'user'} />
  );
};

export default DashboardHome;
