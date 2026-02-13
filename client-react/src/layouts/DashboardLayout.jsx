import { useState, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Breadcrumbs from '../components/Breadcrumbs';
import useAuth from '../hooks/useAuth';
import useOnClickOutside from '../hooks/useOnClickOutside';
import { UserOutlined, DownOutlined, LogoutOutlined } from '@ant-design/icons';

const DashboardLayout = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useOnClickOutside(dropdownRef, () => setShowDropdown(false));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2l8 4v6c0 7-8 10-8 10S4 19 4 12V6l8-4z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-900">EPR Kavach</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">
              Audit Platform
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 transition-all duration-200"
            >
              <div className="hidden text-right leading-tight md:block">
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md transition-transform group-hover:scale-105">
                <UserOutlined className="text-sm" />
              </div>
              <DownOutlined
                className={`text-[10px] text-gray-400 transition-transform ${
                  showDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-100 bg-white py-2 shadow-xl">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className="mt-2 inline-block rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
                    {(() => {
                        const r = user?.role?.name || user?.role || 'User';
                        if (r === 'ADMIN') return 'Administrator';
                        if (r === 'MANAGER') return 'Manager';
                        if (r === 'USER') return 'User';
                        return r;
                    })()}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/dashboard/profile');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
                    <UserOutlined className="text-xs" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Profile</p>
                    <p className="text-xs text-gray-500">View and edit profile</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    handleLogout();
                  }}
                  className="mt-1 flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <LogoutOutlined className="text-xs" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Logout</p>
                    <p className="text-xs text-gray-500">Sign out of your account</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex pt-16 h-screen overflow-hidden">
        <div
          className={`z-40 flex-shrink-0 border-r border-gray-100 bg-slate-50 shadow-sm transition-all duration-200 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-2 md:p-4">
          <Breadcrumbs />
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
