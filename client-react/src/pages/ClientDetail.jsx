import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Tabs,
  Table,
  Image,
  Select,
  Input,
  Checkbox,
  Drawer,
  Button,
  Tag,
  Tooltip as AntdTooltip,
} from "antd";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import api from "../services/api";
import { API_ENDPOINTS } from "../services/apiEndpoints";
import {
  FaChevronDown,
  FaUser,
  FaUsers,
  FaMapMarkerAlt,
  FaIdCard,
  FaIndustry,
  FaListAlt,
  FaFileContract,
  FaFile,
  FaEye,
  FaDownload,
  FaFolderOpen,
  FaBuilding,
  FaArrowUp,
  FaArrowDown,
  FaCheckCircle,
  FaClipboardCheck,
  FaFilePdf,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaUserTie,
  FaRecycle,
  FaChartLine,
  FaBolt,
  FaOilCan,
  FaCarSide,
  FaBatteryFull,
  FaRupeeSign,
  FaSpinner,
} from "react-icons/fa";
import AuditStepper from "../components/AuditStepper";
import DocumentViewerModal from "../components/DocumentViewerModal";
import GsapCountUp from "../components/GsapCountUp";
import GsapRevealGroup from "../components/GsapRevealGroup";
import GsapStepTransition from "../components/GsapStepTransition";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  AuditOutlined,
  EditOutlined,
} from "@ant-design/icons";

import PlantProcess from "./PlantProcess";
import EWasteProcess from "../features/ewaste/pages/EWasteProcess";
import MarkingLabeling from "../features/plantProcess/components/MarkingLabeling";
import Analysis from "../features/plantProcess/components/Analysis";
import SalesAnalysis from "../features/plantProcess/components/SalesAnalysis";
import PurchaseAnalysis from "../features/plantProcess/components/PurchaseAnalysis";
import useSkuCompliance from "../hooks/useSkuCompliance";
import useAuth from "../hooks/useAuth";
import { resolveClientFileUrl } from "../utils/fileAccess";
import { useClientDetailQuery } from "../hooks/queries/useClientDetailQuery";
import { useClientConnectSummaryQuery } from "../hooks/queries/useClientConnectSummaryQuery";
import { buildCategoryWiseProcurement } from "../features/clientDetail/utils/categorySummary";
import ClientHeader from "../features/clientDetail/components/ClientHeader";
import ClientDocuments from "../features/clientDetail/components/ClientDocuments";
import ClientSummaryPanel from "../features/clientDetail/components/ClientSummaryPanel";
import ClientComplianceTable from "../features/clientDetail/components/ClientComplianceTable";

import { ClientProvider } from "../context/ClientContext";

const WASTE_THEME = {
  "Plastic Waste": { color: "#059669", bg: "#ecfdf5", icon: FaRecycle },
  "E-Waste": { color: "#7c3aed", bg: "#f5f3ff", icon: FaBolt },
  "Battery Waste": { color: "#dc2626", bg: "#fef2f2", icon: FaBatteryFull },
  ELV: { color: "#0284c7", bg: "#f0f9ff", icon: FaCarSide },
  "Used Oil": { color: "#b45309", bg: "#fffbeb", icon: FaOilCan },
};

