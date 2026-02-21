import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import ClientDetail from './ClientDetail';

const ClientConnectDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const clientName = location.state?.clientName;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/client-connect')}
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors"
            aria-label="Back to Client Connect"
          >
            <FaArrowLeft className="text-sm" />
          </button>
          <div className="flex items-center justify-between flex-1 gap-4">
            <div className="flex items-center gap-2">
              <FaUsers className="text-primary-600 text-sm" />
              <span className="text-sm font-semibold text-gray-700">Client Connect</span>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-500">Client Details</span>
            </div>
            {clientName && (
              <div className="hidden md:block text-sm font-semibold text-gray-900 truncate max-w-xs md:max-w-md">
                {clientName}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="px-2 md:px-4 py-4">
        <ClientDetail embedded initialViewMode="client-connect" />
      </div>
    </div>
  );
};

export default ClientConnectDetail;
