import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tabs, Statistic, Row, Col, Tag, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  BarChartOutlined, 
  EnvironmentOutlined, 
  TeamOutlined,
  ThunderboltOutlined,
  DesktopOutlined,
  CarOutlined,
  ExperimentOutlined,
  BlockOutlined
} from '@ant-design/icons';
import api from '../services/api';
import API_ENDPOINTS from '../services/apiEndpoints';
import { WASTE_TYPES } from '../constants/wasteTypes';

const { TabPane } = Tabs;

const KPIDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);

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
    const counts = {
      total: 0
    };
    
    // Initialize all waste types with 0
    Object.values(WASTE_TYPES).forEach(type => {
      counts[type] = 0;
    });

    clients.forEach(client => {
      counts.total++;
      if (client.wasteType && counts[client.wasteType] !== undefined) {
        counts[client.wasteType]++;
      }
    });

    return counts;
  }, [clients]);

  const getIcon = (type) => {
    switch (type) {
      case WASTE_TYPES.PLASTIC: return <BlockOutlined />;
      case WASTE_TYPES.E_WASTE: return <DesktopOutlined />;
      case WASTE_TYPES.BATTERY: return <ThunderboltOutlined />;
      case WASTE_TYPES.USED_OIL: return <ExperimentOutlined />;
      case WASTE_TYPES.ELV: return <CarOutlined />;
      default: return <BarChartOutlined />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case WASTE_TYPES.PLASTIC: return 'orange';
      case WASTE_TYPES.E_WASTE: return 'blue';
      case WASTE_TYPES.BATTERY: return 'green';
      case WASTE_TYPES.USED_OIL: return 'purple';
      case WASTE_TYPES.ELV: return 'cyan';
      default: return 'default';
    }
  };

  const getHexColor = (type) => {
    switch (type) {
      case WASTE_TYPES.PLASTIC: return '#ea580c';
      case WASTE_TYPES.E_WASTE: return '#2563eb';
      case WASTE_TYPES.BATTERY: return '#16a34a';
      case WASTE_TYPES.USED_OIL: return '#9333ea';
      case WASTE_TYPES.ELV: return '#06b6d4';
      default: return '#4b5563';
    }
  };

  const columns = [
    {
      title: 'Company Name',
      dataIndex: 'clientName',
      key: 'clientName',
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
      render: (text, record) => (
        <span 
          className="font-medium text-blue-600 cursor-pointer hover:underline"
          onClick={() => navigate(`/dashboard/admin/view-client/${record._id}`)}
        >
          {text}
        </span>
      )
    },
    {
      title: 'Waste Type',
      dataIndex: 'wasteType',
      key: 'wasteType',
      filters: Object.values(WASTE_TYPES).map(type => ({ text: type, value: type })),
      onFilter: (value, record) => record.wasteType === value,
      render: (type) => (
        <Tag color={getColor(type)} icon={getIcon(type)} className="rounded-full px-2">
          {type || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (user) => user ? (
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
             {user.name.charAt(0).toUpperCase()}
           </div>
           <span className="text-gray-600">{user.name}</span>
        </div>
      ) : (
        <span className="text-gray-400 italic text-xs">Unassigned</span>
      )
    }
  ];

  const renderClientTable = (wasteType) => {
    const filteredClients = wasteType === 'All' 
      ? clients 
      : clients.filter(c => c.wasteType === wasteType);

    return (
      <Table 
        columns={columns} 
        dataSource={filteredClients} 
        rowKey="_id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KPI Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of clients and waste streams</p>
      </div>

      <Row gutter={[16, 16]} className="mb-8">
        {Object.values(WASTE_TYPES).map((type) => (
          <Col xs={24} sm={12} md={6} key={type}>
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title={<span className="font-semibold text-gray-600 flex items-center gap-2">{getIcon(type)} {type}</span>}
                value={stats[type]}
                styles={{ content: { color: getHexColor(type) } }}
                suffix={<span className="text-sm text-gray-400">Clients</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <Tabs 
          defaultActiveKey="All"
          items={[
            {
              key: 'All',
              label: 'All Clients',
              children: renderClientTable('All')
            },
            ...Object.values(WASTE_TYPES).map(type => ({
              key: type,
              label: (
                <span className="flex items-center gap-2">
                  {getIcon(type)} {type}
                </span>
              ),
              children: renderClientTable(type)
            }))
          ]}
        />
      </div>
    </div>
  );
};

export default KPIDashboard;
