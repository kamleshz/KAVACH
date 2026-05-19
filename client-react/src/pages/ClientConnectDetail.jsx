import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { FaArrowLeft, FaUsers, FaFilePdf } from "react-icons/fa";
import { Button, Checkbox, Modal, Radio, message } from "antd";
import { API_ENDPOINTS } from "../services/apiEndpoints";
import ClientDetail from "./ClientDetail";
import { queueReportAndDownload } from "../services/reportQueue";
import GsapRevealGroup from "../components/GsapRevealGroup";

const CUSTOM_REPORT_SECTIONS = [
  { id: "companyInfo", title: "Company Information" },
  { id: "summaryData", title: "Summary Data" },
  { id: "industryCategory", title: "Industry Category Wise Details" },
  { id: "markingLabeling", title: "Marking and Labeling" },
  { id: "portalSummaryReport", title: "Portal Summary Report" },
  { id: "skuWiseSummary", title: "SKU Wise Summary" },
  { id: "polymerWiseSummary", title: "Polymer Wise Summary" },
  { id: "categoryWiseSummary", title: "Category Wise Summary" },
  { id: "supplierWiseSummary", title: "Supplier Wise Summary" },
  { id: "skuWiseSupplierDetails", title: "SKU Wise Supplier Details" },
  { id: "polymerWiseSupplierDetails", title: "Polymer Wise Supplier Details" },
  { id: "categoryWiseSupplierDetails", title: "Category Wise Supplier Details" },
];

const ClientConnectDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const clientName = location.state?.clientName;
  const [reportContext, setReportContext] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportMode, setReportMode] = useState("complete");
  const [selectedSections, setSelectedSections] = useState(
    CUSTOM_REPORT_SECTIONS.map((section) => section.id),
  );

  const handleDownloadReport = async (sections) => {
    if (!reportContext) return;
    const { id: contextClientId, client, type, itemId } = reportContext;
    const resolvedClientId = contextClientId || client?._id || client?.id || id;
    const wasteType = (client?.wasteType || "").toLowerCase();
    if (!wasteType.includes("plastic") || !type || !itemId) return;

    try {
      setDownloading(true);
      await queueReportAndDownload({
        reportEndpoint: API_ENDPOINTS.ANALYSIS.COMPLIANCE_REPORT,
        clientId: resolvedClientId,
        type,
        itemId,
        queryParams: sections?.length ? { sections } : {},
        filename: `Plastic_Compliance_Report_${client.clientName || resolvedClientId}.pdf`,
      });
    } catch (error) {
      console.error("Report download failed:", error);
    } finally {
      setDownloading(false);
    }
  };

  const openReportModal = () => {
    setReportMode("complete");
    setSelectedSections(CUSTOM_REPORT_SECTIONS.map((section) => section.id));
    setReportModalOpen(true);
  };

  const handleConfirmReportDownload = async () => {
    if (reportMode === "custom" && !selectedSections.length) {
      message.error("Please select at least one report section.");
      return;
    }

    await handleDownloadReport(
      reportMode === "custom" ? selectedSections : undefined,
    );
    setReportModalOpen(false);
  };

  const handleDownloadSummaryReport = async () => {
    if (!reportContext) return;
    const { id: contextClientId, client, type, itemId } = reportContext;
    const resolvedClientId = contextClientId || client?._id || client?.id || id;
    const wasteType = (client?.wasteType || "").toLowerCase();
    if (!wasteType.includes("plastic") || !type || !itemId) return;

    try {
      setDownloadingSummary(true);
      await queueReportAndDownload({
        reportEndpoint: API_ENDPOINTS.ANALYSIS.SUMMARY_REPORT,
        clientId: resolvedClientId,
        type,
        itemId,
        filename: `Plastic_Summary_Report_${client.clientName || resolvedClientId}.pdf`,
      });
    } catch (error) {
      console.error("Summary report download failed:", error);
    } finally {
      setDownloadingSummary(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 md:px-6 py-3">
        <GsapRevealGroup
          className="flex items-center gap-3"
          animateKey={`client-connect-detail-header-${id}-${clientName || "default"}`}
        >
          <button
            onClick={() => navigate("/dashboard/client-connect")}
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors"
            aria-label="Back to Client Connect"
          >
            <FaArrowLeft className="text-sm" />
          </button>
          <div className="flex items-center flex-1 gap-4">
            <div className="flex items-center gap-2">
              <FaUsers className="text-primary-600 text-sm" />
              <span className="text-sm font-semibold text-gray-700">
                Client Connect
              </span>
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
              {reportContext &&
                (reportContext.client?.wasteType || "")
                  .toLowerCase()
                  .includes("plastic") && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSummaryReport}
                      disabled={downloadingSummary}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-amber-700 text-xs font-semibold hover:bg-amber-50 disabled:opacity-60"
                    >
                      <FaFilePdf className="text-sm" />
                      <span>
                        {downloadingSummary
                          ? "Preparing Summary..."
                          : "Download Summary Report"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={openReportModal}
                      disabled={downloading}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary-200 bg-white text-primary-700 text-xs font-semibold hover:bg-primary-50 disabled:opacity-60"
                    >
                      <FaFilePdf className="text-sm" />
                      <span>
                        {downloading
                          ? "Preparing Report..."
                          : "Download Complete Report"}
                      </span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </GsapRevealGroup>
      </div>
      <div className="px-2 md:px-4 py-4">
        <ClientDetail
          embedded
          initialViewMode="client-connect"
          onContextReady={setReportContext}
        />
      </div>
      <Modal
        open={reportModalOpen}
        title="Choose Report Type"
        onCancel={() => setReportModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setReportModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="download"
            type="primary"
            loading={downloading}
            onClick={handleConfirmReportDownload}
          >
            {reportMode === "custom"
              ? "Download Custom Report"
              : "Download Complete Report"}
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <Radio.Group
            value={reportMode}
            onChange={(event) => setReportMode(event.target.value)}
            className="flex flex-col gap-3"
          >
            <Radio value="complete">
              <div className="ml-2">
                <div className="font-semibold text-gray-800">Complete Report</div>
                <div className="text-xs text-gray-500">
                  Download the full report with all index sections.
                </div>
              </div>
            </Radio>
            <Radio value="custom">
              <div className="ml-2">
                <div className="font-semibold text-gray-800">Custom Report</div>
                <div className="text-xs text-gray-500">
                  Select only the report sections you want from the index.
                </div>
              </div>
            </Radio>
          </Radio.Group>

          {reportMode === "custom" ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    Report Index Selection
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedSections.length} sections selected
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                    onClick={() =>
                      setSelectedSections(
                        CUSTOM_REPORT_SECTIONS.map((section) => section.id),
                      )
                    }
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                    onClick={() => setSelectedSections([])}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <Checkbox.Group
                value={selectedSections}
                onChange={(values) => setSelectedSections(values)}
                className="grid grid-cols-1 gap-3 md:grid-cols-2"
              >
                {CUSTOM_REPORT_SECTIONS.map((section, index) => (
                  <label
                    key={section.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <Checkbox value={section.id} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800">
                        {index + 1}. {section.title}
                      </div>
                    </div>
                  </label>
                ))}
              </Checkbox.Group>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default ClientConnectDetail;