const ClientDetail = ({
  clientId,
  embedded = false,
  initialViewMode,
  onAuditComplete,
  onContextReady,
}) => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const roleName =
    typeof user?.role === "string" ? user.role : user?.role?.name;
  const isClientUser = roleName === "CLIENT";
  const linkedClientId = user?.linkedClient?._id;

  const derivedId =
    clientId ||
    (initialViewMode === "client-connect" && location.state?.clientId) ||
    paramId;
  const id = derivedId;
  const isProcessMode =
    initialViewMode === "process" || location.state?.viewMode === "process";

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(isProcessMode ? 4 : 1);
  const [expandedSections, setExpandedSections] = useState(
    initialViewMode === "client-connect"
      ? {
          "overview-section": true,
          "address-section": true,
          "documents-section": true,
          "cte-cto-section": true,
        }
      : {},
  );
  const [clientDataOpen, setClientDataOpen] = useState(true);
  const [clientConnectTab, setClientConnectTab] = useState("overview");

  // Document Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerName, setViewerName] = useState("");

  const [embeddedAuditTarget, setEmbeddedAuditTarget] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [summaryProductRows, setSummaryProductRows] = useState([]);
  const [summaryMonthlyRows, setSummaryMonthlyRows] = useState([]);
  const [summarySupplierRows, setSummarySupplierRows] = useState([]);
  const [summarySupplierCtoRows, setSummarySupplierCtoRows] = useState([]);
  const [summaryComponentRows, setSummaryComponentRows] = useState([]);
  const [summaryRecycledRows, setSummaryRecycledRows] = useState([]);
  const [summaryTargetTables, setSummaryTargetTables] = useState([]);
  const [summaryAnnualTargetRows, setSummaryAnnualTargetRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedIndustryCategory, setSelectedIndustryCategory] =
    useState("All");
  const [selectedComplianceStatus, setSelectedComplianceStatus] =
    useState("All");
  const [selectedFoodGrade, setSelectedFoodGrade] = useState("All");
  const [industrySearch, setIndustrySearch] = useState("");
  const [industryOnlyShortfall, setIndustryOnlyShortfall] = useState(false);
  const [industryOnlyNoRecycled, setIndustryOnlyNoRecycled] = useState(false);
  const [industryTopN, setIndustryTopN] = useState("All");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierOnlyShortfall, setSupplierOnlyShortfall] = useState(false);
  const [supplierOnlyNoRecycled, setSupplierOnlyNoRecycled] = useState(false);
  const [supplierTopN, setSupplierTopN] = useState("All");
  const [summaryDrawerOpen, setSummaryDrawerOpen] = useState(false);
  const [summaryDrawerType, setSummaryDrawerType] = useState(null);
  const [summaryDrawerRecord, setSummaryDrawerRecord] = useState(null);
  const [producerViewMode, setProducerViewMode] = useState("cards");
  const [producerCardOpen, setProducerCardOpen] = useState(new Set());
  const [brandOwnerViewMode, setBrandOwnerViewMode] = useState("accordion");
  const [expandedBrandOwnerSku, setExpandedBrandOwnerSku] = useState(null);
  const [closingBrandOwnerSku, setClosingBrandOwnerSku] = useState(null);
  const [brandOwnerComponentStatusFilter, setBrandOwnerComponentStatusFilter] =
    useState(null);
  const isProducerEntity = (client?.entityType || "")
    .toString()
    .toLowerCase()
    .includes("producer");

  const safeNumber = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatWithCommas = (value, digits = 3) =>
    safeNumber(value).toLocaleString("en-IN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  const renderAnimatedSummaryValue = (
    value,
    { digits = 0, className = "text-2xl font-bold", suffix = "" } = {},
  ) => (
    <GsapCountUp
      value={safeNumber(value)}
      duration={0.85}
      animateKey={`summary-${digits}-${suffix}-${value}`}
      className={className}
      formatter={(currentValue) =>
        `${formatWithCommas(currentValue, digits)}${suffix}`
      }
    />
  );

  const resolveUniqueSupplierCounts = (rows = []) => {
    const suppliersByName = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row, index) => {
      const supplierName = (row?.supplierName || "").toString().trim();
      const supplierKey = supplierName
        ? supplierName.toLowerCase()
        : `supplier-${index}`;
      const status = (row?.supplierStatus || "")
        .toString()
        .trim()
        .toLowerCase();
      const existing = suppliersByName.get(supplierKey);

      if (!existing) {
        suppliersByName.set(supplierKey, {
          supplierName,
          hasRegistered:
            status.includes("registered") && !status.includes("unregistered"),
          hasUnregistered: status.includes("unregistered"),
        });
        return;
      }

      existing.hasUnregistered =
        existing.hasUnregistered || status.includes("unregistered");
      existing.hasRegistered =
        existing.hasRegistered ||
        (status.includes("registered") && !status.includes("unregistered"));
    });

    let registeredSuppliers = 0;
    let unregisteredSuppliers = 0;

    suppliersByName.forEach((supplier) => {
      if (supplier.hasUnregistered) {
        unregisteredSuppliers += 1;
        return;
      }
      if (supplier.hasRegistered) {
        registeredSuppliers += 1;
      }
    });

    return {
      registeredSuppliers,
      unregisteredSuppliers,
    };
  };

  const { skuComplianceData, fetchSkuComplianceData } = useSkuCompliance(
    initialViewMode === "client-connect" ? id : null,
    isProducerEntity,
    summaryProductRows,
    summaryComponentRows,
  );

  const { type, itemId } = useMemo(() => {
    if (!client) return { type: null, itemId: null };
    const ctoList = client.productionFacility?.ctoDetailsList || [];
    const cteList = client.productionFacility?.cteDetailsList || [];
    const primary = ctoList[0] || cteList[0];
    const computedType = primary
      ? primary.type || (ctoList[0] === primary ? "CTO" : "CTE")
      : null;
    const computedItemId = primary?._id;
    return { type: computedType, itemId: computedItemId };
  }, [client]);

  const clientDetailQuery = useClientDetailQuery(derivedId);
  const summaryQuery = useClientConnectSummaryQuery({
    clientId: id,
    type,
    itemId,
    enabled: initialViewMode === "client-connect" && Boolean(client),
  });

  useEffect(() => {
    if (client && onContextReady) {
      onContextReady({ id, client, type, itemId });
    }
  }, [client, type, itemId, id, onContextReady]);

  const toggleSection = (plantKey, section) => {
    const key = `${plantKey}-${section}`;
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePlantCard = (plantKey) => {
    const key = `${plantKey}-plant`;
    setExpandedSections((prev) => {
      const current = prev[key];
      const currentValue = typeof current === "boolean" ? current : true;
      return { ...prev, [key]: !currentValue };
    });
  };

  const skuTableData = useMemo(() => {
    const productRows = summaryProductRows || [];
    const monthlyRows = summaryMonthlyRows || [];
    const supplierRows = summarySupplierRows || [];
    const componentRows = summaryComponentRows || [];
    const recycledRows = summaryRecycledRows || [];

    const groupedBySku = new Map();

    productRows.forEach((product) => {
      const skuCode = (product.skuCode || "").trim();
      const componentCode = (product.componentCode || "").trim();

      // For Producer, if skuCode is missing, use componentCode as skuCode
      const effectiveSkuCode =
        isProducerEntity && !skuCode ? componentCode : skuCode;

      if (!effectiveSkuCode) return;

      if (!groupedBySku.has(effectiveSkuCode)) {
        groupedBySku.set(effectiveSkuCode, {
          skuCode: effectiveSkuCode,
          skuDescription: product.skuDescription || "-",
          industryCategory: product.industryCategory || "-",
          productImage: product.productImage,
          componentCodes: new Set(),
          products: [],
        });
      }

      const group = groupedBySku.get(effectiveSkuCode);
      group.products.push(product);

      if (product.componentCode) {
        group.componentCodes.add((product.componentCode || "").trim());
      }
    });

    if (isProducerEntity) {
      // For Producer, return flat list of all component details
      const allDetails = [];
      groupedBySku.forEach((group) => {
        const {
          skuCode,
          skuDescription,
          industryCategory,
          productImage,
          componentCodes,
          products,
        } = group;

        let details = [];

        componentCodes.forEach((compCode) => {
          const procurementRecords = monthlyRows.filter(
            (m) => (m.componentCode || "").trim() === compCode,
          );
          const matchingRecycledRows = recycledRows.filter(
            (r) => (r.componentCode || "").trim() === compCode,
          );

          if (procurementRecords.length > 0) {
            const procDetails = procurementRecords.map((procurement, idx) => {
              const componentRow =
                componentRows.find(
                  (c) => (c.componentCode || "").trim() === compCode,
                ) || {};
              const supplierRow =
                supplierRows.find(
                  (s) =>
                    (s.componentCode || "").trim() === compCode &&
                    (s.supplierName || "").trim().toLowerCase() ===
                      (procurement.supplierName || "").trim().toLowerCase(),
                ) || {};

              const productRow =
                products.find(
                  (p) => (p.componentCode || "").trim() === compCode,
                ) || {};

              const recycledRow =
                matchingRecycledRows.find(
                  (r) =>
                    (r.supplierName || "").trim().toLowerCase() ===
                    (procurement.supplierName || "").trim().toLowerCase(),
                ) ||
                matchingRecycledRows[0] ||
                {};

              return {
                key: `${skuCode}-${compCode}-${idx}`,
                skuCode,
                industryCategory,
                productComplianceStatus:
                  productRow.componentComplianceStatus ||
                  productRow.complianceStatus ||
                  "",
                componentCode: compCode,
                componentImage: productRow.componentImage,
                componentDescription:
                  componentRow.componentDescription ||
                  procurement.componentDescription ||
                  productRow.componentDescription ||
                  "-",
                supplierName: procurement.supplierName || "-",
                supplierStatus: supplierRow.supplierStatus || "-",
                eprCertificateNumber: supplierRow.eprCertificateNumber || "-",
                polymerType:
                  componentRow.polymerType || procurement.polymerType || "-",
                foodGrade:
                  supplierRow.foodGrade || componentRow.foodGrade || "-",
                recycledPolymerUsed:
                  procurement.recycledPolymerUsed ||
                  procurement.recycled_polymer_used ||
                  procurement["Recycled Polymer Used"] ||
                  componentRow.recycledPolymerUsed ||
                  componentRow.recycled_polymer_used ||
                  componentRow["Recycled Polymer Used"] ||
                  "-",
                componentPolymer:
                  componentRow.componentPolymer ||
                  procurement.componentPolymer ||
                  "-",
                category: componentRow.category || procurement.category || "-",
                categoryIIType: componentRow.categoryIIType || "-",
                containerCapacity:
                  componentRow.containerCapacity !== undefined &&
                  componentRow.containerCapacity !== null
                    ? componentRow.containerCapacity
                    : "-",
                layerType: componentRow.layerType || "-",
                thickness:
                  componentRow.thickness !== undefined &&
                  componentRow.thickness !== null
                    ? componentRow.thickness
                    : "-",
                monthlyPurchaseMt: procurement.monthlyPurchaseMt || "0",
                recycledPercent:
                  recycledRow.usedRecycledPercent ||
                  procurement.recycledPercent ||
                  "0",
                recycledQty: (
                  Number(
                    recycledRow.usedRecycledQtyMt || procurement.recycledQty,
                  ) || 0
                ).toFixed(3),
                recycledAmount: procurement.recycledQrtAmount || "0",
                virginQty: procurement.virginQty || "0",
                virginAmount: procurement.virginQtyAmount || "0",
                componentComplianceStatus:
                  productRow.componentComplianceStatus ||
                  productRow.complianceStatus ||
                  "",
                auditorRemarks: productRow.auditorRemarks || "",
                additionalDocument: productRow.additionalDocument,
                managerRemarks: productRow.managerRemarks || "",
              };
            });
            details.push(...procDetails);
          } else {
            const componentRow =
              componentRows.find(
                (c) => (c.componentCode || "").trim() === compCode,
              ) || {};
            const productRow =
              products.find(
                (p) => (p.componentCode || "").trim() === compCode,
              ) || {};

            const totalRecycledQtyForComp = matchingRecycledRows.reduce(
              (sum, r) => sum + (parseFloat(r.usedRecycledQtyMt) || 0),
              0,
            );
            const recycledPercentForComp =
              matchingRecycledRows.find(
                (r) => parseFloat(r.usedRecycledPercent) > 0,
              )?.usedRecycledPercent || "0";

            // Try to find supplier info from product row or supplier row if no procurement
            // Often for Producers, supplier might be in supplierRows even if not in procurement
            const supplierRow =
              supplierRows.find(
                (s) => (s.componentCode || "").trim() === compCode,
              ) || {};

            details.push({
              key: `${skuCode}-${compCode}-stub`,
              skuCode,
              industryCategory,
              productComplianceStatus:
                productRow.componentComplianceStatus ||
                productRow.complianceStatus ||
                "",
              componentCode: compCode,
              componentImage: productRow.componentImage,
              componentDescription:
                componentRow.componentDescription ||
                productRow.componentDescription ||
                "-",
              supplierName: supplierRow.supplierName || "-",
              supplierStatus: supplierRow.supplierStatus || "-",
              eprCertificateNumber: supplierRow.eprCertificateNumber || "-",
              polymerType: componentRow.polymerType || "-",
              foodGrade: supplierRow.foodGrade || componentRow.foodGrade || "-",
              recycledPolymerUsed:
                componentRow.recycledPolymerUsed ||
                componentRow.recycled_polymer_used ||
                componentRow["Recycled Polymer Used"] ||
                "-",
              componentPolymer: componentRow.componentPolymer || "-",
              category: componentRow.category || "-",
              categoryIIType: componentRow.categoryIIType || "-",
              containerCapacity:
                componentRow.containerCapacity !== undefined &&
                componentRow.containerCapacity !== null
                  ? componentRow.containerCapacity
                  : "-",
              layerType: componentRow.layerType || "-",
              thickness:
                componentRow.thickness !== undefined &&
                componentRow.thickness !== null
                  ? componentRow.thickness
                  : "-",
              monthlyPurchaseMt: "0",
              recycledPercent: recycledPercentForComp,
              recycledQty: totalRecycledQtyForComp.toFixed(3),
              recycledAmount: "0",
              virginQty: "0",
              virginAmount: "0",
              componentComplianceStatus:
                productRow.componentComplianceStatus ||
                productRow.complianceStatus ||
                "",
              auditorRemarks: productRow.auditorRemarks || "",
              additionalDocument: productRow.additionalDocument,
              managerRemarks: productRow.managerRemarks || "",
            });
          }
        });
        allDetails.push(...details);
      });
      return allDetails;
    }

    return Array.from(groupedBySku.values()).map((group, index) => {
      const {
        skuCode,
        skuDescription,
        industryCategory,
        productImage,
        componentCodes,
        products,
      } = group;

      let details = [];
      let totalRecycledQty = 0;
      let hasNonCompliant = false;
      let allCompliant = true;
      let remarksList = [];
      let managerRemarksList = [];

      componentCodes.forEach((compCode) => {
        const procurementRecords = monthlyRows.filter(
          (m) => (m.componentCode || "").trim() === compCode,
        );
        const matchingRecycledRows = recycledRows.filter(
          (r) => (r.componentCode || "").trim() === compCode,
        );

        // Calculate metrics for this component across all procurements
        let compRecycledQty = 0;

        if (procurementRecords.length > 0) {
          procurementRecords.forEach((procurement, idx) => {
            const componentRow =
              componentRows.find(
                (c) => (c.componentCode || "").trim() === compCode,
              ) || {};
            const supplierRow =
              supplierRows.find(
                (s) =>
                  (s.componentCode || "").trim() === compCode &&
                  (s.supplierName || "").trim().toLowerCase() ===
                    (procurement.supplierName || "").trim().toLowerCase(),
              ) || {};
            const productRow =
              products.find(
                (p) => (p.componentCode || "").trim() === compCode,
              ) || {};
            const recycledRow =
              matchingRecycledRows.find(
                (r) =>
                  (r.supplierName || "").trim().toLowerCase() ===
                  (procurement.supplierName || "").trim().toLowerCase(),
              ) ||
              matchingRecycledRows[0] ||
              {};

            const recQty = parseFloat(
              recycledRow.usedRecycledQtyMt || procurement.recycledQty || 0,
            );
            compRecycledQty += recQty;

            // Compliance Status Logic
            const status =
              productRow.componentComplianceStatus ||
              productRow.complianceStatus ||
              "";
            if (status === "Non-Compliant") {
              hasNonCompliant = true;
              allCompliant = false;
            } else if (status !== "Compliant") {
              allCompliant = false;
            }

            // Remarks
            if (productRow.auditorRemarks) {
              remarksList.push(`${compCode}: ${productRow.auditorRemarks}`);
            }
            if (status === "Non-Compliant" && productRow.managerRemarks) {
              managerRemarksList.push(
                `${compCode}: ${productRow.managerRemarks}`,
              );
            }

            details.push({
              key: `${skuCode}-${compCode}-${idx}`,
              componentCode: compCode,
              componentImage: productRow.componentImage,
              componentDescription:
                componentRow.componentDescription ||
                procurement.componentDescription ||
                productRow.componentDescription ||
                "-",
              supplierName: procurement.supplierName || "-",
              supplierStatus: supplierRow.supplierStatus || "-",
              eprCertificateNumber: supplierRow.eprCertificateNumber || "-",
              polymerType:
                componentRow.polymerType || procurement.polymerType || "-",
              componentPolymer:
                componentRow.componentPolymer ||
                procurement.componentPolymer ||
                "-",
              recycledPolymerUsed:
                procurement.recycledPolymerUsed ||
                procurement.recycled_polymer_used ||
                procurement["Recycled Polymer Used"] ||
                componentRow.recycledPolymerUsed ||
                componentRow.recycled_polymer_used ||
                componentRow["Recycled Polymer Used"] ||
                "-",
              category: componentRow.category || procurement.category || "-",
              categoryIIType: componentRow.categoryIIType || "-",
              containerCapacity:
                componentRow.containerCapacity !== undefined &&
                componentRow.containerCapacity !== null
                  ? componentRow.containerCapacity
                  : "-",
              layerType: componentRow.layerType || "-",
              thickness:
                componentRow.thickness !== undefined &&
                componentRow.thickness !== null
                  ? componentRow.thickness
                  : "-",
              monthlyPurchaseMt: procurement.monthlyPurchaseMt || "0",
              recycledQty: (
                Number(
                  recycledRow.usedRecycledQtyMt || procurement.recycledQty,
                ) || 0
              ).toFixed(3),
              componentComplianceStatus: status,
              auditorRemarks: productRow.auditorRemarks || "",
              additionalDocument: productRow.additionalDocument,
              managerRemarks: productRow.managerRemarks || "",
            });
          });
        } else {
          // No procurement records, but component exists in product definition
          const componentRow =
            componentRows.find(
              (c) => (c.componentCode || "").trim() === compCode,
            ) || {};
          const productRow =
            products.find((p) => (p.componentCode || "").trim() === compCode) ||
            {};
          const supplierRow =
            supplierRows.find(
              (s) => (s.componentCode || "").trim() === compCode,
            ) || {};

          // Sum recycled qty for component (if any recycled rows exist without procurement link)
          const recQty = matchingRecycledRows.reduce(
            (sum, r) => sum + (parseFloat(r.usedRecycledQtyMt) || 0),
            0,
          );
          compRecycledQty += recQty;

          const status =
            productRow.componentComplianceStatus ||
            productRow.complianceStatus ||
            "";
          if (status === "Non-Compliant") {
            hasNonCompliant = true;
            allCompliant = false;
          } else if (status !== "Compliant") {
            allCompliant = false;
          }

          if (productRow.auditorRemarks) {
            remarksList.push(`${compCode}: ${productRow.auditorRemarks}`);
          }
          if (status === "Non-Compliant" && productRow.managerRemarks) {
            managerRemarksList.push(
              `${compCode}: ${productRow.managerRemarks}`,
            );
          }

          details.push({
            key: `${skuCode}-${compCode}-stub`,
            componentCode: compCode,
            componentImage: productRow.componentImage,
            componentDescription:
              componentRow.componentDescription ||
              productRow.componentDescription ||
              "-",
            supplierName: supplierRow.supplierName || "-",
            supplierStatus: supplierRow.supplierStatus || "-",
            eprCertificateNumber: supplierRow.eprCertificateNumber || "-",
            polymerType: componentRow.polymerType || "-",
            componentPolymer: componentRow.componentPolymer || "-",
            recycledPolymerUsed:
              componentRow.recycledPolymerUsed ||
              componentRow.recycled_polymer_used ||
              componentRow["Recycled Polymer Used"] ||
              "-",
            category: componentRow.category || "-",
            categoryIIType: componentRow.categoryIIType || "-",
            containerCapacity:
              componentRow.containerCapacity !== undefined &&
              componentRow.containerCapacity !== null
                ? componentRow.containerCapacity
                : "-",
            layerType: componentRow.layerType || "-",
            thickness:
              componentRow.thickness !== undefined &&
              componentRow.thickness !== null
                ? componentRow.thickness
                : "-",
            monthlyPurchaseMt: "0",
            recycledQty: recQty.toFixed(3),
            componentComplianceStatus: status,
            auditorRemarks: productRow.auditorRemarks || "",
            additionalDocument: productRow.additionalDocument,
            managerRemarks: productRow.managerRemarks || "",
          });
        }

        totalRecycledQty += compRecycledQty;
      });

      let productComplianceStatus = "";
      if (hasNonCompliant) productComplianceStatus = "Non-Compliant";
      else if (allCompliant && componentCodes.size > 0)
        productComplianceStatus = "Compliant";

      const uniqueRemarks = [...new Set(remarksList)].join("\n");
      const uniqueManagerRemarks = [...new Set(managerRemarksList)].join("\n");

      return {
        key: skuCode,
        skuCode,
        skuDescription,
        industryCategory,
        productImage,
        recycledQty: totalRecycledQty.toFixed(3),
        productComplianceStatus,
        computedRemarks: uniqueRemarks,
        computedManagerRemarks: uniqueManagerRemarks,
        details: details,
      };
    });
  }, [
    summaryProductRows,
    summaryMonthlyRows,
    summarySupplierRows,
    summaryComponentRows,
    summaryRecycledRows,
    isProducerEntity,
  ]);

  const industrySkuSummaryData = useMemo(() => {
    const asList = (value) => {
      if (Array.isArray(value))
        return value
          .map((item) => (item ?? "").toString().trim())
          .filter(Boolean);
      const text = (value ?? "").toString().trim();
      return text ? [text] : [];
    };

    const normalizeStatus = (status, fallback = "Pending") => {
      const value = (status ?? "").toString().trim();
      return value || fallback;
    };

    const deriveComplianceStatus = (item) => {
      const explicitStatus = (item?.productComplianceStatus || "")
        .toString()
        .trim();
      if (explicitStatus) return explicitStatus;

      const detailStatuses = Array.isArray(item?.details)
        ? item.details
            .map((detail) =>
              (
                detail?.componentComplianceStatus ||
                detail?.complianceStatus ||
                ""
              )
                .toString()
                .trim(),
            )
            .filter(Boolean)
        : [];

      if (detailStatuses.includes("Non-Compliant")) return "Non-Compliant";
      if (
        detailStatuses.length > 0 &&
        detailStatuses.every((status) => status === "Compliant")
      )
        return "Compliant";
      if (detailStatuses.length > 0) return "Partially Compliant";
      return "Pending";
    };

    const deriveSupplierStatusCounts = (item) => {
      const componentCodes = new Set(
        (Array.isArray(item?.details) ? item.details : [])
          .map((detail) => (detail?.componentCode || "").toString().trim())
          .filter(Boolean),
      );

      if (componentCodes.size === 0) {
        return {
          supplierRegisteredCount: 0,
          supplierUnregisteredCount: 0,
        };
      }

      const matchingSupplierRows = [];
      (summarySupplierRows || []).forEach((supplierRow) => {
        const componentCode = (supplierRow?.componentCode || "")
          .toString()
          .trim();
        if (!componentCodes.has(componentCode)) return;
        matchingSupplierRows.push(supplierRow);
      });

      const { registeredSuppliers, unregisteredSuppliers } =
        resolveUniqueSupplierCounts(matchingSupplierRows);

      return {
        supplierRegisteredCount: registeredSuppliers,
        supplierUnregisteredCount: unregisteredSuppliers,
      };
    };

    const savedMarkingBySku = new Map();
    (skuComplianceData || []).forEach((row) => {
      const code = (row?.skuCode || "").toString().trim();
      if (!code) return;
      savedMarkingBySku.set(code, row);
    });

    return [...(skuTableData || [])]
      .map((item, index) => {
        const skuCode = (item?.skuCode || "").toString().trim();
        if (!skuCode) return null;

        const savedMarking = savedMarkingBySku.get(skuCode) || {};
        const remarks = [
          ...asList(item?.computedRemarks),
          ...asList(savedMarking?.remarks),
          ...asList(savedMarking?.complianceRemarks),
        ];
        const complianceStatus = deriveComplianceStatus(item);
        const solution =
          complianceStatus === "Non-Compliant"
            ? asList(item?.computedManagerRemarks).join("\n")
            : "";
        const supplierCounts = deriveSupplierStatusCounts(item);

        return {
          key: `${item?.industryCategory || "industry"}-${skuCode}-${index}`,
          industryCategory: item?.industryCategory || "Uncategorized",
          skuCode,
          skuDescription:
            item?.skuDescription ||
            (isProducerEntity ? "Component summary" : "-"),
          complianceStatus,
          markingLabelingStatus: normalizeStatus(
            savedMarking?.complianceStatus,
          ),
          supplierRegisteredCount: supplierCounts.supplierRegisteredCount,
          supplierUnregisteredCount: supplierCounts.supplierUnregisteredCount,
          remarks: [...new Set(remarks)].join("\n"),
          solution,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const industryCompare = (left.industryCategory || "").localeCompare(
          right.industryCategory || "",
        );
        if (industryCompare !== 0) return industryCompare;
        return (left.skuCode || "").localeCompare(right.skuCode || "");
      });
  }, [skuTableData, skuComplianceData, isProducerEntity, summarySupplierRows]);

  useEffect(() => {
    setLoading(clientDetailQuery.isLoading);
  }, [clientDetailQuery.isLoading]);

  useEffect(() => {
    if (clientDetailQuery.data) {
      setClient(clientDetailQuery.data);
      setError("");
    }
  }, [clientDetailQuery.data]);

  useEffect(() => {
    if (clientDetailQuery.error) {
      setError(
        clientDetailQuery.error?.response?.data?.message ||
          "Failed to fetch client details",
      );
    }
  }, [clientDetailQuery.error]);

  useEffect(() => {
    if (!client || initialViewMode !== "client-connect") return;

    if (!type || !itemId || !id) {
      setSummaryProductRows([]);
      setSummaryMonthlyRows([]);
      setSummarySupplierRows([]);
      setSummarySupplierCtoRows([]);
      setSummaryComponentRows([]);
      setSummaryRecycledRows([]);
      setSummaryTargetTables([]);
      setSummaryAnnualTargetRows([]);
      return;
    }

    setSummaryLoading(summaryQuery.isLoading);
  }, [client, initialViewMode, type, itemId, id, summaryQuery.isLoading]);

  useEffect(() => {
    if (initialViewMode !== "client-connect" || !client) return;

    if (!summaryQuery.data) {
      setSummaryProductRows([]);
      setSummaryMonthlyRows([]);
      setSummarySupplierRows([]);
      setSummarySupplierCtoRows([]);
      setSummaryComponentRows([]);
      setSummaryRecycledRows([]);
      setSummaryTargetTables([]);
      setSummaryAnnualTargetRows([]);
      return;
    }

    setSummaryProductRows(summaryQuery.data.productRows || []);
    setSummaryComponentRows(summaryQuery.data.componentRows || []);
    setSummarySupplierRows(summaryQuery.data.supplierRows || []);
    setSummarySupplierCtoRows(summaryQuery.data.supplierCtoRows || []);
    setSummaryMonthlyRows(summaryQuery.data.monthlyRows || []);
    setSummaryRecycledRows(summaryQuery.data.recycledRows || []);
    setSummaryTargetTables(summaryQuery.data.targetTables || []);
    setSummaryAnnualTargetRows(summaryQuery.data.annualTargetRows || []);
  }, [client, initialViewMode, summaryQuery.data]);

  useEffect(() => {
    if (initialViewMode !== "client-connect" || !id) return;
    fetchSkuComplianceData();
  }, [initialViewMode, id, fetchSkuComplianceData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary-200 border-t-primary-600" />
          <FaBuilding className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600 text-lg" />
        </div>
        <p className="mt-4 text-sm text-gray-500 font-medium">
          Loading client details...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        {!embedded && (
          <button
            onClick={() => navigate("/dashboard/clients")}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Back to Clients
          </button>
        )}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">
            Client not found
          </h2>
          {!embedded && (
            <button
              onClick={() => navigate("/dashboard/clients")}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Back to Clients
            </button>
          )}
        </div>
      </div>
    );
  }

  const allTabs = [
    {
      number: 1,
      title: "Client Basic Info",
      description: "Legal & Trade Details",
      icon: <FaUser />,
    },
    {
      number: 2,
      title: "Company Address Details",
      description: "Registered & Communication",
      icon: <FaMapMarkerAlt />,
    },
    {
      number: 3,
      title: "Company Documents",
      description: "GST, PAN, CIN, etc.",
      icon: <FaIdCard />,
    },
    {
      number: 4,
      title: "CTE & CTO/CCA Details",
      description: "Consent Details",
      icon: <FaIndustry />,
    },
  ];

  const tabs = isProcessMode ? allTabs.filter((t) => t.number === 4) : allTabs;

  const resolveUrl = (p) => {
    return resolveClientFileUrl(id, p);
  };

  const handleViewDocument = (filePath, docType, docName) => {
    setViewerUrl(resolveUrl(filePath));
    setViewerName(docName || docType);
    setViewerOpen(true);
  };

  const renderComingSoon = (title) => (
    <div className="py-16 flex flex-col items-center justify-center text-gray-400">
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      <p className="mt-2 text-xs text-gray-400">Coming Soon</p>
    </div>
  );

  const renderOverviewSection = () => {
    const wasteType = client.wasteType || "Plastic Waste";
    const theme = WASTE_THEME[wasteType] || WASTE_THEME["Plastic Waste"];
    const WasteIcon = theme.icon;
    const pf = client.productionFacility || {};
    const regs = Array.isArray(pf.regulationsCoveredUnderCto)
      ? pf.regulationsCoveredUnderCto
      : [];
    const capacityRows = Array.isArray(pf.ctoProductionCapacityValidation)
      ? pf.ctoProductionCapacityValidation
      : [];
    const hasWater = regs.includes("Water");
    const waterRegs = Array.isArray(pf.waterRegulations)
      ? pf.waterRegulations
      : [];
    const hasAir = regs.includes("Air");
    const airRegs = Array.isArray(pf.airRegulations) ? pf.airRegulations : [];
    const hasHazardousWaste = regs.some((r) => {
      const lower = (r || "").toString().trim().toLowerCase();
      return lower === "hazardous waste" || lower === "hazardous wate";
    });
    const hazardousRegs = Array.isArray(pf.hazardousWasteRegulations)
      ? pf.hazardousWasteRegulations
      : [];

    const InfoItem = ({
      icon: Icon,
      label,
      value,
      iconColor = "text-gray-400",
    }) => (
      <div className="flex items-start gap-3 py-2.5">
        <div className="mt-0.5">
          <Icon className={`text-sm ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-sm text-gray-900 font-medium mt-0.5 truncate">
            {value || "N/A"}
          </p>
        </div>
      </div>
    );

    const PersonCard = ({ title, person, icon: Icon }) => {
      if (!person?.name) return null;
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
            <Icon className="text-primary-600 text-sm" />
            <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                {(person.name || "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {person.name}
                </p>
                {person.designation && (
                  <p className="text-xs text-gray-500">{person.designation}</p>
                )}
              </div>
            </div>
            <div className="space-y-2 ml-[52px]">
              {person.number && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <FaPhone className="text-gray-400 text-[10px]" />
                  <span>{person.number}</span>
                </div>
              )}
              {person.email && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <FaEnvelope className="text-gray-400 text-[10px]" />
                  <span className="truncate">{person.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <GsapRevealGroup
        className="w-full mx-auto space-y-5"
        animateKey={`client-overview-${client?._id || id || "default"}`}
      >
        {/* Hero Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: theme.color }}
          />
          <div className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${theme.color}, ${theme.color}bb)`,
                }}
              >
                {(client.clientName || "U")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    {client.clientName}
                  </h2>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold w-fit"
                    style={{
                      color: theme.color,
                      backgroundColor: theme.bg,
                      border: `1px solid ${theme.color}33`,
                    }}
                  >
                    <WasteIcon className="text-[10px]" />
                    {wasteType}
                  </span>
                </div>
                {client.tradeName && (
                  <p className="text-sm text-gray-500 mt-1">
                    Trade Name: {client.tradeName}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
                  {client.entityType && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <FaBuilding className="text-gray-400 text-xs" />
                      <span>{client.entityType}</span>
                    </div>
                  )}
                  {client.companyGroupName && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <FaIndustry className="text-gray-400 text-xs" />
                      <span>{client.companyGroupName}</span>
                    </div>
                  )}
                  {client.financialYear && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <FaCalendarAlt className="text-gray-400 text-xs" />
                      <span>FY {client.financialYear}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
              <FaBuilding className="text-primary-600 text-sm" />
              <h4 className="text-sm font-semibold text-gray-700">
                Company Information
              </h4>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6">
              <InfoItem
                icon={FaBuilding}
                label="Client Name"
                value={client.clientName}
                iconColor="text-primary-500"
              />
              <InfoItem
                icon={FaIdCard}
                label="Trade Name"
                value={client.tradeName}
              />
              <InfoItem
                icon={FaIndustry}
                label="Company Group"
                value={client.companyGroupName}
              />
              <InfoItem
                icon={FaListAlt}
                label="Company Type"
                value={client.companyType}
              />
              <InfoItem
                icon={FaCalendarAlt}
                label="Financial Year"
                value={client.financialYear}
              />
              <InfoItem
                icon={FaCheckCircle}
                label="Entity Type"
                value={client.entityType}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
              <FaUserTie className="text-primary-600 text-sm" />
              <h4 className="text-sm font-semibold text-gray-700">
                Assignment Details
              </h4>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-x-6">
                <InfoItem
                  icon={FaUserTie}
                  label="Assigned To"
                  value={client.assignedTo?.name || "Unassigned"}
                  iconColor="text-blue-500"
                />
                <InfoItem
                  icon={FaEnvelope}
                  label="Assigned Email"
                  value={client.assignedTo?.email}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Person Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PersonCard
            title="Authorised Person"
            person={client.authorisedPerson}
            icon={FaUser}
          />
          <PersonCard
            title="Coordinating Person"
            person={client.coordinatingPerson}
            icon={FaUserTie}
          />
        </div>

        {initialViewMode !== "client-connect" &&
          (regs.length > 0 || capacityRows.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
                <FaIndustry className="text-primary-600 text-sm" />
                <h4 className="text-sm font-semibold text-gray-700">
                  CTO Regulations & Capacity
                </h4>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    Regulations Covered under CTO
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {regs.length ? (
                      regs.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm italic">
                        Not selected
                      </span>
                    )}
                  </div>
                </div>

                {(hasWater || hasAir || hasHazardousWaste) && (
                  <div className="space-y-4">
                    {hasWater && (
                      <div>
                        <div className="text-sm font-bold text-gray-700 mb-2">
                          Water
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                              <tr>
                                <th className="p-3 font-semibold border-b w-20">
                                  SR No
                                </th>
                                <th className="p-3 font-semibold border-b">
                                  Description (water consumption / waste)
                                </th>
                                <th className="p-3 font-semibold border-b w-48">
                                  Permitted quantity
                                </th>
                                <th className="p-3 font-semibold border-b w-24">
                                  UOM
                                </th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                              {(waterRegs.length ? waterRegs : [{}]).map(
                                (row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-bold text-gray-800">
                                      {idx + 1}
                                    </td>
                                    <td className="p-3 text-gray-700">
                                      {row?.description || "-"}
                                    </td>
                                    <td className="p-3 text-gray-700">
                                      {row?.permittedQuantity || "-"}
                                    </td>
                                    <td className="p-3 text-gray-700">
                                      {row?.uom || "-"}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {hasAir && (
                      <div>
                        <div className="text-sm font-bold text-gray-700 mb-2">
                          Air
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                              <tr>
                                <th className="p-3 font-semibold border-b w-20">
                                  SR No
                                </th>
                                <th className="p-3 font-semibold border-b">
                                  Parameters
                                </th>
                                <th className="p-3 font-semibold border-b w-80">
                                  Permissible annual / daily limit
                                </th>
                                <th className="p-3 font-semibold border-b w-24">
                                  UOM
                                </th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                              {(airRegs.length ? airRegs : [{}]).map(
                                (row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-bold text-gray-800">
                                      {idx + 1}
                                    </td>
                                    <td className="p-3 text-gray-700">
                                      {row?.parameter || "-"}
                                    </td>
                                    <td className="p-3 text-gray-700">
                                      {row?.permittedLimit || "-"}
                                    </td>
                                    <td className="p-3 text-gray-700">
                                      {row?.uom || "-"}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {hasHazardousWaste && (
                      <div>
                        <div className="text-sm font-bold text-gray-700 mb-2">
                          Hazardous Waste
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                              <tr>
                                <th className="p-3 font-semibold border-b w-20">
                                  SR No
                                </th>
                                <th className="p-3 font-semibold border-b">
                                  Name of Hazardous Waste
                                </th>
                                <th className="p-3 font-semibold border-b">
                                  Facility &amp; Mode of Disposal
                                </th>
                                <th className="p-3 font-semibold border-b w-40">
                                  Quantity MT/YR
                                </th>
                                <th className="p-3 font-semibold border-b w-24">
                                  UOM
                                </th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                              {(hazardousRegs.length
                                ? hazardousRegs
                                : [{}]
                              ).map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="p-3 font-bold text-gray-800">
                                    {idx + 1}
                                  </td>
                                  <td className="p-3 text-gray-700">
                                    {row?.nameOfHazardousWaste || "-"}
                                  </td>
                                  <td className="p-3 text-gray-700">
                                    {row?.facilityModeOfDisposal || "-"}
                                  </td>
                                  <td className="p-3 text-gray-700">
                                    {row?.quantityMtYr || "-"}
                                  </td>
                                  <td className="p-3 text-gray-700">
                                    {row?.uom || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {capacityRows.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-3 font-semibold border-b">
                            Product Name
                          </th>
                          <th className="p-3 font-semibold border-b">
                            Machine name
                          </th>
                          <th className="p-3 font-semibold border-b">
                            Production output in one HR
                          </th>
                          <th className="p-3 font-semibold border-b">UOM</th>
                          <th className="p-3 font-semibold border-b">
                            Power per hr KWH
                          </th>
                          <th className="p-3 font-semibold border-b">
                            Machine working days
                          </th>
                          <th className="p-3 font-semibold border-b">
                            Machine Total working hours per day
                          </th>
                          <th className="p-3 font-semibold border-b">
                            Total monthly capacity (KG)
                          </th>
                          <th className="p-3 font-semibold border-b">
                            Total monthly capacity (MT)
                          </th>
                          <th className="p-3 font-semibold border-b">
                            Total electricity per month KWH
                          </th>
                          <th className="p-3 font-semibold border-b">
                            Consent capacity
                          </th>
                          <th className="p-3 font-semibold border-b">UOM</th>
                          <th className="p-3 font-semibold border-b">
                            Utilization %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {capacityRows.map((r, idx) => {
                          const fmt = (v) => {
                            if (v === null || v === undefined) return "";
                            const n = Number(v);
                            if (!Number.isFinite(n)) return "";
                            return (Math.round(n * 100) / 100).toString();
                          };
                          const uom = (r.uom || "")
                            .toString()
                            .trim()
                            .toUpperCase();
                          const consentUom = (r.consentUom || uom || "")
                            .toString()
                            .trim()
                            .toUpperCase();
                          const totalMonthlyCapacity =
                            Number(r.totalMonthlyCapacity) || 0;
                          const totalMonthlyCapacityMt =
                            Number(r.totalMonthlyCapacityMt) ||
                            (uom === "KG" ? totalMonthlyCapacity / 1000 : 0);
                          const consentCapacity =
                            Number(r.consentCapacity) || 0;
                          const util = Number.isFinite(
                            Number(r.utilizationPercent),
                          )
                            ? Number(r.utilizationPercent)
                            : consentCapacity > 0
                              ? ((uom === "KG" && consentUom === "MT"
                                  ? totalMonthlyCapacity / 1000
                                  : totalMonthlyCapacity) /
                                  consentCapacity) *
                                100
                              : 0;
                          const isHigh = util >= 100;
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3 text-gray-700">
                                {r.productName || "-"}
                              </td>
                              <td className="p-3 text-gray-700">
                                {r.machineName || "-"}
                              </td>
                              <td className="p-3 text-gray-700">
                                {fmt(r.productionOutputPerHr)}
                              </td>
                              <td className="p-3 text-gray-700">
                                {uom || "-"}
                              </td>
                              <td className="p-3 text-gray-700">
                                {fmt(r.powerPerHrKwh)}
                              </td>
                              <td className="p-3 text-gray-700">
                                {fmt(r.workingDays)}
                              </td>
                              <td className="p-3 text-gray-700">
                                {fmt(r.workingHoursPerDay)}
                              </td>
                              <td className="p-3 text-gray-700">
                                {fmt(totalMonthlyCapacity)}
                              </td>
                              <td className="p-3 text-gray-700">
                                {uom === "KG"
                                  ? fmt(totalMonthlyCapacityMt)
                                  : "NA"}
                              </td>
                              <td className="p-3 text-gray-700">
                                {fmt(r.totalElectricityConsumptionPerMonthKwh)}
                              </td>
                              <td className="p-3 text-gray-700">
                                {fmt(consentCapacity)}
                              </td>
                              <td className="p-3 text-gray-700">
                                {uom === "KG" ? "MT" : consentUom || "-"}
                              </td>
                              <td
                                className={`p-3 ${isHigh ? "text-red-600 font-semibold" : "text-gray-700"}`}
                              >
                                {fmt(util)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
      </GsapRevealGroup>
    );
  };

  const renderCteCtoSection = () => (
    <div className="w-full mx-auto space-y-8">
      {(() => {
        const plantGroups = {};
        const normalize = (name) => (name ? name.trim().toLowerCase() : "");

        const processData = (list, keyName) => {
          (list || []).forEach((item) => {
            const pName = item.plantName;
            if (!pName) return;
            const norm = normalize(pName);
            if (!plantGroups[norm]) {
              plantGroups[norm] = {
                displayName: pName,
                cteDetails: [],
                ctoDetails: [],
                cteProd: [],
                ctoProds: [],
              };
            }
            plantGroups[norm][keyName].push(item);
          });
        };

        processData(client.productionFacility?.cteDetailsList, "cteDetails");
        processData(client.productionFacility?.ctoDetailsList, "ctoDetails");
        processData(client.productionFacility?.cteProduction, "cteProd");
        processData(client.productionFacility?.ctoProducts, "ctoProds");

        const sortedGroups = Object.values(plantGroups).sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        );
        const pf = client.productionFacility || {};
        const regs = Array.isArray(pf.regulationsCoveredUnderCto)
          ? pf.regulationsCoveredUnderCto
          : [];
        const hasWater = regs.includes("Water");
        const waterRegs = Array.isArray(pf.waterRegulations)
          ? pf.waterRegulations
          : [];
        const hasAir = regs.includes("Air");
        const airRegs = Array.isArray(pf.airRegulations)
          ? pf.airRegulations
          : [];
        const hasHazardousWaste = regs.some((r) => {
          const lower = (r || "").toString().trim().toLowerCase();
          return lower === "hazardous waste" || lower === "hazardous wate";
        });
        const hazardousRegs = Array.isArray(pf.hazardousWasteRegulations)
          ? pf.hazardousWasteRegulations
          : [];
        const hasCto = sortedGroups.some(
          (group) => (group.ctoDetails || []).length > 0,
        );

        if (sortedGroups.length === 0) {
          return (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="bg-gray-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                <FaIndustry className="text-3xl text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No Plant Details Found
              </h3>
              <p className="text-gray-500 mt-1">
                There are no CTE or CTO/CCA details available for any plant.
              </p>
            </div>
          );
        }

        const plantCards = sortedGroups.map((group, pIdx) => {
          const {
            displayName: plantName,
            cteDetails,
            ctoDetails,
            cteProd,
            ctoProds,
          } = group;
          const plantKey = plantName || `plant-${pIdx}`;
          const plantToggleKey = `${plantKey}-plant`;
          const cteKey = `${plantKey}-cte`;
          const ctoKey = `${plantKey}-cto`;
          const prodKey = `${plantKey}-products`;
          const isPlantExpanded =
            typeof expandedSections[plantToggleKey] === "boolean"
              ? expandedSections[plantToggleKey]
              : true;
          const isCteExpanded = !!expandedSections[cteKey];
          const isCtoExpanded = !!expandedSections[ctoKey];
          const isProdExpanded = !!expandedSections[prodKey];

          let auditTarget = null;
          let auditType = "";

          if (ctoDetails.length > 0) {
            auditTarget = ctoDetails[0];
            auditType = "CTO";
          } else if (cteDetails.length > 0) {
            auditTarget = cteDetails[0];
            auditType = "CTE";
          }

          let buttonProgress = 0;
          let buttonIsComplete = false;

          if (auditTarget) {
            const stepsCount = Array.isArray(auditTarget.completedSteps)
              ? auditTarget.completedSteps.length
              : 0;
            buttonProgress = Math.min((stepsCount / 4) * 100, 100);
            buttonIsComplete = stepsCount >= 4;
          }

          const buttonContent = buttonIsComplete ? (
            <>
              <FaCheckCircle /> Audit Done
            </>
          ) : (
            <>
              <FaClipboardCheck />{" "}
              {buttonProgress === 0
                ? "Start Audit"
                : `Resume (${Math.round(buttonProgress)}%)`}
            </>
          );

          const combinedConsents = [
            ...cteDetails.map((r) => ({ ...r, type: "CTE", _rawType: "cte" })),
            ...ctoDetails.map((r) => ({ ...r, type: "CTO", _rawType: "cto" })),
          ];

          const combinedProducts = [
            ...cteProd.map((r) => ({
              ...r,
              type: "CTE",
              _rawType: "cte",
              capacity: r.maxCapacityPerYear,
              capacityUnit: r.uom || "MT/Year",
            })),
            ...ctoProds.map((r) => ({
              ...r,
              type: "CTO",
              _rawType: "cto",
              capacity: r.quantity,
              capacityUnit: r.uom || "MT",
            })),
          ];

          return (
            <div
              key={pIdx}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-8"
            >
              <div className="px-6 py-5 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => togglePlantCard(plantKey)}
                  className="flex items-center gap-3 group"
                  aria-expanded={isPlantExpanded}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                    <FaBuilding className="text-xl" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 text-left">
                        {plantName}
                      </h3>
                      <p className="text-xs text-gray-500 text-left">
                        Plant Unit
                      </p>
                    </div>
                    <div
                      className={`text-gray-500 transition-transform duration-300 ${
                        isPlantExpanded ? "rotate-180" : ""
                      }`}
                    >
                      <FaChevronDown className="text-xs" />
                    </div>
                  </div>
                </button>

                {isProcessMode && auditTarget && (
                  <button
                    onClick={() => {
                      if (embedded) {
                        setEmbeddedAuditTarget({
                          type: auditType,
                          id: auditTarget._id,
                        });
                      } else {
                        const isEWaste = client.wasteType === "E-Waste";
                        const processRoute = isEWaste
                          ? "process-ewaste"
                          : "process-plant";
                        navigate(
                          `/dashboard/client/${id}/${processRoute}/${auditType}/${auditTarget._id}`,
                        );
                      }
                    }}
                    className="relative overflow-hidden group w-40 h-10 rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all border border-blue-500 bg-white"
                  >
                    <div className="absolute inset-0 flex items-center justify-center gap-2 text-blue-600 z-0">
                      {buttonContent}
                    </div>
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-500 overflow-hidden transition-all duration-1000 ease-in-out z-10"
                      style={{
                        width: `${buttonIsComplete ? 100 : buttonProgress}%`,
                        opacity: buttonProgress === 0 ? 0 : 1,
                      }}
                    >
                      <div className="w-40 h-full flex items-center justify-center gap-2 text-white whitespace-nowrap">
                        {buttonContent}
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {isPlantExpanded && (
                <div className="p-6 space-y-8">
                  {cteDetails.length > 0 && (
                    <div
                      className={`rounded-lg border transition-all duration-300 ${
                        isCteExpanded
                          ? "border-blue-200 bg-blue-50/40"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(plantKey, "cte")}
                        className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                        aria-expanded={isCteExpanded}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-1 rounded-full ${
                              isCteExpanded ? "bg-blue-600" : "bg-blue-500"
                            }`}
                          ></div>
                          <h4 className="text-sm md:text-base font-bold text-gray-800">
                            CTE Details
                          </h4>
                        </div>
                        <div
                          className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${
                            isCteExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <FaChevronDown className="text-sm" />
                        </div>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isCteExpanded
                            ? "max-h-[600px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="px-4 pb-4 md:px-5 md:pb-5">
                          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                <tr>
                                  <th className="p-3 font-semibold border-b">
                                    Consent No
                                  </th>
                                  <th className="p-3 font-semibold border-b">
                                    Dates
                                  </th>
                                  <th className="p-3 font-semibold border-b">
                                    Location & Address
                                  </th>
                                  <th className="p-3 font-semibold border-b">
                                    Key Personnel
                                  </th>
                                  <th className="p-3 font-semibold border-b">
                                    Document
                                  </th>
                                  <th className="p-3 font-semibold border-b text-center">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="text-sm divide-y divide-gray-100">
                                {cteDetails.map((r, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-900">
                                      {r.consentNo}
                                      {r.category && (
                                        <div
                                          className={`mt-1 text-[10px] inline-block px-1.5 py-0.5 rounded ${
                                            r.category === "Red"
                                              ? "bg-red-50 text-red-600"
                                              : r.category === "Orange"
                                                ? "bg-orange-50 text-orange-600"
                                                : "bg-green-50 text-green-600"
                                          }`}
                                        >
                                          {r.category}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs">
                                          Issued:{" "}
                                          {r.issuedDate
                                            ? new Date(
                                                r.issuedDate,
                                              ).toLocaleDateString()
                                            : "-"}
                                        </span>
                                        <span className="text-xs">
                                          Valid:{" "}
                                          {r.validUpto
                                            ? new Date(
                                                r.validUpto,
                                              ).toLocaleDateString()
                                            : "-"}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 max-w-xs">
                                      <div className="font-medium text-gray-900 mb-1">
                                        {r.plantLocation}
                                      </div>
                                      <div
                                        className="text-xs text-gray-500 leading-relaxed line-clamp-2"
                                        title={r.plantAddress}
                                      >
                                        {r.plantAddress}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex flex-col gap-2 text-xs text-gray-600">
                                        <div>
                                          <div className="font-semibold text-gray-800">
                                            Factory Head
                                          </div>
                                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            <span>
                                              {r.factoryHeadName || "-"}
                                            </span>
                                            {r.factoryHeadDesignation && (
                                              <span>
                                                | {r.factoryHeadDesignation}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            {r.factoryHeadMobile && (
                                              <span>
                                                Mob: {r.factoryHeadMobile}
                                              </span>
                                            )}
                                            {r.factoryHeadEmail && (
                                              <span>
                                                Email: {r.factoryHeadEmail}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-800">
                                            Contact Person
                                          </div>
                                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            <span>
                                              {r.contactPersonName || "-"}
                                            </span>
                                            {r.contactPersonDesignation && (
                                              <span>
                                                | {r.contactPersonDesignation}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            {r.contactPersonMobile && (
                                              <span>
                                                Mob: {r.contactPersonMobile}
                                              </span>
                                            )}
                                            {r.contactPersonEmail && (
                                              <span>
                                                Email: {r.contactPersonEmail}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      {r.documentFile ? (
                                        <button
                                          onClick={() =>
                                            handleViewDocument(
                                              r.documentFile,
                                              "CTE Document",
                                              `CTE_${r.consentNo}`,
                                            )
                                          }
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                        >
                                          <FaEye className="mr-1" /> View
                                        </button>
                                      ) : (
                                        <span className="text-gray-400 text-xs italic">
                                          No Doc
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      {r.verification?.status === "Verified" ? (
                                        <div className="flex flex-col items-center">
                                          <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
                                            <FaCheckCircle /> Verified
                                          </span>
                                          {r.verification?.verifiedBy && (
                                            <span className="text-[10px] text-gray-500 mt-0.5">
                                              by{" "}
                                              {r.verification.verifiedBy.name ||
                                                "User"}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-400 font-medium">
                                          Pending
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {ctoDetails.length > 0 && (
                    <div
                      className={`rounded-lg border transition-all duration-300 ${
                        isCtoExpanded
                          ? "border-purple-200 bg-purple-50/40"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(plantKey, "cto")}
                        className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                        aria-expanded={isCtoExpanded}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-1 rounded-full ${
                              isCtoExpanded ? "bg-purple-600" : "bg-purple-500"
                            }`}
                          ></div>
                          <h4 className="text-sm md:text-base font-bold text-gray-800">
                            CTO Details
                          </h4>
                        </div>
                        <div
                          className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${
                            isCtoExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <FaChevronDown className="text-sm" />
                        </div>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isCtoExpanded
                            ? "max-h-[600px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="px-4 pb-4 md:px-5 md:pb-5">
                          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                <tr>
                                  <th className="p-3 font-semibold border-b">
                                    Consent Order No
                                  </th>
                                  <th className="p-3 font-semibold border-b">
                                    Type / Industry / Category
                                  </th>
                                  <th className="p-3 font-semibold border-b">
                                    Dates
                                  </th>
                                  <th className="p-3 font-semibold border-b">
                                    Location & Address
                                  </th>
                                  <th className="p-3 font-semibold border-b">
                                    Key Personnel
                                  </th>
                                  <th className="p-3 font-semibold border-b">
                                    Document
                                  </th>
                                  <th className="p-3 font-semibold border-b text-center">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="text-sm divide-y divide-gray-100">
                                {ctoDetails.map((r, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-900">
                                      {r.consentOrderNo}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                      <div className="flex flex-col gap-1 text-xs">
                                        <span>
                                          CTO/CCA Type: {r.ctoCaaType || "-"}
                                        </span>
                                        <span>
                                          Industry: {r.industryType || "-"}
                                        </span>
                                        <span>
                                          Category: {r.category || "-"}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-gray-600">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs">
                                          Issued:{" "}
                                          {r.dateOfIssue
                                            ? new Date(
                                                r.dateOfIssue,
                                              ).toLocaleDateString()
                                            : "-"}
                                        </span>
                                        <span className="text-xs">
                                          Valid:{" "}
                                          {r.validUpto
                                            ? new Date(
                                                r.validUpto,
                                              ).toLocaleDateString()
                                            : "-"}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 max-w-xs">
                                      <div className="font-medium text-gray-900 mb-1">
                                        {r.plantLocation}
                                      </div>
                                      <div
                                        className="text-xs text-gray-500 leading-relaxed line-clamp-2"
                                        title={r.plantAddress}
                                      >
                                        {r.plantAddress}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex flex-col gap-2 text-xs text-gray-600">
                                        <div>
                                          <div className="font-semibold text-gray-800">
                                            Factory Head
                                          </div>
                                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            <span>
                                              {r.factoryHeadName || "-"}
                                            </span>
                                            {r.factoryHeadDesignation && (
                                              <span>
                                                | {r.factoryHeadDesignation}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            {r.factoryHeadMobile && (
                                              <span>
                                                Mob: {r.factoryHeadMobile}
                                              </span>
                                            )}
                                            {r.factoryHeadEmail && (
                                              <span>
                                                Email: {r.factoryHeadEmail}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-800">
                                            Contact Person
                                          </div>
                                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            <span>
                                              {r.contactPersonName || "-"}
                                            </span>
                                            {r.contactPersonDesignation && (
                                              <span>
                                                | {r.contactPersonDesignation}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            {r.contactPersonMobile && (
                                              <span>
                                                Mob: {r.contactPersonMobile}
                                              </span>
                                            )}
                                            {r.contactPersonEmail && (
                                              <span>
                                                Email: {r.contactPersonEmail}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      {r.documentFile ? (
                                        <button
                                          onClick={() =>
                                            handleViewDocument(
                                              r.documentFile,
                                              "CTO Document",
                                              `CTO_${r.consentOrderNo}`,
                                            )
                                          }
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                        >
                                          <FaEye className="mr-1" /> View
                                        </button>
                                      ) : (
                                        <span className="text-gray-400 text-xs italic">
                                          No Doc
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      {r.verification?.status === "Verified" ? (
                                        <div className="flex flex-col items-center">
                                          <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
                                            <FaCheckCircle /> Verified
                                          </span>
                                          {r.verification?.verifiedBy && (
                                            <span className="text-[10px] text-gray-500 mt-0.5">
                                              by{" "}
                                              {r.verification.verifiedBy.name ||
                                                "User"}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-400 font-medium">
                                          Pending
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {combinedProducts.length > 0 && (
                    <div
                      className={`rounded-lg border transition-all duration-300 ${
                        isProdExpanded
                          ? "border-blue-200 bg-gray-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(plantKey, "products")}
                        className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                        aria-expanded={isProdExpanded}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-1 rounded-full bg-blue-400"></div>
                          <h5 className="text-sm md:text-base font-bold text-gray-800">
                            Plant Products & Capacity
                          </h5>
                        </div>
                        <div
                          className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${
                            isProdExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <FaChevronDown className="text-sm" />
                        </div>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isProdExpanded
                            ? "max-h-[600px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="px-4 pb-4 md:px-5 md:pb-5">
                          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {combinedProducts.map((prod, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center relative overflow-hidden"
                                >
                                  <div
                                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                                      prod.type === "CTE"
                                        ? "bg-blue-400"
                                        : "bg-purple-400"
                                    }`}
                                  ></div>
                                  <div className="pl-2">
                                    <p className="text-sm font-semibold text-gray-800">
                                      {prod.productName}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span
                                        className={`text-[10px] px-1.5 rounded ${
                                          prod.type === "CTE"
                                            ? "bg-blue-50 text-blue-600"
                                            : "bg-purple-50 text-purple-600"
                                        }`}
                                      >
                                        {prod.type}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        Product
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-gray-700">
                                      {prod.capacity}
                                    </p>
                                    <p className="text-[10px] text-gray-400 uppercase">
                                      {prod.capacityUnit}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasCto && (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                          <h4 className="font-bold text-gray-800 text-sm md:text-base">
                            CTO/CCA Additional Details
                          </h4>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {(() => {
                          const rows =
                            Array.isArray(pf.ctoAdditionalDetails) &&
                            pf.ctoAdditionalDetails.length
                              ? pf.ctoAdditionalDetails
                              : pf.totalCapitalInvestmentLakhs !== undefined ||
                                  pf.groundWaterUsage ||
                                  pf.cgwaNocRequirement ||
                                  pf.cgwaNocDocument
                                ? [
                                    {
                                      plantName:
                                        pf.ctoDetailsList?.[0]?.plantName || "",
                                      totalCapitalInvestmentLakhs:
                                        pf.totalCapitalInvestmentLakhs,
                                      groundWaterUsage: pf.groundWaterUsage,
                                      cgwaNocRequirement: pf.cgwaNocRequirement,
                                      cgwaNocDocument: pf.cgwaNocDocument,
                                    },
                                  ]
                                : [];
                          return rows.length ? (
                            rows.map((row, idx) => (
                              <div
                                key={row._id || row.plantName || idx}
                                className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                      Plant Name
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-gray-900">
                                      {row.plantName || "-"}
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                      Total Capital Investment (Lakhs)
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-gray-900">
                                      {row.totalCapitalInvestmentLakhs ?? "-"}
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                      Ground/Bore Well Water Usage
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-gray-900">
                                      {row.groundWaterUsage || "-"}
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                      CGWA NOC Requirement
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-gray-900">
                                      {row.cgwaNocRequirement || "-"}
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                      CGWA NOC Document
                                    </div>
                                    <div className="mt-2">
                                      {row.cgwaNocDocument ? (
                                        <button
                                          onClick={() =>
                                            handleViewDocument(
                                              row.cgwaNocDocument,
                                              "CGWA",
                                              `CGWA NOC_${row.plantName || idx + 1}`,
                                            )
                                          }
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                        >
                                          <FaEye className="mr-1" /> View
                                        </button>
                                      ) : (
                                        <span className="text-gray-400 text-xs italic">
                                          No Doc
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-400 italic">
                              No additional details added.
                            </div>
                          );
                        })()}

                        {initialViewMode === "client-connect" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                <h4 className="font-bold text-gray-800 text-sm md:text-base">
                                  Regulations Covered under CTO
                                </h4>
                              </div>
                            </div>

                            <div className="mt-1 flex flex-wrap gap-2">
                              {regs.length ? (
                                regs.map((r) => (
                                  <span
                                    key={r}
                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  >
                                    {r}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm italic">
                                  Not selected
                                </span>
                              )}
                            </div>

                            {hasWater && (
                              <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm font-bold text-gray-700">
                                    Water
                                  </div>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                  <table className="w-full text-left border-collapse">
                                    <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                                      <tr>
                                        <th className="p-3 font-semibold border-b w-20">
                                          SR No
                                        </th>
                                        <th className="p-3 font-semibold border-b w-48">
                                          Plant Name
                                        </th>
                                        <th className="p-3 font-semibold border-b">
                                          Description (water consumption /
                                          waste)
                                        </th>
                                        <th className="p-3 font-semibold border-b w-48">
                                          Permitted quantity
                                        </th>
                                        <th className="p-3 font-semibold border-b w-24">
                                          UOM
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-100">
                                      {(waterRegs.length
                                        ? waterRegs
                                        : [{}]
                                      ).map((row, idx) => (
                                        <tr
                                          key={idx}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="p-3 font-bold text-gray-800">
                                            {idx + 1}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {row.plantName || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {row.description || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {row.permittedQuantity || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {row.uom || "-"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {hasAir && (
                              <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm font-bold text-gray-700">
                                    Air
                                  </div>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                  <table className="w-full text-left border-collapse">
                                    <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                                      <tr>
                                        <th className="p-3 font-semibold border-b w-20">
                                          SR No
                                        </th>
                                        <th className="p-3 font-semibold border-b w-48">
                                          Plant Name
                                        </th>
                                        <th className="p-3 font-semibold border-b">
                                          Parameters
                                        </th>
                                        <th className="p-3 font-semibold border-b w-80">
                                          Permissible annual / daily limit
                                        </th>
                                        <th className="p-3 font-semibold border-b w-24">
                                          UOM
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-100">
                                      {(airRegs.length ? airRegs : [{}]).map(
                                        (row, idx) => (
                                          <tr
                                            key={idx}
                                            className="hover:bg-gray-50"
                                          >
                                            <td className="p-3 font-bold text-gray-800">
                                              {idx + 1}
                                            </td>
                                            <td className="p-3 text-gray-700">
                                              {row.plantName || "-"}
                                            </td>
                                            <td className="p-3 text-gray-700">
                                              {row.parameter || "-"}
                                            </td>
                                            <td className="p-3 text-gray-700">
                                              {row.permittedLimit || "-"}
                                            </td>
                                            <td className="p-3 text-gray-700">
                                              {row.uom || "-"}
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {hasHazardousWaste && (
                              <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm font-bold text-gray-700">
                                    Hazardous Waste
                                  </div>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                  <table className="w-full text-left border-collapse">
                                    <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                                      <tr>
                                        <th className="p-3 font-semibold border-b w-20">
                                          SR No
                                        </th>
                                        <th className="p-3 font-semibold border-b w-48">
                                          Plant Name
                                        </th>
                                        <th className="p-3 font-semibold border-b">
                                          Name of Hazardous Waste
                                        </th>
                                        <th className="p-3 font-semibold border-b">
                                          Facility &amp; Mode of Disposal
                                        </th>
                                        <th className="p-3 font-semibold border-b w-40">
                                          Quantity MT/YR
                                        </th>
                                        <th className="p-3 font-semibold border-b w-24">
                                          UOM
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-100">
                                      {(hazardousRegs.length
                                        ? hazardousRegs
                                        : [{}]
                                      ).map((row, idx) => (
                                        <tr
                                          key={idx}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="p-3 font-bold text-gray-800">
                                            {idx + 1}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {row.plantName || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {row.nameOfHazardousWaste || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {row.facilityModeOfDisposal || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {row.quantityMtYr || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {row.uom || "-"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {initialViewMode === "client-connect" &&
                          Array.isArray(pf.ctoProductionCapacityValidation) &&
                          pf.ctoProductionCapacityValidation.length > 0 && (
                            <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                  <tr>
                                    <th className="p-3 font-semibold border-b">
                                      Product Name
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Machine name
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Production output in one HR
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      UOM
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Power per hr KWH
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Machine working days
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Machine Total working hours per day
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Total monthly capacity (KG)
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Total monthly capacity (MT)
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Total electricity per month KWH
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Consent capacity
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      UOM
                                    </th>
                                    <th className="p-3 font-semibold border-b">
                                      Utilization %
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-100">
                                  {pf.ctoProductionCapacityValidation.map(
                                    (r, idx) => {
                                      const fmt = (v) => {
                                        if (v === null || v === undefined)
                                          return "";
                                        const n = Number(v);
                                        if (!Number.isFinite(n)) return "";
                                        return (
                                          Math.round(n * 100) / 100
                                        ).toString();
                                      };
                                      const uom = (r.uom || "")
                                        .toString()
                                        .trim()
                                        .toUpperCase();
                                      const consentUom = (
                                        r.consentUom ||
                                        uom ||
                                        ""
                                      )
                                        .toString()
                                        .trim()
                                        .toUpperCase();
                                      const totalMonthlyCapacity =
                                        Number(r.totalMonthlyCapacity) || 0;
                                      const totalMonthlyCapacityMt =
                                        Number(r.totalMonthlyCapacityMt) ||
                                        (uom === "KG"
                                          ? totalMonthlyCapacity / 1000
                                          : 0);
                                      const consentCapacity =
                                        Number(r.consentCapacity) || 0;
                                      const util = Number.isFinite(
                                        Number(r.utilizationPercent),
                                      )
                                        ? Number(r.utilizationPercent)
                                        : consentCapacity > 0
                                          ? ((uom === "KG" &&
                                            consentUom === "MT"
                                              ? totalMonthlyCapacity / 1000
                                              : totalMonthlyCapacity) /
                                              consentCapacity) *
                                            100
                                          : 0;
                                      const isHigh = util >= 100;
                                      return (
                                        <tr
                                          key={idx}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="p-3 text-gray-700">
                                            {r.productName || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {r.machineName || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {fmt(r.productionOutputPerHr)}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {uom || "-"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {fmt(r.powerPerHrKwh)}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {fmt(r.workingDays)}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {fmt(r.workingHoursPerDay)}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {fmt(totalMonthlyCapacity)}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {uom === "KG"
                                              ? fmt(totalMonthlyCapacityMt)
                                              : "NA"}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {fmt(
                                              r.totalElectricityConsumptionPerMonthKwh,
                                            )}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {fmt(consentCapacity)}
                                          </td>
                                          <td className="p-3 text-gray-700">
                                            {uom === "KG"
                                              ? "MT"
                                              : consentUom || "-"}
                                          </td>
                                          <td
                                            className={`p-3 ${isHigh ? "text-red-600 font-semibold" : "text-gray-700"}`}
                                          >
                                            {fmt(util)}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        });

        return <>{plantCards}</>;
      })()}
    </div>
  );

  const renderAddressSection = () => (
    <div className="w-full mx-auto space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
          <span className="font-semibold text-gray-700 flex items-center gap-2">
            <FaMapMarkerAlt className="text-primary-600" />
            Company Address Details
          </span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Registered Address
              </p>
              <p className="text-gray-900">
                {client.companyDetails?.registeredAddress || "N/A"}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Communication Address
              </p>
              <p className="text-gray-900">{client.notes || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentsSection = () => (
    <div className="w-full mx-auto">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <span className="font-semibold text-gray-700 flex items-center gap-2">
            <FaFileContract className="text-primary-600" />
            Company Documents
          </span>
        </div>
        <div className="p-6 space-y-3">
          {(client.documents || [])
            .filter((d) =>
              [
                "PAN",
                "GST",
                "CIN",
                "Factory License",
                "EPR Certificate",
              ].includes(d.documentType),
            )
            .map((doc, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-50 border rounded-lg p-4"
              >
                <div className="flex items-center gap-4">
                  <FaFile className="text-primary-600 text-xl" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {doc.documentType}
                    </p>
                    <p className="text-xs text-gray-600">
                      Number: {doc.certificateNumber || "N/A"} • Date:{" "}
                      {doc.certificateDate
                        ? new Date(doc.certificateDate).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleViewDocument(
                        doc.filePath,
                        doc.documentType,
                        doc.documentType,
                      )
                    }
                    className="px-3 py-1.5 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-sm flex items-center gap-1"
                  >
                    <FaEye className="text-xs" />
                    View
                  </button>
                  <a
                    href={resolveUrl(doc.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm flex items-center gap-1"
                  >
                    <FaDownload className="text-xs" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          {(client.documents || []).filter((d) =>
            [
              "PAN",
              "GST",
              "CIN",
              "Factory License",
              "EPR Certificate",
              "IEC Certificate",
              "DIC/DCSSI Certificate",
            ].includes(d.documentType),
          ).length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border">
              <FaFolderOpen className="text-gray-300 text-4xl mb-3 mx-auto" />
              <p className="text-gray-500 text-sm">No certificates uploaded</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 border-t pt-6">
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 text-primary-700">
            MSME Details
          </h4>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-center border-collapse whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-3 border-b text-sm font-semibold">Year</th>
                  <th className="p-3 border-b text-sm font-semibold">Status</th>
                  <th className="p-3 border-b text-sm font-semibold">
                    Major Activity
                  </th>
                  <th className="p-3 border-b text-sm font-semibold">
                    Udyam Number
                  </th>
                  <th className="p-3 border-b text-sm font-semibold">
                    TurnOver (CR.)
                  </th>
                  <th className="p-3 border-b text-sm font-semibold">
                    Certificate
                  </th>
                </tr>
              </thead>
              <tbody>
                {(client.msmeDetails || []).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 border-b">
                    <td className="p-3">{row.classificationYear}</td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3">{row.majorActivity}</td>
                    <td className="p-3">{row.udyamNumber}</td>
                    <td className="p-3">{row.turnover}</td>
                    <td className="p-3">
                      {row.certificateFile ? (
                        <button
                          onClick={() =>
                            handleViewDocument(
                              row.certificateFile,
                              "MSME Certificate",
                              `MSME_${row.udyamNumber}`,
                            )
                          }
                          className="text-primary-600 hover:underline"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(client.msmeDetails || []).length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-gray-400">
                      No MSME details
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSkuSummary = () => {
    const normalizeLayerType = (value) => {
      const raw = (value ?? "").toString().trim();
      if (!raw) return "—";
      const s = raw.toLowerCase();
      if (s.includes("multi")) return "Multilayer";
      if (s.includes("mono") || s.includes("single")) return "Monolayer";
      return raw;
    };

    const toggleBrandOwnerSku = (skuKey) => {
      const currentExpanded = expandedBrandOwnerSku;

      if (currentExpanded && currentExpanded !== skuKey) {
        const toClose = currentExpanded;
        setClosingBrandOwnerSku(toClose);
        window.setTimeout(() => {
          setClosingBrandOwnerSku((prev) => (prev === toClose ? null : prev));
        }, 260);
      }

      if (currentExpanded === skuKey) {
        setClosingBrandOwnerSku(skuKey);
        window.setTimeout(() => {
          setExpandedBrandOwnerSku((prev) => (prev === skuKey ? null : prev));
          setClosingBrandOwnerSku((prev) => (prev === skuKey ? null : prev));
        }, 260);
        return;
      }

      setExpandedBrandOwnerSku(skuKey);
      setClosingBrandOwnerSku(null);
    };

    const categories = [
      "All",
      ...new Set(
        skuTableData.map((item) => item.industryCategory).filter(Boolean),
      ),
    ];
    const foodGrades = [
      "All",
      ...new Set(skuTableData.map((item) => item.foodGrade).filter(Boolean)),
    ];
    const complianceOptions = ["All", "Compliant", "Non-Compliant"];

    const filteredByIndustry =
      selectedIndustryCategory === "All"
        ? skuTableData
        : skuTableData.filter(
            (item) => item.industryCategory === selectedIndustryCategory,
          );

    const filteredByFood =
      selectedFoodGrade === "All"
        ? filteredByIndustry
        : filteredByIndustry.filter(
            (item) => (item.foodGrade || "-") === selectedFoodGrade,
          );

    const filteredData =
      selectedComplianceStatus === "All"
        ? filteredByFood
        : filteredByFood.filter(
            (item) => item.productComplianceStatus === selectedComplianceStatus,
          );

    // Calculate status counts based on ALL data (or filtered? usually dashboard cards show summary of current view)
    // Let's use filteredData for dynamic updates as requested by standard patterns
    const compliantCount = filteredData.filter(
      (item) => item.productComplianceStatus === "Compliant",
    ).length;
    const nonCompliantCount = filteredData.filter(
      (item) => item.productComplianceStatus === "Non-Compliant",
    ).length;
    const totalWithStatus = compliantCount + nonCompliantCount;
    const compliantPct = totalWithStatus
      ? ((compliantCount / totalWithStatus) * 100).toFixed(1)
      : "0.0";
    const nonCompliantPct = totalWithStatus
      ? ((nonCompliantCount / totalWithStatus) * 100).toFixed(1)
      : "0.0";

    let detailColumns = [
      {
        title: "Component Code",
        dataIndex: "componentCode",
        key: "componentCode",
        width: 120,
        fixed: "left",
        render: (text) => (
          <span className="font-semibold text-gray-700">{text}</span>
        ),
      },
      {
        title: "Component Image",
        dataIndex: "componentImage",
        key: "componentImage",
        width: 100,
        align: "center",
        render: (img) =>
          img ? (
            <div className="w-10 h-10 mx-auto rounded bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
              <Image
                src={typeof img === "string" ? resolveUrl(img) : ""}
                alt="Component"
                className="w-full h-full object-cover"
                preview={
                  img
                    ? { src: typeof img === "string" ? resolveUrl(img) : "" }
                    : false
                }
              />
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          ),
      },
      {
        title: "Component Description",
        dataIndex: "componentDescription",
        key: "componentDescription",
        width: 250,
      },
      {
        title: "Name of Supplier",
        dataIndex: "supplierName",
        key: "supplierName",
        width: 250,
      },
      {
        title: "Supplier Status",
        dataIndex: "supplierStatus",
        key: "supplierStatus",
        width: 120,
      },
      {
        title: "EPR Cert. No",
        dataIndex: "eprCertificateNumber",
        key: "eprCertificateNumber",
        width: 120,
      },
      {
        title: "Polymer Type",
        dataIndex: "polymerType",
        key: "polymerType",
        width: 100,
      },
      {
        title: "Component Polymer",
        dataIndex: "componentPolymer",
        key: "componentPolymer",
        width: 120,
      },
      {
        title: "Recycled Polymer Used",
        dataIndex: "recycledPolymerUsed",
        key: "recycledPolymerUsed",
        width: 160,
      },
      { title: "Category", dataIndex: "category", key: "category", width: 100 },
      {
        title: "Category II Type",
        dataIndex: "categoryIIType",
        key: "categoryIIType",
        width: 120,
      },
      {
        title: "Container Capacity",
        dataIndex: "containerCapacity",
        key: "containerCapacity",
        width: 120,
      },
      {
        title: "Layer Type",
        dataIndex: "layerType",
        key: "layerType",
        width: 120,
      },
      {
        title: "Thickness",
        dataIndex: "thickness",
        key: "thickness",
        width: 100,
      },
      {
        title: "Monthly purchase MT",
        dataIndex: "monthlyPurchaseMt",
        key: "monthlyPurchaseMt",
        width: 150,
        align: "right",
      },
      {
        title: "Recycled QTY",
        dataIndex: "recycledQty",
        key: "recycledQty",
        width: 120,
        align: "right",
      },
      {
        title: "Component Compliance Status",
        dataIndex: "componentComplianceStatus",
        key: "componentComplianceStatus",
        width: 150,
        render: (val) => (
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              val === "Compliant"
                ? "bg-green-100 text-green-700"
                : val === "Non-Compliant"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {val || "-"}
          </span>
        ),
      },
      {
        title: "Auditor Remarks",
        dataIndex: "auditorRemarks",
        key: "auditorRemarks",
        width: 300,
        render: (val) => (
          <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
            {val || "-"}
          </div>
        ),
      },
      {
        title: "Additional Document",
        dataIndex: "additionalDocument",
        key: "additionalDocument",
        width: 120,
        align: "center",
        render: (doc) => (
          <div className="flex flex-col items-center gap-1">
            {doc ? (
              <button
                onClick={() => {
                  const url = typeof doc === "string" ? resolveUrl(doc) : "";
                  if (url) window.open(url, "_blank");
                }}
                className="text-[10px] font-bold text-primary-600 hover:text-primary-800 underline"
              >
                View
              </button>
            ) : (
              <span className="text-gray-300">-</span>
            )}
          </div>
        ),
      },
      {
        title: "Manager Remarks",
        dataIndex: "managerRemarks",
        key: "managerRemarks",
        width: 200,
        render: (val) => (
          <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
            {val || "-"}
          </div>
        ),
      },
    ];

    const producerDetailColumns = detailColumns
      .filter((col) => col.key !== "componentPolymer")
      .map((col) => {
        if (col.key !== "layerType") return col;
        return {
          ...col,
          title: "Multilayer/Monolayer",
          render: (val) => (
            <span className="text-gray-800">{normalizeLayerType(val)}</span>
          ),
        };
      });

    const expandedRowRender = (record) => {
      return (
        <Table
          columns={detailColumns}
          dataSource={record.details}
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }}
          bordered
          className="bg-gray-50"
        />
      );
    };

    let columns = [];

    if (isProducerEntity) {
      // Use standard component table columns for Producer (flat view)
      columns = producerDetailColumns;
    } else {
      // Standard SKU -> Component Table for Brand Owners
      columns = [
        {
          title: "SKU Code",
          dataIndex: "skuCode",
          key: "skuCode",
          width: 120,
          fixed: "left",
          render: (text) => (
            <span className="font-semibold text-gray-700">{text}</span>
          ),
        },
        {
          title: "SKU Description",
          dataIndex: "skuDescription",
          key: "skuDescription",
          width: 220,
          render: (text) => (
            <span className="text-gray-600 text-xs">{text}</span>
          ),
        },
        {
          title: "Industry Category",
          dataIndex: "industryCategory",
          key: "industryCategory",
          width: 180,
          render: (text) => (
            <span className="text-gray-600 text-xs">{text}</span>
          ),
        },
        {
          title: "Product Image",
          dataIndex: "productImage",
          key: "productImage",
          width: 120,
          align: "center",
          render: (img) =>
            img ? (
              <div className="w-10 h-10 mx-auto rounded bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
                <Image
                  src={typeof img === "string" ? resolveUrl(img) : ""}
                  alt="Product"
                  className="w-full h-full object-cover"
                  preview={
                    img
                      ? { src: typeof img === "string" ? resolveUrl(img) : "" }
                      : false
                  }
                />
              </div>
            ) : (
              <span className="text-gray-300">-</span>
            ),
        },
        {
          title: "Recycled Qty",
          dataIndex: "recycledQty",
          key: "recycledQty",
          width: 120,
          align: "right",
          render: (val) => (
            <span className="font-medium text-green-700">{val}</span>
          ),
        },
        {
          title: "Product Compliance Status",
          dataIndex: "productComplianceStatus",
          key: "productComplianceStatus",
          width: 180,
          render: (val) => (
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                val === "Compliant"
                  ? "bg-green-100 text-green-700"
                  : val === "Non-Compliant"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {val || "-"}
            </span>
          ),
        },
        {
          title: "Remarks",
          dataIndex: "computedRemarks",
          key: "computedRemarks",
          width: 200,
          render: (val) => (
            <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
              {val || "-"}
            </div>
          ),
        },
        {
          title: "Additional Document",
          dataIndex: "additionalDocument",
          key: "additionalDocument",
          width: 120,
          align: "center",
          render: (doc) => (
            <div className="flex flex-col items-center gap-1">
              {doc ? (
                <button
                  onClick={() => {
                    const url = typeof doc === "string" ? resolveUrl(doc) : "";
                    if (url) window.open(url, "_blank");
                  }}
                  className="text-[10px] font-bold text-primary-600 hover:text-primary-800 underline"
                >
                  View
                </button>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </div>
          ),
        },
        {
          title: "Manager Remarks",
          dataIndex: "managerRemarks",
          key: "managerRemarks",
          width: 200,
          render: (val) => (
            <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[60px] overflow-y-auto">
              {val || "-"}
            </div>
          ),
        },
      ];
    }

    if (summaryLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (!skuTableData.length) {
      return (
        <div className="text-center py-12 text-gray-400 text-sm">
          No SKU data available.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="w-full md:w-64">
              <span className="text-sm font-semibold text-gray-700 block mb-1">
                Filter by Industry Category:
              </span>
              <Select
                className="w-full"
                value={selectedIndustryCategory}
                onChange={setSelectedIndustryCategory}
                options={categories.map((c) => ({ value: c, label: c }))}
              />
            </div>
            {isProducerEntity && (
              <div className="w-full md:w-64">
                <span className="text-sm font-semibold text-gray-700 block mb-1">
                  Filter by Food Grade:
                </span>
                <Select
                  className="w-full"
                  value={selectedFoodGrade}
                  onChange={setSelectedFoodGrade}
                  options={foodGrades.map((f) => ({ value: f, label: f }))}
                />
              </div>
            )}
            <div className="w-full md:w-64">
              <span className="text-sm font-semibold text-gray-700 block mb-1">
                Compliance Status:
              </span>
              <Select
                className="w-full"
                value={selectedComplianceStatus}
                onChange={setSelectedComplianceStatus}
                options={complianceOptions.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isProducerEntity && (
              <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5 mr-2">
                <button
                  onClick={() => setProducerViewMode("cards")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    producerViewMode === "cards"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setProducerViewMode("table")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    producerViewMode === "table"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Table
                </button>
              </div>
            )}
            {!isProducerEntity && (
              <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5 mr-2">
                <button
                  onClick={() => setBrandOwnerViewMode("accordion")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    brandOwnerViewMode === "accordion"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setBrandOwnerViewMode("table")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    brandOwnerViewMode === "table"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Table
                </button>
              </div>
            )}
            <div className="bg-gradient-to-br from-green-50 to-white px-4 py-3 rounded-xl border border-green-200 flex items-center gap-3 min-w-[180px] shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <FaCheckCircle className="text-green-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">
                  Compliant
                </p>
                <p className="text-xl font-bold text-green-600">
                  {compliantCount}
                </p>
                <p className="text-[11px] text-gray-500">
                  {compliantPct}% of SKUs
                </p>
                <div className="w-full h-1 bg-green-100 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${compliantPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white px-4 py-3 rounded-xl border border-red-200 flex items-center gap-3 min-w-[180px] shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 font-bold text-sm">!</span>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">
                  Non-Compliant
                </p>
                <p className="text-xl font-bold text-red-600">
                  {nonCompliantCount}
                </p>
                <p className="text-[11px] text-gray-500">
                  {nonCompliantPct}% of SKUs
                </p>
                <div className="w-full h-1 bg-red-100 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${nonCompliantPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isProducerEntity && producerViewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredData.map((item, idx) => {
              const cardKey = item.key || `${item.componentCode}-${idx}`;
              const status =
                item.componentComplianceStatus ||
                item.productComplianceStatus ||
                "Pending";
              const isOpen = producerCardOpen.has(cardKey);
              const toggleOpen = () => {
                setProducerCardOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(cardKey)) next.delete(cardKey);
                  else next.add(cardKey);
                  return next;
                });
              };

              return (
                <div
                  key={cardKey}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="h-1 bg-purple-500" />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-semibold">
                        {item.componentCode || "-"}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          status === "Compliant"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : status === "Non-Compliant"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-yellow-50 text-amber-700 border-yellow-200"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-start gap-3">
                      <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.componentImage ? (
                          <Image
                            src={
                              typeof item.componentImage === "string"
                                ? resolveUrl(item.componentImage)
                                : ""
                            }
                            alt="Component"
                            className="w-full h-full object-cover"
                            preview={
                              item.componentImage
                                ? {
                                    src:
                                      typeof item.componentImage === "string"
                                        ? resolveUrl(item.componentImage)
                                        : "",
                                  }
                                : false
                            }
                          />
                        ) : (
                          <div className="text-[10px] text-gray-400 text-center leading-tight px-2">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 leading-snug">
                          {item.componentDescription || "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 p-4 space-y-4">
                    <div>
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md">
                        <FaUser className="text-[11px] text-blue-700" />
                        <span>SUPPLIER</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="col-span-2">
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            SUPPLIER NAME
                          </div>
                          <div className="mt-0.5 text-gray-900 font-semibold">
                            {item.supplierName || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            SUPPLIER STATUS
                          </div>
                          <div className="mt-0.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                (item.supplierStatus || "")
                                  .toLowerCase()
                                  .includes("reg")
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : (item.supplierStatus || "")
                                        .toLowerCase()
                                        .includes("unreg")
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {item.supplierStatus || "—"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            EPR CERT. NO
                          </div>
                          <div className="mt-0.5 text-gray-900 font-semibold">
                            {item.eprCertificateNumber || "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md">
                        <FaRecycle className="text-[11px] text-emerald-700" />
                        <span>POLYMER DETAILS</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            POLYMER TYPE
                          </div>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                              {item.polymerType || "—"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            RECYCLED POLYMER
                          </div>
                          <div className="mt-1 text-gray-900 font-semibold">
                            {item.recycledPolymerUsed || "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-md">
                        <FaIdCard className="text-[11px] text-purple-700" />
                        <span>CLASSIFICATION</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            CATEGORY
                          </div>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                              {item.category || "—"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            CATEGORY II TYPE
                          </div>
                          <div className="mt-1 text-gray-900 font-semibold">
                            {item.categoryIIType || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            MULTILAYER/MONOLAYER
                          </div>
                          <div className="mt-1 text-gray-900 font-semibold">
                            {normalizeLayerType(item.layerType)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            CONTAINER CAPACITY
                          </div>
                          <div className="mt-1 text-gray-900 font-semibold">
                            {item.containerCapacity || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            THICKNESS (M)
                          </div>
                          <div className="mt-1 text-gray-900 font-semibold">
                            {item.thickness || "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-md">
                        <FaChartLine className="text-[11px] text-orange-700" />
                        <span>MEASUREMENTS</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            MONTHLY (MT)
                          </div>
                          <div className="mt-1 text-gray-900 font-semibold">
                            {item.monthlyPurchaseMt || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            RECYCLED QTY
                          </div>
                          <div className="mt-1 text-gray-900 font-semibold">
                            {item.recycledQty || "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <div className="w-full flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-gray-50 text-gray-700 px-2.5 py-1.5 rounded-md">
                        <FaFile className="text-[11px] text-gray-500" />
                        <span>REMARKS & DOCUMENTS</span>
                      </div>
                      <div className="mt-2 space-y-2 text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            AUDITOR REMARKS
                          </div>
                          <div className="mt-0.5 text-gray-900 font-semibold whitespace-pre-wrap">
                            {item.auditorRemarks || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            ADDITIONAL DOCUMENT
                          </div>
                          <div className="mt-0.5">
                            {item.additionalDocument ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const url =
                                    typeof item.additionalDocument === "string"
                                      ? resolveUrl(item.additionalDocument)
                                      : "";
                                  if (url) window.open(url, "_blank");
                                }}
                                className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 underline"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-gray-900 font-semibold">
                                —
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 tracking-wider">
                            MANAGER REMARKS
                          </div>
                          <div className="mt-0.5 text-gray-900 font-semibold whitespace-pre-wrap">
                            {item.managerRemarks || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !isProducerEntity &&
          initialViewMode === "client-connect" &&
          brandOwnerViewMode === "accordion" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredData.map((sku, idx) => {
              const skuKey = sku.key || sku._id || sku.skuCode || `sku-${idx}`;
              const isExpanded =
                expandedBrandOwnerSku === skuKey &&
                closingBrandOwnerSku !== skuKey;
              const isClosing = closingBrandOwnerSku === skuKey;
              const status = sku.productComplianceStatus || "Pending";
              const borderClass =
                status === "Compliant"
                  ? "border-l-green-500"
                  : status === "Non-Compliant"
                    ? "border-l-red-500"
                    : "border-l-gray-300";

              const componentCount = new Set(
                (sku.details || [])
                  .map((d) => (d.componentCode || "").trim())
                  .filter(Boolean),
              ).size;
              const compliantCount = (sku.details || []).filter((d) => {
                const st = (
                  d.componentComplianceStatus ||
                  d.complianceStatus ||
                  "Pending"
                ).toString();
                return st === "Compliant";
              }).length;
              const nonCompliantCount = (sku.details || []).filter((d) => {
                const st = (
                  d.componentComplianceStatus ||
                  d.complianceStatus ||
                  "Pending"
                ).toString();
                return st === "Non-Compliant";
              }).length;

              return (
                <div
                  key={skuKey}
                  className={`border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm border-l-4 ${borderClass} ${isExpanded ? "lg:col-span-2" : ""}`}
                >
                  <div
                    className={`px-4 py-4 ${status === "Compliant" ? "bg-green-50/30" : status === "Non-Compliant" ? "bg-red-50/30" : "bg-gray-50/30"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                          {sku.productImage ? (
                            <Image
                              src={
                                typeof sku.productImage === "string"
                                  ? resolveUrl(sku.productImage)
                                  : ""
                              }
                              alt="Product"
                              className="w-full h-full object-cover"
                              preview={
                                sku.productImage
                                  ? {
                                      src:
                                        typeof sku.productImage === "string"
                                          ? resolveUrl(sku.productImage)
                                          : "",
                                    }
                                  : false
                              }
                            />
                          ) : (
                            <div className="text-[10px] text-gray-400 text-center leading-tight px-2">
                              No Image
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold">
                              {sku.skuCode || "—"}
                            </span>
                            {sku.industryCategory ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                                {sku.industryCategory}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-base font-semibold text-gray-900 truncate">
                            {sku.skuDescription || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                            status === "Compliant"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : status === "Non-Compliant"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {status}
                        </span>
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                          <FaRecycle className="text-green-600" />
                          <span className="text-gray-500">Recycled Qty:</span>
                          <span className="text-gray-900">
                            {sku.recycledQty || "0.000"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold tracking-wider text-gray-600">
                        {componentCount} COMPONENTS
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isExpanded) toggleBrandOwnerSku(skuKey);
                          setBrandOwnerComponentStatusFilter("Compliant");
                        }}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-green-50 text-green-700 border-green-200"
                      >
                        Compliant: {compliantCount}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isExpanded) toggleBrandOwnerSku(skuKey);
                          setBrandOwnerComponentStatusFilter("Non-Compliant");
                        }}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-red-50 text-red-700 border-red-200"
                      >
                        Non‑Compliant: {nonCompliantCount}
                      </button>
                      {isExpanded && brandOwnerComponentStatusFilter && (
                        <button
                          type="button"
                          onClick={() =>
                            setBrandOwnerComponentStatusFilter(null)
                          }
                          className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-gray-600 hover:text-gray-800"
                          title="Show all components"
                        >
                          Show All
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBrandOwnerSku(skuKey)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800"
                    >
                      <span>{isExpanded ? "Collapse" : "View Components"}</span>
                      <FaChevronDown
                        className={`text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  <div
                    className={`border-t border-gray-100 bg-white overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded
                        ? "max-h-[6000px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    {(isExpanded || isClosing) && (
                      <div className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {(sku.details || [])
                            .filter((comp) => {
                              if (!brandOwnerComponentStatusFilter) return true;
                              const st = (
                                comp.componentComplianceStatus ||
                                comp.complianceStatus ||
                                "Pending"
                              ).toString();
                              return st === brandOwnerComponentStatusFilter;
                            })
                            .map((comp, cidx) => {
                              const compKey =
                                comp.key ||
                                comp._id ||
                                `${comp.componentCode || "comp"}-${comp.supplierName || "supp"}-${cidx}`;
                              const compStatus =
                                comp.componentComplianceStatus ||
                                comp.complianceStatus ||
                                "Pending";
                              const supplierStatus = (
                                comp.supplierStatus || ""
                              ).toString();
                              const isRegistered = supplierStatus
                                .toLowerCase()
                                .includes("reg");
                              const isUnregistered = supplierStatus
                                .toLowerCase()
                                .includes("unreg");

                              return (
                                <div
                                  key={compKey}
                                  className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                                >
                                  <div className="h-1 bg-gray-200" />
                                  <div className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-semibold">
                                        {comp.componentCode || "—"}
                                      </span>
                                      <span
                                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                                          compStatus === "Compliant"
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : compStatus === "Non-Compliant"
                                              ? "bg-red-50 text-red-700 border-red-200"
                                              : "bg-gray-50 text-gray-700 border-gray-200"
                                        }`}
                                      >
                                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                        {compStatus}
                                      </span>
                                    </div>

                                    <div className="mt-3 flex items-start gap-3">
                                      <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {comp.componentImage ? (
                                          <Image
                                            src={
                                              typeof comp.componentImage ===
                                              "string"
                                                ? resolveUrl(
                                                    comp.componentImage,
                                                  )
                                                : ""
                                            }
                                            alt="Component"
                                            className="w-full h-full object-cover"
                                            preview={
                                              comp.componentImage
                                                ? {
                                                    src:
                                                      typeof comp.componentImage ===
                                                      "string"
                                                        ? resolveUrl(
                                                            comp.componentImage,
                                                          )
                                                        : "",
                                                  }
                                                : false
                                            }
                                          />
                                        ) : (
                                          <div className="text-[10px] text-gray-400 text-center leading-tight px-2">
                                            No Image
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 leading-snug">
                                          {comp.componentDescription || "—"}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-4 space-y-3">
                                      <div>
                                        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                          <FaUser className="text-[11px]" />
                                          SUPPLIER
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                          <div className="text-gray-500 font-bold">
                                            Supplier Name
                                          </div>
                                          <div className="text-gray-900 font-semibold truncate">
                                            {comp.supplierName || "—"}
                                          </div>
                                          <div className="text-gray-500 font-bold">
                                            Supplier Status
                                          </div>
                                          <div>
                                            <span
                                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                                isRegistered
                                                  ? "bg-green-50 text-green-700 border-green-200"
                                                  : isUnregistered
                                                    ? "bg-red-50 text-red-700 border-red-200"
                                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                              }`}
                                            >
                                              {supplierStatus || "—"}
                                            </span>
                                          </div>
                                          <div className="text-gray-500 font-bold">
                                            EPR Cert. No
                                          </div>
                                          <div className="text-gray-900 font-semibold">
                                            {comp.eprCertificateNumber || "—"}
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                          <FaRecycle className="text-[11px]" />
                                          POLYMER DETAILS
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Polymer Type
                                            </div>
                                            <div className="mt-1">
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                                {comp.polymerType || "—"}
                                              </span>
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Comp. Polymer
                                            </div>
                                            <div className="mt-1 text-gray-900 font-semibold">
                                              {comp.componentPolymer || "—"}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                          <FaIdCard className="text-[11px]" />
                                          CLASSIFICATION
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Category
                                            </div>
                                            <div className="mt-1">
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                                                {comp.category || "—"}
                                              </span>
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Category II Type
                                            </div>
                                            <div className="mt-1 text-gray-900 font-semibold">
                                              {comp.categoryIIType || "—"}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Multilayer/Monolayer
                                            </div>
                                            <div className="mt-1 text-gray-900 font-semibold">
                                              {normalizeLayerType(
                                                comp.layerType,
                                              )}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Container Capacity
                                            </div>
                                            <div className="mt-1 text-gray-900 font-semibold">
                                              {comp.containerCapacity || "—"}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Thickness (M)
                                            </div>
                                            <div className="mt-1 text-gray-900 font-semibold">
                                              {comp.thickness || "—"}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-md -mx-0.5">
                                          <FaChartLine className="text-[11px]" />
                                          MEASUREMENTS
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Monthly Purchase (MT)
                                            </div>
                                            <div className="mt-1 text-gray-900 font-semibold">
                                              {comp.monthlyPurchaseMt || "—"}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Recycled Qty
                                            </div>
                                            <div className="mt-1 text-gray-900 font-semibold">
                                              {comp.recycledQty || "—"}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="border-t border-gray-100 pt-3">
                                        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-gray-600">
                                          <FaFile className="text-[11px] text-gray-400" />
                                          REMARKS & DOCUMENTS
                                        </div>
                                        <div className="mt-2 space-y-2 text-xs">
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Auditor Remarks
                                            </div>
                                            <div className="mt-0.5 text-gray-900 font-semibold whitespace-pre-wrap">
                                              {comp.auditorRemarks || "—"}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Additional Document
                                            </div>
                                            <div className="mt-0.5">
                                              {comp.additionalDocument ? (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const url =
                                                      typeof comp.additionalDocument ===
                                                      "string"
                                                        ? resolveUrl(
                                                            comp.additionalDocument,
                                                          )
                                                        : "";
                                                    if (url)
                                                      window.open(
                                                        url,
                                                        "_blank",
                                                      );
                                                  }}
                                                  className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 underline"
                                                >
                                                  View
                                                </button>
                                              ) : (
                                                <span className="text-gray-900 font-semibold">
                                                  —
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 font-bold">
                                              Manager Remarks
                                            </div>
                                            <div className="mt-0.5 text-gray-900 font-semibold whitespace-pre-wrap">
                                              {comp.managerRemarks || "—"}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <Table
              columns={columns}
              dataSource={filteredData}
              pagination={false}
              rowKey={(row, index) =>
                row.key || row._id || `${row.skuCode || "sku"}-${index}`
              }
              scroll={{ x: 1200 }}
              size="middle"
              expandable={
                isProducerEntity
                  ? undefined
                  : {
                      expandedRowRender,
                      rowExpandable: (record) =>
                        record.details && record.details.length > 0,
                    }
              }
            />
          </div>
        )}
      </div>
    );
  };

  const renderClientConnectSummary = () => {
    const normalizeText = (value) => (value || "").toString().trim().toLowerCase();

    const getAnalysisDerivedCategoryRows = () => {
      const annualRows = Array.isArray(summaryAnnualTargetRows)
        ? summaryAnnualTargetRows
        : [];
      const targetTables = Array.isArray(summaryTargetTables)
        ? summaryTargetTables
        : [];
      const yearLabel = (client?.financialYear || "").toString().trim();

      const matchingTargetCalculationTable =
        targetTables.find((table) => {
          const title = normalizeText(table?.title);
          return (
            title.includes("target calculation") &&
            (!yearLabel || title.includes(normalizeText(yearLabel)))
          );
        }) ||
        targetTables.find((table) =>
          normalizeText(table?.title).includes("target calculation"),
        );

      const matchingUrepTable =
        targetTables.find((table) => {
          const title = normalizeText(table?.title);
          return (
            title.includes("urep target") &&
            (!yearLabel || title.includes(normalizeText(yearLabel)))
          );
        }) ||
        targetTables.find((table) =>
          normalizeText(table?.title).includes("urep target"),
        );

      const targetCalcRows = Array.isArray(matchingTargetCalculationTable?.data)
        ? matchingTargetCalculationTable.data
        : [];
      const targetCalcColumns = Array.isArray(matchingTargetCalculationTable?.columns)
        ? matchingTargetCalculationTable.columns
        : [];
      const urepRows = Array.isArray(matchingUrepTable?.data)
        ? matchingUrepTable.data
        : [];
      const urepColumns = Array.isArray(matchingUrepTable?.columns)
        ? matchingUrepTable.columns
        : [];

      const categoryKeyFromAnnual = (row) =>
        (
          row?.["Category of Plastic"] ||
          row?.category ||
          row?.Category ||
          "Uncategorized"
        )
          .toString()
          .trim();

      const categoryKeyFromTarget = (row) =>
        (
          row?.["Category of Plastic"] ||
          row?.category ||
          row?.Category ||
          "Uncategorized"
        )
          .toString()
          .trim();

      const recycledQtyColumn =
        targetCalcColumns.find((column) =>
          normalizeText(column).includes("recycled qty"),
        ) || "Recycled Qty";

      const virginTargetColumn =
        targetCalcColumns.find((column) =>
          normalizeText(column).includes("target for virgin"),
        ) || "Target For Virgin";

      const urepMandateColumn =
        urepColumns.find((column) => {
          const label = normalizeText(column);
          return label.includes("urep target") && label.includes("mandate");
        }) || null;

      const targetCalcByCategory = new Map();
      targetCalcRows.forEach((row) => {
        const category = categoryKeyFromTarget(row);
        if (!category) return;
        targetCalcByCategory.set(category.toLowerCase(), row);
      });

      const urepByCategory = new Map();
      urepRows.forEach((row) => {
        const category = categoryKeyFromTarget(row);
        if (!category) return;
        urepByCategory.set(category.toLowerCase(), row);
      });

      return annualRows.map((row, index) => {
        const category = categoryKeyFromAnnual(row);
        const purchase = safeNumber(row?.["Total Purchase"]);
        const targetCalcRow = targetCalcByCategory.get(category.toLowerCase());
        const urepRow = urepByCategory.get(category.toLowerCase());
        const recycledQty = safeNumber(targetCalcRow?.[recycledQtyColumn]);
        const virginQty = Math.max(
          0,
          safeNumber(targetCalcRow?.[virginTargetColumn]),
        );
        const recycledTargetPct = safeNumber(
          urepMandateColumn ? urepRow?.[urepMandateColumn] : 0,
        );
        const recycledTargetQtyMt =
          purchase > 0 && recycledTargetPct > 0
            ? purchase * (recycledTargetPct / 100)
            : 0;

        return {
          key: `analysis-category-${index}`,
          category,
          monthlyPurchaseMt: purchase,
          recycledQty,
          virginQty,
          recycledAmount: 0,
          virginAmount: 0,
          recycledTargetPct,
          recycledTargetQtyMt,
        };
      });
    };

    const deriveProducerComponentTotals = () => {
      const components = new Map();
      const rows = Array.isArray(skuTableData) ? skuTableData : [];
      rows.forEach((row, index) => {
        const componentCode = (row?.componentCode || "").toString().trim();
        if (!componentCode) return;
        const key = componentCode || `component-${index}`;
        const status = (
          row?.componentComplianceStatus ||
          row?.productComplianceStatus ||
          row?.complianceStatus ||
          ""
        )
          .toString()
          .trim();

        const prev = components.get(key) || {
          hasCompliant: false,
          hasNonCompliant: false,
        };
        if (status === "Non-Compliant") prev.hasNonCompliant = true;
        else if (status === "Compliant") prev.hasCompliant = true;
        components.set(key, prev);
      });

      let compliant = 0;
      let nonCompliant = 0;
      components.forEach((meta) => {
        if (meta.hasNonCompliant) nonCompliant += 1;
        else if (meta.hasCompliant) compliant += 1;
      });

      return { total: components.size, compliant, nonCompliant };
    };

    const totalSku = industrySkuSummaryData.length;
    const compliantSku = industrySkuSummaryData.filter(
      (item) => item.complianceStatus === "Compliant",
    ).length;
    const nonCompliantSku = industrySkuSummaryData.filter(
      (item) => item.complianceStatus === "Non-Compliant",
    ).length;
    const markingNonCompliant = isProducerEntity
      ? 0
      : industrySkuSummaryData.filter(
          (item) => item.markingLabelingStatus === "Non-Compliant",
        ).length;

    const producerComponentTotals = isProducerEntity
      ? deriveProducerComponentTotals()
      : null;
    const totalPrimary = isProducerEntity
      ? producerComponentTotals.total
      : totalSku;
    const compliantPrimary = isProducerEntity
      ? producerComponentTotals.compliant
      : compliantSku;
    const nonCompliantPrimary = isProducerEntity
      ? producerComponentTotals.nonCompliant
      : nonCompliantSku;
    const { registeredSuppliers, unregisteredSuppliers } =
      resolveUniqueSupplierCounts(summarySupplierRows);

    const hasProcurementData = (summaryMonthlyRows || []).some(
      (row) =>
        safeNumber(row?.monthlyPurchaseMt) > 0 ||
        safeNumber(row?.recycledQty) > 0 ||
        safeNumber(row?.virginQty) > 0,
    );
    const derivedCategoryRows = getAnalysisDerivedCategoryRows();
    const summaryProcurementRows = hasProcurementData
      ? summaryMonthlyRows
      : derivedCategoryRows;

    const totalMonthlyPurchase = summaryProcurementRows.reduce(
      (sum, row) => sum + safeNumber(row?.monthlyPurchaseMt),
      0,
    );
    const totalRecycledQty = summaryProcurementRows.reduce(
      (sum, row) => sum + safeNumber(row?.recycledQty),
      0,
    );
    const totalVirginQty = summaryProcurementRows.reduce(
      (sum, row) => sum + safeNumber(row?.virginQty),
      0,
    );
    const totalRecycledAmount = summaryProcurementRows.reduce(
      (sum, row) => sum + safeNumber(row?.recycledQrtAmount),
      0,
    );
    const totalVirginAmount = summaryProcurementRows.reduce(
      (sum, row) => sum + safeNumber(row?.virginQtyAmount),
      0,
    );

    const resolveUrepTargetPct = () => {
      const yearLabel = (client?.financialYear || "").toString().trim();
      const FIXED_YEAR_TARGET_PCT = {
        "2025-26": 45,
        "2026-27": 55,
        "2027-28": 80,
        "2028-29": 90,
      };

      if (FIXED_YEAR_TARGET_PCT[yearLabel] !== undefined) {
        return FIXED_YEAR_TARGET_PCT[yearLabel];
      }

      const tables = summaryTargetTables || [];
      if (!tables.length) return 0;

      const normalize = (value) => (value || "").toString().toLowerCase();
      const matchYear = (title) =>
        !yearLabel || normalize(title).includes(normalize(yearLabel));

      const urepTables = tables.filter((table) =>
        normalize(table?.title).includes("urep target"),
      );
      if (!urepTables.length) return 0;

      const pickBestUrepTable = (candidates) => {
        const withYear = candidates.filter((t) => matchYear(t?.title));
        const ordered = withYear.length ? withYear : candidates;

        const findMandateColumn = (cols) =>
          (cols || []).find((col) => {
            const label = normalize(col);
            return (
              label.includes("urep target") &&
              (label.includes("mandate") || label.includes("as per"))
            );
          });

        return (
          ordered.find((t) =>
            findMandateColumn(Array.isArray(t?.columns) ? t.columns : []),
          ) || ordered[0]
        );
      };

      const targetTable = pickBestUrepTable(urepTables);
      const columns = Array.isArray(targetTable?.columns)
        ? targetTable.columns
        : [];

      const mandateColumn = columns.find((col) => {
        const label = normalize(col);
        return (
          label.includes("urep target") &&
          (label.includes("mandate") || label.includes("as per"))
        );
      });

      const columnKey = mandateColumn || null;
      if (!columnKey) return 0;

      const rows = Array.isArray(targetTable?.data) ? targetTable.data : [];
      const seenCategories = new Set();
      const categoryKey =
        columns.find((col) => normalize(col) === "category of plastic") ||
        columns.find((col) => normalize(col) === "category") ||
        "Category of Plastic";

      return rows.reduce((sum, row) => {
        const category = (
          row?.[categoryKey] ??
          row?.category ??
          row?.["Category of Plastic"] ??
          ""
        )
          .toString()
          .trim();
        if (!category) return sum;

        const catKey = category.toLowerCase();
        if (seenCategories.has(catKey)) return sum;
        seenCategories.add(catKey);

        return sum + safeNumber(row?.[columnKey]);
      }, 0);
    };

    const totalTargetPct = resolveUrepTargetPct();
    const fallbackTargetQty = derivedCategoryRows.reduce(
      (sum, row) => sum + safeNumber(row?.recycledTargetQtyMt),
      0,
    );
    const targetQty =
      hasProcurementData || !fallbackTargetQty
        ? totalMonthlyPurchase * (totalTargetPct / 100)
        : fallbackTargetQty;
    const recycledShortfall = totalRecycledQty - targetQty;
    const virginTargetQty = Math.max(totalMonthlyPurchase - targetQty, 0);
    const virginGap = totalVirginQty - virginTargetQty;

    const compliantPct = totalPrimary
      ? ((compliantPrimary / totalPrimary) * 100).toFixed(1)
      : "0.0";
    const nonCompliantPct = totalPrimary
      ? ((nonCompliantPrimary / totalPrimary) * 100).toFixed(1)
      : "0.0";

    let riskLabel = "Low Risk";
    let riskClass = "bg-green-50 text-green-700 border-green-200";
    if (nonCompliantPrimary >= Math.max(1, Math.ceil(totalPrimary * 0.5))) {
      riskLabel = "High Risk";
      riskClass = "bg-red-50 text-red-700 border-red-200";
    } else if (
      nonCompliantPrimary > 0 ||
      (!isProducerEntity && markingNonCompliant > 0)
    ) {
      riskLabel = "Medium Risk";
      riskClass = "bg-amber-50 text-amber-700 border-amber-200";
    }

    const skuCompliantPct = totalSku
      ? ((compliantSku / totalSku) * 100).toFixed(1)
      : "0.0";
    const skuNonCompliantPct = totalSku
      ? ((nonCompliantSku / totalSku) * 100).toFixed(1)
      : "0.0";

    const skuSummaryCards = [
      {
        label: "Total SKU",
        value: totalSku,
        tone: "text-blue-700 bg-blue-50 border-blue-200",
        icon: FaListAlt,
      },
      {
        label: "Compliant SKU",
        value: compliantSku,
        subtext: `${skuCompliantPct}%`,
        tone: "text-green-700 bg-green-50 border-green-200",
        icon: FaCheckCircle,
      },
      {
        label: "Non-Compliant SKU",
        value: nonCompliantSku,
        subtext: `${skuNonCompliantPct}%`,
        tone: "text-red-700 bg-red-50 border-red-200",
        icon: FaClipboardCheck,
      },
    ];

    const totalSuppliers =
      safeNumber(registeredSuppliers) + safeNumber(unregisteredSuppliers);
    const supplierSummaryCards = [
      {
        label: "Total Suppliers",
        value: totalSuppliers,
        tone: "text-blue-700 bg-blue-50 border-blue-200",
        icon: FaUsers,
      },
      {
        label: "Registered Suppliers",
        value: registeredSuppliers,
        tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
        icon: FaUserTie,
      },
      {
        label: "Unregistered Suppliers",
        value: unregisteredSuppliers,
        tone: "text-orange-700 bg-orange-50 border-orange-200",
        icon: FaUser,
      },
    ];

    const supplierStatusByName = new Map();
    (summarySupplierRows || []).forEach((row) => {
      const supplierName = (row?.supplierName || "").toString().trim();
      if (!supplierName || supplierStatusByName.has(supplierName)) return;
      supplierStatusByName.set(
        supplierName,
        (row?.supplierStatus || "").toString().trim(),
      );
    });

    const supplierCtoSummaryByName = new Map();
    (summarySupplierCtoRows || []).forEach((row, index) => {
      const supplierName = (row?.supplierName || "").toString().trim();
      const supplierKey = supplierName || `supplier-cto-${index}`;
      const supplierStatus = (supplierStatusByName.get(supplierName) || "")
        .toString()
        .trim()
        .toLowerCase();
      const registrationStatusRaw = (row?.registrationStatus || "")
        .toString()
        .trim();
      const registrationStatus =
        supplierStatus === "registered"
          ? "Approved"
          : ["Approved", "In Progress", "Pending"].includes(
                registrationStatusRaw,
              )
            ? registrationStatusRaw
            : "Pending";
      const ctoAvailability =
        (row?.ctoAvailability || "Available").toString().trim() ===
        "Not Available"
          ? "Not Available"
          : "Available";
      const hasDocument = !!(row?.ctoCcaDocument || "").toString().trim();

      const existing = supplierCtoSummaryByName.get(supplierKey);
      if (!existing) {
        supplierCtoSummaryByName.set(supplierKey, {
          supplierName,
          registrationStatus,
          hasAvailable: ctoAvailability === "Available",
          hasNotAvailable: ctoAvailability === "Not Available",
          hasDocument,
        });
        return;
      }

      const registrationPriority = {
        Approved: 3,
        "In Progress": 2,
        Pending: 1,
      };
      if (
        (registrationPriority[registrationStatus] || 0) >
        (registrationPriority[existing.registrationStatus] || 0)
      ) {
        existing.registrationStatus = registrationStatus;
      }
      existing.hasAvailable =
        existing.hasAvailable || ctoAvailability === "Available";
      existing.hasNotAvailable =
        existing.hasNotAvailable || ctoAvailability === "Not Available";
      existing.hasDocument = existing.hasDocument || hasDocument;
    });

    const supplierCtoSummary = Array.from(
      supplierCtoSummaryByName.values(),
    ).reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.registrationStatus === "Approved") acc.approved += 1;
        else if (item.registrationStatus === "In Progress") acc.inProgress += 1;
        else acc.pending += 1;

        if (item.hasAvailable) acc.available += 1;
        if (!item.hasAvailable && item.hasNotAvailable) acc.notAvailable += 1;
        if (item.hasDocument) acc.documentUploaded += 1;
        return acc;
      },
      {
        total: 0,
        approved: 0,
        inProgress: 0,
        pending: 0,
        available: 0,
        notAvailable: 0,
        documentUploaded: 0,
      },
    );

    const supplierCtoSummaryCards = [
      {
        label: "Total Supplier CTO",
        value: supplierCtoSummary.total,
        tone: "text-blue-700 bg-blue-50 border-blue-200",
        icon: FaUsers,
      },
      {
        label: "Approved",
        value: supplierCtoSummary.approved,
        tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
        icon: FaCheckCircle,
      },
      {
        label: "In Progress",
        value: supplierCtoSummary.inProgress,
        tone: "text-sky-700 bg-sky-50 border-sky-200",
        icon: FaSpinner,
      },
      {
        label: "Pending",
        value: supplierCtoSummary.pending,
        tone: "text-orange-700 bg-orange-50 border-orange-200",
        icon: FaClipboardCheck,
      },
      {
        label: "CTO Available",
        value: supplierCtoSummary.available,
        tone: "text-green-700 bg-green-50 border-green-200",
        icon: FaFileContract,
      },
      {
        label: "CTO Uploaded",
        value: supplierCtoSummary.documentUploaded,
        tone: "text-violet-700 bg-violet-50 border-violet-200",
        icon: FaFile,
      },
    ];

    const supplierCtoTableRows = (summarySupplierCtoRows || []).map(
      (row, index) => {
        const supplierName = (row?.supplierName || "").toString().trim() || "-";
        const supplierStatus =
          (
            supplierStatusByName.get(
              (row?.supplierName || "").toString().trim(),
            ) || ""
          )
            .toString()
            .trim() || "-";
        const eprCertificateNumber = (() => {
          const supplierMatch = (summarySupplierRows || []).find(
            (item) =>
              (item?.supplierName || "").toString().trim().toLowerCase() ===
              supplierName.toLowerCase(),
          );
          return (
            (supplierMatch?.eprCertificateNumber || "").toString().trim() || "-"
          );
        })();
        const registrationStatusRaw = (row?.registrationStatus || "")
          .toString()
          .trim();
        const registrationStatus =
          supplierStatus.toLowerCase() === "registered"
            ? "Approved"
            : ["Approved", "In Progress", "Pending"].includes(
                  registrationStatusRaw,
                )
              ? registrationStatusRaw
              : "Pending";

        return {
          key: `supplier-cto-row-${index}`,
          supplierName,
          supplierStatus,
          registrationStatus,
          eprCertificateNumber,
          ctoAvailability:
            (row?.ctoAvailability || "Available").toString().trim() ||
            "Available",
          ctoPlantNo: (row?.ctoPlantNo || "").toString().trim() || "-",
          ctoPlantName: (row?.ctoPlantName || "").toString().trim() || "-",
          ctoStartDate: (row?.ctoStartDate || "").toString().trim() || "-",
          ctoValidUpto: (row?.ctoValidUpto || "").toString().trim() || "-",
          ctoCcaDocument: (row?.ctoCcaDocument || "").toString().trim(),
        };
      },
    );

    const supplierCtoTableColumns = [
      {
        title: "Supplier Name",
        dataIndex: "supplierName",
        key: "supplierName",
        fixed: "left",
        width: 240,
        render: (value) => (
          <span className="font-medium text-gray-800">{value}</span>
        ),
      },
      {
        title: "Supplier Status",
        dataIndex: "supplierStatus",
        key: "supplierStatus",
        width: 140,
        render: (value) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${
              value === "Registered"
                ? "bg-green-50 text-green-700"
                : value === "Unregistered"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            {value || "-"}
          </span>
        ),
      },
      {
        title: "Registration Status",
        dataIndex: "registrationStatus",
        key: "registrationStatus",
        width: 150,
        render: (value) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${
              value === "Approved"
                ? "bg-green-50 text-green-700"
                : value === "In Progress"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            {value}
          </span>
        ),
      },
      {
        title: "EPR Certificate Number",
        dataIndex: "eprCertificateNumber",
        key: "eprCertificateNumber",
        width: 170,
      },
      {
        title: "CTO Av/NA",
        dataIndex: "ctoAvailability",
        key: "ctoAvailability",
        width: 120,
      },
      {
        title: "CTO Plant No",
        dataIndex: "ctoPlantNo",
        key: "ctoPlantNo",
        width: 120,
      },
      {
        title: "CTO Plant Name",
        dataIndex: "ctoPlantName",
        key: "ctoPlantName",
        width: 150,
      },
      {
        title: "CTO Start Date",
        dataIndex: "ctoStartDate",
        key: "ctoStartDate",
        width: 130,
      },
      {
        title: "CTO Valid Upto",
        dataIndex: "ctoValidUpto",
        key: "ctoValidUpto",
        width: 130,
      },
      {
        title: "CTO/CCA Document",
        dataIndex: "ctoCcaDocument",
        key: "ctoCcaDocument",
        width: 150,
        render: (value) =>
          value ? (
            <Button
              size="small"
              type="link"
              className="!px-0"
              onClick={() =>
                handleViewDocument(
                  value,
                  "CTO/CCA Document",
                  "CTO/CCA Document",
                )
              }
            >
              View
            </Button>
          ) : (
            <span className="text-xs text-gray-400">No file</span>
          ),
      },
    ];

    const virginShortfall = totalVirginQty - virginTargetQty;

    const resolvePct = (achieved, target) => {
      const safeTarget = safeNumber(target);
      if (safeTarget <= 0) return 0;
      return (safeNumber(achieved) / safeTarget) * 100;
    };

    const clampPct = (pct) => Math.min(100, Math.max(0, safeNumber(pct)));

    const recycledAchievedPct = resolvePct(totalRecycledQty, targetQty);
    const virginAchievedPct = resolvePct(totalVirginQty, virginTargetQty);
    const recycledShortfallColor =
      recycledShortfall >= 0 ? "text-green-700" : "text-red-600";
    const virginShortfallColor =
      recycledShortfall >= 0 && virginShortfall >= 0
        ? "text-green-700"
        : "text-red-600";

    const componentCategoryMap = new Map();
    (summaryComponentRows || []).forEach((row) => {
      const componentCode = (row?.componentCode || "").toString().trim();
      if (!componentCode) return;
      const category = (row?.category || "").toString().trim();
      if (category) componentCategoryMap.set(componentCode, category);
    });

    const categoryWiseProcurementSourceRows = hasProcurementData
      ? summaryMonthlyRows || []
      : derivedCategoryRows;

    const categoryWiseProcurement = buildCategoryWiseProcurement({
      rows: categoryWiseProcurementSourceRows,
      componentCategoryMap,
      financialYear: client?.financialYear || "",
      safeNumber,
    });

    const quickInfo = [
      { label: "Client Name", value: client?.clientName || "N/A" },
      { label: "Trade Name", value: client?.tradeName || "N/A" },
      { label: "Entity Type", value: client?.entityType || "N/A" },
      { label: "Waste Type", value: client?.wasteType || "N/A" },
      { label: "Financial Year", value: client?.financialYear || "N/A" },
      { label: "Assigned To", value: client?.assignedTo?.name || "Unassigned" },
    ];

    const skuIndustryMap = new Map();
    industrySkuSummaryData.forEach((item) => {
      const skuCode = (item?.skuCode || "").toString().trim();
      const industryCategory =
        (item?.industryCategory || "Uncategorized").toString().trim() ||
        "Uncategorized";
      if (skuCode) skuIndustryMap.set(skuCode, industryCategory);
    });

    const industryWiseTotals = industrySkuSummaryData.reduce((acc, item) => {
      const key =
        (item?.industryCategory || "Uncategorized").toString().trim() ||
        "Uncategorized";
      if (!acc[key]) {
        acc[key] = { totalSku: 0 };
      }
      acc[key].totalSku += 1;
      return acc;
    }, {});

    const industryWiseProcurement = (summaryMonthlyRows || []).reduce(
      (acc, row) => {
        const skuCode = (row?.skuCode || "").toString().trim();
        const industryCategory = skuIndustryMap.get(skuCode) || "Uncategorized";
        if (!acc[industryCategory]) {
          acc[industryCategory] = {
            monthlyPurchaseMt: 0,
            recycledAchievedMt: 0,
            virginAchievedMt: 0,
          };
        }

        acc[industryCategory].monthlyPurchaseMt += safeNumber(
          row?.monthlyPurchaseMt,
        );
        acc[industryCategory].recycledAchievedMt += safeNumber(
          row?.recycledQty,
        );
        acc[industryCategory].virginAchievedMt += safeNumber(row?.virginQty);
        return acc;
      },
      {},
    );

    const allIndustryKeys = Array.from(
      new Set([
        ...Object.keys(industryWiseTotals),
        ...Object.keys(industryWiseProcurement),
      ]),
    ).sort((a, b) => a.localeCompare(b));

    const topIndustryRows = allIndustryKeys.map((industryCategory) => {
      const totalSku = industryWiseTotals[industryCategory]?.totalSku || 0;
      const purchase =
        industryWiseProcurement[industryCategory]?.monthlyPurchaseMt || 0;
      const recycledAchieved =
        industryWiseProcurement[industryCategory]?.recycledAchievedMt || 0;
      const virginAchieved =
        industryWiseProcurement[industryCategory]?.virginAchievedMt || 0;

      const recycledTarget = purchase * (totalTargetPct / 100);
      const virginTarget = Math.max(purchase - recycledTarget, 0);

      const recycledShortfall = recycledAchieved - recycledTarget;
      const virginShortfall = virginAchieved - virginTarget;

      return {
        key: `industry-wise-${industryCategory}`,
        industryCategory,
        totalSku,
        monthlyPurchaseMt: purchase,
        recycledTargetMt: recycledTarget,
        recycledAchievedMt: recycledAchieved,
        recycledShortfallMt: recycledShortfall,
        virginTargetMt: virginTarget,
        virginAchievedMt: virginAchieved,
        virginShortfallMt: virginShortfall,
      };
    });

    const headerCell = (label, tip, tone = "text-gray-700") => (
      <AntdTooltip title={tip} placement="top">
        <div
          className={`text-center text-xs font-bold uppercase ${tone} cursor-help`}
        >
          {label}
        </div>
      </AntdTooltip>
    );

    const topIndustryColumns = [
      {
        title: headerCell(
          "Industry",
          "Industry category (from SKU master mapping)",
        ),
        dataIndex: "industryCategory",
        key: "industryCategory",
        fixed: "left",
        width: 260,
        render: (value) => (
          <span className="font-medium text-gray-800">{value}</span>
        ),
      },
      {
        title: headerCell(
          "Total SKU",
          "Distinct SKU count under this industry",
        ),
        dataIndex: "totalSku",
        key: "totalSku",
        align: "center",
        width: 110,
      },
      {
        title: headerCell(
          "Monthly Purchase Qty",
          "Sum of monthlyPurchaseMt for this industry",
        ),
        dataIndex: "monthlyPurchaseMt",
        key: "monthlyPurchaseMt",
        align: "center",
        width: 170,
        render: (value) => formatWithCommas(value, 2),
      },
      {
        title: headerCell(
          "Recycled Target Qty",
          "Monthly Purchase Qty × UREP target % (FY)",
          "text-gray-700",
        ),
        dataIndex: "recycledTargetMt",
        key: "recycledTargetMt",
        align: "center",
        width: 170,
        render: (value) => formatWithCommas(value, 2),
      },
      {
        title: headerCell(
          "Recycled Achieved (MT)",
          "Sum of recycledQty for this industry",
          "text-green-700",
        ),
        dataIndex: "recycledAchievedMt",
        key: "recycledAchievedMt",
        align: "center",
        width: 180,
        render: (value) => (
          <span className="font-semibold text-green-700">
            {formatWithCommas(value, 2)}
          </span>
        ),
      },
      {
        title: headerCell(
          "Recycled Shortfall (MT)",
          "Achieved − Target (negative means shortfall)",
          "text-red-600",
        ),
        dataIndex: "recycledShortfallMt",
        key: "recycledShortfallMt",
        align: "center",
        width: 200,
        render: (value) => (
          <span
            className={`inline-flex items-center justify-center gap-1 font-semibold ${safeNumber(value) >= 0 ? "text-green-700" : "text-red-600"}`}
          >
            {safeNumber(value) >= 0 ? (
              <FaArrowUp className="text-green-600" />
            ) : (
              <FaArrowDown className="text-red-600" />
            )}
            {formatWithCommas(Math.abs(safeNumber(value)), 2)}
          </span>
        ),
      },
      {
        title: headerCell(
          "Virgin Target Qty (MT)",
          "Monthly Purchase Qty − Recycled Target Qty",
          "text-indigo-700",
        ),
        dataIndex: "virginTargetMt",
        key: "virginTargetMt",
        align: "center",
        width: 180,
        render: (value) => formatWithCommas(value, 2),
      },
      {
        title: headerCell(
          "Virgin Achieved (MT)",
          "Sum of virginQty for this industry",
          "text-emerald-700",
        ),
        dataIndex: "virginAchievedMt",
        key: "virginAchievedMt",
        align: "center",
        width: 170,
        render: (value) => (
          <span className="font-semibold text-emerald-700">
            {formatWithCommas(value, 2)}
          </span>
        ),
      },
      {
        title: headerCell(
          "Virgin Shortfall (MT)",
          "Achieved − Target (value color depends on recycled shortfall rule)",
          "text-red-600",
        ),
        dataIndex: "virginShortfallMt",
        key: "virginShortfallMt",
        align: "center",
        width: 200,
        render: (value, record) => {
          const virginValue = safeNumber(value);
          const recycledOk = safeNumber(recycledShortfall) >= 0;
          const showGreen = recycledOk && virginValue >= 0;
          const tone = showGreen ? "text-green-700" : "text-red-600";
          return (
            <span
              className={`inline-flex items-center justify-center gap-1 font-semibold ${tone}`}
            >
              {virginValue >= 0 ? (
                <FaArrowUp className="text-green-600" />
              ) : (
                <FaArrowDown className="text-red-600" />
              )}
              {formatWithCommas(Math.abs(virginValue), 2)}
            </span>
          );
        },
      },
    ];

    const supplierWiseProcurement = (summaryMonthlyRows || []).reduce(
      (acc, row) => {
        const supplierName =
          (row?.supplierName || "Unknown").toString().trim() || "Unknown";
        if (!acc[supplierName]) {
          acc[supplierName] = {
            skuCodes: new Set(),
            monthlyPurchaseMt: 0,
            recycledAchievedMt: 0,
            virginAchievedMt: 0,
          };
        }

        const skuKey =
          (row?.skuCode || "").toString().trim() ||
          (row?.systemCode || "").toString().trim() ||
          (row?.componentCode || "").toString().trim();
        if (skuKey) acc[supplierName].skuCodes.add(skuKey);

        acc[supplierName].monthlyPurchaseMt += safeNumber(
          row?.monthlyPurchaseMt,
        );
        acc[supplierName].recycledAchievedMt += safeNumber(row?.recycledQty);
        acc[supplierName].virginAchievedMt += safeNumber(row?.virginQty);
        return acc;
      },
      {},
    );

    const supplierWiseRows = Object.keys(supplierWiseProcurement)
      .sort(
        (a, b) =>
          (supplierWiseProcurement[b]?.monthlyPurchaseMt || 0) -
          (supplierWiseProcurement[a]?.monthlyPurchaseMt || 0),
      )
      .map((supplierName) => {
        const purchase =
          supplierWiseProcurement[supplierName]?.monthlyPurchaseMt || 0;
        const recycledAchieved =
          supplierWiseProcurement[supplierName]?.recycledAchievedMt || 0;
        const virginAchieved =
          supplierWiseProcurement[supplierName]?.virginAchievedMt || 0;
        const totalSku =
          supplierWiseProcurement[supplierName]?.skuCodes?.size || 0;

        const recycledTarget = purchase * (totalTargetPct / 100);
        const virginTarget = Math.max(purchase - recycledTarget, 0);

        const recycledShortfall = recycledAchieved - recycledTarget;
        const virginShortfall = virginAchieved - virginTarget;

        return {
          key: `supplier-wise-${supplierName.toLowerCase().replace(/\s+/g, "-")}`,
          supplierName,
          totalSku,
          monthlyPurchaseMt: purchase,
          recycledTargetMt: recycledTarget,
          recycledAchievedMt: recycledAchieved,
          recycledShortfallMt: recycledShortfall,
          virginTargetMt: virginTarget,
          virginAchievedMt: virginAchieved,
          virginShortfallMt: virginShortfall,
        };
      });

    const supplierWiseColumns = [
      {
        title: headerCell(
          "Supplier Name",
          "Supplier name from monthly procurement rows",
        ),
        dataIndex: "supplierName",
        key: "supplierName",
        fixed: "left",
        width: 260,
        render: (value) => (
          <span className="font-medium text-gray-800">{value}</span>
        ),
      },
      {
        title: headerCell(
          "Total SKU",
          "Distinct SKU count per supplier (from monthly procurement rows)",
        ),
        dataIndex: "totalSku",
        key: "totalSku",
        align: "center",
        width: 110,
      },
      {
        title: headerCell(
          "Monthly Purchase Qty",
          "Sum of monthlyPurchaseMt for this supplier",
        ),
        dataIndex: "monthlyPurchaseMt",
        key: "monthlyPurchaseMt",
        align: "center",
        width: 160,
        render: (value) => formatWithCommas(value, 2),
      },
      {
        title: headerCell(
          "Recycled Target Qty",
          "Monthly Purchase Qty × UREP target % (FY)",
        ),
        dataIndex: "recycledTargetMt",
        key: "recycledTargetMt",
        align: "center",
        width: 160,
        render: (value) => formatWithCommas(value, 2),
      },
      {
        title: headerCell(
          "Recycled Achieved (MT)",
          "Sum of recycledQty for this supplier",
          "text-green-700",
        ),
        dataIndex: "recycledAchievedMt",
        key: "recycledAchievedMt",
        align: "center",
        width: 170,
        render: (value) => (
          <span className="font-semibold text-green-700">
            {formatWithCommas(value, 2)}
          </span>
        ),
      },
      {
        title: headerCell(
          "Recycled Shortfall (MT)",
          "Achieved − Target (negative means shortfall)",
          "text-red-600",
        ),
        dataIndex: "recycledShortfallMt",
        key: "recycledShortfallMt",
        align: "center",
        width: 180,
        render: (value) => (
          <span
            className={`inline-flex items-center justify-center gap-1 font-semibold ${safeNumber(value) >= 0 ? "text-green-700" : "text-red-600"}`}
          >
            {safeNumber(value) >= 0 ? (
              <FaArrowUp className="text-green-600" />
            ) : (
              <FaArrowDown className="text-red-600" />
            )}
            {formatWithCommas(Math.abs(safeNumber(value)), 2)}
          </span>
        ),
      },
      {
        title: headerCell(
          "Virgin Target Qty (MT)",
          "Monthly Purchase Qty − Recycled Target Qty",
          "text-indigo-700",
        ),
        dataIndex: "virginTargetMt",
        key: "virginTargetMt",
        align: "center",
        width: 170,
        render: (value) => formatWithCommas(value, 2),
      },
      {
        title: headerCell(
          "Virgin Achieved (MT)",
          "Sum of virginQty for this supplier",
          "text-emerald-700",
        ),
        dataIndex: "virginAchievedMt",
        key: "virginAchievedMt",
        align: "center",
        width: 160,
        render: (value) => (
          <span className="font-semibold text-emerald-700">
            {formatWithCommas(value, 2)}
          </span>
        ),
      },
      {
        title: headerCell(
          "Virgin Shortfall (MT)",
          "Achieved − Target (value color depends on recycled shortfall rule)",
          "text-red-600",
        ),
        dataIndex: "virginShortfallMt",
        key: "virginShortfallMt",
        align: "center",
        width: 170,
        render: (value, record) => {
          const virginValue = safeNumber(value);
          const recycledOk = safeNumber(recycledShortfall) >= 0;
          const showGreen = recycledOk && virginValue >= 0;
          const tone = showGreen ? "text-green-700" : "text-red-600";
          return (
            <span
              className={`inline-flex items-center justify-center gap-1 font-semibold ${tone}`}
            >
              {virginValue >= 0 ? (
                <FaArrowUp className="text-green-600" />
              ) : (
                <FaArrowDown className="text-red-600" />
              )}
              {formatWithCommas(Math.abs(virginValue), 2)}
            </span>
          );
        },
      },
    ];

    const applyTableFilters = (
      rows,
      { search, onlyShortfall, onlyNoRecycled, topN },
    ) => {
      const text = (search || "").toString().trim().toLowerCase();
      let next = Array.isArray(rows) ? rows : [];
      if (text) {
        next = next.filter((row) =>
          (row?.industryCategory || row?.supplierName || "")
            .toString()
            .toLowerCase()
            .includes(text),
        );
      }
      if (onlyShortfall) {
        next = next.filter(
          (row) =>
            safeNumber(row?.recycledShortfallMt) < 0 ||
            safeNumber(row?.virginShortfallMt) < 0,
        );
      }
      if (onlyNoRecycled) {
        next = next.filter(
          (row) =>
            safeNumber(row?.recycledAchievedMt) <= 0 &&
            safeNumber(row?.recycledTargetMt) > 0,
        );
      }
      const top = topN === "All" ? null : Number(topN);
      if (top && Number.isFinite(top) && top > 0) {
        next = next.slice(0, top);
      }
      return next;
    };

    const filteredIndustryRows = applyTableFilters(topIndustryRows, {
      search: industrySearch,
      onlyShortfall: industryOnlyShortfall,
      onlyNoRecycled: industryOnlyNoRecycled,
      topN: industryTopN,
    });

    const filteredSupplierRows = applyTableFilters(supplierWiseRows, {
      search: supplierSearch,
      onlyShortfall: supplierOnlyShortfall,
      onlyNoRecycled: supplierOnlyNoRecycled,
      topN: supplierTopN,
    });

    const topOptions = [
      { label: "All", value: "All" },
      { label: "Top 10", value: 10 },
      { label: "Top 25", value: 25 },
      { label: "Top 50", value: 50 },
    ];

    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Summary Dashboard
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Mixed overview of client profile, compliance position, supplier
                status, procurement, and target readiness.
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskClass}`}
            >
              {riskLabel}
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border-2 border-green-500/60 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {skuSummaryCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className={`rounded-xl border p-4 ${card.tone}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                          {card.label}
                        </div>
                        {Icon ? <Icon className="text-sm opacity-80" /> : null}
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        {renderAnimatedSummaryValue(card.value)}
                        {card.subtext && (
                          <div className="text-xs font-semibold opacity-80">
                            {card.subtext}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-green-500/60 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {supplierSummaryCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className={`rounded-xl border p-4 ${card.tone}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                          {card.label}
                        </div>
                        {Icon ? <Icon className="text-sm opacity-80" /> : null}
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        {renderAnimatedSummaryValue(card.value)}
                        {card.subtext && (
                          <div className="text-xs font-semibold opacity-80">
                            {card.subtext}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="rounded-2xl border-2 border-amber-400/60 p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    Supplier CTO Summary
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Based on Supplier CTO Check data, registration stage, CTO
                    availability, and uploaded CTO/CCA documents.
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs font-semibold">
                  {renderAnimatedSummaryValue(supplierCtoSummary.total, {
                    digits: 0,
                    className: "",
                  })}{" "}
                  Suppliers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
                {supplierCtoSummaryCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className={`rounded-xl border p-4 ${card.tone}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                          {card.label}
                        </div>
                        {Icon ? <Icon className="text-sm opacity-80" /> : null}
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        {renderAnimatedSummaryValue(card.value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">
              Target vs Achieved
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Based on UREP target sum for FY {client?.financialYear || "N/A"}{" "}
              and total monthly purchase.
            </p>
          </div>
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="rounded-xl border p-4 text-gray-800 bg-gray-50 border-gray-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    Monthly Purchase MT
                  </div>
                  <FaChartLine className="text-sm opacity-80" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {renderAnimatedSummaryValue(totalMonthlyPurchase, {
                    digits: 3,
                    className: "text-2xl font-bold",
                  })}
                </div>
              </div>
              <div className="rounded-xl border p-4 text-blue-700 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    Recycled Target Qty (MT)
                  </div>
                  <FaRecycle className="text-sm opacity-80" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {renderAnimatedSummaryValue(targetQty, {
                    digits: 2,
                    className: "text-2xl font-bold",
                  })}
                </div>
              </div>
              <div className="rounded-xl border p-4 text-indigo-700 bg-indigo-50 border-indigo-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    Virgin Target Qty (MT)
                  </div>
                  <FaIndustry className="text-sm opacity-80" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {renderAnimatedSummaryValue(virginTargetQty, {
                    digits: 2,
                    className: "text-2xl font-bold",
                  })}
                </div>
              </div>
              <div className="rounded-xl border p-4 text-emerald-700 bg-emerald-50 border-emerald-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    Recycled Qty Amount
                  </div>
                  <FaRupeeSign className="text-sm opacity-80" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {renderAnimatedSummaryValue(totalRecycledAmount, {
                    digits: 3,
                    className: "text-2xl font-bold",
                  })}
                </div>
              </div>
              <div className="rounded-xl border p-4 text-indigo-700 bg-indigo-50 border-indigo-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    Virgin Qty Amount
                  </div>
                  <FaRupeeSign className="text-sm opacity-80" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {renderAnimatedSummaryValue(totalVirginAmount, {
                    digits: 3,
                    className: "text-2xl font-bold",
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-sm font-semibold text-gray-800">
                  Recycled Target Achieved vs Shortfall
                </div>

                <div className="mt-5 flex items-start justify-between gap-8">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      Recycled Achieved (MT)
                    </div>
                    {renderAnimatedSummaryValue(totalRecycledQty, {
                      digits: 2,
                      className: "mt-2 text-3xl font-bold text-green-700",
                    })}
                  </div>

                  <div className="min-w-0 text-right">
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide ${recycledShortfallColor}`}
                    >
                      Recycled Shortfall (MT)
                    </div>
                    <div
                      className={`mt-2 flex items-center justify-end gap-2 text-3xl font-bold ${recycledShortfallColor}`}
                    >
                      {recycledShortfall >= 0 ? (
                        <FaArrowUp className="text-green-600" />
                      ) : (
                        <FaArrowDown className="text-red-600" />
                      )}
                      {renderAnimatedSummaryValue(Math.abs(recycledShortfall), {
                        digits: 2,
                        className: "",
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 h-2.5 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                  <div
                    className="h-full bg-green-500"
                    data-gsap-progress-fill
                    style={{ width: `${clampPct(recycledAchievedPct)}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Achieved: {formatWithCommas(recycledAchievedPct, 1)}%
                  </span>
                  <span>Target: {formatWithCommas(targetQty, 2)} MT</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-sm font-semibold text-gray-800">
                  Virgin Target Achieved vs Shortfall
                </div>

                <div className="mt-5 flex items-start justify-between gap-8">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Virgin Achieved (MT)
                    </div>
                    {renderAnimatedSummaryValue(totalVirginQty, {
                      digits: 2,
                      className: "mt-2 text-3xl font-bold text-emerald-700",
                    })}
                  </div>

                  <div className="min-w-0 text-right">
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide ${virginShortfallColor}`}
                    >
                      Virgin Shortfall (MT)
                    </div>
                    <div
                      className={`mt-2 flex items-center justify-end gap-2 text-3xl font-bold ${virginShortfallColor}`}
                    >
                      {virginShortfall >= 0 ? (
                        <FaArrowUp className="text-green-600" />
                      ) : (
                        <FaArrowDown className="text-red-600" />
                      )}
                      {renderAnimatedSummaryValue(Math.abs(virginShortfall), {
                        digits: 2,
                        className: "",
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 h-2.5 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                  <div
                    className="h-full bg-green-500"
                    data-gsap-progress-fill
                    style={{ width: `${clampPct(virginAchievedPct)}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Achieved: {formatWithCommas(virginAchievedPct, 1)}%
                  </span>
                  <span>Target: {formatWithCommas(virginTargetQty, 2)} MT</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {categoryWiseProcurement.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">
                Category Wise
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Infographic split of procurement quantities and spend by
                category.
              </p>
            </div>
            <div className="p-5 overflow-x-auto">
              <div className="flex gap-5 min-w-max">
                {categoryWiseProcurement.map((item) => (
                  <div
                    key={item.key}
                    className="w-[360px] flex-shrink-0 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          {item.category}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                          Monthly Purchase MT
                        </div>
                        {renderAnimatedSummaryValue(item.monthlyPurchaseMt, {
                          digits: 3,
                          className: "text-xl font-bold text-gray-900",
                        })}
                        <div className="mt-2 text-[11px] uppercase tracking-wide text-gray-400">
                          Recycled Target Qty (MT)
                          {item.recycledTargetPct
                            ? ` (${item.recycledTargetPct}%)`
                            : ""}
                        </div>
                        {renderAnimatedSummaryValue(item.recycledTargetQtyMt, {
                          digits: 3,
                          className: "text-sm font-bold text-green-700",
                        })}
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-wide text-gray-400">
                          Recycled Share
                        </div>
                        {renderAnimatedSummaryValue(item.recycledShareRaw, {
                          digits:
                            safeNumber(item.recycledShareRaw) > 0 &&
                            safeNumber(item.recycledShareRaw) < 0.1
                              ? 2
                              : 1,
                          className: "text-lg font-bold text-green-700",
                          suffix: "%",
                        })}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1">
                        <span>Recycled vs Virgin</span>
                        <span>
                          {item.recycledShare}% / {item.virginShare}%
                        </span>
                      </div>
                      {(() => {
                        const actualRecycledShare = Math.min(
                          100,
                          Math.max(
                            0,
                            Number(item.recycledShareRaw ?? item.recycledShare),
                          ),
                        );
                        const visibleRecycledShare =
                          actualRecycledShare > 0 && actualRecycledShare < 1.5
                            ? 1.5
                            : actualRecycledShare;
                        const visibleVirginShare = Math.max(
                          0,
                          100 - visibleRecycledShare,
                        );

                        return (
                      <div className="h-3 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex">
                        <div
                          className="h-full bg-green-500"
                          data-gsap-progress-fill
                          style={{
                            width: `${visibleRecycledShare}%`,
                          }}
                        />
                        <div
                          className="h-full bg-blue-500"
                          data-gsap-progress-fill
                          style={{
                            width: `${visibleVirginShare}%`,
                          }}
                        />
                      </div>
                        );
                      })()}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-green-700/70 font-semibold">
                          Recycled Qty
                        </div>
                        {renderAnimatedSummaryValue(item.recycledQty, {
                          digits: 3,
                          className: "mt-1 text-base font-bold text-green-700",
                        })}
                      </div>
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-blue-700/70 font-semibold">
                          Virgin Qty
                        </div>
                        {renderAnimatedSummaryValue(item.virginQty, {
                          digits: 3,
                          className: "mt-1 text-base font-bold text-blue-700",
                        })}
                      </div>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-emerald-700/70 font-semibold">
                          Recycled Amount
                        </div>
                        {renderAnimatedSummaryValue(item.recycledAmount, {
                          digits: 3,
                          className: "mt-1 text-base font-bold text-emerald-700",
                        })}
                      </div>
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-indigo-700/70 font-semibold">
                          Virgin Amount
                        </div>
                        {renderAnimatedSummaryValue(item.virginAmount, {
                          digits: 3,
                          className: "mt-1 text-base font-bold text-indigo-700",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isProducerEntity && (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Industry Wise Summary
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>Click a row to view details.</span>
                    <Tag color="green">Surplus</Tag>
                    <Tag color="red">Shortfall</Tag>
                    <Tag color="blue">Target</Tag>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={industrySearch}
                    onChange={(e) => setIndustrySearch(e.target.value)}
                    placeholder="Search industry"
                    className="w-[220px]"
                    allowClear
                    size="middle"
                  />
                  <Checkbox
                    checked={industryOnlyShortfall}
                    onChange={(e) => setIndustryOnlyShortfall(e.target.checked)}
                  >
                    Only shortfall
                  </Checkbox>
                  <Checkbox
                    checked={industryOnlyNoRecycled}
                    onChange={(e) =>
                      setIndustryOnlyNoRecycled(e.target.checked)
                    }
                  >
                    Only no recycled
                  </Checkbox>
                  <Select
                    value={industryTopN}
                    onChange={setIndustryTopN}
                    options={topOptions}
                    className="w-[120px]"
                    size="middle"
                  />
                  <Button
                    onClick={() => {
                      setIndustrySearch("");
                      setIndustryOnlyShortfall(false);
                      setIndustryOnlyNoRecycled(false);
                      setIndustryTopN("All");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
            <Table
              columns={topIndustryColumns}
              dataSource={filteredIndustryRows}
              rowKey="key"
              pagination={false}
              bordered
              loading={summaryLoading}
              locale={{
                emptyText: summaryLoading
                  ? "Loading summary data..."
                  : "No summary data available.",
              }}
              sticky
              scroll={{ x: 1500, y: 420 }}
              rowClassName={() => "cursor-pointer"}
              onRow={(record) => ({
                onClick: () => {
                  setSummaryDrawerType("industry");
                  setSummaryDrawerRecord(record);
                  setSummaryDrawerOpen(true);
                },
              })}
            />
          </div>
        )}

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Supplier Wise Summary
                </h3>
                <div className="mt-1 text-xs text-gray-500">
                  Click a row to view details.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  placeholder="Search supplier"
                  className="w-[220px]"
                  allowClear
                  size="middle"
                />
                <Checkbox
                  checked={supplierOnlyShortfall}
                  onChange={(e) => setSupplierOnlyShortfall(e.target.checked)}
                >
                  Only shortfall
                </Checkbox>
                <Checkbox
                  checked={supplierOnlyNoRecycled}
                  onChange={(e) => setSupplierOnlyNoRecycled(e.target.checked)}
                >
                  Only no recycled
                </Checkbox>
                <Select
                  value={supplierTopN}
                  onChange={setSupplierTopN}
                  options={topOptions}
                  className="w-[120px]"
                  size="middle"
                />
                <Button
                  onClick={() => {
                    setSupplierSearch("");
                    setSupplierOnlyShortfall(false);
                    setSupplierOnlyNoRecycled(false);
                    setSupplierTopN("All");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
          <Table
            columns={supplierWiseColumns}
            dataSource={filteredSupplierRows}
            rowKey="key"
            pagination={false}
            bordered
            loading={summaryLoading}
            locale={{
              emptyText: summaryLoading
                ? "Loading summary data..."
                : "No summary data available.",
            }}
            sticky
            scroll={{ x: 1600, y: 420 }}
            rowClassName={() => "cursor-pointer"}
            onRow={(record) => ({
              onClick: () => {
                setSummaryDrawerType("supplier");
                setSummaryDrawerRecord(record);
                setSummaryDrawerOpen(true);
              },
            })}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">
              Supplier CTO Check Table
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Read-only view of saved Supplier CTO Check records from the plant
              process.
            </p>
          </div>
          <Table
            columns={supplierCtoTableColumns}
            dataSource={supplierCtoTableRows}
            rowKey="key"
            pagination={false}
            size="middle"
            bordered
            loading={summaryLoading}
            locale={{
              emptyText: summaryLoading
                ? "Loading supplier CTO data..."
                : "No supplier CTO check data available.",
            }}
            scroll={{ x: 1600 }}
            rowClassName="hover:bg-gray-50"
          />
        </div>

        <Drawer
          open={summaryDrawerOpen}
          onClose={() => setSummaryDrawerOpen(false)}
          size={720}
          title={
            summaryDrawerType === "supplier"
              ? `Supplier: ${summaryDrawerRecord?.supplierName || ""}`
              : `Industry: ${summaryDrawerRecord?.industryCategory || ""}`
          }
        >
          {(() => {
            const record = summaryDrawerRecord;
            if (!record) return null;

            const rows = (summaryMonthlyRows || []).filter((row) => {
              if (summaryDrawerType === "supplier") {
                return (
                  (row?.supplierName || "Unknown").toString().trim() ===
                  (record?.supplierName || "").toString().trim()
                );
              }
              const skuCode = (row?.skuCode || "").toString().trim();
              const industry = skuIndustryMap.get(skuCode) || "Uncategorized";
              return industry === (record?.industryCategory || "Uncategorized");
            });

            const skuAgg = rows.reduce((acc, row) => {
              const skuCode =
                (row?.skuCode || "").toString().trim() || "Unknown";
              if (!acc[skuCode]) {
                acc[skuCode] = {
                  key: skuCode,
                  skuCode,
                  monthlyPurchaseMt: 0,
                  recycledQty: 0,
                  virginQty: 0,
                };
              }
              acc[skuCode].monthlyPurchaseMt += safeNumber(
                row?.monthlyPurchaseMt,
              );
              acc[skuCode].recycledQty += safeNumber(row?.recycledQty);
              acc[skuCode].virginQty += safeNumber(row?.virginQty);
              return acc;
            }, {});

            const skuRows = Object.values(skuAgg)
              .sort((a, b) => b.monthlyPurchaseMt - a.monthlyPurchaseMt)
              .slice(0, 12);

            const skuColumns = [
              {
                title: "SKU",
                dataIndex: "skuCode",
                key: "skuCode",
                width: 180,
                fixed: "left",
              },
              {
                title: "Monthly Purchase (MT)",
                dataIndex: "monthlyPurchaseMt",
                key: "monthlyPurchaseMt",
                align: "right",
                render: (v) => formatWithCommas(v, 3),
              },
              {
                title: "Recycled Qty (MT)",
                dataIndex: "recycledQty",
                key: "recycledQty",
                align: "right",
                render: (v) => formatWithCommas(v, 3),
              },
              {
                title: "Virgin Qty (MT)",
                dataIndex: "virginQty",
                key: "virginQty",
                align: "right",
                render: (v) => formatWithCommas(v, 3),
              },
            ];

            return (
              <GsapRevealGroup
                className="space-y-4"
                animateKey={`summary-drawer-${summaryDrawerType || "unknown"}-${record?.key || record?.supplierName || record?.industryCategory || "default"}`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      Monthly Purchase (MT)
                    </div>
                    <div className="mt-1 text-lg font-bold text-gray-900">
                      {renderAnimatedSummaryValue(record.monthlyPurchaseMt, {
                        digits: 3,
                        className: "text-lg font-bold text-gray-900",
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      Total SKU
                    </div>
                    <div className="mt-1 text-lg font-bold text-gray-900">
                      {renderAnimatedSummaryValue(record.totalSku, {
                        className: "text-lg font-bold text-gray-900",
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      Recycled Achieved (MT)
                    </div>
                    <div className="mt-1 text-lg font-bold text-green-700">
                      {renderAnimatedSummaryValue(record.recycledAchievedMt, {
                        digits: 3,
                        className: "text-lg font-bold text-green-700",
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">
                      Virgin Achieved (MT)
                    </div>
                    <div className="mt-1 text-lg font-bold text-emerald-700">
                      {renderAnimatedSummaryValue(record.virginAchievedMt, {
                        digits: 3,
                        className: "text-lg font-bold text-emerald-700",
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800">
                      Top SKUs
                    </div>
                    <div className="text-xs text-gray-500">
                      By Monthly Purchase
                    </div>
                  </div>
                  <Table
                    columns={skuColumns}
                    dataSource={skuRows}
                    rowKey="key"
                    pagination={false}
                    scroll={{ x: 700 }}
                    size="small"
                  />
                </div>
              </GsapRevealGroup>
            );
          })()}
        </Drawer>
      </div>
    );
  };

  const renderIndustrySkuWiseSummary = () => {
    const statusBadgeClass = (status) => {
      if (status === "Compliant") return "bg-green-100 text-green-700";
      if (status === "Non-Compliant") return "bg-red-100 text-red-700";
      if (status === "Partially Compliant")
        return "bg-amber-100 text-amber-700";
      if (status === "Under Review") return "bg-blue-100 text-blue-700";
      return "bg-gray-100 text-gray-700";
    };

    const reportRows = [];

    industrySkuSummaryData.forEach((item, index) => {
      const industryKey = (item.industryCategory || "Uncategorized").trim();
      const previousIndustry =
        index > 0
          ? (
              industrySkuSummaryData[index - 1]?.industryCategory ||
              "Uncategorized"
            ).trim()
          : null;

      if (industryKey !== previousIndustry) {
        reportRows.push({
          key: `industry-header-${industryKey}-${index}`,
          rowType: "industry-header",
          industryCategory: industryKey,
        });
      }

      reportRows.push({
        ...item,
        rowType: "sku-row",
      });
    });

    const industryCategorySummaryRows = Object.values(
      industrySkuSummaryData.reduce((acc, item) => {
        const industryKey =
          (item.industryCategory || "Uncategorized").trim() || "Uncategorized";
        if (!acc[industryKey]) {
          acc[industryKey] = {
            key: `industry-summary-${industryKey}`,
            industryCategory: industryKey,
            totalSku: 0,
            complianceCompliant: 0,
            complianceNonCompliant: 0,
            markingCompliant: 0,
            markingNonCompliant: 0,
          };
        }

        acc[industryKey].totalSku += 1;
        if (item.complianceStatus === "Compliant")
          acc[industryKey].complianceCompliant += 1;
        if (item.complianceStatus === "Non-Compliant")
          acc[industryKey].complianceNonCompliant += 1;
        if (item.markingLabelingStatus === "Compliant")
          acc[industryKey].markingCompliant += 1;
        if (item.markingLabelingStatus === "Non-Compliant")
          acc[industryKey].markingNonCompliant += 1;

        return acc;
      }, {}),
    ).sort((left, right) =>
      left.industryCategory.localeCompare(right.industryCategory),
    );

    const complianceTotals = industrySkuSummaryData.reduce(
      (acc, item) => {
        acc.totalSku += 1;
        if (item.complianceStatus === "Compliant") acc.compliant += 1;
        else if (item.complianceStatus === "Non-Compliant")
          acc.nonCompliant += 1;
        else acc.other += 1;
        return acc;
      },
      { totalSku: 0, compliant: 0, nonCompliant: 0, other: 0 },
    );

    const overallPieData = [
      {
        name: "Compliant",
        value: complianceTotals.compliant,
        color: "#16a34a",
      },
      {
        name: "Non-Compliant",
        value: complianceTotals.nonCompliant,
        color: "#f97316",
      },
      {
        name: "Pending/Other",
        value: complianceTotals.other,
        color: "#94a3b8",
      },
    ].filter((entry) => entry.value > 0);

    const compliantPct = complianceTotals.totalSku
      ? (
          (complianceTotals.compliant / complianceTotals.totalSku) *
          100
        ).toFixed(1)
      : "0.0";
    const nonCompliantPct = complianceTotals.totalSku
      ? (
          (complianceTotals.nonCompliant / complianceTotals.totalSku) *
          100
        ).toFixed(1)
      : "0.0";

    const industryBarData = industryCategorySummaryRows.map((row) => {
      const total = row.totalSku || 0;
      const compliant = row.complianceCompliant || 0;
      const nonCompliant = row.complianceNonCompliant || 0;
      const other = Math.max(0, total - compliant - nonCompliant);
      return {
        industry: row.industryCategory,
        total,
        compliant,
        nonCompliant,
        other,
      };
    });

    const reportColumns = [
      {
        title: <div className="text-center">Industry Wise SKU</div>,
        dataIndex: "industryCategory",
        key: "industryWiseSku",
        width: 320,
        align: "center",
        onHeaderCell: () => ({ className: "!text-center" }),
        render: (_, record) => {
          if (record.rowType === "industry-header") {
            return {
              children: (
                <div className="w-full text-center text-[14px] leading-5 font-bold text-orange-600 py-0">
                  {record.industryCategory || "Uncategorized"}
                </div>
              ),
              props: {
                colSpan: 7,
                className: "bg-orange-50 !py-1",
              },
            };
          }

          return {
            children: (
              <div className="min-w-[240px] text-center">
                <div className="text-sm font-semibold text-gray-900 underline underline-offset-2">
                  {record.skuCode || "-"}
                </div>
                <div className="text-sm font-semibold text-gray-900 whitespace-pre-wrap">
                  {record.skuDescription || "-"}
                </div>
              </div>
            ),
            props: {
              className: "align-top",
            },
          };
        },
      },
      {
        title: <div className="text-center">Compliance Status</div>,
        dataIndex: "complianceStatus",
        key: "complianceStatus",
        width: 180,
        align: "center",
        onHeaderCell: () => ({ className: "!text-center" }),
        render: (value, record) => {
          if (record.rowType === "industry-header") {
            return { children: null, props: { colSpan: 0 } };
          }

          return (
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(value)}`}
            >
              {value || "Pending"}
            </span>
          );
        },
      },
      {
        title: <div className="text-center">Marking and Labeling Status</div>,
        dataIndex: "markingLabelingStatus",
        key: "markingLabelingStatus",
        width: 220,
        align: "center",
        onHeaderCell: () => ({ className: "!text-center" }),
        render: (value, record) => {
          if (record.rowType === "industry-header") {
            return { children: null, props: { colSpan: 0 } };
          }

          return (
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(value)}`}
            >
              {value || "Pending"}
            </span>
          );
        },
      },
      {
        title: <div className="text-center">Supplier Status</div>,
        key: "supplierStatusGroup",
        align: "center",
        children: [
          {
            title: <div className="text-center">Registered</div>,
            dataIndex: "supplierRegisteredCount",
            key: "supplierRegisteredCount",
            width: 130,
            align: "center",
            onHeaderCell: () => ({ className: "!text-center" }),
            render: (value, record) => {
              if (record.rowType === "industry-header") {
                return { children: null, props: { colSpan: 0 } };
              }

              return (
                <span className="text-sm font-medium text-gray-700">
                  {value ?? 0}
                </span>
              );
            },
          },
          {
            title: <div className="text-center">Unregistered</div>,
            dataIndex: "supplierUnregisteredCount",
            key: "supplierUnregisteredCount",
            width: 150,
            align: "center",
            onHeaderCell: () => ({ className: "!text-center" }),
            render: (value, record) => {
              if (record.rowType === "industry-header") {
                return { children: null, props: { colSpan: 0 } };
              }

              return (
                <span className="text-sm font-medium text-gray-700">
                  {value ?? 0}
                </span>
              );
            },
          },
        ],
      },
      {
        title: <div className="text-center">Remarks</div>,
        dataIndex: "remarks",
        key: "remarks",
        align: "center",
        onHeaderCell: () => ({ className: "!text-center" }),
        render: (value, record) => {
          if (record.rowType === "industry-header") {
            return { children: null, props: { colSpan: 0 } };
          }

          return (
            <div className="text-xs text-gray-600 whitespace-pre-wrap leading-5 min-h-[20px] text-center">
              {value || "-"}
            </div>
          );
        },
      },
      {
        title: <div className="text-center">Solution</div>,
        dataIndex: "solution",
        key: "solution",
        align: "center",
        onHeaderCell: () => ({ className: "!text-center" }),
        render: (value, record) => {
          if (record.rowType === "industry-header") {
            return { children: null, props: { colSpan: 0 } };
          }

          return (
            <div className="text-xs text-gray-600 whitespace-pre-wrap leading-5 min-h-[20px] text-center">
              {value || "-"}
            </div>
          );
        },
      },
    ];

    const industryCategorySummaryColumns = [
      {
        title: <div className="text-center">Industry Category</div>,
        dataIndex: "industryCategory",
        key: "industryCategory",
        align: "center",
        onHeaderCell: () => ({ className: "!text-center" }),
        render: (value) => (
          <div className="text-sm font-semibold text-gray-800 text-center">
            {value || "-"}
          </div>
        ),
      },
      {
        title: <div className="text-center">Total SKU</div>,
        dataIndex: "totalSku",
        key: "totalSku",
        width: 120,
        align: "center",
        onHeaderCell: () => ({ className: "!text-center" }),
      },
      {
        title: <div className="text-center">Compliance Status</div>,
        key: "complianceStatusGroup",
        align: "center",
        children: [
          {
            title: <div className="text-center">Compliant</div>,
            dataIndex: "complianceCompliant",
            key: "complianceCompliant",
            width: 140,
            align: "center",
            onHeaderCell: () => ({ className: "!text-center" }),
          },
          {
            title: <div className="text-center">Non Compliant</div>,
            dataIndex: "complianceNonCompliant",
            key: "complianceNonCompliant",
            width: 160,
            align: "center",
            onHeaderCell: () => ({ className: "!text-center" }),
          },
        ],
      },
      {
        title: <div className="text-center">Marking and Labeling</div>,
        key: "markingLabelingGroup",
        align: "center",
        children: [
          {
            title: <div className="text-center">Compliant</div>,
            dataIndex: "markingCompliant",
            key: "markingCompliant",
            width: 140,
            align: "center",
            onHeaderCell: () => ({ className: "!text-center" }),
          },
          {
            title: <div className="text-center">Non Compliant</div>,
            dataIndex: "markingNonCompliant",
            key: "markingNonCompliant",
            width: 160,
            align: "center",
            onHeaderCell: () => ({ className: "!text-center" }),
          },
        ],
      },
    ];

    const renderTargetTableColumns = (columns = []) =>
      columns.map((col, colIdx) => {
        const title = typeof col === "object" ? col.title : col;
        const key = typeof col === "object" ? col.key : col;

        return {
          title: (
            <div className="text-center text-xs font-bold uppercase text-gray-700">
              {title}
            </div>
          ),
          key,
          align: colIdx === 0 ? "left" : "center",
          render: (_, record) => {
            const value = record?.[key];
            if (colIdx === 0) {
              return <span className="font-medium text-gray-700">{value}</span>;
            }
            return <span className="text-gray-600">{value}</span>;
          },
        };
      });

    const annualTargetTableData = (summaryAnnualTargetRows || []).map(
      (row, index) => {
        const preConsumer = parseFloat(row?.["Pre Consumer"] || 0) || 0;
        const postConsumer = parseFloat(row?.["Post Consumer"] || 0) || 0;

        return {
          key: `${row?.["Category of Plastic"] || "annual-target"}-${index}`,
          category: row?.["Category of Plastic"] || "-",
          procurementTons: row?.["Total Purchase"] ?? 0,
          salesTons: (preConsumer + postConsumer).toFixed(4),
          exportTons: row?.["Export"] ?? 0,
        };
      },
    );

    const annualTargetColumns = [
      {
        title: (
          <div className="text-center text-xs font-bold uppercase text-gray-700">
            Category
          </div>
        ),
        dataIndex: "category",
        key: "category",
        align: "left",
        render: (value) => (
          <span className="font-medium text-gray-700">{value}</span>
        ),
      },
      {
        title: (
          <div className="text-center text-xs font-bold uppercase text-gray-700">
            Procurement (Tons)
          </div>
        ),
        dataIndex: "procurementTons",
        key: "procurementTons",
        align: "center",
        render: (value) => <span className="text-gray-600">{value}</span>,
      },
      {
        title: (
          <div className="text-center text-xs font-bold uppercase text-gray-700">
            Sales (Tons)
          </div>
        ),
        dataIndex: "salesTons",
        key: "salesTons",
        align: "center",
        render: (value) => <span className="text-gray-600">{value}</span>,
      },
      {
        title: (
          <div className="text-center text-xs font-bold uppercase text-gray-700">
            Export (Tons)
          </div>
        ),
        dataIndex: "exportTons",
        key: "exportTons",
        align: "center",
        render: (value) => <span className="text-gray-600">{value}</span>,
      },
    ];

    return (
      <div className="space-y-5">
        {!isProducerEntity && (
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
            Summary is shown SKU-wise for the client entity type:{" "}
            <span className="font-semibold">{client?.entityType || "N/A"}</span>
          </div>
        )}

        {industrySkuSummaryData.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">
                Compliance Overview
              </h3>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-xl border border-green-100 bg-green-50/40 p-4 lg:col-span-1">
                <div className="text-sm font-semibold text-gray-800 mb-3">
                  Overall SKU Compliance
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overallPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {overallPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#111827"
                        fontSize="18"
                        fontWeight="700"
                      >
                        {compliantPct}%
                      </text>
                      <text
                        x="50%"
                        y="50%"
                        dy={18}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#6b7280"
                        fontSize="11"
                        fontWeight="600"
                      >
                        Compliant
                      </text>
                      <RechartsTooltip
                        formatter={(value, name) => {
                          const pct = complianceTotals.totalSku
                            ? (
                                (Number(value) / complianceTotals.totalSku) *
                                100
                              ).toFixed(1)
                            : "0.0";
                          return [`${value} (${pct}%)`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="font-semibold">Compliant:</span>{" "}
                    {renderAnimatedSummaryValue(complianceTotals.compliant, {
                      digits: 0,
                      className: "",
                    })}{" "}
                    (
                    {renderAnimatedSummaryValue(compliantPct, {
                      digits: 1,
                      className: "",
                      suffix: "%",
                    })}
                    )
                  </div>
                  <div>
                    <span className="font-semibold">Non-Compliant:</span>{" "}
                    {renderAnimatedSummaryValue(complianceTotals.nonCompliant, {
                      digits: 0,
                      className: "",
                    })}{" "}
                    (
                    {renderAnimatedSummaryValue(nonCompliantPct, {
                      digits: 1,
                      className: "",
                      suffix: "%",
                    })}
                    )
                  </div>
                  <div>
                    <span className="font-semibold">Total SKU:</span>{" "}
                    {renderAnimatedSummaryValue(complianceTotals.totalSku, {
                      digits: 0,
                      className: "",
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-green-100 bg-green-50/40 p-4 lg:col-span-2">
                <div className="text-sm font-semibold text-gray-800 mb-3">
                  Industry Wise Compliance
                </div>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={industryBarData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 42 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="industry"
                        angle={-12}
                        textAnchor="end"
                        interval={0}
                        height={70}
                        tick={{ fill: "#334155", fontSize: 11 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#334155", fontSize: 11 }}
                      />
                      <RechartsTooltip
                        formatter={(value, name, props) => {
                          const total = props?.payload?.total || 0;
                          const pct = total
                            ? ((Number(value) / total) * 100).toFixed(1)
                            : "0.0";
                          const label =
                            name === "nonCompliant"
                              ? "Non-Compliant"
                              : name === "compliant"
                                ? "Compliant"
                                : "Pending/Other";
                          return [`${value} (${pct}%)`, label];
                        }}
                      />
                      <Legend
                        formatter={(value) =>
                          value === "nonCompliant"
                            ? "Non-Compliant"
                            : value === "compliant"
                              ? "Compliant"
                              : "Pending/Other"
                        }
                        verticalAlign="top"
                        height={28}
                      />
                      <Bar
                        dataKey="compliant"
                        stackId="a"
                        fill="#16a34a"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar dataKey="nonCompliant" stackId="a" fill="#f97316" />
                      <Bar dataKey="other" stackId="a" fill="#94a3b8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Hover the bars to view compliant/non-compliant percentage
                  within each industry.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">
              Industry Category Summary
            </h3>
          </div>

          <Table
            columns={industryCategorySummaryColumns}
            dataSource={industryCategorySummaryRows}
            rowKey="key"
            pagination={false}
            className="[&_.ant-table-thead_th]:!py-2 [&_.ant-table-thead_th]:!px-3 [&_.ant-table-thead_th]:!leading-4 [&_.ant-table-thead_th]:align-middle"
            locale={{
              emptyText: summaryLoading
                ? "Loading industry category summary..."
                : "No industry summary data available.",
            }}
            scroll={{ x: 900 }}
            bordered
          />
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Summary Report of Industry, SKU Wise
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Combined view of overall compliance and marking/labeling status
                for each saved SKU.
              </p>
            </div>
          </div>

          <Table
            columns={reportColumns}
            dataSource={reportRows}
            rowKey="key"
            loading={summaryLoading}
            pagination={false}
            className="[&_.ant-table-thead_th]:!py-2 [&_.ant-table-thead_th]:!px-3 [&_.ant-table-thead_th]:!leading-4 [&_.ant-table-thead_th]:align-middle [&_.ant-table-thead_th]:!text-xs"
            locale={{
              emptyText: summaryLoading
                ? "Loading summary report..."
                : "No industry or SKU compliance data available.",
            }}
            scroll={{ x: 1000 }}
            bordered
          />
        </div>

        {annualTargetTableData.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">
                Annual Summary
              </h3>
            </div>

            <div className="p-5">
              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm [&_.ant-table-thead_th]:!bg-orange-50 [&_.ant-table-thead_th]:!font-bold [&_.ant-table-thead_th]:!text-gray-700">
                <Table
                  dataSource={annualTargetTableData}
                  columns={annualTargetColumns}
                  pagination={false}
                  rowKey="key"
                  bordered
                  size="middle"
                  scroll={{ x: 700 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (embeddedAuditTarget) {
    const isEWaste = client?.wasteType === "E-Waste";
    const ProcessComponent = isEWaste ? EWasteProcess : PlantProcess;
    return (
      <ProcessComponent
        clientId={id}
        type={embeddedAuditTarget.type}
        itemId={embeddedAuditTarget.id}
        onBack={() => {
          setEmbeddedAuditTarget(null);
          clientDetailQuery.refetch();
        }}
        onFinish={onAuditComplete}
      />
    );
  }

  return (
    <ClientProvider>
      <div className={embedded ? "" : "p-6"}>
        <ClientHeader
          embedded={embedded}
          initialViewMode={initialViewMode}
          isClientUser={isClientUser}
          isProcessMode={isProcessMode}
          client={client}
          onBack={() =>
            navigate(
              isClientUser ? "/dashboard/client-connect" : "/dashboard/clients",
            )
          }
          onStartAudit={() =>
            navigate(`/dashboard/client/${id}/edit`, {
              state: { activeTab: "Pre - Validation", unlockAudit: true },
            })
          }
          onEdit={() => navigate(`/dashboard/client/${id}/edit`)}
        />
        <div className="flex flex-wrap gap-3 justify-end">
          {/* {(client.wasteType || '').toLowerCase().includes('plastic') && initialViewMode !== 'client-connect' && (
            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
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
                } catch (err) {
                  console.error('Report download failed:', err);
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 bg-white text-primary-700 text-xs font-semibold hover:bg-primary-50 transition-colors"
            >
              <FaFilePdf className="text-sm" />
              Download Complete Report
            </button>
          )} */}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {initialViewMode !== "client-connect" && tabs.length > 1 && (
            <div className="p-6 pb-0 mb-6">
              <AuditStepper
                steps={tabs}
                currentStep={activeTab}
                onStepChange={setActiveTab}
              />
            </div>
          )}

          <div>
            {initialViewMode === "client-connect" ? (
              <>
                {/* Custom Tab Navigation */}
                <div className="border-b border-gray-200 px-5">
                  <nav
                    className="flex gap-1 -mb-px overflow-x-auto"
                    role="tablist"
                  >
                    {[
                      {
                        key: "overview",
                        label: "Client Overview",
                        icon: FaListAlt,
                      },
                      { key: "summary", label: "Summary", icon: FaChartLine },
                      ...(!isProducerEntity
                        ? [
                            {
                              key: "industry-summary",
                              label: "Summary Report of Industry, SKU Wise",
                              icon: FaChartLine,
                            },
                          ]
                        : []),
                      {
                        key: "industry",
                        label: isProducerEntity
                          ? "Component Details"
                          : "Industry SKU & Component",
                        icon: FaIndustry,
                      },
                      {
                        key: "marking",
                        label: "Marking & Labelling",
                        icon: FaClipboardCheck,
                      },
                      {
                        key: "portal",
                        label: "Portal Data & EPR Targets",
                        icon: FaFileContract,
                      },
                    ].map((tab) => {
                      const isActive = clientConnectTab === tab.key;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.key}
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setClientConnectTab(tab.key)}
                          className={`
                          flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap
                          border-b-2 transition-all duration-200
                          ${
                            isActive
                              ? "border-primary-600 text-primary-600"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }
                        `}
                        >
                          <Icon className="text-xs" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-5 md:p-6">
                  {clientConnectTab === "overview" && (
                    <div className="space-y-5">
                      {renderOverviewSection()}
                      <ClientDocuments
                        isOpen={clientDataOpen}
                        onToggle={() => setClientDataOpen((prev) => !prev)}
                      >
                        {renderAddressSection()}
                        {renderDocumentsSection()}
                        {renderCteCtoSection()}
                      </ClientDocuments>
                    </div>
                  )}
                  {clientConnectTab === "summary" && (
                    <ClientSummaryPanel>
                      {renderClientConnectSummary()}
                    </ClientSummaryPanel>
                  )}
                  {!isProducerEntity &&
                    clientConnectTab === "industry-summary" && (
                      <GsapRevealGroup animateKey="industry-summary-tab">
                        {renderIndustrySkuWiseSummary()}
                      </GsapRevealGroup>
                    )}
                  {clientConnectTab === "industry" && (
                    <ClientComplianceTable>
                      {renderSkuSummary()}
                    </ClientComplianceTable>
                  )}
                  {clientConnectTab === "marking" && (
                    <GsapRevealGroup animateKey="marking-tab">
                      <MarkingLabeling
                        clientId={id}
                        API_URL={api.defaults.baseURL}
                        readOnly={true}
                        isProducer={isProducerEntity}
                        productRows={summaryProductRows}
                      />
                    </GsapRevealGroup>
                  )}
                  {clientConnectTab === "portal" && (
                    <div className="space-y-8">
                      {isProducerEntity ? (
                        <>
                          <SalesAnalysis
                            clientId={id}
                            type={type}
                            itemId={itemId}
                            readOnly={true}
                            entityType={client.entityType}
                            showTargetsOnTop={true}
                            hideSalesSection={true}
                          />
                          <Analysis
                            clientId={id}
                            type={type}
                            itemId={itemId}
                            isStepReadOnly={true}
                            entityType={client.entityType}
                          />
                        </>
                      ) : (
                        <>
                          <Analysis
                            clientId={id}
                            type={type}
                            itemId={itemId}
                            isStepReadOnly={true}
                            entityType={client.entityType}
                            showTargetsOnly={true}
                          />
                          <Analysis
                            clientId={id}
                            type={type}
                            itemId={itemId}
                            isStepReadOnly={true}
                            entityType={client.entityType}
                            hideTargets={true}
                          />
                        </>
                      )}
                      <SalesAnalysis
                        clientId={id}
                        type={type}
                        itemId={itemId}
                        readOnly={true}
                        entityType={client.entityType}
                        hideTargetSection={true}
                      />
                      <PurchaseAnalysis
                        clientId={id}
                        type={type}
                        itemId={itemId}
                        readOnly={true}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <GsapStepTransition
                className="p-6"
                transitionKey={`client-detail-step-${activeTab}`}
              >
                {activeTab === 1 && renderOverviewSection()}
                {activeTab === 2 && renderAddressSection()}
                {activeTab === 3 && renderDocumentsSection()}
                {activeTab === 4 && renderCteCtoSection()}
              </GsapStepTransition>
            )}
          </div>
        </div>
        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          documentUrl={viewerUrl}
          documentName={viewerName}
        />
      </div>
    </ClientProvider>
  );
};

export default ClientDetail;
