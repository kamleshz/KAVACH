import { useEffect, useMemo, useState } from 'react';
import { Select, Empty } from 'antd';
import { FaUsers, FaSearch, FaBuilding, FaIndustry, FaRecycle, FaBolt, FaOilCan, FaCarSide, FaTimes, FaChevronRight, FaBatteryFull } from 'react-icons/fa';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import { useNavigate } from 'react-router-dom';
import { WASTE_TYPES } from '../constants/wasteTypes';

const { Option } = Select;

const WASTE_CONFIG = {
  [WASTE_TYPES.PLASTIC]: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: FaRecycle, label: 'Plastic Waste' },
  [WASTE_TYPES.E_WASTE]: { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: FaBolt, label: 'E-Waste' },
  [WASTE_TYPES.BATTERY]: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: FaBatteryFull, label: 'Battery Waste' },
  [WASTE_TYPES.ELV]: { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: FaCarSide, label: 'ELV' },
  [WASTE_TYPES.USED_OIL]: { color: '#b45309', bg: '#fffbeb', border: '#fde68a', icon: FaOilCan, label: 'Used Oil' },
};

const getWasteConfig = (type) => WASTE_CONFIG[type] || WASTE_CONFIG[WASTE_TYPES.PLASTIC];

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
    return () => controller.abort();
  }, []);

  const filteredClients = useMemo(() => {
    const base = wasteType === 'ALL'
      ? clients
      : clients.filter(client => (client.wasteType || WASTE_TYPES.PLASTIC) === wasteType);

    const term = searchTerm.trim().toLowerCase();
    const bySearch = term
      ? base.filter(client => {
          const name = (client.clientName || '').toLowerCase();
          const group = (client.companyGroupName || '').toLowerCase();
          const entity = (client.entityType || '').toLowerCase();
          return name.includes(term) || group.includes(term) || entity.includes(term);
        })
      : base;

    return [...bySearch].sort((a, b) =>
      (a.clientName || '').toLowerCase().localeCompare((b.clientName || '').toLowerCase())
    );
  }, [clients, wasteType, searchTerm]);

  const wasteStats = useMemo(() => {
    const stats = {};
    clients.forEach(c => {
      const wt = c.wasteType || WASTE_TYPES.PLASTIC;
      stats[wt] = (stats[wt] || 0) + 1;
    });
    return stats;
  }, [clients]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary-200 border-t-primary-600" />
          <FaUsers className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600 text-lg" />
        </div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Loading clients...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <FaUsers className="text-lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Connect</h1>
              <p className="text-sm text-gray-500">
                Select a client to view complete pre-audit details in read-only mode.
              </p>
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
            <span className="text-primary-600 text-base">{filteredClients.length}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-gray-700">{clients.length}</span>
            <span className="text-gray-500 ml-1 font-normal">clients</span>
          </div>
        </div>

        {/* Waste Type Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(WASTE_CONFIG).map(([type, cfg]) => {
            const count = wasteStats[type] || 0;
            const isActive = wasteType === type;
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setWasteType(isActive ? 'ALL' : type)}
                className={`
                  relative flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 transition-all duration-200 text-left
                  ${isActive
                    ? 'shadow-md scale-[1.02]'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }
                `}
                style={isActive ? { borderColor: cfg.color, backgroundColor: cfg.bg } : {}}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isActive ? cfg.color + '22' : '#f3f4f6' }}
                >
                  <Icon style={{ color: isActive ? cfg.color : '#9ca3af' }} className="text-sm" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold leading-tight" style={{ color: isActive ? cfg.color : '#1f2937' }}>{count}</div>
                  <div className="text-[10px] font-medium text-gray-500 truncate leading-tight">{cfg.label}</div>
                </div>
                {isActive && (
                  <div
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: cfg.color }}
                  >
                    <FaTimes className="text-white text-[8px]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3.5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search by client name, group or entity type..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all placeholder:text-gray-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>
            <Select
              value={wasteType}
              onChange={value => setWasteType(value)}
              className="min-w-[180px]"
              size="large"
              popupMatchSelectWidth={false}
            >
              <Option value="ALL">All Waste Types</Option>
              {Object.entries(WASTE_CONFIG).map(([type, cfg]) => (
                <Option key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </span>
                </Option>
              ))}
            </Select>
          </div>
        </div>

        {/* Client Cards Grid */}
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 px-6">
            <Empty
              description={
                <div className="text-center">
                  <p className="text-gray-500 font-medium text-base">No clients match your filters</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your search or waste type filter</p>
                </div>
              }
            />
            {(searchTerm || wasteType !== 'ALL') && (
              <div className="text-center mt-5">
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setWasteType('ALL'); }}
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                >
                  <FaTimes className="text-xs" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredClients.map(client => {
              const wt = client.wasteType || WASTE_TYPES.PLASTIC;
              const cfg = getWasteConfig(wt);
              const WasteIcon = cfg.icon;
              const initial = (client.clientName || 'U')[0].toUpperCase();

              return (
                <button
                  key={client._id}
                  type="button"
                  onClick={() => navigate(`/dashboard/client-connect/${client._id}`, { state: { clientName: client.clientName } })}
                  className="group relative bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
                >
                  <div className="h-1 w-full" style={{ backgroundColor: cfg.color }} />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-primary-600 transition-colors">
                            {client.clientName || 'Unnamed Client'}
                          </h3>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {client.companyGroupName || client.entityType || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide flex-shrink-0"
                        style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        <WasteIcon className="text-[9px]" />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                      {client.entityType && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <FaBuilding className="text-gray-400 text-[10px]" />
                          <span className="truncate max-w-[120px]">{client.entityType}</span>
                        </div>
                      )}
                      {client.state && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <FaIndustry className="text-gray-400 text-[10px]" />
                          <span className="truncate max-w-[100px]">{client.state}</span>
                        </div>
                      )}
                      <div className="ml-auto flex items-center gap-1 text-xs text-primary-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        View <FaChevronRight className="text-[9px]" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientConnect;
