import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Sidebar from '../components/Sidebar';
import Breadcrumbs from '../components/Breadcrumbs';
import ThemeToggle from '../components/ThemeToggle';
import GsapRevealGroup from '../components/GsapRevealGroup';
import GsapFloatingPanel from '../components/GsapFloatingPanel';
import GsapPageTransition from '../components/GsapPageTransition';
import useAuth from '../hooks/useAuth';
import useOnClickOutside from '../hooks/useOnClickOutside';
import {
  UserOutlined,
  DownOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

const UNREAD_COUNT_POLL_MS = 60 * 1000;
dayjs.extend(relativeTime);

const DashboardLayout = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 1023px)').matches
      : false,
  );
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const unreadCountRetryAfterRef = useRef(0);

  useOnClickOutside(dropdownRef, () => setShowDropdown(false));
  useOnClickOutside(notificationRef, () => setShowNotifications(false));

  const fetchUnreadCount = async () => {
    const now = Date.now();
    if (unreadCountRetryAfterRef.current > now) return;

    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATION.UNREAD_COUNT);
      unreadCountRetryAfterRef.current = 0;
      if (response.data?.success) {
        setUnreadCount(Number(response.data?.data?.count) || 0);
      }
    } catch (error) {
      if (error?.response?.status === 429) {
        const retryAfterSeconds = Number(error?.response?.headers?.['retry-after']) || 60;
        unreadCountRetryAfterRef.current = Date.now() + retryAfterSeconds * 1000;
        return;
      }
      throw error;
    }
  };

  const fetchNotifications = async () => {
    const response = await api.get(API_ENDPOINTS.NOTIFICATION.LIST(20));
    if (response.data?.success) {
      setNotifications(Array.isArray(response.data?.data) ? response.data.data : []);
    }
  };

  useEffect(() => {
    let interval;

    (async () => {
      try {
        if (document.visibilityState === 'visible') {
          await fetchUnreadCount();
        }
      } catch {
        setUnreadCount(0);
      }
    })();

    interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchUnreadCount().catch(() => {});
    }, UNREAD_COUNT_POLL_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showNotifications) return;
    fetchNotifications().catch(() => setNotifications([]));
  }, [showNotifications]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const media = window.matchMedia('(max-width: 1023px)');
    const handleChange = (event) => {
      setIsTabletViewport(event.matches);
    };

    setIsTabletViewport(media.matches);
    media.addEventListener('change', handleChange);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isTabletViewport) {
      setTabletSidebarOpen(false);
      return;
    }

    setSidebarCollapsed(false);
  }, [isTabletViewport]);

  useEffect(() => {
    if (!isTabletViewport) return;
    setTabletSidebarOpen(false);
  }, [isTabletViewport, location.pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!isTabletViewport) return undefined;

    const originalOverflow = document.body.style.overflow;
    if (tabletSidebarOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isTabletViewport, tabletSidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--app-bg)' }}>
      <div
        className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b px-4 backdrop-blur-md md:px-6"
        style={{
          borderColor: 'var(--app-border)',
          background: 'var(--app-bg-soft)',
        }}
      >
        <GsapRevealGroup
          className="flex w-full items-center justify-between"
          animateKey="dashboard-layout-header"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTabletSidebarOpen((prev) => !prev)}
              className="theme-surface-muted theme-text-secondary flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 lg:hidden"
              aria-label={tabletSidebarOpen ? 'Close navigation' : 'Open navigation'}
            >
              <MenuOutlined className="text-base" />
            </button>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: 'var(--brand-primary-soft)',
                color: 'var(--brand-primary)',
              }}
            >
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
              <div className="theme-text-primary text-sm font-semibold">EPR Kavach</div>
              <div className="theme-text-muted text-[10px] font-medium uppercase tracking-[0.16em]">
                Audit Platform
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <ThemeToggle />

            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="theme-surface-muted theme-text-secondary relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200"
                aria-label="Notifications"
              >
                <BellOutlined className="text-base" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <GsapFloatingPanel
                  animateKey={`notifications-${notifications.length}-${unreadCount}`}
                  className="theme-surface absolute right-0 mt-2 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl"
                >
                  <div
                    className="flex items-center justify-between border-b px-4 py-3"
                    style={{ borderColor: 'var(--app-border)' }}
                  >
                    <p className="theme-text-primary text-sm font-semibold">Notifications</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.patch(API_ENDPOINTS.NOTIFICATION.MARK_ALL_READ);
                          await fetchUnreadCount();
                          await fetchNotifications();
                        } finally {
                          setShowNotifications(false);
                        }
                      }}
                      className="text-xs font-semibold transition-colors"
                      style={{ color: 'var(--brand-primary)' }}
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="theme-text-secondary px-4 py-6 text-center text-sm">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const isUnread = !n?.readAt;
                        const title = (n?.title || '').trim() || 'Notification';
                        const message = (n?.message || '').trim();
                        const when = n?.createdAt ? dayjs(n.createdAt).fromNow() : '';

                        return (
                          <button
                            key={n?._id}
                            type="button"
                            onClick={async () => {
                              try {
                                if (isUnread && n?._id) {
                                  await api.patch(API_ENDPOINTS.NOTIFICATION.MARK_READ(n._id));
                                }
                                await fetchUnreadCount();
                                if (n?.linkPath) {
                                  navigate(n.linkPath);
                                }
                              } finally {
                                setShowNotifications(false);
                              }
                            }}
                            className="w-full px-4 py-3 text-left transition-colors"
                            style={{
                              background: isUnread ? 'var(--brand-primary-soft)' : 'transparent',
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="mt-1 h-2.5 w-2.5 rounded-full"
                                style={{
                                  background: isUnread ? 'var(--brand-primary)' : 'var(--app-border)',
                                }}
                              />
                              <div className="min-w-0">
                                <p className="theme-text-primary truncate text-sm font-semibold">
                                  {title}
                                </p>
                                {message && (
                                  <p className="theme-text-secondary mt-0.5 whitespace-normal break-words text-xs">
                                    {message}
                                  </p>
                                )}
                                {when && <p className="theme-text-muted mt-1 text-[10px]">{when}</p>}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </GsapFloatingPanel>
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="group theme-panel flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200"
              >
                <div className="hidden text-right leading-tight md:block">
                  <p className="theme-text-primary text-sm font-semibold">{user?.name}</p>
                  <p className="theme-text-secondary text-xs">{user?.email}</p>
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #f97316, var(--brand-primary))' }}
                >
                  <UserOutlined className="text-sm" />
                </div>
                <DownOutlined
                  className={`theme-text-muted text-[10px] transition-transform ${
                    showDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showDropdown && (
                <GsapFloatingPanel
                  animateKey={`user-dropdown-${showDropdown}`}
                  className="theme-surface absolute right-0 mt-2 w-[min(16rem,calc(100vw-1rem))] rounded-xl py-2"
                >
                  <div className="border-b px-4 py-3" style={{ borderColor: 'var(--app-border)' }}>
                    <p className="theme-text-primary text-sm font-semibold">{user?.name}</p>
                    <p className="theme-text-secondary text-xs">{user?.email}</p>
                    <span
                      className="mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{
                        background: 'var(--brand-primary-soft)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      {(() => {
                        const r = user?.role?.name || user?.role || 'User';
                        if (r === 'ADMIN') return 'Administrator';
                        if (r === 'SUPER ADMIN') return 'Super Administrator';
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
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors"
                  >
                    <div className="theme-surface-muted theme-text-secondary flex h-8 w-8 items-center justify-center rounded-lg">
                      <UserOutlined className="text-xs" />
                    </div>
                    <div>
                      <p className="theme-text-primary text-sm font-medium">Profile</p>
                      <p className="theme-text-secondary text-xs">View and edit profile</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      handleLogout();
                    }}
                    className="mt-1 flex w-full items-center gap-3 border-t px-4 py-3 text-left text-sm text-red-600 transition-colors"
                    style={{ borderColor: 'var(--app-border)' }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <LogoutOutlined className="text-xs" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Logout</p>
                      <p className="theme-text-secondary text-xs">Sign out of your account</p>
                    </div>
                  </button>
                </GsapFloatingPanel>
              )}
            </div>
          </div>
        </GsapRevealGroup>
      </div>

      <div className="flex h-screen overflow-x-visible overflow-y-hidden pt-16">
        {isTabletViewport && (
          <>
            <div
              className={`fixed inset-0 z-40 bg-slate-950/35 transition-opacity duration-200 ${
                tabletSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
              }`}
              style={{ top: '4rem' }}
              onClick={() => setTabletSidebarOpen(false)}
              aria-hidden="true"
            />
            <div
              className={`fixed inset-y-16 left-0 z-50 w-[17rem] max-w-[86vw] border-r shadow-2xl transition-transform duration-200 lg:hidden ${
                tabletSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
              style={{
                borderColor: 'var(--app-border)',
                background: 'var(--app-bg-elevated)',
              }}
            >
              <Sidebar
                collapsed={false}
                onToggleCollapse={() => setTabletSidebarOpen(false)}
              />
            </div>
          </>
        )}

        <div
          className={`relative z-40 hidden flex-shrink-0 overflow-visible border-r transition-all duration-200 lg:flex ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
          style={{
            borderColor: 'var(--app-border)',
            background: 'var(--app-bg-elevated)',
          }}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />
        </div>

        <div
          className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-5 2xl:p-6"
          style={{ background: 'var(--app-bg)' }}
        >
          <div className="mx-auto w-full max-w-[1680px] xl:max-w-[1540px] 2xl:max-w-[1760px]">
            <Breadcrumbs />
            <GsapPageTransition transitionKey={location.pathname} className="min-h-[calc(100vh-7rem)]">
              <Outlet />
            </GsapPageTransition>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
