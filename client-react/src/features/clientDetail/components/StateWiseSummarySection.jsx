import React from "react";
import { Table, Select } from "antd";
import {
  FaMapMarkerAlt,
  FaUsers,
  FaListAlt,
  FaChartLine,
  FaRecycle,
  FaIndustry,
} from "react-icons/fa";
import indiaSvgMap from "@svg-maps/india";

const StateWiseSummarySection = ({
  stateWiseSupplierSummary,
  selectedSupplierState,
  setSelectedSupplierState,
  normalizeStateName,
  safeNumber,
  formatWithCommas,
  renderAnimatedSummaryValue,
  formatCurrency,
  summarySupplierRows,
  producerClientConnectSkuData,
  industrySkuSummaryData,
  isProducerEntity,
  isBrandOwnerEntity,
  showPlantLocationMarkers,
  indiaMapLabels,
  attachIndiaMapSvgRef,
  hoveredStateMapDetails,
  setHoveredStateMapDetails,
}) => {
  const stateRows = Array.isArray(stateWiseSupplierSummary)
    ? stateWiseSupplierSummary
    : [];
  const selectedStateRecord =
    stateRows.find((row) => row.stateName === selectedSupplierState) ||
    stateRows[0] ||
    null;
  const stateRowByName = new Map(
    stateRows.map((row) => [normalizeStateName(row?.stateName), row]),
  );
  const stateLabelByName = new Map(
    (indiaMapLabels || []).map((label) => [normalizeStateName(label?.name), label]),
  );
  const overallUniqueSkuCount = isProducerEntity
    ? producerClientConnectSkuData.length
    : industrySkuSummaryData.length;
  const maxAnnualPurchaseMt = stateRows.reduce(
    (maxValue, row) => Math.max(maxValue, safeNumber(row?.annualPurchaseMt)),
    0,
  );
  const statesWithPurchaseCount = stateRows.filter(
    (row) => safeNumber(row?.annualPurchaseMt) > 0,
  ).length;
  const positiveAnnualPurchaseValues = stateRows
    .map((row) => safeNumber(row?.annualPurchaseMt))
    .filter((value) => value > 0);
  const minAnnualPurchaseMt = positiveAnnualPurchaseValues.length
    ? Math.min(...positiveAnnualPurchaseValues)
    : 0;
  const topAnnualPurchaseState = [...stateRows].sort(
    (left, right) =>
      safeNumber(right?.annualPurchaseMt) - safeNumber(left?.annualPurchaseMt),
  )[0];
  const topSupplierState = [...stateRows].sort(
    (left, right) =>
      safeNumber(right?.totalSuppliers) - safeNumber(left?.totalSuppliers),
  )[0];
  const topStateHighlights = [...stateRows]
    .sort(
      (left, right) =>
        safeNumber(right?.annualPurchaseMt) - safeNumber(left?.annualPurchaseMt),
    )
    .slice(0, 5);

  const getStateFillColor = (stateRow, isSelected) => {
    if (isSelected) return "#16a34a";
    if (!stateRow) return "#f1f5f9";

    const annualPurchaseMt = safeNumber(stateRow?.annualPurchaseMt);
    if (annualPurchaseMt <= 0 || maxAnnualPurchaseMt <= 0) {
      return "#e2e8f0";
    }

    const range = Math.max(maxAnnualPurchaseMt - minAnnualPurchaseMt, 0);
    const normalized =
      range > 0
        ? (annualPurchaseMt - minAnnualPurchaseMt) / range
        : 0.5;

    if (normalized >= 0.8) return "#14532d";
    if (normalized >= 0.6) return "#166534";
    if (normalized >= 0.4) return "#15803d";
    if (normalized >= 0.2) return "#22c55e";
    return "#86efac";
  };

  const supplierStatusByName = new Map();
  (summarySupplierRows || []).forEach((row) => {
    const supplierNameKey = normalizeStateName(row?.supplierName);
    const supplierStatus = (row?.supplierStatus || "").toString().trim();
    if (!supplierNameKey || !supplierStatus) return;

    const normalizedStatus = supplierStatus.toLowerCase();
    const existingStatus = supplierStatusByName.get(supplierNameKey);
    if (
      !existingStatus ||
      (normalizedStatus.includes("registered") &&
        !normalizedStatus.includes("unregistered"))
    ) {
      supplierStatusByName.set(supplierNameKey, supplierStatus);
    }
  });

  const selectedStateSuppliers = Array.from(
    new Map(
      (selectedStateRecord?.supplierRows || []).map((row) => [
        normalizeStateName(row?.supplierName || row?.supplierCode || row?.key),
        {
          supplierName: row?.supplierName || "-",
          supplierStatus: (() => {
            const directStatus = (row?.supplierStatus || "").toString().trim();
            if (directStatus && directStatus !== "-") {
              return directStatus;
            }
            const fallbackStatus = supplierStatusByName.get(
              normalizeStateName(row?.supplierName),
            );
            if (fallbackStatus) {
              return fallbackStatus;
            }
            return "Not Available";
          })(),
        },
      ]),
    ).values(),
  );

  const selectedStateSupplierStatusCounts = selectedStateSuppliers.reduce(
    (acc, supplier) => {
      const normalizedStatus = String(supplier?.supplierStatus || "").toLowerCase();
      if (
        normalizedStatus.includes("registered") &&
        !normalizedStatus.includes("unregistered")
      ) {
        acc.registered += 1;
      } else if (normalizedStatus.includes("unregistered")) {
        acc.unregistered += 1;
      }
      return acc;
    },
    { registered: 0, unregistered: 0 },
  );
  const selectedStatePlantLocations =
    showPlantLocationMarkers && Array.isArray(selectedStateRecord?.plantLocations)
      ? selectedStateRecord.plantLocations
      : [];
  const plantLocationMarkers = React.useMemo(() => {
    if (!showPlantLocationMarkers) return [];

    return stateRows.flatMap((stateRow) => {
      const stateName = stateRow?.stateName || "";
      const label = stateLabelByName.get(normalizeStateName(stateName));
      const plantLocations = Array.isArray(stateRow?.plantLocations)
        ? stateRow.plantLocations
        : [];

      if (!label || !plantLocations.length) return [];

      const columnCount = plantLocations.length >= 3 ? 3 : Math.min(2, plantLocations.length);
      const markerSpacingX = 12;
      const markerSpacingY = 14;
      const startX = -((columnCount - 1) * markerSpacingX) / 2;

      return plantLocations.map((plant, index) => {
        const rowIndex = Math.floor(index / columnCount);
        const columnIndex = index % columnCount;

        return {
          ...plant,
          markerType: "plant",
          sourceType: plant?.sourceType || "plant",
          label: plant?.plantLocation || "Plant Location",
          secondaryLabel:
            (isProducerEntity ? plant?.clientName : "") || plant?.plantName || "",
          stateName,
          stateRow,
          x: label.x + startX + columnIndex * markerSpacingX,
          y: label.y + 22 + rowIndex * markerSpacingY,
        };
      });
    });
  }, [
    isProducerEntity,
    normalizeStateName,
    showPlantLocationMarkers,
    stateLabelByName,
    stateRows,
  ]);
  const getPlantSecondaryLabel = (plant, stateName) => {
    const plantName = (plant?.plantName || "").toString().trim();
    const plantLocation = (plant?.plantLocation || "").toString().trim();
    const stateLabel = (stateName || "").toString().trim();
    const clientName = (plant?.clientName || "").toString().trim();

    if (isProducerEntity && clientName) {
      if (
        normalizeStateName(clientName) === normalizeStateName(plantLocation) ||
        normalizeStateName(clientName) === normalizeStateName(stateLabel)
      ) {
        return "";
      }
      return clientName;
    }

    if (!plantName) return "";
    if (
      normalizeStateName(plantName) === normalizeStateName(plantLocation) ||
      normalizeStateName(plantName) === normalizeStateName(stateLabel)
    ) {
      return "";
    }

    return plantName;
  };

  const handleMapStateHover = (event, locationName, stateRow) => {
    const svgBounds =
      event?.currentTarget?.ownerSVGElement?.getBoundingClientRect?.() || null;
    const hoverPlantLocations =
      showPlantLocationMarkers && Array.isArray(stateRow?.plantLocations)
        ? stateRow.plantLocations.slice(0, 3)
        : [];
    const tooltipWidth = hoverPlantLocations.length ? 280 : 220;
    const tooltipHeight = stateRow
      ? 150 + hoverPlantLocations.length * 48
      : 60;
    const fallbackX = 18;
    const fallbackY = 18;
    const nextX = svgBounds
      ? Math.min(
          Math.max(12, event.clientX - svgBounds.left + 14),
          Math.max(12, svgBounds.width - tooltipWidth - 12),
        )
      : fallbackX;
    const nextY = svgBounds
      ? Math.min(
          Math.max(12, event.clientY - svgBounds.top - 14),
          Math.max(12, svgBounds.height - tooltipHeight - 12),
        )
      : fallbackY;

    setHoveredStateMapDetails({
      stateName: stateRow?.stateName || locationName || "-",
      totalSuppliers: safeNumber(stateRow?.totalSuppliers),
      totalSku: safeNumber(stateRow?.totalSku),
      annualPurchaseMt: safeNumber(stateRow?.annualPurchaseMt),
      recycledQty: safeNumber(stateRow?.recycledQty),
      virginQty: safeNumber(stateRow?.virginQty),
      recycledAmount: safeNumber(stateRow?.recycledAmount),
      virginAmount: safeNumber(stateRow?.virginAmount),
      plantLocations: hoverPlantLocations,
      plantLocationCount: Array.isArray(stateRow?.plantLocations)
        ? stateRow.plantLocations.length
        : 0,
      x: nextX,
      y: nextY,
      hasData: Boolean(stateRow),
    });
  };

  const overallTotals = stateRows.reduce(
    (acc, row) => {
      acc.totalStates += 1;
      acc.totalSuppliers += safeNumber(row?.totalSuppliers);
      acc.annualPurchaseMt += safeNumber(row?.annualPurchaseMt);
      acc.recycledQty += safeNumber(row?.recycledQty);
      acc.virginQty += safeNumber(row?.virginQty);
      return acc;
    },
    {
      totalStates: 0,
      totalSuppliers: 0,
      annualPurchaseMt: 0,
      recycledQty: 0,
      virginQty: 0,
    },
  );

  const stateTableColumns = [
    {
      title: "Supplier Name",
      dataIndex: "supplierName",
      key: "supplierName",
      fixed: "left",
      width: 220,
      render: (value) => (
        <span className="font-medium text-gray-800">{value || "-"}</span>
      ),
    },
    {
      title: "Supplier Type",
      dataIndex: "supplierType",
      key: "supplierType",
      width: 170,
      render: (value) => value || "-",
    },
    {
      title: "Supplier State",
      dataIndex: "supplierState",
      key: "supplierState",
      width: 150,
    },
    {
      title: "Status",
      dataIndex: "supplierStatus",
      key: "supplierStatus",
      width: 150,
      render: (value) => value || "-",
    },
    {
      title: "Total SKU",
      dataIndex: "totalSku",
      key: "totalSku",
      width: 120,
      align: "center",
      render: (value) => formatWithCommas(value, 0),
    },
    {
      title: "Annual Purchase MT",
      dataIndex: "annualPurchaseMt",
      key: "annualPurchaseMt",
      width: 160,
      align: "right",
      render: (value) => formatWithCommas(value, 3),
    },
    {
      title: "Recycled Qty",
      dataIndex: "recycledQty",
      key: "recycledQty",
      width: 150,
      align: "right",
      render: (value) => (
        <span className="font-semibold text-green-700">
          {formatWithCommas(value, 3)}
        </span>
      ),
    },
    {
      title: "Virgin Qty",
      dataIndex: "virginQty",
      key: "virginQty",
      width: 150,
      align: "right",
      render: (value) => (
        <span className="font-semibold text-blue-700">
          {formatWithCommas(value, 3)}
        </span>
      ),
    },
    {
      title: "Recycled Amount",
      dataIndex: "recycledAmount",
      key: "recycledAmount",
      width: 160,
      align: "right",
      render: (value) => formatCurrency(value, 3),
    },
    {
      title: "Virgin Amount",
      dataIndex: "virginAmount",
      key: "virginAmount",
      width: 160,
      align: "right",
      render: (value) => formatCurrency(value, 3),
    },
  ];

  if (!stateRows.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
        No supplier state data available to show state wise summary.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: "States",
            value: overallTotals.totalStates,
            tone: "text-blue-700 bg-blue-50 border-blue-100",
            icon: FaMapMarkerAlt,
            digits: 0,
          },
          {
            label: "Suppliers",
            value: overallTotals.totalSuppliers,
            tone: "text-indigo-700 bg-indigo-50 border-indigo-100",
            icon: FaUsers,
            digits: 0,
          },
          {
            label: "Total SKU",
            value: overallUniqueSkuCount,
            tone: "text-slate-700 bg-slate-50 border-slate-100",
            icon: FaListAlt,
            digits: 0,
          },
          {
            label: "Annual Purchase MT",
            value: overallTotals.annualPurchaseMt,
            tone: "text-gray-800 bg-gray-50 border-gray-100",
            icon: FaChartLine,
            digits: 3,
          },
          {
            label: "Recycled Qty",
            value: overallTotals.recycledQty,
            tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
            icon: FaRecycle,
            digits: 3,
          },
          {
            label: "Virgin Qty",
            value: overallTotals.virginQty,
            tone: "text-sky-700 bg-sky-50 border-sky-100",
            icon: FaIndustry,
            digits: 3,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl border p-3 ${card.tone}`}>
              <div className="flex items-center gap-2">
                <Icon className="text-xs opacity-70" />
                <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {card.label}
                </div>
              </div>
              <div className="mt-1.5 text-xl font-bold">
                {renderAnimatedSummaryValue(card.value, {
                  digits: card.digits,
                  className: "text-xl font-bold",
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Map + State Details */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.8fr,1fr]">
        {/* India Map - Compact */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-emerald-600 text-sm" />
              <h3 className="text-sm font-semibold text-gray-800">Supplier Coverage Map</h3>
            </div>
            <Select
              value={selectedStateRecord?.stateName || "All States"}
              onChange={(value) => setSelectedSupplierState(value)}
              options={stateRows.map((row) => ({
                value: row.stateName,
                label: row.stateName,
              }))}
              size="small"
              className="w-40"
            />
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="text-[10px] font-medium text-gray-500">Low</span>
            <div className="flex h-2.5 flex-1 overflow-hidden rounded-full">
              <span className="flex-1 bg-[#86efac]"></span>
              <span className="flex-1 bg-[#22c55e]"></span>
              <span className="flex-1 bg-[#15803d]"></span>
              <span className="flex-1 bg-[#166534]"></span>
              <span className="flex-1 bg-[#14532d]"></span>
            </div>
            <span className="text-[10px] font-medium text-gray-500">High</span>
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-gray-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#f1f5f9] border border-gray-300"></span>
              No Data
            </span>
            {showPlantLocationMarkers && plantLocationMarkers.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-amber-600">
                <span className="relative inline-flex h-3 w-3 items-center justify-center">
                  <span className="absolute h-3 w-3 rounded-full bg-amber-500"></span>
                  <span
                    className="absolute h-2.5 w-2.5 rotate-45 rounded-[2px] bg-amber-500"
                    style={{ top: "4px" }}
                  ></span>
                  <span className="relative h-1.5 w-1.5 rounded-full bg-white"></span>
                </span>
                Plant Marker
              </span>
            )}
          </div>

          {/* Map SVG */}
          <div className="relative rounded-xl border border-gray-100 bg-gradient-to-br from-slate-50 to-white p-2">
            <svg
              ref={attachIndiaMapSvgRef}
              viewBox={indiaSvgMap.viewBox}
              className="block w-full"
              role="img"
              aria-label="India map"
              onMouseLeave={() => setHoveredStateMapDetails(null)}
            >
              {(indiaSvgMap.locations || []).map((loc) => {
                const matchingStateRow = stateRowByName.get(
                  normalizeStateName(loc?.name),
                );
                const isSelected =
                  normalizeStateName(selectedStateRecord?.stateName) ===
                  normalizeStateName(loc?.name);
                const hasData = Boolean(matchingStateRow);

                return (
                  <path
                    key={loc.id}
                    id={loc.id}
                    data-state-id={loc.id}
                    d={loc.path}
                    onMouseEnter={(event) =>
                      handleMapStateHover(event, loc?.name, matchingStateRow)
                    }
                    onMouseMove={(event) =>
                      handleMapStateHover(event, loc?.name, matchingStateRow)
                    }
                    onMouseLeave={() => setHoveredStateMapDetails(null)}
                    onClick={() => {
                      const matchingRow = stateRows.find(
                        (row) =>
                          normalizeStateName(row?.stateName) ===
                          normalizeStateName(loc?.name),
                      );
                      if (matchingRow) {
                        setSelectedSupplierState(matchingRow.stateName);
                      }
                    }}
                    style={{
                      cursor: hasData ? "pointer" : "default",
                      fill: getStateFillColor(matchingStateRow, isSelected),
                      stroke: isSelected ? "#14532d" : "#94a3b8",
                      strokeWidth: isSelected ? 2 : 0.8,
                      opacity: hasData ? 1 : 0.4,
                      transition:
                        "fill 180ms ease, stroke 180ms ease, stroke-width 180ms ease, opacity 180ms ease",
                    }}
                  />
                );
              })}
              {indiaMapLabels.map((label) => {
                const isSelected =
                  normalizeStateName(selectedStateRecord?.stateName) ===
                  normalizeStateName(label.name);
                const words = label.name.split(" ");
                const labelLines =
                  label.name.length <= 14
                    ? [label.name]
                    : words.length >= 2
                      ? [words[0], words.slice(1).join(" ")]
                      : [label.name.slice(0, 12), label.name.slice(12)];
                const lineHeight = labelLines.length > 1 ? 10 : 0;
                const maxLineLength = labelLines.reduce(
                  (max, line) => Math.max(max, line.length),
                  0,
                );
                const badgeWidth = Math.max(46, maxLineLength * 6.6 + 12);
                const badgeHeight = labelLines.length > 1 ? 24 + lineHeight : 22;
                const badgeX = label.x - badgeWidth / 2;
                const badgeY =
                  label.y - (labelLines.length > 1 ? badgeHeight / 2 : 11);

                return (
                  <g key={`label-${label.id}`} style={{ pointerEvents: "none" }}>
                    <rect
                      x={badgeX}
                      y={badgeY}
                      rx="6"
                      ry="6"
                      width={badgeWidth}
                      height={badgeHeight}
                      fill={
                        isSelected
                          ? "rgba(240, 253, 244, 0.98)"
                          : label.hasData
                            ? "rgba(255, 255, 255, 0.92)"
                            : "rgba(248, 250, 252, 0.75)"
                      }
                      stroke={
                        isSelected
                          ? "#16a34a"
                          : label.hasData
                            ? "#cbd5e1"
                            : "#e2e8f0"
                      }
                      strokeWidth="0.9"
                    />
                    <text
                      x={label.x}
                      y={label.y - (labelLines.length > 1 ? lineHeight / 2 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fill: isSelected
                          ? "#14532d"
                          : label.hasData
                            ? "#166534"
                            : "#64748b",
                        fontSize: labelLines.length > 1 ? 9 : 10,
                        fontWeight: isSelected ? 800 : 600,
                        opacity: isSelected || label.hasData ? 1 : 0.8,
                      }}
                    >
                      {labelLines.map((line, index) => (
                        <tspan
                          key={`${label.id}-${index}`}
                          x={label.x}
                          dy={index === 0 ? 0 : lineHeight}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
              {plantLocationMarkers.map((marker) => {
                const isSelected =
                  normalizeStateName(selectedStateRecord?.stateName) ===
                  normalizeStateName(marker.stateName);
                const isClientStateMarker = marker.sourceType === "client-state";
                const markerFill = isClientStateMarker
                  ? isSelected
                    ? "#15803d"
                    : "#22c55e"
                  : isSelected
                    ? "#ea580c"
                    : "#f59e0b";
                const markerStroke = isClientStateMarker ? "#ecfdf5" : "#fff7ed";

                return (
                  <g
                    key={`plant-marker-${marker.key}`}
                    transform={`translate(${marker.x} ${marker.y}) scale(${isSelected ? 1.08 : 1})`}
                    onMouseEnter={(event) =>
                      handleMapStateHover(event, marker.stateName, marker.stateRow)
                    }
                    onMouseMove={(event) =>
                      handleMapStateHover(event, marker.stateName, marker.stateRow)
                    }
                    onMouseLeave={() => setHoveredStateMapDetails(null)}
                    onClick={() => setSelectedSupplierState(marker.stateName)}
                    style={{ cursor: "pointer" }}
                    aria-label={`${marker.plantLocation || "Plant"} in ${marker.stateName}`}
                  >
                    <title>
                      {`${marker.plantLocation || "Plant Location"}${getPlantSecondaryLabel(marker, marker.stateName) ? ` - ${getPlantSecondaryLabel(marker, marker.stateName)}` : ""}`}
                    </title>
                    <path
                      d="M0 -7.5C-4.1 -7.5 -6.9 -4.7 -6.9 -1.2C-6.9 2.8 0 9 0 9C0 9 6.9 2.8 6.9 -1.2C6.9 -4.7 4.1 -7.5 0 -7.5Z"
                      fill={markerFill}
                      stroke={markerStroke}
                      strokeWidth="1.2"
                    />
                    <circle cx="0" cy="-1.7" r="2.15" fill="#ffffff" />
                  </g>
                );
              })}
            </svg>
            {/* Hover Tooltip */}
            {hoveredStateMapDetails && (
              <div
                className="pointer-events-none absolute z-20 rounded-lg border border-emerald-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm"
                style={{
                  width:
                    hoveredStateMapDetails.plantLocationCount > 0 ? 280 : 220,
                  left: hoveredStateMapDetails.x,
                  top: hoveredStateMapDetails.y,
                }}
              >
                <div className="text-xs font-bold text-gray-900">
                  {hoveredStateMapDetails.stateName}
                </div>
                {hoveredStateMapDetails.hasData ? (
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="rounded bg-slate-50 px-1.5 py-1">
                      <div className="text-gray-500">Suppliers</div>
                      <div className="font-bold text-slate-800">
                        {formatWithCommas(hoveredStateMapDetails.totalSuppliers, 0)}
                      </div>
                    </div>
                    <div className="rounded bg-slate-50 px-1.5 py-1">
                      <div className="text-gray-500">Total SKU</div>
                      <div className="font-bold text-slate-800">
                        {formatWithCommas(hoveredStateMapDetails.totalSku, 0)}
                      </div>
                    </div>
                    <div className="rounded bg-slate-50 px-1.5 py-1">
                      <div className="text-gray-500">Annual Purchase MT</div>
                      <div className="font-bold text-slate-800">
                        {formatWithCommas(hoveredStateMapDetails.annualPurchaseMt, 3)}
                      </div>
                    </div>
                    <div className="rounded bg-slate-50 px-1.5 py-1">
                      <div className="text-gray-500">Recycled Qty</div>
                      <div className="font-bold text-emerald-700">
                        {formatWithCommas(hoveredStateMapDetails.recycledQty, 3)}
                      </div>
                    </div>
                    <div className="rounded bg-slate-50 px-1.5 py-1">
                      <div className="text-gray-500">Virgin Qty</div>
                      <div className="font-bold text-blue-700">
                        {formatWithCommas(hoveredStateMapDetails.virginQty, 3)}
                      </div>
                    </div>
                    <div className="rounded bg-slate-50 px-1.5 py-1">
                      <div className="text-gray-500">Recycled Amount</div>
                      <div className="font-bold text-emerald-700">
                        {formatCurrency(hoveredStateMapDetails.recycledAmount, 3)}
                      </div>
                    </div>
                    <div className="col-span-2 rounded bg-slate-50 px-1.5 py-1">
                      <div className="text-gray-500">Virgin Amount</div>
                      <div className="font-bold text-blue-700">
                        {formatCurrency(hoveredStateMapDetails.virginAmount, 3)}
                      </div>
                    </div>
                    {showPlantLocationMarkers &&
                      hoveredStateMapDetails.plantLocationCount > 0 && (
                        <div className="col-span-2 rounded bg-amber-50 px-1.5 py-1.5">
                          <div className="flex items-center justify-between text-gray-600">
                            <span>Plant Locations</span>
                            <span className="font-semibold text-amber-700">
                              {formatWithCommas(
                                hoveredStateMapDetails.plantLocationCount,
                                0,
                              )}
                            </span>
                          </div>
                          <div className="mt-1.5 space-y-1">
                            {(hoveredStateMapDetails.plantLocations || []).map((plant) => (
                              <div
                                key={plant.key}
                                className="rounded border border-amber-100 bg-white/80 px-1.5 py-1"
                              >
                                <div className="flex items-start gap-1.5">
                                  <FaMapMarkerAlt className="mt-0.5 shrink-0 text-[10px] text-amber-600" />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-amber-700">
                                      {plant.plantLocation || "-"}
                                    </div>
                                    {getPlantSecondaryLabel(
                                      plant,
                                      hoveredStateMapDetails.stateName,
                                    ) && (
                                      <div className="truncate text-gray-700">
                                        {getPlantSecondaryLabel(
                                          plant,
                                          hoveredStateMapDetails.stateName,
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="mt-1 text-[10px] text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: State Details + Top States */}
        <div className="space-y-4">
          {/* Selected State Summary Card */}
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                  <FaMapMarkerAlt className="text-xs text-emerald-600" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    {selectedStateRecord?.stateName || "Select a State"}
                  </h4>
                  <p className="text-[10px] text-gray-500">Selected state details</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {formatWithCommas(selectedStateSupplierStatusCounts.registered, 0)} Reg
                </span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  {formatWithCommas(selectedStateSupplierStatusCounts.unregistered, 0)} Unreg
                </span>
                {showPlantLocationMarkers && selectedStatePlantLocations.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    {formatWithCommas(selectedStatePlantLocations.length, 0)} Plants
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Suppliers", selectedStateRecord?.totalSuppliers, 0, "text-indigo-700 bg-indigo-50"],
                ["SKU", selectedStateRecord?.totalSku, 0, "text-slate-700 bg-slate-50"],
                ["Annual MT", selectedStateRecord?.annualPurchaseMt, 3, "text-gray-800 bg-gray-50"],
                ["Recycled", selectedStateRecord?.recycledQty, 3, "text-emerald-700 bg-emerald-50"],
              ].map(([label, value, digits, tone]) => (
                <div key={label} className={`rounded-lg px-3 py-2 ${tone}`}>
                  <div className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                    {label}
                  </div>
                  <div className="mt-0.5 text-base font-bold">
                    {formatWithCommas(value, digits)}
                  </div>
                </div>
              ))}
            </div>

            {/* Suppliers in selected state */}
            {selectedStateSuppliers.length > 0 && (
              <div className="mt-3 max-h-32 overflow-auto rounded-lg border border-gray-100 bg-white p-2">
                <div className="space-y-1.5">
                  {selectedStateSuppliers.map((supplier, index) => (
                    <div
                      key={`supplier-${index}`}
                      className="flex items-center justify-between rounded-md bg-gray-50 px-2.5 py-1.5"
                    >
                      <span className="text-xs font-medium text-gray-800 truncate max-w-[60%]">
                        {supplier.supplierName}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          String(supplier.supplierStatus).toLowerCase().includes("registered") &&
                          !String(supplier.supplierStatus).toLowerCase().includes("unregistered")
                            ? "bg-emerald-100 text-emerald-700"
                            : String(supplier.supplierStatus).toLowerCase().includes("unregistered")
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {supplier.supplierStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showPlantLocationMarkers && selectedStatePlantLocations.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-900">
                      Plant Locations
                    </div>
                    <div className="text-[10px] text-gray-500">
                      One marker per plant location
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    {formatWithCommas(selectedStatePlantLocations.length, 0)}
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {selectedStatePlantLocations.map((plant) => (
                    <div
                      key={plant.key}
                      className="rounded-lg border border-amber-100 bg-white px-3 py-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
                          <FaMapMarkerAlt className="text-[11px] text-amber-700" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-amber-700">
                            {plant.plantLocation || "-"}
                          </div>
                          {getPlantSecondaryLabel(
                            plant,
                            selectedStateRecord?.stateName,
                          ) && (
                            <div className="mt-0.5 truncate text-xs font-semibold text-gray-900">
                              {getPlantSecondaryLabel(
                                plant,
                                selectedStateRecord?.stateName,
                              )}
                            </div>
                          )}
                          {plant.plantAddress && (
                            <div className="mt-0.5 line-clamp-2 text-[10px] text-gray-500">
                              {plant.plantAddress}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top States by Purchase - Horizontal Bar Chart Style */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Top States by Annual Purchase
            </h4>
            <div className="space-y-2">
              {topStateHighlights.map((stateRow, index) => {
                const pct = maxAnnualPurchaseMt > 0
                  ? (safeNumber(stateRow.annualPurchaseMt) / maxAnnualPurchaseMt) * 100
                  : 0;
                const isSelected = selectedStateRecord?.stateName === stateRow.stateName;

                return (
                  <button
                    key={stateRow.key}
                    type="button"
                    onClick={() => setSelectedSupplierState(stateRow.stateName)}
                    className={`w-full rounded-lg border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-50/80"
                        : "border-gray-100 bg-gray-50/50 hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                          {index + 1}
                        </span>
                        <span className="text-xs font-semibold text-gray-800">
                          {stateRow.stateName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span>{formatWithCommas(stateRow.totalSuppliers, 0)} suppliers</span>
                        <span className="font-semibold text-gray-800">
                          {formatWithCommas(stateRow.annualPurchaseMt, 3)} MT
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(4, pct)}%`,
                          background: `linear-gradient(90deg, #86efac, #15803d)`,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* State Heat Summary - Full Width */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">State Heat Summary</h3>
            <p className="mt-0.5 text-xs text-gray-500">Click a state card to view supplier details and metrics</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
            {stateRows.length} states
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stateRows.map((stateRow) => {
            const isSelected = selectedStateRecord?.stateName === stateRow.stateName;
            const pct = maxAnnualPurchaseMt > 0
              ? Math.round((safeNumber(stateRow.annualPurchaseMt) / maxAnnualPurchaseMt) * 100)
              : 0;

            return (
              <button
                key={stateRow.key}
                type="button"
                onClick={() => setSelectedSupplierState(stateRow.stateName)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-100 shadow-sm"
                    : "border-gray-200 hover:border-emerald-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">
                    {stateRow.stateName}
                  </span>
                  <span className={`text-sm font-bold ${pct >= 50 ? 'text-emerald-700' : 'text-gray-600'}`}>{pct}%</span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(4, pct)}%`,
                      background: pct >= 80 ? 'linear-gradient(90deg, #059669, #14532d)' :
                                 pct >= 50 ? 'linear-gradient(90deg, #10b981, #059669)' :
                                 pct >= 20 ? 'linear-gradient(90deg, #34d399, #10b981)' :
                                 '#86efac'
                    }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-[10px]">
                  <div>
                    <div className="text-gray-500">Total SKU</div>
                    <div className="font-bold text-gray-800">{formatWithCommas(stateRow.totalSku, 0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Annual Purchase MT</div>
                    <div className="font-bold text-gray-800">{formatWithCommas(stateRow.annualPurchaseMt, 3)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Recycled Qty</div>
                    <div className="font-bold text-emerald-700">{formatWithCommas(stateRow.recycledQty, 3)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Virgin Qty</div>
                    <div className="font-bold text-blue-700">{formatWithCommas(stateRow.virginQty, 3)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Recycled Amount</div>
                    <div className="font-bold text-emerald-700">{formatCurrency(stateRow.recycledAmount, 3)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Virgin Amount</div>
                    <div className="font-bold text-blue-700">{formatCurrency(stateRow.virginAmount, 3)}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                  <span>{formatWithCommas(stateRow.totalSuppliers, 0)} suppliers</span>
                  <span className="font-semibold text-gray-700">{formatWithCommas(stateRow.annualPurchaseMt, 1)} MT</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Supplier Details Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Supplier Details — {selectedStateRecord?.stateName || "All"}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {formatWithCommas(selectedStateRecord?.supplierRows?.length || 0, 0)} suppliers in selected state
            </p>
          </div>
        </div>
        <Table
          dataSource={selectedStateRecord?.supplierRows || []}
          columns={stateTableColumns}
          rowKey="key"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 1600 }}
          size="small"
          bordered
        />
      </div>
    </div>
  );
};

export default StateWiseSummarySection;
