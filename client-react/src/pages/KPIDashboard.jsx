import { useState, useEffect, useMemo } from 'react';
import { Input, Select, message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaBatteryFull,
  FaBolt,
  FaBuilding,
  FaCarSide,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaEllipsisV,
  FaMapMarkerAlt,
  FaOilCan,
  FaPlus,
  FaRecycle,
  FaSearch,
  FaSort,
  FaTimes,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import api from '../services/api';
import API_ENDPOINTS from '../services/apiEndpoints';
import { WASTE_TYPES } from '../constants/wasteTypes';
import GsapRevealGroup from '../components/GsapRevealGroup';
import GsapCountUp from '../components/GsapCountUp';
import useAuth from '../hooks/useAuth';

const WASTE_CONFIG = {
  [WASTE_TYPES.PLASTIC]: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: FaRecycle },
  [WASTE_TYPES.E_WASTE]: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: FaBolt },
  [WASTE_TYPES.BATTERY]: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: FaBatteryFull },
  [WASTE_TYPES.ELV]: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: FaCarSide },
  [WASTE_TYPES.USED_OIL]: { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', icon: FaOilCan },
};

const ALL_WASTE_TAB = 'All';
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const getClientState = (client) =>
  client?.state ||
  client?.registeredOfficeAddress?.state ||
  client?.communicationAddress?.state ||
  '';

const getClientCity = (client) =>
  client?.city ||
  client?.registeredOfficeAddress?.city ||
  client?.communicationAddress?.city ||
  '';

const getClientSubtitle = (client) =>
  client?.tradeName ||
  client?.companyGroupName ||
  client?.companyDetails?.cin ||
  client?.companyDetails?.pan ||
  client?.entityType ||
  'Audit client';

const getAssignedName = (client) => client?.assignedTo?.name || '';

const getInitials = (value = '') =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'KV';

const formatDashboardDate = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);

const buildPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 'ellipsis-right', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis-left', totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis-left', currentPage, 'ellipsis-right', totalPages];
};

