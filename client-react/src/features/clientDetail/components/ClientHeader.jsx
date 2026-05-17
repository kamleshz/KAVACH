import {
  CalendarOutlined,
  AuditOutlined,
  EditOutlined,
} from "@ant-design/icons";
import BackButton from "../../../components/BackButton";

const ClientHeader = ({
  embedded,
  initialViewMode,
  isClientUser,
  isProcessMode,
  client,
  onBack,
  onStartAudit,
  onEdit,
}) => (
  <div className="mb-6 flex justify-between items-center">
    <div className="flex items-center gap-4">
      {!embedded && (
        <BackButton
          onClick={onBack}
          title="Back to previous page"
          className="bg-white shadow-md"
        />
      )}
      {initialViewMode !== "client-connect" && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {client?.clientName}
          </h1>
          <p className="text-sm text-gray-500">Client Details</p>
          {(client?.auditStartDate || client?.auditEndDate) && (
            <p className="text-sm font-medium text-blue-600 mt-1">
              <CalendarOutlined className="mr-1" />
              Audit Period:{" "}
              {client?.auditStartDate
                ? new Date(client.auditStartDate).toLocaleDateString()
                : "N/A"}{" "}
              -{" "}
              {client?.auditEndDate
                ? new Date(client.auditEndDate).toLocaleDateString()
                : "N/A"}
            </p>
          )}
        </div>
      )}
    </div>
    <div className="flex flex-wrap gap-3 justify-end">
      {!embedded && (
        <>
          {isProcessMode && !isClientUser && (
            <button
              onClick={onStartAudit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <AuditOutlined />
              Start Audit
            </button>
          )}
          {!isClientUser && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <EditOutlined />
              Edit
            </button>
          )}
        </>
      )}
    </div>
  </div>
);

export default ClientHeader;
