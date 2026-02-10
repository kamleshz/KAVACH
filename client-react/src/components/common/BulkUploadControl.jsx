import React, { useRef } from 'react';
import { Button } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';

const BulkUploadControl = ({ 
  onUpload, 
  onDownloadTemplate, 
  uploadLabel = "Upload Excel", 
  templateLabel = "Template" 
}) => {
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (onUpload) {
      onUpload(e);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".xlsx, .xls"
      />
      <Button 
        icon={<UploadOutlined />} 
        onClick={handleUploadClick}
        className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
      >
        {uploadLabel}
      </Button>
      <Button 
        icon={<DownloadOutlined />} 
        onClick={onDownloadTemplate}
        className="bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
      >
        {templateLabel}
      </Button>
    </div>
  );
};

export default BulkUploadControl;
