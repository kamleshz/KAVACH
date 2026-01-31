import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

const ClientGroupSearch = ({ onProcess, isEmbedded = false }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;

    setLoading(true);
    setHasSearched(true);
    try {
      // Using the generic search which now includes companyGroupName
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_ALL, {
        params: { search: term }
      });
      if (response.data.success) {
        setResults(response.data.data || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className={`w-full ${isEmbedded ? '' : 'p-4 md:p-8 min-h-screen'}`}>
      <div className="w-full mx-auto">
        {!isEmbedded && (
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Client Group Search
                </h1>
                <p className="text-gray-600 mt-2">Search clients by Company Name</p>
            </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <form onSubmit={handleSearch} className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Company Name
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Enter company name..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all outline-none"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading || !searchTerm.trim()}
                    className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                    Search
                </button>
            </form>
        </div>

        {hasSearched && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fadeIn">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Client Legal Name</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Company Group</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Entity Type</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Audit Period</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {results?.length > 0 ? (
                                results.map((client) => (
                                    <tr key={client._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-800 font-medium">{client.clientName}</td>
                                        <td className="p-4 text-gray-600">{client.companyGroupName || '-'}</td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                                                {client.entityType}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {client.auditStartDate && client.auditEndDate ? (
                                                <div className="flex flex-col">
                                                    <span>
                                                        {new Date(client.auditStartDate).toLocaleDateString()} - {new Date(client.auditEndDate).toLocaleDateString()}
                                                    </span>
                                                    {new Date(client.auditEndDate) < new Date() && (
                                                        <span className="text-red-500 text-xs font-bold mt-1 bg-red-50 px-2 py-1 rounded w-fit flex items-center gap-1">
                                                            <i className="fas fa-exclamation-circle"></i>
                                                            Audit Period Expired
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/dashboard/client/${client._id}`)}
                                                    className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-700 flex items-center justify-center transition-colors"
                                                    title="View Details"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (onProcess) {
                                                            onProcess(client);
                                                        } else if (isEmbedded) {
                                                            // For embedded mode (like in AddClient tab), we trigger onProcess if available
                                                            // If not available, we might want to stay in same page but show detail
                                                            if (onProcess) onProcess(client);
                                                        } else {
                                                            navigate(`/dashboard/client/${client._id}`, { state: { viewMode: 'process' } });
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium flex items-center gap-1"
                                                >
                                                    <i className="fas fa-cog"></i>
                                                    Click to Process
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <i className="fas fa-search text-4xl text-gray-200 mb-3"></i>
                                            <p>No clients found matching "{searchTerm}"</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ClientGroupSearch;