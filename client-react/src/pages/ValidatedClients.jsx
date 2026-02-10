import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, message, Popconfirm, Space, Table, Tag, Tooltip, Typography, Upload } from 'antd';
import { DeleteOutlined, EyeOutlined, LoadingOutlined, UndoOutlined } from '@ant-design/icons';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import DocumentViewerModal from '../components/DocumentViewerModal';

const ValidatedClients = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingClientId, setUploadingClientId] = useState(null);

  // Document Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerName, setViewerName] = useState('');

  const fetchValidatedClients = async (search = '') => {
    setLoading(true);
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.GET_ALL, {
        params: {
          search,
          validationStatus: 'Verified'
        }
      });
      if (response.data.success) {
        setResults(response.data.data || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Fetch failed:', error);
      message.error('Failed to fetch validated clients');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidatedClients('');
  }, []);

  const getSignedDoc = (client) => {
    const docs = client?.documents || [];
    return docs.find((d) => (d?.documentType || '') === 'Signed Document');
  };

  const resolveUrl = (p) => {
    if (!p) return '';
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    const raw = p.startsWith('/') ? p.slice(1) : p;
    const baseRaw = (api.defaults.baseURL || '').toString().replace(/\/+$/, '');
    const base = baseRaw.endsWith('/api') ? baseRaw.slice(0, -4) : baseRaw;
    const origin = base || 'http://127.0.0.1:8080';
    return `${origin}/${raw}`;
  };

  const handleViewDocument = (filePath, docType, docName) => {
    setViewerUrl(resolveUrl(filePath));
    setViewerName(docName || docType);
    setViewerOpen(true);
  };

  const makeUploadProps = (clientId) => ({
    accept: '.pdf,.jpg,.jpeg,.png',
    showUploadList: false,
    disabled: uploadingClientId === clientId,
    customRequest: async (options) => {
      const { file, onError, onSuccess } = options;
      try {
        setUploadingClientId(clientId);
        const formData = new FormData();
        formData.append('document', file);
        formData.append('documentType', 'Signed Document');
        formData.append('documentName', file?.name || 'Signed Document');
        await api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(clientId), formData, {
          headers: { 'Content-Type': undefined }
        });
        message.success('Signed document uploaded');
        await fetchValidatedClients(searchTerm);
        onSuccess && onSuccess({}, file);
      } catch (error) {
        console.error('Signed document upload failed:', error);
        message.error(error?.response?.data?.message || error?.message || 'Upload failed');
        onError && onError(error);
      } finally {
        setUploadingClientId(null);
      }
    }
  });

  const deleteSignedDoc = async (clientId, docId) => {
    try {
      await api.delete(API_ENDPOINTS.CLIENT.DELETE_DOC(clientId, docId));
      message.success('Signed document deleted');
      await fetchValidatedClients(searchTerm);
    } catch (error) {
      message.error(error?.response?.data?.message || error?.message || 'Delete failed');
    }
  };

  const ActionTile = ({ title, disabled, className, onClick, children }) => (
    <Tooltip title={title}>
      <button
        type="button"
        disabled={disabled}
        onClick={disabled ? undefined : onClick}
        className={[
          'h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-200',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm',
          className
        ].join(' ')}
      >
        {children}
      </button>
    </Tooltip>
  );

  const columns = useMemo(
    () => [
      {
        title: 'Client Legal Name',
        dataIndex: 'clientName',
        key: 'clientName',
        render: (value) => <Typography.Text strong>{value || '-'}</Typography.Text>
      },
      {
        title: 'Company Group',
        dataIndex: 'companyGroupName',
        key: 'companyGroupName',
        render: (value) => <Typography.Text>{value || '-'}</Typography.Text>
      },
      {
        title: 'Entity Type',
        dataIndex: 'entityType',
        key: 'entityType',
        render: (value) => <Tag>{value || '-'}</Tag>
      },
      {
        title: 'Verified On',
        key: 'verifiedOn',
        render: (_, client) => {
          const at = client.validationDetails?.validatedAt;
          return <Typography.Text>{at ? new Date(at).toLocaleDateString() : '-'}</Typography.Text>;
        }
      },
      {
        title: 'Signed Doc',
        key: 'signedDoc',
        render: (_, client) => {
          const doc = getSignedDoc(client);
          if (!doc) return <Tag color="default">Not uploaded</Tag>;
          const date = doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '';
          return <Tag color="purple">{date ? `Uploaded • ${date}` : 'Uploaded'}</Tag>;
        }
      },
      {
        title: 'Actions',
        key: 'actions',
        align: 'center',
        width: 140,
        render: (_, client) => {
          const doc = getSignedDoc(client);
          const isUploading = uploadingClientId === client._id;
          return (
            <Space size={10}>
              <ActionTile
                title={doc ? 'View signed document' : 'Signed document not uploaded'}
                disabled={!doc}
                className="bg-green-600 text-white"
                onClick={() => handleViewDocument(doc?.filePath, 'Signed Document', doc?.documentName || 'Signed Document')}
              >
                <EyeOutlined />
              </ActionTile>

              <Upload {...makeUploadProps(client._id)}>
                <ActionTile
                  title={doc ? 'Replace signed document' : 'Upload signed document'}
                  disabled={isUploading}
                  className="bg-gray-100 text-gray-700"
                >
                  {isUploading ? <LoadingOutlined /> : <UndoOutlined />}
                </ActionTile>
              </Upload>

              <Popconfirm
                title="Delete signed document?"
                okText="Delete"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                disabled={!doc}
                onConfirm={() => deleteSignedDoc(client._id, doc?._id)}
              >
                <div>
                  <ActionTile
                    title={doc ? 'Delete signed document' : 'Signed document not uploaded'}
                    disabled={!doc}
                    className="bg-red-50 text-red-600"
                  >
                    <DeleteOutlined />
                  </ActionTile>
                </div>
              </Popconfirm>
            </Space>
          );
        }
      }
    ],
    [navigate, searchTerm, uploadingClientId, handleViewDocument]
  );

  return (
    <div className="p-4 md:p-8 w-full min-h-screen">
      <div className="w-full mx-auto">
        <div className="mb-4">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Validated Clients
          </Typography.Title>
          <Typography.Text type="secondary">List of all successfully verified clients</Typography.Text>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search by company name, email, or group..."
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            enterButton
            loading={loading}
            onSearch={(value) => fetchValidatedClients((value || '').toString())}
          />
        </Card>

        <Card>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={results}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </Card>
      </div>

      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentUrl={viewerUrl}
        documentName={viewerName}
      />
    </div>
  );
};

export default ValidatedClients;
