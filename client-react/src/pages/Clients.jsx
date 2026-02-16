import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input, Select } from 'antd';
import { 
  FaEdit, 
  FaClipboardCheck, 
  FaTrashAlt, 
  FaExclamationTriangle, 
  FaSpinner, 
  FaPlus, 
  FaUsers, 
  FaSearch, 
  FaFilter, 
  FaChevronDown, 
  FaPhoneAlt 
} from 'react-icons/fa';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import useAuth from '../hooks/useAuth';
import { WASTE_TYPES } from '../constants/wasteTypes';

const DeleteModal = ({ isOpen, onClose, onConfirm, clientName, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <FaExclamationTriangle className="text-red-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Delete Client
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete <span className="font-bold text-gray-800">{clientName}</span>? All of their data will be permanently removed. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${isDeleting ? 'opacity-75 cursor-not-allowed' : ''}`}
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



// Inline action icons for view/edit/delete
const ActionIcons = ({ onEdit, onView, onDelete, onAudit }) => {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={onEdit}
        className="group relative p-2.5 rounded-xl text-blue-500 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-200 shadow-sm"
      >
        <FaEdit className="text-lg" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">Edit Client</span>
      </button>
      <button
        onClick={onAudit}
        className="group relative p-2.5 rounded-xl text-amber-500 bg-amber-50 hover:bg-amber-600 hover:text-white transition-all duration-200 shadow-sm"
      >
        <FaClipboardCheck className="text-lg" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">Audit Client</span>
      </button>
      <button
        onClick={onDelete}
        className="group relative p-2.5 rounded-xl text-red-500 bg-red-50 hover:bg-red-600 hover:text-white transition-all duration-200 shadow-sm"
      >
        <FaTrashAlt className="text-lg" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">Delete</span>
      </button>
    </div>
  );
};

const Clients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentWasteType = searchParams.get('wasteType') || WASTE_TYPES.PLASTIC;

  const { user, isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  
  // Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetchClients(signal);

    return () => {
      controller.abort();
    };
  }, [user]);

  const fetchClients = async (signal) => {
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_ALL, { signal });
      setClients(response.data.data || []);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const wasteTypeClients = useMemo(() => {
    return clients.filter(client => (client.wasteType || WASTE_TYPES.PLASTIC) === currentWasteType);
  }, [clients, currentWasteType]);

  const uniqueEntityTypes = useMemo(() => {
    const types = wasteTypeClients.map(client => client.entityType).filter(Boolean);
    return [...new Set(types)];
  }, [wasteTypeClients]);

  const filteredClients = useMemo(() => {
    return wasteTypeClients.filter(client => {
      const matchesSearch =
        (client.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.contactPerson?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.entityType?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'All' || client.entityType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [wasteTypeClients, searchTerm, typeFilter]);

  const activeAuditsCount = useMemo(() => {
    let count = 0;
    wasteTypeClients.forEach(client => {
      const cteList = client.productionFacility?.cteDetailsList || [];
      const ctoList = client.productionFacility?.ctoDetailsList || [];

      const hasActiveAudit = [...cteList, ...ctoList].some(item => {
        const steps = item.completedSteps?.length || 0;
        return steps > 0 && steps < 5;
      });

      if (hasActiveAudit) count++;
    });
    return count;
  }, [wasteTypeClients]);

  const getBadgeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'producer': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'brand owner': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'importer': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pwp': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleViewClient = (id) => navigate(`/dashboard/client/${id}/edit`, { state: { viewMode: true } });
  const handleEditClient = (id) => navigate(`/dashboard/client/${id}/edit`);
  const handleAuditClient = (id) => navigate(`/dashboard/client/${id}/audit`);

  const promptDeleteClient = (client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await api.delete(API_ENDPOINTS.CLIENT.DELETE(clientToDelete._id));
      if (response.data.success) {
        fetchClients();
        setIsDeleteModalOpen(false);
        setClientToDelete(null);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete client.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {currentWasteType ? `${currentWasteType} Portfolio` : 'Clients Portfolio'}
            </h1>
            <p className="text-gray-500 mt-2 text-lg">Manage, monitor, and audit your client base efficiently.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/add-client')}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <FaPlus className="mr-2.5" />
            Add New Client
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 flex items-center text-white transform hover:scale-[1.02] transition-transform duration-300">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mr-5 shadow-inner">
                    <FaUsers className="text-2xl" />
                </div>
                <div>
                    <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Total Clients</p>
                    <p className="text-3xl font-bold">{wasteTypeClients.length}</p>
                </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 flex items-center text-white transform hover:scale-[1.02] transition-transform duration-300">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mr-5 shadow-inner">
                    <FaClipboardCheck className="text-2xl" />
                </div>
                <div>
                    <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Active Audits</p>
                    <p className="text-3xl font-bold">{activeAuditsCount}</p>
                </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg p-6 flex items-center text-white transform hover:scale-[1.02] transition-transform duration-300">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mr-5 shadow-inner">
                    <FaExclamationTriangle className="text-2xl" />
                </div>
                <div>
                    <p className="text-amber-100 text-sm font-medium uppercase tracking-wider">Pending Actions</p>
                    <p className="text-3xl font-bold">--</p>
                </div>
            </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <Input
              prefix={<FaSearch className="text-gray-400 group-focus-within:text-primary-500 transition-colors" />}
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl py-2"
              size="large"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none min-w-[200px]">
                <Select
                    value={typeFilter}
                    onChange={(value) => setTypeFilter(value)}
                    className="w-full"
                    size="large"
                    suffixIcon={<FaChevronDown className="text-xs text-gray-400" />}
                >
                    <Select.Option value="All">All Types</Select.Option>
                    {uniqueEntityTypes.map(type => (
                    <Select.Option key={type} value={type}>{type}</Select.Option>
                    ))}
                </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="bg-blue-50 rounded-full h-24 w-24 flex items-center justify-center mb-6 animate-pulse">
               <FaSearch className="text-4xl text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              {searchTerm || typeFilter !== 'All' 
                ? 'We couldn\'t find any clients matching your current filters. Try adjusting your search criteria.' 
                : 'Get started by adding your first client to the platform.'}
            </p>
            {!searchTerm && typeFilter === 'All' && (
              <button
                onClick={() => navigate('/dashboard/add-client')}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg shadow-blue-500/30 text-base font-medium rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transition-all transform hover:-translate-y-0.5"
              >
                <FaPlus className="mr-2" />
                Add Client
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th scope="col" className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Client Name</th>
                    <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Entity Type</th>
                    <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Person</th>
                    <th scope="col" className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned To</th>
                    <th scope="col" className="px-8 py-5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredClients.map((client) => (
                    <tr key={client._id} className="group hover:bg-blue-50/30 transition-colors duration-200">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-11 w-11 flex-shrink-0 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 bg-gradient-to-br ${
                              ['from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-emerald-400 to-emerald-600', 'from-amber-400 to-amber-600', 'from-rose-400 to-rose-600'][client.clientName.length % 5]
                          } text-white`}>
                            <span className="font-bold text-lg">{client.clientName?.charAt(0).toUpperCase() || '?'}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{client.clientName}</div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                    <FaPhoneAlt className="text-gray-400" />
                                    {client.contactPerson?.mobile || 'N/A'}
                                </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-lg border ${getBadgeColor(client.entityType)}`}>
                          {client.entityType}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">{client.contactPerson?.name || 'N/A'}</span>
                            <span className="text-xs text-gray-500">{client.contactPerson?.email || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm">
                          {client.assignedTo ? (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold border border-indigo-200">
                                    {client.assignedTo.name?.charAt(0) || 'U'}
                                </div>
                                <span className="font-medium text-gray-700">
                                  {client.assignedTo.name}
                                </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div className="transition-opacity duration-200">
                            <ActionIcons
                            onView={() => handleViewClient(client._id)}
                            onEdit={() => handleEditClient(client._id)}
                            onAudit={() => handleAuditClient(client._id)}
                            onDelete={() => promptDeleteClient(client)}
                            />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer */}
            <div className="bg-gray-50/50 px-8 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Showing <span className="text-gray-900">{filteredClients.length}</span> of <span className="text-gray-900">{wasteTypeClients.length}</span> clients
                </div>
                <div className="flex gap-2">
                    <button disabled className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 bg-white cursor-not-allowed hover:bg-gray-50 transition-colors">
                        Previous
                    </button>
                    <button disabled className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 bg-white cursor-not-allowed hover:bg-gray-50 transition-colors">
                        Next
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteClient}
        clientName={clientToDelete?.clientName}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Clients;
