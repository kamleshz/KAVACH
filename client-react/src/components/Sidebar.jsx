import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, ConfigProvider } from 'antd';
import { gsap } from 'gsap';
import {
  AppstoreOutlined,
  TeamOutlined,
  CrownOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  DeleteOutlined,
  BlockOutlined,
  ThunderboltOutlined,
  CarOutlined,
  ExperimentOutlined,
  DesktopOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import { WASTE_TYPES } from '../constants/wasteTypes';

const SIDEBAR_POPUP_CLASS = 'sidebar-nav-popup';

const Sidebar = ({ collapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { isDark } = useTheme();
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const isClientUser = roleName === 'CLIENT';
  const linkedClientId = user?.linkedClient?._id;
  const [openKeys, setOpenKeys] = useState([]);
  const sidebarRef = useRef(null);

  const resolvedWasteType = (() => {
    const searchParams = new URLSearchParams(location.search);
    const wasteType = searchParams.get('wasteType');
    return Object.values(WASTE_TYPES).includes(wasteType)
      ? wasteType
      : WASTE_TYPES.PLASTIC;
  })();

  const routeState = location.state || {};
  const isClientWorkflowRoute = location.pathname.startsWith('/dashboard/client/');
  const workflowSourceRoute = (() => {
    const from = (routeState.from || '').toString();
    if (!from) return '';
    if (from.startsWith('/dashboard/clients')) return from;
    if (from.startsWith('/dashboard/admin')) return from.split('?')[0];
    if (from.startsWith('/dashboard/client-connect')) return '/dashboard/client-connect';
    if (from.startsWith('/dashboard')) return from.split('?')[0];
    return '';
  })();
  const workflowBackRoute =
    workflowSourceRoute ||
    (isClientUser ? '/dashboard/client-connect' : '/dashboard/clients');
  const workflowContextTitle =
    routeState.clientName || (isClientUser ? 'My Client' : 'Client Workflow');
  const workflowContextLabel = (() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const processType = (pathParts[pathParts.indexOf('process-plant') + 1] || pathParts[pathParts.indexOf('process-ewaste') + 1] || '').toUpperCase();
    if (location.pathname.includes('/process-ewaste/')) {
      return processType ? `${processType} E-Waste audit process` : 'E-Waste audit process';
    }
    if (location.pathname.includes('/process-plant/')) {
      return processType ? `${processType} plant audit process` : 'Plant audit process';
    }
    if (location.pathname.endsWith('/edit') && routeState.activeTab) {
      return `${routeState.activeTab} workflow`;
    }
    if (location.pathname.endsWith('/audit')) return 'Audit workflow';
    if (location.pathname.endsWith('/edit')) return 'Edit client';
    return 'Client details';
  })();
  const workflowSourceLabel = (() => {
    if (workflowBackRoute.startsWith('/dashboard/admin/kpi')) return 'Back to KPI Dashboard';
    if (workflowBackRoute.startsWith('/dashboard/admin')) return 'Back to Administration';
    if (workflowBackRoute.startsWith('/dashboard/client-connect')) return 'Back to Client Connect';
    if (workflowBackRoute.startsWith('/dashboard/clients')) return 'Back to Clients';
    return 'Back';
  })();

  const selectedMenuKey = (() => {
    if (isClientWorkflowRoute && workflowSourceRoute) {
      return workflowSourceRoute;
    }
    if (isClientWorkflowRoute && isClientUser && linkedClientId) {
      return `/dashboard/client/${linkedClientId}`;
    }
    if (location.pathname.startsWith('/dashboard/all-clients')) {
      return '/dashboard/all-clients';
    }
    if (location.pathname.startsWith('/dashboard/clients')) {
      return `/dashboard/clients?wasteType=${resolvedWasteType}`;
    }
    return location.pathname;
  })();

  const onOpenChange = (keys) => {
    setOpenKeys(keys);
  };

  const baseItems = [
    {
      key: '/dashboard/client-connect',
      icon: <LinkOutlined />,
      label: 'Client Connect',
      onClick: () => navigate('/dashboard/client-connect'),
    },
  ];

  const items = isSuperAdmin
    ? baseItems
    : isClientUser
    ? [
        {
          key: '/dashboard',
          icon: <AppstoreOutlined />,
          label: 'Dashboard',
          onClick: () => navigate('/dashboard'),
        },
        ...baseItems,
        ...(linkedClientId
          ? [
              {
                key: `/dashboard/client/${linkedClientId}`,
                icon: <TeamOutlined />,
                label: 'My Client',
                onClick: () => navigate(`/dashboard/client/${linkedClientId}`),
              },
            ]
          : []),
      ]
    : [
        {
          key: '/dashboard',
          icon: <AppstoreOutlined />,
          label: 'Dashboard',
          onClick: () => navigate('/dashboard'),
        },
        {
          key: '/dashboard/all-clients',
          icon: <TeamOutlined />,
          label: 'All Client',
          onClick: () => navigate('/dashboard/all-clients'),
        },
        {
          key: 'clients',
          icon: <TeamOutlined />,
          label: 'KAVACH Audit',
          popupClassName: SIDEBAR_POPUP_CLASS,
          children: [
            {
              key: `/dashboard/clients?wasteType=${WASTE_TYPES.PLASTIC}`,
              icon: <BlockOutlined />,
              label: WASTE_TYPES.PLASTIC,
              onClick: () => navigate(`/dashboard/clients?wasteType=${WASTE_TYPES.PLASTIC}`),
            },
            {
              key: `/dashboard/clients?wasteType=${WASTE_TYPES.E_WASTE}`,
              icon: <DesktopOutlined />,
              label: WASTE_TYPES.E_WASTE,
              onClick: () => navigate(`/dashboard/clients?wasteType=${WASTE_TYPES.E_WASTE}`),
            },
            {
              key: `/dashboard/clients?wasteType=${WASTE_TYPES.BATTERY}`,
              icon: <ThunderboltOutlined />,
              label: WASTE_TYPES.BATTERY,
              onClick: () => navigate(`/dashboard/clients?wasteType=${WASTE_TYPES.BATTERY}`),
            },
            {
              key: `/dashboard/clients?wasteType=${WASTE_TYPES.ELV}`,
              icon: <CarOutlined />,
              label: WASTE_TYPES.ELV,
              onClick: () => navigate(`/dashboard/clients?wasteType=${WASTE_TYPES.ELV}`),
            },
            {
              key: `/dashboard/clients?wasteType=${WASTE_TYPES.USED_OIL}`,
              icon: <ExperimentOutlined />,
              label: WASTE_TYPES.USED_OIL,
              onClick: () => navigate(`/dashboard/clients?wasteType=${WASTE_TYPES.USED_OIL}`),
            },
          ],
        },
        ...baseItems,
      ];

  if (isAdmin && !isSuperAdmin) {
    items.push({
      key: 'admin',
      icon: <CrownOutlined />,
      label: 'Administration',
      popupClassName: SIDEBAR_POPUP_CLASS,
      children: [
        {
          key: '/dashboard/admin',
          icon: <CrownOutlined />,
          label: 'Admin Dashboard',
          onClick: () => navigate('/dashboard/admin'),
        },
        {
          key: '/dashboard/admin/kpi',
          icon: <BarChartOutlined />,
          label: 'KPI Dashboard',
          onClick: () => navigate('/dashboard/admin/kpi'),
        },
        {
          key: '/dashboard/admin/companies',
          icon: <UnorderedListOutlined />,
          label: 'Company Name',
          onClick: () => navigate('/dashboard/admin/companies'),
        },
        {
          key: '/dashboard/admin/login-logs',
          icon: <SafetyCertificateOutlined />,
          label: 'Login Logs',
          onClick: () => navigate('/dashboard/admin/login-logs'),
        },
      ],
    });
  }

  useEffect(() => {
    if (isSuperAdmin) {
      setOpenKeys([]);
      return;
    }

    if (selectedMenuKey.startsWith('/dashboard/clients')) {
      setOpenKeys(['clients']);
      return;
    }

    if (selectedMenuKey.startsWith('/dashboard/admin')) {
      setOpenKeys(['admin']);
      return;
    }

    setOpenKeys([]);
  }, [isSuperAdmin, selectedMenuKey]);

  useLayoutEffect(() => {
    if (!sidebarRef.current || typeof window === 'undefined') return undefined;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      const items = sidebarRef.current.querySelectorAll(
        '[data-sidebar-animate]',
      );
      if (!items.length) return;

      gsap.fromTo(
        items,
        { autoAlpha: 0, x: collapsed ? -6 : -14 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.28,
          stagger: 0.04,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
      );
    }, sidebarRef);

    return () => ctx.revert();
  }, [collapsed, openKeys, location.pathname]);

  return (
    <div
      ref={sidebarRef}
      className="flex h-full w-full flex-col"
      style={{
        background: 'var(--sidebar-gradient)',
        color: 'var(--sidebar-text)',
      }}
    >
      <div
        data-sidebar-animate
        className="flex items-center justify-between px-3 pt-3 pb-1"
      >
        {!collapsed && (
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'var(--sidebar-muted)' }}
          >
            Navigation
          </span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-md border shadow-sm transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            borderColor: 'var(--sidebar-border)',
            background: isDark ? 'rgba(15, 23, 42, 0.26)' : 'rgba(255, 255, 255, 0.12)',
            color: 'var(--sidebar-text)',
          }}
        >
          {collapsed ? <RightOutlined className="text-xs" /> : <LeftOutlined className="text-xs" />}
        </button>
      </div>
      {!collapsed && isClientWorkflowRoute && (
        <div
          data-sidebar-animate
          className="mx-3 mb-2 rounded-2xl border px-3 py-3"
          style={{
            borderColor: 'var(--sidebar-border)',
            background: isDark ? 'rgba(15, 23, 42, 0.22)' : 'rgba(255, 255, 255, 0.12)',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(workflowBackRoute)}
            className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'var(--sidebar-muted)' }}
          >
            <LeftOutlined className="text-[10px]" />
            {workflowSourceLabel}
          </button>
          <div className="text-sm font-semibold" style={{ color: 'var(--sidebar-text)' }}>
            {workflowContextTitle}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--sidebar-muted)' }}>
            {workflowContextLabel}
          </div>
        </div>
      )}
      <div
        data-sidebar-animate
        className={`flex-1 overflow-x-visible ${collapsed ? 'overflow-y-visible' : 'overflow-y-auto'}`}
      >
        <ConfigProvider
          theme={{
            token: {
              colorBgElevated: 'transparent',
              borderRadiusLG: 12,
            },
            components: {
              Menu: {
                itemColor: 'var(--sidebar-text)',
                itemHoverColor: 'var(--sidebar-text)',
                itemSelectedColor: isDark ? '#f8fafc' : 'var(--brand-primary)',
                itemSelectedBg: isDark ? 'rgba(251, 146, 60, 0.18)' : 'rgba(255, 255, 255, 0.96)',
                itemBg: 'transparent',
                subMenuItemBg: 'transparent',
                groupTitleColor: 'var(--sidebar-muted)',
                iconSize: 16,
                itemBorderRadius: 8,
                itemMarginInline: 12,
                itemPaddingInline: 12,
                colorSplit: 'var(--sidebar-border)',
                subMenuItemSelectedColor: isDark ? '#f8fafc' : 'var(--brand-primary)',
              },
            },
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedMenuKey]}
            inlineCollapsed={collapsed}
            className="sidebar-nav-menu"
            {...(!collapsed && {
              openKeys,
              onOpenChange,
            })}
            style={{
              background: 'transparent',
              borderRight: 0,
              paddingTop: 8,
              paddingBottom: 12,
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--sidebar-text)',
            }}
            items={items}
          />
        </ConfigProvider>
      </div>
    </div>
  );
};

export default Sidebar;
