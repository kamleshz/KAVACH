import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">EPR Kavach Dashboard</h1>
          <button onClick={handleLogout} className="btn-primary">
            <i className="fas fa-sign-out-alt mr-2"></i>
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-8">
        <div className="card">
          <h2 className="text-3xl font-bold mb-4">Welcome, {user?.name}!</h2>
          <p className="text-gray-600">Dashboard with client management will be here</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="stat-card">
              <i className="fas fa-users text-4xl mb-3 opacity-80"></i>
              <h3 className="text-2xl font-bold">0</h3>
              <p className="opacity-90">Total Clients</p>
            </div>
            <div className="stat-card bg-gradient-to-br from-primary-500 to-primary-600">
              <i className="fas fa-spinner text-4xl mb-3 opacity-80"></i>
              <h3 className="text-2xl font-bold">0</h3>
              <p className="opacity-90">In Progress</p>
            </div>
            <div className="stat-card bg-gradient-to-br from-green-500 to-green-600">
              <i className="fas fa-check-circle text-4xl mb-3 opacity-80"></i>
              <h3 className="text-2xl font-bold">0</h3>
              <p className="opacity-90">Completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
