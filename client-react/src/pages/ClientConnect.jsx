import { useEffect, useMemo, useState } from 'react';
import { Input, Select, Tag } from 'antd';
import { FaUsers, FaSearch } from 'react-icons/fa';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import { useNavigate } from 'react-router-dom';
import { WASTE_TYPES } from '../constants/wasteTypes';

const { Option } = Select;

const ClientConnect = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wasteType, setWasteType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchClients = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.CLIENT.GET_ALL, { signal });
        const data = response.data?.data || [];
        setClients(data);
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        console.error('Error fetching clients for Client Connect:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();

    return () => {
      controller.abort();
    };
  }, []);

  const filteredClients = useMemo(() => {
    const base =
      wasteType === 'ALL'
        ? clients
        : clients.filter(
            client => (client.wasteType || WASTE_TYPES.PLASTIC) === wasteType
          );

    const term = searchTerm.trim().toLowerCase();
    const bySearch = term
      ? base.filter(client => {
          const name = (client.clientName || '').toLowerCase();
          const group = (client.companyGroupName || '').toLowerCase();
          const entity = (client.entityType || '').toLowerCase();
          return (
            name.includes(term) ||
            group.includes(term) ||
            entity.includes(term)
          );
        })
      : base;

    return [...bySearch].sort((a, b) => {
      const aName = (a.clientName || '').toLowerCase();
      const bName = (b.clientName || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [clients, wasteType, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Client Connect</h1>
            <p className="text-gray-500 mt-2 text-base">
              Select a client to view complete pre-audit details in read-only mode.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {filteredClients.length} client{filteredClients.length === 1 ? '' : 's'} found
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mt-2">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-full flex flex-col">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <FaUsers className="text-lg" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800">Clients</h2>
                    <p className="text-xs text-gray-500">Filter by waste type and click to open details.</p>
                  </div>
                </div>
                  <div className="flex items-center gap-2">
                    <Select
                      size="small"
                      value={wasteType}
                      onChange={value => setWasteType(value)}
                      style={{ minWidth: 160 }}
                    >
                      <Option value="ALL">All Waste Types</Option>
                      <Option value={WASTE_TYPES.PLASTIC}>{WASTE_TYPES.PLASTIC}</Option>
                      <Option value={WASTE_TYPES.E_WASTE}>{WASTE_TYPES.E_WASTE}</Option>
                      <Option value={WASTE_TYPES.BATTERY}>{WASTE_TYPES.BATTERY}</Option>
                      <Option value={WASTE_TYPES.ELV}>{WASTE_TYPES.ELV}</Option>
                      <Option value={WASTE_TYPES.USED_OIL}>{WASTE_TYPES.USED_OIL}</Option>
                    </Select>
                  </div>
                </div>
                <Input
                  size="small"
                  placeholder="Search by client, group or entity type..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  prefix={<FaSearch className="text-gray-400" />}
                  className="rounded-xl"
                />
              </div>

              <div className="mt-2 flex-1 overflow-y-auto border-t border-gray-100 pt-3 space-y-2">
                {filteredClients.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm mt-8">
                    No clients match your current filters.
                  </div>
                ) : (
                  filteredClients.map(client => (
                    <button
                      key={client._id}
                      type="button"
                      onClick={() => navigate(`/dashboard/client-connect/${client._id}`)}
                      className="w-full text-left px-3 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-primary-200 transition-all flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm truncate">
                          {client.clientName || 'Unnamed Client'}
                        </div>
                        <Tag color="orange" className="text-[10px] px-2 py-0.5 rounded-full">
                          {client.wasteType || WASTE_TYPES.PLASTIC}
                        </Tag>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {client.companyGroupName || client.entityType || 'Details not available'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientConnect;
