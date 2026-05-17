import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input, Select, message } from 'antd';
import {
  FaBolt,
  FaBatteryFull,
  FaBuilding,
  FaCarSide,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardCheck,
  FaEdit,
  FaEllipsisV,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaOilCan,
  FaPhoneAlt,
  FaPlus,
  FaRecycle,
  FaSearch,
  FaSort,
  FaSpinner,
  FaTimes,
  FaTrashAlt,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import useAuth from '../hooks/useAuth';
import { WASTE_TYPES } from '../constants/wasteTypes';
import GsapRevealGroup from '../components/GsapRevealGroup';
import GsapCountUp from '../components/GsapCountUp';

const WASTE_CONFIG = {
  [WASTE_TYPES.PLASTIC]: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: FaRecycle },
  [WASTE_TYPES.E_WASTE]: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: FaBolt },
  [WASTE_TYPES.BATTERY]: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: FaBatteryFull },
  [WASTE_TYPES.ELV]: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: FaCarSide },
  [WASTE_TYPES.USED_OIL]: { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', icon: FaOilCan },
};

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

const getAssignedName = (client) => client?.assignedTo?.name || '';

const getContactName = (client) =>
  client?.contactPerson?.name ||
  client?.coordinatingPerson?.name ||
  client?.authorisedPerson?.name ||
  '';

const getContactEmail = (client) =>
  client?.contactPerson?.email ||
  client?.coordinatingPerson?.email ||
  client?.authorisedPerson?.email ||
  '';

const getContactPhone = (client) =>
  client?.contactPerson?.mobile ||
  client?.contactPerson?.number ||
  client?.coordinatingPerson?.number ||
  client?.authorisedPerson?.number ||
  '';

const getClientSubtitle = (client) =>
  client?.tradeName ||
  client?.companyGroupName ||
  client?.companyDetails?.cin ||
  client?.companyDetails?.pan ||
  client?.entityType ||
  'Audit client';

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

