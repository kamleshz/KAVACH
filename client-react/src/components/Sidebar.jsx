import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, ConfigProvider } from 'antd';
import {
  AppstoreOutlined,
  TeamOutlined,
  CrownOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  DeleteOutlined,
  BlockOutlined,
  ThunderboltOutlined,
  CarOutlined,
  ExperimentOutlined,
  DesktopOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import useAuth from '../hooks/useAuth';
import { WASTE_TYPES } from '../constants/wasteTypes';

const Sidebar = ({ collapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [openKeys, setOpenKeys] = useState(['clients']);

  const onOpenChange = (keys) => {
    setOpenKeys(keys);
  };

  const items = [
    {
      key: '/dashboard',
      icon: <AppstoreOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: 'clients',
      icon: <TeamOutlined />,
      label: 'Clients',
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
  ];

  if (isAdmin) {
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

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
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
          <i className={`fas fa-angle-${collapsed ? 'right' : 'left'} text-xs`} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
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
