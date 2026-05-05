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
import { WASTE_TYPES } from '../constants/wasteTypes';

const Sidebar = ({ collapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const isClientUser = roleName === 'CLIENT';
  const linkedClientId = user?.linkedClient?._id;
  const [openKeys, setOpenKeys] = useState([]);
  const sidebarRef = useRef(null);

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
          key: 'clients',
          icon: <TeamOutlined />,
          label: 'KAVACH Audit',
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

    if (location.pathname.startsWith('/dashboard/clients')) {
      setOpenKeys(['clients']);
      return;
    }
  }, [isSuperAdmin, location.pathname]);

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
      className="flex h-full w-full flex-col bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700"
    >
      <div
        data-sidebar-animate
        className="flex items-center justify-between px-3 pt-3 pb-1"
      >
        {!collapsed && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-50/90">
            Navigation
          </span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/30 bg-white/10 text-orange-50 shadow-sm transition-colors hover:bg-white/20"
        >
          {collapsed ? <RightOutlined className="text-xs" /> : <LeftOutlined className="text-xs" />}
        </button>
      </div>
      <div data-sidebar-animate className="flex-1 overflow-y-auto">
        <ConfigProvider
          theme={{
            token: {
              colorBgElevated: '#ea580c',
              borderRadiusLG: 12,
            },
            components: {
              Menu: {
                itemColor: 'rgba(255,255,255,0.9)',
                itemHoverColor: '#ffffff',
                itemSelectedColor: '#ea580c',
                itemSelectedBg: '#ffffff',
                itemBg: 'transparent',
                subMenuItemBg: 'transparent',
                groupTitleColor: 'rgba(255,255,255,0.7)',
                iconSize: 16,
                itemBorderRadius: 8,
                itemMarginInline: 12,
                itemPaddingInline: 12,
              },
            },
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            inlineCollapsed={collapsed}
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
            }}
            items={items}
          />
        </ConfigProvider>
      </div>
    </div>
  );
};

export default Sidebar;
