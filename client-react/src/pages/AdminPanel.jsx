import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import { setUser } from '../store/authSlice';
import useAuth from '../hooks/useAuth';

const UserDetailModal = ({ isOpen, onClose, user, onUpdateRole, allRoles }) => {
  if (!isOpen || !user) return null;

  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role?._id || user.role);

  const handleSaveRole = () => {
    onUpdateRole(user._id, selectedRole);
    setIsEditingRole(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border border-gray-100">
            
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-br from-green-600 to-emerald-700 px-6 py-8 text-center">
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors bg-black/10 hover:bg-black/20 rounded-full w-8 h-8 flex items-center justify-center"
                >
                    <i className="fas fa-times"></i>
                </button>
                
                <div className="relative mx-auto h-24 w-24 rounded-full p-1 bg-white/20 backdrop-blur-sm">
                    <div className="h-full w-full rounded-full bg-white overflow-hidden shadow-inner">
                        {user.last_login_photo ? (
                            <img 
                                src={user.last_login_photo} 
                                alt={`${user.name}`} 
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300">
                                <i className="fas fa-user text-4xl"></i>
                            </div>
                        )}
                    </div>
                    {user.last_login_photo && (
                        <div className="absolute bottom-1 right-1 bg-green-500 border-2 border-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm" title="Photo Verified">
                             <i className="fas fa-check text-white text-[10px]"></i>
                        </div>
                    )}
                </div>
                
                <h3 className="mt-3 text-xl font-bold text-white tracking-tight">{user.name}</h3>
                <p className="text-green-50 text-sm font-light">{user.email}</p>
            </div>

            {/* Content Body */}
            <div className="px-6 py-5 space-y-6 bg-white">
                
                {/* Status & Role Row */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                     <div className="flex flex-col">
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Role</span>
                         <div className="flex items-center">
                            {isEditingRole ? (
                                <div className="flex items-center gap-1">
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-1 pl-1 pr-6"
                                    >
                                        {allRoles.map(role => (
                                            <option key={role._id} value={role._id}>{role.name}</option>
                                        ))}
                                    </select>
                                    <button onClick={handleSaveRole} className="text-green-600 hover:text-green-800 p-1">
                                        <i className="fas fa-check"></i>
                                    </button>
                                    <button onClick={() => setIsEditingRole(false)} className="text-red-600 hover:text-red-800 p-1">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingRole(true)}>
                                    <span className="font-semibold text-gray-700 text-sm">
                                        {typeof user.role === 'string' ? user.role : user.role?.name || 'USER'}
                                    </span>
                                    <i className="fas fa-pencil-alt text-gray-300 text-xs group-hover:text-indigo-500 transition-colors"></i>
                                </div>
                            )}
                         </div>
                     </div>
                     <div className="w-px h-8 bg-gray-200"></div>
                     <div className="flex flex-col items-end">
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Status</span>
                         <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                              user.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                         }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {user.status || 'Active'}
                         </span>
                     </div>
                </div>

                {/* Info List */}
                <div className="space-y-4">
                     <div className="flex items-center gap-3 group">
                         <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                             <i className="fas fa-phone-alt text-sm"></i>
                         </div>
                         <div className="flex-1">
                             <p className="text-xs text-gray-500">Mobile Number</p>
                             <p className="text-sm font-medium text-gray-900">{user.mobile || 'Not provided'}</p>
                         </div>
                     </div>

                     <div className="flex items-center gap-3 group">
                         <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                             <i className="fas fa-check-circle text-sm"></i>
                         </div>
                         <div className="flex-1">
                             <p className="text-xs text-gray-500">Email Verification</p>
                             <p className={`text-sm font-medium ${user.verify_email ? 'text-green-600' : 'text-amber-600'}`}>
                                 {user.verify_email ? 'Verified Account' : 'Pending Verification'}
                             </p>
                         </div>
                     </div>
                </div>

                {/* Security Section */}
                {(user.last_login_ip || (user.last_login_latitude != null)) && (
                    <div className="pt-2">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-2 bg-white text-xs text-gray-400 uppercase tracking-wider">Security & Location</span>
                            </div>
                        </div>

                        <div className="mt-4 space-y-3">
                            {user.last_login_ip && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <i className="fas fa-wifi text-gray-300 w-4 text-center"></i> Last IP
                                    </span>
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">
                                        {user.last_login_ip}
                                    </span>
                                </div>
                            )}

                            {user.last_login_latitude != null && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100 flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm text-red-500 shrink-0">
                                            <i className="fas fa-map-marked-alt"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-blue-900 truncate">Login Location</p>
                                            <p className="text-[10px] text-blue-600/70 font-mono truncate">
                                                {user.last_login_latitude.toFixed(6)}, {user.last_login_longitude.toFixed(6)}
                                            </p>
                                        </div>
                                    </div>
                                     <a 
                                         href={`https://www.google.com/maps?q=${user.last_login_latitude},${user.last_login_longitude}`}
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="text-xs bg-white text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg font-medium shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors shrink-0 whitespace-nowrap"
                                     >
                                         View on Maps
                                     </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {user.last_login_date && (
                    <div className="text-[10px] text-center text-gray-400 pt-2">
                        Last seen: {new Date(user.last_login_date).toLocaleString()}
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    statusBreakdown: {
      pending: 0,
      inProgress: 0,
      completed: 0,
      onHold: 0,
    },
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [clientsSummary, setClientsSummary] = useState({
    total: 0,
    unassigned: 0,
    overdue: 0,
  });
  const [users, setUsers] = useState([]);
  const [unlockingUserId, setUnlockingUserId] = useState(null);
  const [loginActivity, setLoginActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetchStats(signal);
    fetchAdminData(signal);
    fetchLoginActivity(signal);
    fetchRoles(signal);

    return () => {
      controller.abort();
    };
  }, []);

  const getRoleBadgeColor = (roleName) => {
    const role = (roleName || '').toUpperCase();
    if (role.includes('ADMIN')) return 'bg-purple-100 text-purple-700 border border-purple-200';
    if (role.includes('MANAGER')) return 'bg-blue-100 text-blue-700 border border-blue-200';
    if (role.includes('USER')) return 'bg-gray-100 text-gray-700 border border-gray-200';
    return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
  };

  const fetchRoles = async (signal) => {
    try {
        const response = await api.get(API_ENDPOINTS.USER.ROLES, { signal });
        if (response.data.success) {
            setAllRoles(response.data.data);
        }
    } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        console.error('Failed to fetch roles:', error);
    }
  };

  const handleUpdateRole = async (userId, newRoleId) => {
    try {
      const response = await api.patch(API_ENDPOINTS.USER.UPDATE_ROLE(userId), { roleId: newRoleId });
      if (response.data.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: response.data.data.role } : u));
        
        // Update selectedUser if it's the one being edited
        if (selectedUser && selectedUser._id === userId) {
            setSelectedUser({ ...selectedUser, role: response.data.data.role });
        }

        // If updated user is the current logged-in user, update Redux state
        if (user && (user.id === userId || user._id === userId)) {
            setUser({ ...user, role: response.data.data.role });
        }
        
        toast.success("Role updated successfully");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update role");
    }
  };

  const fetchStats = async (signal) => {
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.STATS, { signal });
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      console.error('Failed to fetch client stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAdminData = async (signal) => {
    try {
      const [usersRes, clientsRes] = await Promise.all([
        api.get(API_ENDPOINTS.USER.GET_ALL, { signal }),
        api.get(API_ENDPOINTS.CLIENT.GET_ALL, { signal }),
      ]);
      const userList = usersRes.data?.data || [];
      const clientList = clientsRes.data?.data || [];
      const now = new Date();

      let unassigned = 0;
      let overdue = 0;

      clientList.forEach((c) => {
        if (!c.assignedTo) {
          unassigned += 1;
        }
        if (c.auditEndDate) {
          const end = new Date(c.auditEndDate);
          if (end < now && c.status !== 'Completed') {
            overdue += 1;
          }
        }
      });

      setUsers(userList);
      setClientsSummary({
        total: clientList.length,
        unassigned,
        overdue,
      });

      // Extract unique roles from users for the dropdown
      // Now handled by fetchRoles
      // const uniqueRoles = [];
      // const roleMap = new Map();
      // userList.forEach(u => {
      //     if (u.role && typeof u.role === 'object' && u.role._id) {
      //         if (!roleMap.has(u.role._id)) {
      //             roleMap.set(u.role._id, true);
      //             uniqueRoles.push(u.role);
      //         }
      //     }
      // });
      // setAllRoles(uniqueRoles);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      console.error('Failed to fetch admin data:', error);
    }
  };

  const fetchLoginActivity = async (signal) => {
    try {
      const response = await api.get(API_ENDPOINTS.USER.LOGIN_ACTIVITY, {
        params: { limit: 20 },
        signal
      });
      if (response.data.success) {
        setLoginActivity(response.data.data || []);
      }
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      console.error('Failed to fetch login activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const pending = stats.statusBreakdown.pending;
  const inProgress = stats.statusBreakdown.inProgress;
  const completed = stats.statusBreakdown.completed;
  const onHold = stats.statusBreakdown.onHold;

  const activeUsersCount = users.length;

  const handleUnlockUser = async (userId) => {
    try {
      setUnlockingUserId(userId);
      const response = await api.patch(API_ENDPOINTS.USER.UNLOCK(userId));
      if (response.data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, status: 'Active', failedLoginAttempts: 0 }
              : u
          )
        );
        toast.success(response.data.message || 'User account activated');
      } else {
        toast.error(response.data.message || 'Failed to activate user');
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to activate user';
      toast.error(message);
    } finally {
      setUnlockingUserId(null);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-500">
            Admin Dashboard
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-gray-900">
            Welcome, {user?.name || 'Admin'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Central place to oversee users, audits and platform configuration.
          </p>
        </div>
        <div className="flex items-center gap-3 md:justify-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Admin role access
          </span>
        </div>
      </div>

      <div className="space-y-6 mb-6">
        <div className="space-y-6">
          {loadingStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-gray-50 p-5 shadow-sm animate-pulse"
                >
                  <div className="mb-3 h-4 w-24 rounded-full bg-gray-100" />
                  <div className="mb-2 h-8 w-16 rounded-full bg-gray-100" />
                  <div className="h-3 w-20 rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="group relative flex flex-col justify-between rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <i className="fas fa-clock text-sm" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Pending Audits
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-semibold text-gray-900">
                    {pending}
                  </p>
                  <span className="text-xs text-gray-400">Awaiting kickoff</span>
                </div>
              </div>

              <div className="group relative flex flex-col justify-between rounded-2xl border border-sky-100 bg-sky-50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                      <i className="fas fa-tasks text-sm" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      In Progress
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-semibold text-gray-900">
                    {inProgress}
                  </p>
                  <span className="text-xs text-gray-400">Audits started</span>
                </div>
              </div>

              <div className="group relative flex flex-col justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <i className="fas fa-check-circle text-sm" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Completed
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-semibold text-gray-900">
                    {completed}
                  </p>
                  <span className="text-xs text-gray-400">Closed audits</span>
                </div>
              </div>

              <div className="group relative flex flex-col justify-between rounded-2xl border border-rose-100 bg-rose-50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                      <i className="fas fa-exclamation-triangle text-sm" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      On Hold
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-semibold text-gray-900">
                    {onHold}
                  </p>
                  <span className="text-xs text-gray-400">Requires attention</span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <i className="fas fa-users-cog text-sm" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
                  </div>
                  <p className="text-sm text-gray-500">Review platform users, roles and access posture.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                     <select
                        value={selectedRoleFilter}
                        onChange={(e) => setSelectedRoleFilter(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
                     >
                        <option value="All">All Roles</option>
                        {allRoles.map(role => (
                            <option key={role._id} value={role._id}>{role.name}</option>
                        ))}
                     </select>
                     <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                        <i className="fas fa-chevron-down text-xs"></i>
                     </div>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <i className="fas fa-search text-xs"></i>
                    </span>
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User Profile</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Activity</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.filter(u => {
                    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (typeof u.role === 'string' ? u.role : u.role?.name)?.toLowerCase().includes(searchTerm.toLowerCase());
                    
                    const matchesRole = selectedRoleFilter === 'All' || 
                        (typeof u.role === 'object' && u.role?._id === selectedRoleFilter) ||
                        (typeof u.role === 'string' && u.role === selectedRoleFilter);

                    return matchesSearch && matchesRole;
                  }).map((u) => {
                    const isSuspended = u.status === 'Suspended';
                    const isInactive = u.status === 'Inactive';
                    const canActivate = isSuspended || isInactive;
                    const roleName = typeof u.role === 'string' ? u.role : u.role?.name || 'USER';
                    
                    return (
                      <tr key={u._id} className="hover:bg-gray-50/80 transition-all duration-200 group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                                {u.last_login_photo ? (
                                    <img 
                                        src={u.last_login_photo} 
                                        alt={u.name} 
                                        className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                                    />
                                ) : (
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm bg-gradient-to-br ${
                                        u.name ? 
                                        ['from-pink-500 to-rose-500', 'from-purple-500 to-indigo-500', 'from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-orange-500 to-amber-500'][u.name.length % 5] 
                                        : 'from-gray-400 to-gray-500'
                                    }`}>
                                        {u.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                    u.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'
                                }`}></div>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{u.name}</p>
                              <p className="text-xs text-gray-500 font-medium">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm ${getRoleBadgeColor(roleName)}`}>
                            {roleName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                           <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                              u.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                u.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}></span>
                            {u.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-900">
                                    {u.last_login_date ? new Date(u.last_login_date).toLocaleDateString() : 'Never'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {u.last_login_date ? new Date(u.last_login_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {canActivate && (
                                <button
                                  type="button"
                                  onClick={() => handleUnlockUser(u._id)}
                                  disabled={unlockingUserId === u._id}
                                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                  {unlockingUserId === u._id ? 'Activating...' : 'Activate'}
                                </button>
                              )}
                             <button 
                                onClick={() => handleViewUser(u)}
                                className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-full transition-all"
                                title="View Details"
                             >
                                <i className="fas fa-eye"></i>
                             </button>
                             <button className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                                <i className="fas fa-ellipsis-v"></i>
                             </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 bg-white">
                        <div className="flex flex-col items-center justify-center">
                            <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                <i className="fas fa-search text-gray-300"></i>
                            </div>
                            <p className="text-sm font-medium">No users found</p>
                            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
             <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Showing {users.length} users
                </span>
                <div className="flex gap-1">
                  {/* Pagination placeholder if needed */}
                </div>
            </div>
          </div>
        </div>


      </div>

      <UserDetailModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
        onUpdateRole={handleUpdateRole}
        allRoles={allRoles}
      />
    </div>
  );
};

export default AdminPanel;
