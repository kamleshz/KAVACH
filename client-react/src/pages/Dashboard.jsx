import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { 
  FaSignOutAlt, 
  FaUsers, 
  FaSpinner, 
  FaCheckCircle 
} from 'react-icons/fa';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalClients: 0,
    inProgress: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.CLIENT.STATS);
        if (response.data?.success) {
          const data = response.data.data;
          setStats({
            totalClients: data.totalClients || 0,
            inProgress: data.statusBreakdown?.inProgress || 0,
            completed: data.statusBreakdown?.completed || 0
          });
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">EPR Kavach Dashboard</h1>
          <button onClick={handleLogout} className="btn-primary flex items-center">
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-8">
        <div className="card">
          <h2 className="text-3xl font-bold mb-4">Welcome, {user?.name}!</h2>
          <p className="text-gray-600">Dashboard with client management will be here</p>
          
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Spin size="large" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="stat-card">
                <FaUsers className="text-4xl mb-3 opacity-80" />
                <h3 className="text-2xl font-bold">{stats.totalClients}</h3>
                <p className="opacity-90">Total Clients</p>
              </div>
              <div className="stat-card bg-gradient-to-br from-primary-500 to-primary-600">
                <FaSpinner className="text-4xl mb-3 opacity-80 animate-spin" />
                <h3 className="text-2xl font-bold">{stats.inProgress}</h3>
                <p className="opacity-90">In Progress</p>
              </div>
              <div className="stat-card bg-gradient-to-br from-green-500 to-green-600">
                <FaCheckCircle className="text-4xl mb-3 opacity-80" />
                <h3 className="text-2xl font-bold">{stats.completed}</h3>
                <p className="opacity-90">Completed</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
