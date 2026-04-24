import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FaArrowLeft, FaUsers, FaFilePdf } from 'react-icons/fa';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import ClientDetail from './ClientDetail';

const ClientConnectDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const clientName = location.state?.clientName;
  const [reportContext, setReportContext] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);

  const handleDownloadReport = async () => {
    if (!reportContext) return;
    const { client, type, itemId } = reportContext;
    const wasteType = (client?.wasteType || '').toLowerCase();
    if (!wasteType.includes('plastic') || !type || !itemId) return;

    try {
      setDownloading(true);
      const response = await api.get(
        API_ENDPOINTS.ANALYSIS.COMPLIANCE_REPORT(id) + `?type=${type}&itemId=${itemId}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Plastic_Compliance_Report_${client.clientName || id}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Report download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSummaryReport = async () => {
    if (!reportContext) return;
    const { client, type, itemId } = reportContext;
    const wasteType = (client?.wasteType || '').toLowerCase();
    if (!wasteType.includes('plastic') || !type || !itemId) return;

    try {
      setDownloadingSummary(true);
      const response = await api.get(
        API_ENDPOINTS.ANALYSIS.SUMMARY_REPORT(id) + `?type=${type}&itemId=${itemId}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Plastic_Summary_Report_${client.clientName || id}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Summary report download failed:', error);
    } finally {
      setDownloadingSummary(false);
    }
  };

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
            <div className="flex items-center flex-1 gap-4">
            <div className="flex items-center gap-2">
              <FaUsers className="text-primary-600 text-sm" />
              <span className="text-sm font-semibold text-gray-700">Client Connect</span>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-500">Client Details</span>
            </div>
            {clientName && (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-gray-300">|</span>
                <span className="text-sm font-semibold text-gray-900 truncate max-w-xs md:max-w-md">
                  {clientName}
                </span>
              </div>
            )}
            <div className="ml-auto">
              {reportContext && (reportContext.client?.wasteType || '').toLowerCase().includes('plastic') && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSummaryReport}
                    disabled={downloadingSummary}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-amber-700 text-xs font-semibold hover:bg-amber-50 disabled:opacity-60"
                  >
                    <FaFilePdf className="text-sm" />
                    <span>{downloadingSummary ? 'Preparing Summary...' : 'Download Summary Report'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary-200 bg-white text-primary-700 text-xs font-semibold hover:bg-primary-50 disabled:opacity-60"
                  >
                    <FaFilePdf className="text-sm" />
                    <span>{downloading ? 'Preparing Report...' : 'Download Complete Report'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="px-2 md:px-4 py-4">
        <ClientDetail embedded initialViewMode="client-connect" onContextReady={setReportContext} />
      </div>
    </div>
  );
};

export default ClientConnectDetail;