const KPIDashboard = ({ mode = 'admin' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const buildClientRouteState = (client) => ({
    clientName: client?.clientName || 'Client',
    from: `${location.pathname}${location.search}`,
  });
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [activeWasteType, setActiveWasteType] = useState(ALL_WASTE_TAB);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: 'clientName',
    direction: 'asc',
  });

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
    Object.values(WASTE_TYPES).forEach((type) => {
      counts[type] = 0;
    });
    clients.forEach((client) => {
      counts.total++;
      if (client.wasteType && counts[client.wasteType] !== undefined) {
        counts[client.wasteType]++;
      }
    });
    return counts;
  }, [clients]);

  const uniqueStates = useMemo(() => {
    const states = clients
      .map((client) => getClientState(client).toString().trim())
      .filter(Boolean);
    return Array.from(new Set(states)).sort((a, b) => a.localeCompare(b));
  }, [clients]);

  const uniqueAssignees = useMemo(() => {
    const names = clients
      .map((client) => getAssignedName(client))
      .map((value) => (value || '').toString().trim())
      .filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [clients]);

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return clients.filter((client) => {
      const state = getClientState(client);
      const city = getClientCity(client);
      const assignee = getAssignedName(client);
      const subtitle = getClientSubtitle(client);
      const matchesSearch = !q ||
        (client.clientName || '').toLowerCase().includes(q) ||
        subtitle.toLowerCase().includes(q) ||
        (client.wasteType || '').toLowerCase().includes(q) ||
        state.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q) ||
        assignee.toLowerCase().includes(q);
      const matchesState = stateFilter === 'All' || state === stateFilter;
      const matchesAssignee = assigneeFilter === 'All' || assignee === assigneeFilter;
      return matchesSearch && matchesState && matchesAssignee;
    });
  }, [assigneeFilter, clients, searchTerm, stateFilter]);

  const filteredStats = useMemo(() => {
    const counts = { total: filteredClients.length };
    Object.values(WASTE_TYPES).forEach((type) => {
      counts[type] = 0;
    });
    filteredClients.forEach((client) => {
      if (counts[client.wasteType] !== undefined) {
        counts[client.wasteType]++;
      }
    });
    return counts;
  }, [filteredClients]);

  const activeClients = useMemo(() => {
    if (activeWasteType === ALL_WASTE_TAB) return filteredClients;
    return filteredClients.filter((client) => client.wasteType === activeWasteType);
  }, [activeWasteType, filteredClients]);

  const sortedClients = useMemo(() => {
    const getValue = (client) => {
      if (sortConfig.key === 'state') return getClientState(client);
      if (sortConfig.key === 'city') return getClientCity(client);
      if (sortConfig.key === 'assignedTo') return getAssignedName(client);
      return client?.[sortConfig.key] || '';
    };

    return [...activeClients].sort((a, b) => {
      const valueA = getValue(a).toString().toLowerCase();
      const valueB = getValue(b).toString().toLowerCase();
      const result = valueA.localeCompare(valueB, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [activeClients, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeWasteType, assigneeFilter, pageSize, searchTerm, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(sortedClients.length / pageSize));
  const currentPageClamped = Math.min(currentPage, totalPages);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPageClamped - 1) * pageSize;
    return sortedClients.slice(startIndex, startIndex + pageSize);
  }, [currentPageClamped, pageSize, sortedClients]);

  const paginationItems = useMemo(
    () => buildPaginationItems(currentPageClamped, totalPages),
    [currentPageClamped, totalPages],
  );

  const resultsLabel = useMemo(() => {
    if (sortedClients.length === 0) return 'Showing 0 results';
    const start = (currentPageClamped - 1) * pageSize + 1;
    const end = Math.min(currentPageClamped * pageSize, sortedClients.length);
    return `Showing ${start} to ${end} of ${sortedClients.length} clients`;
  }, [currentPageClamped, pageSize, sortedClients.length]);

  const activeRole =
    typeof user?.role === 'string' ? user.role : user?.role?.name || 'TEAM MEMBER';

  const todayLabel = formatDashboardDate(new Date());

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key,
        direction: 'asc',
      };
    });
  };

  const renderSortButton = (label, key, align = 'left') => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${
          isActive ? 'theme-page-title' : 'theme-page-muted'
        } ${align === 'center' ? 'mx-auto' : ''}`}
      >
        <span>{label}</span>
        <FaSort className={`text-[10px] ${isActive ? 'theme-page-brand' : 'theme-page-muted'}`} />
      </button>
    );
  };

  return (
    <div className="theme-page w-full">
      <GsapRevealGroup
        className="theme-page-card mb-5 xl:mb-6 overflow-hidden rounded-[28px]"
        animateKey="kpi-hero"
      >
        <div className="flex flex-col gap-4 p-3 md:p-4 lg:p-5 2xl:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard/add-client')}
              className="inline-flex h-11 min-w-[9.5rem] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            >
              <FaPlus className="text-xs" />
              <span>Add Client</span>
            </button>

            <div className="flex items-center gap-4">
              <div className="theme-page-brand-soft flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold">
                {getInitials(user?.name)}
              </div>
              <div>
                <h1 className="theme-page-title text-xl md:text-2xl font-bold tracking-tight">
                  Welcome to <span className="theme-page-brand">EPR KAVACH</span>
                </h1>
                <div className="theme-page-text mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="theme-page-title font-semibold">{user?.name || 'Team Member'}</span>
                  <span>{user?.email || 'Audit dashboard access'}</span>
                  <span className="theme-page-brand-soft rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                    {activeRole}
                  </span>
                  <span>{todayLabel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:min-w-[250px]">
            <div className="theme-page-card-muted rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3">
              <div className="theme-page-muted text-xs font-semibold uppercase tracking-[0.18em]">
                Total Clients
              </div>
              <div className="mt-2 flex items-end gap-2">
                <GsapCountUp
                  value={stats.total}
                  animateKey="dashboard-total"
                  className="theme-page-title text-2xl font-bold"
                />
                <span className="theme-page-text pb-1 text-xs">registered</span>
              </div>
            </div>
            <div className="theme-page-brand-soft rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                Filtered
              </div>
              <div className="mt-2 flex items-end gap-2">
                <GsapCountUp
                  value={filteredClients.length}
                  animateKey="dashboard-filtered"
                  className="text-2xl font-bold"
                />
                <span className="pb-1 text-xs opacity-80">visible now</span>
              </div>
            </div>
          </div>
        </div>
      </GsapRevealGroup>

      <GsapRevealGroup
        className="theme-page-card mb-4 lg:mb-5 rounded-[24px] p-3 md:p-4"
        animateKey="kpi-filters"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1 xl:max-w-md">
            <FaSearch className="theme-page-muted pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by company name, state, city..."
              className="h-11 rounded-2xl pl-11"
              allowClear
            />
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:max-w-[740px]">
            <Select
              value={stateFilter}
              onChange={setStateFilter}
              suffixIcon={<FaChevronDown className="text-xs text-gray-400" />}
              className="h-11"
              options={[
                { value: 'All', label: 'All States' },
                ...uniqueStates.map((state) => ({ value: state, label: state })),
              ]}
            />

            {mode === 'admin' ? (
              <Select
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                suffixIcon={<FaChevronDown className="text-xs text-gray-400" />}
                className="h-11"
                options={[
                  { value: 'All', label: 'All Assignees' },
                  ...uniqueAssignees.map((name) => ({ value: name, label: name })),
                ]}
              />
            ) : (
              <div className="theme-page-card-muted theme-page-text flex h-11 items-center rounded-2xl px-4 text-sm font-medium">
                <FaUserTie className="theme-page-muted mr-2 text-xs" />
                Assignee filters available in admin view
              </div>
            )}

            <div className="theme-page-brand-soft flex h-11 items-center justify-between rounded-2xl px-4">
              <div className="flex items-center gap-2">
                <FaUsers className="text-sm" />
                <span className="text-sm font-semibold">Clients</span>
              </div>
              <span className="text-sm font-bold">{filteredClients.length}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStateFilter('All');
              setAssigneeFilter('All');
              setActiveWasteType(ALL_WASTE_TAB);
            }}
            className="theme-page-button-muted inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition"
          >
            <FaTimes className="text-xs" />
            Clear
          </button>
        </div>
      </GsapRevealGroup>

      <GsapRevealGroup
        className="theme-page-card overflow-hidden rounded-[28px]"
        animateKey={`kpi-table-${activeWasteType}`}
      >
        <div className="px-3 pt-3 md:px-4 md:pt-4" style={{ borderBottom: '1px solid var(--app-border)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveWasteType(ALL_WASTE_TAB)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                activeWasteType === ALL_WASTE_TAB
                  ? 'theme-page-tab-active shadow-sm'
                  : 'theme-page-tab'
              }`}
            >
              <FaUsers className="text-sm" />
              <span>All Clients</span>
              <span className="theme-page-card rounded-full px-2 py-0.5 text-xs theme-page-text">
                {filteredStats.total}
              </span>
            </button>

            {Object.values(WASTE_TYPES).map((type) => {
              const config = WASTE_CONFIG[type];
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveWasteType(type)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeWasteType === type ? 'shadow-sm' : 'theme-page-tab'
                  }`}
                  style={
                    activeWasteType === type
                      ? {
                          color: config.color,
                          backgroundColor: config.bg,
                          border: `1px solid ${config.border}`,
                        }
                      : undefined
                  }
                >
                  <Icon className="text-sm" style={{ color: activeWasteType === type ? config.color : undefined }} />
                  <span>{type}</span>
                  <span className="theme-page-card rounded-full px-2 py-0.5 text-xs theme-page-text">
                    {filteredStats[type]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                <th className="theme-page-table-head px-6 py-4 text-left">{renderSortButton('Company Name', 'clientName')}</th>
                <th className="theme-page-table-head px-4 py-4 text-left">{renderSortButton('Waste Type', 'wasteType')}</th>
                <th className="theme-page-table-head px-4 py-4 text-left">{renderSortButton('State', 'state')}</th>
                <th className="theme-page-table-head px-4 py-4 text-left">{renderSortButton('City', 'city')}</th>
                <th className="theme-page-table-head px-4 py-4 text-left">{renderSortButton('Assigned To', 'assignedTo')}</th>
                <th className="theme-page-table-head px-4 py-4 text-right">
                  <span className="theme-page-muted text-xs font-semibold uppercase tracking-[0.18em]">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <div className="theme-page-empty-icon flex h-14 w-14 items-center justify-center rounded-2xl">
                        <FaBuilding className="text-xl" />
                      </div>
                      <h3 className="theme-page-title mt-4 text-lg font-semibold">No clients found</h3>
                      <p className="theme-page-text mt-1 text-sm">
                        Try changing the search, state, assignee, or waste type filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => {
                  const wasteConfig = WASTE_CONFIG[client.wasteType];
                  const WasteIcon = wasteConfig?.icon || FaBuilding;
                  const state = getClientState(client);
                  const city = getClientCity(client);
                  const assignedName = getAssignedName(client);
                  const subtitle = getClientSubtitle(client);

                  return (
                    <tr key={client._id} className="theme-page-row group">
                      <td className="px-6 py-3.5" style={{ borderTop: '1px solid var(--app-border)' }}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/dashboard/client/${client._id}`, {
                              state: buildClientRouteState(client),
                            })
                          }
                          className="flex items-center gap-4 text-left"
                        >
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: wasteConfig?.bg || '#f3f4f6' }}
                          >
                            <WasteIcon
                              className="text-lg"
                              style={{ color: wasteConfig?.color || '#6b7280' }}
                            />
                          </div>
                          <div>
                            <div className="theme-page-title font-semibold transition group-hover:text-primary-600">
                              {client.clientName}
                            </div>
                            <div className="theme-page-muted mt-1 text-xs">{subtitle}</div>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-4" style={{ borderTop: '1px solid var(--app-border)' }}>
                        <span
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                          style={{
                            backgroundColor: wasteConfig?.bg || '#f3f4f6',
                            color: wasteConfig?.color || '#4b5563',
                            border: `1px solid ${wasteConfig?.border || '#d1d5db'}`,
                          }}
                        >
                          <WasteIcon className="text-[11px]" />
                          {client.wasteType || 'N/A'}
                        </span>
                      </td>
                      <td className="theme-page-text px-4 py-4 text-sm" style={{ borderTop: '1px solid var(--app-border)' }}>
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="theme-page-muted text-xs" />
                          <span>{state || '-'}</span>
                        </div>
                      </td>
                      <td className="theme-page-text px-4 py-4 text-sm" style={{ borderTop: '1px solid var(--app-border)' }}>
                        {city || '-'}
                      </td>
                      <td className="px-4 py-4" style={{ borderTop: '1px solid var(--app-border)' }}>
                        {assignedName ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-semibold text-white shadow-sm">
                              {getInitials(assignedName)}
                            </div>
                            <div>
                              <div className="theme-page-title text-sm font-semibold">{assignedName}</div>
                              <div className="theme-page-muted text-xs">Assigned auditor</div>
                            </div>
                          </div>
                        ) : (
                          <span className="theme-page-muted text-sm italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right" style={{ borderTop: '1px solid var(--app-border)' }}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/dashboard/client/${client._id}`, {
                              state: buildClientRouteState(client),
                            })
                          }
                          className="theme-page-button-muted inline-flex h-10 w-10 items-center justify-center rounded-xl transition"
                          aria-label={`Open ${client.clientName}`}
                        >
                          <FaEllipsisV className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between" style={{ borderTop: '1px solid var(--app-border)' }}>
          <div className="theme-page-text text-sm">{resultsLabel}</div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPageClamped === 1}
                className="theme-page-button-muted inline-flex h-10 w-10 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaChevronLeft className="text-xs" />
              </button>

              <div className="flex items-center gap-2">
                {paginationItems.map((item) =>
                  typeof item === 'number' ? (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                        item === currentPageClamped
                          ? 'theme-page-tab-active'
                          : 'theme-page-button-muted'
                      }`}
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={item} className="theme-page-muted px-1 text-sm">
                      ...
                    </span>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPageClamped === totalPages}
                className="theme-page-button-muted inline-flex h-10 w-10 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="theme-page-text text-sm">Rows</span>
              <Select
                value={pageSize}
                onChange={setPageSize}
                suffixIcon={<FaChevronDown className="text-xs text-gray-400" />}
                className="min-w-[110px]"
                options={PAGE_SIZE_OPTIONS.map((value) => ({
                  value,
                  label: `${value} per page`,
                }))}
              />
            </div>
          </div>
        </div>
      </GsapRevealGroup>
    </div>
  );
};

export default KPIDashboard;