const DeleteModal = ({ isOpen, onClose, onConfirm, clientName, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" style={{ background: 'rgba(2, 6, 23, 0.6)' }} aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="theme-page-card inline-block align-bottom overflow-hidden rounded-lg text-left transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <FaExclamationTriangle className="text-red-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="theme-page-title text-lg leading-6 font-medium" id="modal-title">
                  Delete Client
                </h3>
                <div className="mt-2">
                  <p className="theme-page-text text-sm">
                    Are you sure you want to delete <span className="theme-page-title font-bold">{clientName}</span>? All of their data will be permanently removed. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="theme-page-card-muted px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
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
              className="theme-page-button-muted mt-3 inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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



const ActionIcons = ({ clientName, onEdit, onDelete, onAudit }) => {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="group relative p-2.5 rounded-xl text-blue-500 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all duration-200 shadow-sm"
        aria-label={`Edit ${clientName}`}
      >
        <FaEdit className="text-lg" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">Edit Client</span>
      </button>
      <button
        type="button"
        onClick={onAudit}
        className="group relative p-2.5 rounded-xl text-amber-500 bg-amber-50 hover:bg-amber-600 hover:text-white transition-all duration-200 shadow-sm"
        aria-label={`Audit ${clientName}`}
      >
        <FaClipboardCheck className="text-lg" />
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">Audit Client</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="group relative p-2.5 rounded-xl text-red-500 bg-red-50 hover:bg-red-600 hover:text-white transition-all duration-200 shadow-sm"
        aria-label={`Delete ${clientName}`}
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
  const requestedWasteType = searchParams.get('wasteType');
  const currentWasteType = Object.values(WASTE_TYPES).includes(requestedWasteType)
    ? requestedWasteType
    : WASTE_TYPES.PLASTIC;

  const { user, isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: 'clientName',
    direction: 'asc',
  });
  
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
    return [...new Set(types)].sort((a, b) => a.localeCompare(b));
  }, [wasteTypeClients]);

  const uniqueAssignees = useMemo(() => {
    const names = wasteTypeClients
      .map((client) => getAssignedName(client))
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [wasteTypeClients]);

  const filteredClients = useMemo(() => {
    return wasteTypeClients.filter(client => {
      const state = getClientState(client);
      const city = getClientCity(client);
      const contactName = getContactName(client);
      const assignedName = getAssignedName(client);
      const subtitle = getClientSubtitle(client);
      const matchesSearch =
        (client.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (contactName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.entityType?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (subtitle?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (state?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (city?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (assignedName?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'All' || client.entityType === typeFilter;
      const matchesAssignee = assigneeFilter === 'All' || assignedName === assigneeFilter;

      return matchesSearch && matchesType && matchesAssignee;
    });
  }, [assigneeFilter, searchTerm, typeFilter, wasteTypeClients]);

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

  const buildClientRouteState = (client, extra = {}) => ({
    clientName: client?.clientName || "Client",
    from: `${location.pathname}${location.search}`,
    ...extra,
  });

  const handleViewClient = (client) =>
    navigate(`/dashboard/client/${client._id}/edit`, {
      state: buildClientRouteState(client, { viewMode: true }),
    });
  const handleEditClient = (client) =>
    navigate(`/dashboard/client/${client._id}/edit`, {
      state: buildClientRouteState(client),
    });
  const handleAuditClient = (client) =>
    navigate(`/dashboard/client/${client._id}/audit`, {
      state: buildClientRouteState(client),
    });

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
        message.success('Client deleted successfully');
        fetchClients();
        setIsDeleteModalOpen(false);
        setClientToDelete(null);
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete client.');
    } finally {
      setIsDeleting(false);
    }
  };

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

  const sortedClients = useMemo(() => {
    const getValue = (client) => {
      if (sortConfig.key === 'state') return getClientState(client);
      if (sortConfig.key === 'city') return getClientCity(client);
      if (sortConfig.key === 'assignedTo') return getAssignedName(client);
      if (sortConfig.key === 'contactPerson') return getContactName(client);
      return client?.[sortConfig.key] || '';
    };

    return [...filteredClients].sort((a, b) => {
      const valueA = getValue(a).toString().toLowerCase();
      const valueB = getValue(b).toString().toLowerCase();
      const result = valueA.localeCompare(valueB, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [filteredClients, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [assigneeFilter, currentWasteType, pageSize, searchTerm, typeFilter]);

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

  const currentWasteConfig = WASTE_CONFIG[currentWasteType] || WASTE_CONFIG[WASTE_TYPES.PLASTIC];
  const PortfolioIcon = currentWasteConfig.icon;
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

  const renderSortButton = (label, key) => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${
          isActive ? 'theme-page-title' : 'theme-page-muted'
        }`}
      >
        <span>{label}</span>
        <FaSort className={`text-[10px] ${isActive ? 'theme-page-brand' : 'theme-page-muted'}`} />
      </button>
    );
  };

  if (loading) {
    return (
      <div className="theme-page-spinner-shell flex h-screen items-center justify-center">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4"
          style={{
            borderColor: 'var(--brand-primary)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  return (
    <div className="theme-page w-full space-y-4 lg:space-y-5">
      <GsapRevealGroup
        className="theme-page-card overflow-hidden rounded-[28px]"
        animateKey={`clients-hero-${currentWasteType}`}
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
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold"
                style={{
                  backgroundColor: currentWasteConfig.bg,
                  color: currentWasteConfig.color,
                }}
              >
                <PortfolioIcon />
              </div>
              <div>
                <h1 className="theme-page-title text-xl md:text-2xl font-bold tracking-tight">
                  {currentWasteType} <span className="theme-page-brand">Portfolio</span>
                </h1>
                <div className="theme-page-text mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="theme-page-title font-semibold">{user?.name || 'Team Member'}</span>
                  <span>{activeRole}</span>
                  <span>{todayLabel}</span>
                  <span>{wasteTypeClients.length} registered clients</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 xl:min-w-[330px]">
            <div className="theme-page-card-muted rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3">
              <div className="theme-page-muted text-xs font-semibold uppercase tracking-[0.18em]">
                Total
              </div>
              <div className="mt-2 flex items-end gap-2">
                <GsapCountUp
                  value={wasteTypeClients.length}
                  animateKey={`clients-total-${currentWasteType}`}
                  className="theme-page-title text-2xl font-bold"
                />
                <span className="theme-page-text pb-1 text-xs">clients</span>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 md:px-4 md:py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">
                Active Audit
              </div>
              <div className="mt-2 flex items-end gap-2">
                <GsapCountUp
                  value={activeAuditsCount}
                  animateKey={`clients-audits-${currentWasteType}`}
                  className="text-2xl font-bold text-emerald-600"
                />
                <span className="pb-1 text-xs text-emerald-500">running</span>
              </div>
            </div>
            <div className="theme-page-brand-soft rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                Filtered
              </div>
              <div className="mt-2 flex items-end gap-2">
                <GsapCountUp
                  value={filteredClients.length}
                  animateKey={`clients-filtered-${currentWasteType}`}
                  className="text-2xl font-bold"
                />
                <span className="pb-1 text-xs opacity-80">visible</span>
              </div>
            </div>
          </div>
        </div>
      </GsapRevealGroup>

      <GsapRevealGroup
        className="theme-page-card mb-4 lg:mb-5 rounded-[24px] p-3 md:p-4"
        animateKey={`clients-filters-${currentWasteType}`}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1 xl:max-w-md">
            <FaSearch className="theme-page-muted pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by company, contact, state, city..."
              className="h-11 rounded-2xl pl-11"
              allowClear
            />
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 xl:max-w-[860px]">
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              suffixIcon={<FaChevronDown className="text-xs text-gray-400" />}
              className="h-11"
              options={[
                { value: 'All', label: 'All Entity Types' },
                ...uniqueEntityTypes.map((type) => ({ value: type, label: type })),
              ]}
            />

            <Select
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              suffixIcon={<FaChevronDown className="text-xs text-gray-400" />}
              className="h-11"
              disabled={!isAdmin}
              options={[
                { value: 'All', label: isAdmin ? 'All Assignees' : 'Assignee Filter' },
                ...uniqueAssignees.map((name) => ({ value: name, label: name })),
              ]}
            />

            <div className="theme-page-card-muted flex h-11 items-center justify-between rounded-2xl px-4">
              <div className="theme-page-text flex items-center gap-2">
                <PortfolioIcon className="text-sm" style={{ color: currentWasteConfig.color }} />
                <span className="text-sm font-semibold">{currentWasteType}</span>
              </div>
              <span className="theme-page-title text-sm font-bold">{filteredStats[currentWasteType] || 0}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('All');
                setAssigneeFilter('All');
              }}
              className="theme-page-button-muted inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition"
            >
              <FaTimes className="text-xs" />
              Clear
            </button>
          </div>
        </div>
      </GsapRevealGroup>

      <GsapRevealGroup
        className="theme-page-card overflow-hidden rounded-[28px]"
        animateKey={`clients-table-${currentWasteType}`}
      >
        <div className="px-3 pt-3 md:px-4 md:pt-4" style={{ borderBottom: '1px solid var(--app-border)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm"
              style={{
                color: currentWasteConfig.color,
                backgroundColor: currentWasteConfig.bg,
                border: `1px solid ${currentWasteConfig.border}`,
              }}
            >
              <PortfolioIcon className="text-sm" style={{ color: currentWasteConfig.color }} />
              <span>{currentWasteType}</span>
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs text-gray-500">
                {filteredClients.length}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="bg-white px-6 py-4 text-left">{renderSortButton('Client Name', 'clientName')}</th>
                <th className="bg-white px-4 py-4 text-left">{renderSortButton('Entity Type', 'entityType')}</th>
                <th className="bg-white px-4 py-4 text-left">{renderSortButton('Contact Person', 'contactPerson')}</th>
                <th className="bg-white px-4 py-4 text-left">{renderSortButton('State', 'state')}</th>
                <th className="bg-white px-4 py-4 text-left">{renderSortButton('Assigned To', 'assignedTo')}</th>
                <th className="bg-white px-4 py-4 text-right">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                        <FaBuilding className="text-xl" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-gray-900">No clients found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try changing the search, entity type, assignee, or waste type filters.
                      </p>
                      {!searchTerm && typeFilter === 'All' && assigneeFilter === 'All' && (
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/add-client')}
                            className="mt-5 inline-flex min-w-[9.5rem] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
                        >
                          <FaPlus className="text-xs" />
                          <span>Add Client</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => {
                  const assignedName = getAssignedName(client);
                  const contactName = getContactName(client);
                  const contactEmail = getContactEmail(client);
                  const contactPhone = getContactPhone(client);
                  const state = getClientState(client);
                  const subtitle = getClientSubtitle(client);

                  return (
                    <tr key={client._id} className="group transition hover:bg-gray-50/70">
                      <td className="border-t border-gray-100 px-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleViewClient(client._id)}
                          className="flex items-center gap-4 text-left"
                        >
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: currentWasteConfig.bg }}
                          >
                            <PortfolioIcon
                              className="text-lg"
                              style={{ color: currentWasteConfig.color }}
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 transition group-hover:text-primary-600">
                              {client.clientName}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">{subtitle}</div>
                            {contactPhone && (
                              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">
                                <FaPhoneAlt className="text-[10px]" />
                                {contactPhone}
                              </div>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="border-t border-gray-100 px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${getBadgeColor(client.entityType)}`}>
                          {client.entityType || 'N/A'}
                        </span>
                      </td>
                      <td className="border-t border-gray-100 px-4 py-4">
                        <div className="min-w-[180px]">
                          <div className="text-sm font-semibold text-gray-800">
                            {contactName || 'N/A'}
                          </div>
                          <div className="mt-1 text-xs text-gray-400">
                            {contactEmail || 'No email available'}
                          </div>
                        </div>
                      </td>
                      <td className="border-t border-gray-100 px-4 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="text-xs text-gray-300" />
                          <span>{state || getClientCity(client) || '-'}</span>
                        </div>
                      </td>
                      <td className="border-t border-gray-100 px-4 py-4">
                        {assignedName ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-semibold text-white shadow-sm">
                              {getInitials(assignedName)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-800">{assignedName}</div>
                              <div className="text-xs text-gray-400">Assigned auditor</div>
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
                            Unassigned
                          </div>
                        )}
                      </td>
                      <td className="border-t border-gray-100 px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ActionIcons
                            clientName={client.clientName}
                            onEdit={() => handleEditClient(client)}
                            onAudit={() => handleAuditClient(client)}
                            onDelete={() => promptDeleteClient(client)}
                          />
                          <button
                            type="button"
                            onClick={() => handleViewClient(client)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-gray-400 transition hover:border-gray-200 hover:bg-white hover:text-gray-700"
                            aria-label={`Open ${client.clientName}`}
                          >
                            <FaEllipsisV className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-gray-500">{resultsLabel}</div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPageClamped === 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                        item === currentPageClamped
                          ? 'border-orange-200 bg-orange-50 text-primary-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={item} className="px-1 text-sm text-gray-300">
                      ...
                    </span>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPageClamped === totalPages}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Rows</span>
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
