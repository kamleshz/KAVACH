import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import useAuth from '../hooks/useAuth';

const LoginLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchLogs(pagination.page, searchTerm, controller.signal);
    return () => controller.abort();
  }, [pagination.page, searchTerm]); // Re-fetch on page or search change

  const fetchLogs = async (page, search, signal) => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.USER.LOGIN_ACTIVITY, {
        params: {
          page,
          limit: pagination.limit,
          search
        },
        signal
      });
      if (response.data.success) {
        setLogs(response.data.data);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
      }
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      console.error('Failed to fetch login logs:', error);
      toast.error('Failed to load login history');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on search
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">
            Security Audit
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-gray-900">
            Login History
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor user access, IP addresses, and geographical locations.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
           <div className="flex items-center gap-2">
               <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                   <i className="fas fa-history text-sm"></i>
               </div>
               <h3 className="text-base font-semibold text-gray-800">Audit Trail</h3>
           </div>
           
           <div className="relative w-full sm:w-auto">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <i className="fas fa-search text-xs"></i>
                </span>
                <input
                  type="text"
                  placeholder="Search user, email, IP..."
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-72 bg-white shadow-sm"
                  value={searchTerm}
                  onChange={handleSearch}
                />
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                 <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex justify-center items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                            <span className="text-sm text-gray-500">Loading logs...</span>
                        </div>
                    </td>
                 </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 bg-white">
                    <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                            <i className="fas fa-search text-gray-300"></i>
                        </div>
                        <p className="text-sm font-medium">No logs found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{log.name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500">{log.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {log.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        {log.ipAddress}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        {log.city || log.country ? (
                            <div className="flex items-center gap-1.5">
                                <i className="fas fa-map-marker-alt text-red-400 text-xs"></i>
                                <span className="text-sm text-gray-700">
                                    {log.city ? `${log.city}, ` : ''}{log.country}
                                </span>
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400 italic">Unknown</span>
                        )}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-900">
                                {new Date(log.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-500">
                                {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-xs text-gray-500 max-w-xs truncate block" title={log.userAgent}>
                            {log.userAgent}
                        </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <span className="text-sm font-medium text-gray-700 px-2">
                        Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default LoginLogs;
