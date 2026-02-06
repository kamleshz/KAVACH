import { useState, useEffect } from 'react';
import { Table, Button, Select, Modal, Tag, message, DatePicker } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import API_ENDPOINTS from '../services/apiEndpoints';

const CompanyManagement = () => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedManager, setSelectedManager] = useState(null);
  const [auditStartDate, setAuditStartDate] = useState(null);
  const [auditEndDate, setAuditEndDate] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchUsers();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_ALL);
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      message.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.USER.GET_ALL);
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAssignClick = (client) => {
    setSelectedClient(client);
    setSelectedUser(client.assignedTo?._id || null);
    setSelectedManager(client.assignedManager?._id || null);
    setAuditStartDate(client.auditStartDate ? dayjs(client.auditStartDate) : null);
    setAuditEndDate(client.auditEndDate ? dayjs(client.auditEndDate) : null);
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    // We allow assigning just dates without changing user, or vice versa
    // But typically at least one thing should be updated.
    
    setAssigning(true);
    try {
      const payload = {
        assignedTo: selectedUser,
        assignedManager: selectedManager,
        auditStartDate: auditStartDate ? auditStartDate.toISOString() : null,
        auditEndDate: auditEndDate ? auditEndDate.toISOString() : null
      };

      const response = await api.patch(API_ENDPOINTS.CLIENT.ASSIGN(selectedClient._id), payload);

      if (response.data.success) {
        message.success('Client updated successfully');
        setIsAssignModalOpen(false);
        fetchClients(); // Refresh list
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to update client');
    } finally {
      setAssigning(false);
    }
  };

  const columns = [
    {
      title: 'Company Name',
      dataIndex: 'clientName',
      key: 'clientName',
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
      render: (text) => <span className="font-medium text-gray-800">{text}</span>
    },
    {
      title: 'Waste Type',
      dataIndex: 'wasteType',
      key: 'wasteType',
      render: (type) => {
        let color = 'default';
        if (type === 'Plastic') color = 'orange';
        if (type === 'E-Waste') color = 'blue';
        if (type === 'Battery') color = 'green';
        if (type === 'Used Oil') color = 'purple';
        
        return (
          <Tag color={color} className="font-medium rounded-full px-2">
            {type || 'N/A'}
          </Tag>
        );
      }
    },
    {
      title: 'Assigned User',
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
    },
    {
      title: 'Audit Period',
      key: 'auditPeriod',
      render: (_, record) => {
        if (!record.auditStartDate && !record.auditEndDate) return <span className="text-gray-400 text-xs">-</span>;
        return (
          <div className="text-xs text-gray-600">
            <div>{record.auditStartDate ? dayjs(record.auditStartDate).format('DD MMM YYYY') : 'N/A'}</div>
            <div className="text-gray-400">to</div>
            <div>{record.auditEndDate ? dayjs(record.auditEndDate).format('DD MMM YYYY') : 'N/A'}</div>
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary" 
          ghost 
          size="small"
          icon={<UserAddOutlined />}
          onClick={() => handleAssignClick(record)}
        >
          Assign User
        </Button>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
            <p className="text-gray-500 mt-1">Manage companies and assign users</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={clients} 
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title="Assign User to Company"
        open={isAssignModalOpen}
        onOk={handleAssignSubmit}
        onCancel={() => setIsAssignModalOpen(false)}
        confirmLoading={assigning}
        okText="Assign"
      >
        <div className="py-4">
          <p className="mb-2 text-gray-600">
            Assigning user for: <span className="font-semibold text-gray-800">{selectedClient?.clientName}</span>
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User (Auditor)</label>
            <Select
              className="w-full"
              placeholder="Select a user"
              value={selectedUser}
              onChange={setSelectedUser}
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {users.map(user => (
                <Select.Option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </Select.Option>
              ))}
            </Select>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Manager</label>
            <Select
              className="w-full"
              placeholder="Select a manager"
              value={selectedManager}
              onChange={setSelectedManager}
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {users.map(user => (
                <Select.Option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </Select.Option>
              ))}
            </Select>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audit Start Date</label>
              <DatePicker 
                className="w-full" 
                value={auditStartDate}
                onChange={setAuditStartDate}
                format="DD-MM-YYYY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audit End Date</label>
              <DatePicker 
                className="w-full" 
                value={auditEndDate}
                onChange={setAuditEndDate}
                format="DD-MM-YYYY"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CompanyManagement;
