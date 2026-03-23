import { useState, useEffect, useMemo } from 'react';
import { Table, Tag, message, Input, Select, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import { FaRecycle, FaBolt, FaBatteryFull, FaCarSide, FaOilCan, FaPlus, FaLink, FaSearch, FaFilter } from 'react-icons/fa';
import api from '../services/api';
import API_ENDPOINTS from '../services/apiEndpoints';
import { WASTE_TYPES } from '../constants/wasteTypes';

const WASTE_CONFIG = {
  [WASTE_TYPES.PLASTIC]: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: FaRecycle, tag: 'orange' },
  [WASTE_TYPES.E_WASTE]: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: FaBolt, tag: 'blue' },
  [WASTE_TYPES.BATTERY]: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: FaBatteryFull, tag: 'green' },
  [WASTE_TYPES.ELV]: { color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc', icon: FaCarSide, tag: 'cyan' },
  [WASTE_TYPES.USED_OIL]: { color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff', icon: FaOilCan, tag: 'purple' },
};

const KPIDashboard = ({ mode = 'admin' }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_ALL);
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      message.error('Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const counts = { total: 0 };
    Object.values(WASTE_TYPES).forEach(type => { counts[type] = 0; });
    clients.forEach(client => {
      counts.total++;
      if (client.wasteType && counts[client.wasteType] !== undefined) {
        counts[client.wasteType]++;
      }
    });
    return counts;
  }, [clients]);

  const uniqueStates = useMemo(() => {
    const states = clients.map((c) => (c.state || '').toString().trim()).filter(Boolean);
    return Array.from(new Set(states)).sort((a, b) => a.localeCompare(b));
  }, [clients]);

  const uniqueAssignees = useMemo(() => {
    const names = clients.map((c) => c.assignedTo?.name).map((v) => (v || '').toString().trim()).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [clients]);

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch = !q ||
        (client.clientName || '').toLowerCase().includes(q) ||
        (client.wasteType || '').toLowerCase().includes(q) ||
        (client.state || '').toLowerCase().includes(q) ||
        (client.city || '').toLowerCase().includes(q) ||
        (client.assignedTo?.name || '').toLowerCase().includes(q);
      const matchesState = stateFilter === 'All' || client.state === stateFilter;
      const matchesAssignee = assigneeFilter === 'All' || (client.assignedTo?.name || '') === assigneeFilter;
      return matchesSearch && matchesState && matchesAssignee;
    });
  }, [assigneeFilter, clients, searchTerm, stateFilter]);

  const columns = [
    {
      title: 'Company Name',
      dataIndex: 'clientName',
      key: 'clientName',
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
      render: (text) => <span className="font-semibold text-gray-900">{text}</span>
    },
    {
      title: 'Waste Type',
      dataIndex: 'wasteType',
      key: 'wasteType',
      filters: Object.values(WASTE_TYPES).map(type => ({ text: type, value: type })),
      onFilter: (value, record) => record.wasteType === value,
      render: (type) => {
        const cfg = WASTE_CONFIG[type];
        if (!cfg) return <Tag>{type || 'N/A'}</Tag>;
        const Icon = cfg.icon;
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            <Icon className="text-[10px]" /> {type}
          </span>
        );
      }
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      render: (text) => <span className="text-gray-600">{text || '-'}</span>
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      render: (text) => <span className="text-gray-600">{text || '-'}</span>
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (user) => user ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-gray-700 font-medium text-sm">{user.name}</span>
        </div>
      ) : (
        <span className="text-gray-400 italic text-xs">Unassigned</span>
      )
    }
  ];

  const renderClientTable = (wasteType) => {
    const visibleClients = wasteType === 'All' ? filteredClients : filteredClients.filter((c) => c.wasteType === wasteType);
    return (
      <Table
        columns={columns}
        dataSource={visibleClients}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `${total} clients` }}
        size="middle"
      />
    );
  };

  return (
    <div className="p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">KAVACH Audit Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Clients by waste stream, state, and assignment</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/client-connect')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-all"
          >
            <FaLink className="text-xs" /> Client Connect
          </button>
          <button
            onClick={() => navigate('/dashboard/add-client')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-all shadow-sm"
          >
            <FaPlus className="text-xs" /> Add Client
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {Object.entries(WASTE_CONFIG).map(([type, cfg]) => {
          const Icon = cfg.icon;
          const count = stats[type] || 0;
          return (
            <div
              key={type}
              className="bg-white rounded-xl border-2 p-5 hover:shadow-md transition-all group"
              style={{ borderColor: count > 0 ? cfg.border : '#e5e7eb' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: cfg.bg }}
                >
                  <Icon style={{ color: cfg.color }} className="text-lg" />
                </div>
                <span className="text-sm font-bold text-gray-700">{type}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold" style={{ color: count > 0 ? cfg.color : '#9ca3af' }}>{count}</span>
                <span className="text-sm text-gray-400 font-medium">Clients</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      {mode === 'admin' && (
        <div className="mb-5 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 lg:max-w-md">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search company, state, city..."
                className="pl-8"
                allowClear
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-400 text-xs" />
                <Select
                  value={stateFilter}
                  onChange={(v) => setStateFilter(v)}
                  className="sm:min-w-[200px]"
                  options={[
                    { value: 'All', label: 'All States' },
                    ...uniqueStates.map((s) => ({ value: s, label: s })),
                  ]}
                />
              </div>
              <Select
                value={assigneeFilter}
                onChange={(v) => setAssigneeFilter(v)}
                className="sm:min-w-[200px]"
                options={[
                  { value: 'All', label: 'All Assignees' },
                  ...uniqueAssignees.map((n) => ({ value: n, label: n })),
                ]}
              />
              <div className="text-xs text-gray-500 whitespace-nowrap bg-gray-50 px-3 py-1.5 rounded-lg">
                <span className="text-gray-900 font-bold">{filteredClients.length}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-gray-900 font-bold">{clients.length}</span>
                <span className="ml-1">clients</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden [&_.ant-table-thead_th]:!bg-orange-50 [&_.ant-table-thead_th]:!font-extrabold [&_.ant-table-thead_th]:!text-gray-700">
        <Tabs
          defaultActiveKey="All"
          className="px-4 pt-2"
          items={[
            {
              key: 'All',
              label: <span className="font-semibold">All Clients</span>,
              children: renderClientTable('All')
            },
            ...Object.values(WASTE_TYPES).map(type => {
              const cfg = WASTE_CONFIG[type];
              const Icon = cfg?.icon;
              return {
                key: type,
                label: (
                  <span className="flex items-center gap-2 font-medium">
                    {Icon && <Icon style={{ color: cfg.color }} className="text-sm" />} {type}
                  </span>
                ),
                children: renderClientTable(type)
              };
            })
          ]}
        />
      </div>
    </div>
  );
};

export default KPIDashboard;
