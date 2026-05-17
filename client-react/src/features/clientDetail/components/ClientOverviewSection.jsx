import React from "react";
import {
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaEnvelope,
  FaIdCard,
  FaIndustry,
  FaListAlt,
  FaMapMarkerAlt,
  FaPhone,
  FaUser,
  FaUserTie,
} from "react-icons/fa";
import GsapRevealGroup from "../../../components/GsapRevealGroup";
import { WASTE_THEME } from "../utils/wasteTheme";

const ClientOverviewSection = ({ client, id, initialViewMode }) => {
  const wasteType = client?.wasteType || "Plastic Waste";
  const theme = WASTE_THEME[wasteType] || WASTE_THEME["Plastic Waste"];
  const WasteIcon = theme.icon;
  const pf = client?.productionFacility || {};
  const regs = Array.isArray(pf.regulationsCoveredUnderCto)
    ? pf.regulationsCoveredUnderCto
    : [];
  const capacityRows = Array.isArray(pf.ctoProductionCapacityValidation)
    ? pf.ctoProductionCapacityValidation
    : [];
  const hasWater = regs.includes("Water");
  const waterRegs = Array.isArray(pf.waterRegulations) ? pf.waterRegulations : [];
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
              <p className="text-sm font-semibold text-gray-900">{person.name}</p>
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-1.5 w-full" style={{ backgroundColor: theme.color }} />
        <div className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${theme.color}, ${theme.color}bb)`,
              }}
            >
              {(client?.clientName || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  {client?.clientName}
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
              {client?.tradeName && (
                <p className="text-sm text-gray-500 mt-1">
                  Trade Name: {client.tradeName}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
                {client?.entityType && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <FaBuilding className="text-gray-400 text-xs" />
                    <span>{client.entityType}</span>
                  </div>
                )}
                {client?.companyGroupName && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <FaIndustry className="text-gray-400 text-xs" />
                    <span>{client.companyGroupName}</span>
                  </div>
                )}
                {client?.financialYear && (
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

      {client?.workflow && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">
                Lifecycle Progress
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Current stage: {client.workflow.currentStatus}
              </p>
            </div>
            {client.workflow.nextStatus && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Next: {client.workflow.nextStatus}
              </span>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {client.workflow.stages?.map((stage) => {
                const isCompleted = stage.state === "completed";
                const isCurrent = stage.state === "current";
                return (
                  <div
                    key={stage.status}
                    className={`rounded-xl border px-4 py-3 ${
                      isCurrent
                        ? "border-blue-200 bg-blue-50"
                        : isCompleted
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {stage.state}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {stage.status}
                    </p>
                  </div>
                );
              })}
            </div>
            {Array.isArray(client.workflow.blockers) &&
              client.workflow.blockers.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800">
                    Blocking Next Stage
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-900">
                    {client.workflow.blockers.map((blocker) => (
                      <li key={blocker}>- {blocker}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      )}

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
              value={client?.clientName}
              iconColor="text-primary-500"
            />
            <InfoItem icon={FaIdCard} label="Trade Name" value={client?.tradeName} />
            <InfoItem
              icon={FaIndustry}
              label="Company Group"
              value={client?.companyGroupName}
            />
            <InfoItem
              icon={FaListAlt}
              label="Company Type"
              value={client?.companyType}
            />
            <InfoItem
              icon={FaCalendarAlt}
              label="Financial Year"
              value={client?.financialYear}
            />
            <InfoItem
              icon={FaCheckCircle}
              label="Entity Type"
              value={client?.entityType}
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
                value={client?.assignedTo?.name || "Unassigned"}
                iconColor="text-blue-500"
              />
              <InfoItem
                icon={FaEnvelope}
                label="Assigned Email"
                value={client?.assignedTo?.email}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PersonCard
          title="Authorised Person"
          person={client?.authorisedPerson}
          icon={FaUser}
        />
        <PersonCard
          title="Coordinating Person"
          person={client?.coordinatingPerson}
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
                      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
                        {waterRegs.length ? waterRegs.join(", ") : "N/A"}
                      </div>
                    </div>
                  )}
                  {hasAir && (
                    <div>
                      <div className="text-sm font-bold text-gray-700 mb-2">
                        Air
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
                        {airRegs.length ? airRegs.join(", ") : "N/A"}
                      </div>
                    </div>
                  )}
                  {hasHazardousWaste && (
                    <div>
                      <div className="text-sm font-bold text-gray-700 mb-2">
                        Hazardous Waste
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
                        {hazardousRegs.length ? hazardousRegs.join(", ") : "N/A"}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
    </GsapRevealGroup>
  );
};

export default ClientOverviewSection;

