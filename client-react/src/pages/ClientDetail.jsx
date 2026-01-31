import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import { FaChevronDown } from 'react-icons/fa';
import AuditStepper from '../components/AuditStepper';

import PlantProcess from './PlantProcess';

const ClientDetail = ({ clientId, embedded = false, initialViewMode, onAuditComplete }) => {
  const { id: paramId } = useParams();
  const id = clientId || paramId;
  const navigate = useNavigate();
  const location = useLocation();
  const isProcessMode = initialViewMode === 'process' || location.state?.viewMode === 'process';
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(isProcessMode ? 4 : 1);
  const [expandedSections, setExpandedSections] = useState({});

  // Embedded Audit Detail state
  const [embeddedAuditTarget, setEmbeddedAuditTarget] = useState(null); // { type, id }

  const toggleSection = (plantKey, section) => {
    const key = `${plantKey}-${section}`;
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePlantCard = (plantKey) => {
    const key = `${plantKey}-plant`;
    setExpandedSections(prev => {
      const current = prev[key];
      const currentValue = typeof current === 'boolean' ? current : true;
      return { ...prev, [key]: !currentValue };
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetchClientDetails(signal);

    return () => {
      controller.abort();
    };
  }, [id, location.key]); // Refetch when location key changes (navigation back)

  const fetchClientDetails = async (signal) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.CLIENT.GET_BY_ID(id)}?_=${Date.now()}`, { signal });
      if (response.data.success) {
        setClient(response.data.data);
      }
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return;
      setError(err.response?.data?.message || 'Failed to fetch client details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
            onClick={() => navigate('/dashboard/clients')}
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
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Client not found</h2>
          {!embedded && (
              <button
                onClick={() => navigate('/dashboard/clients')}
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
    { number: 1, title: 'Client Basic Info', description: 'Legal & Trade Details', icon: 'fas fa-user' },
    { number: 2, title: 'Company Address Details', description: 'Registered & Communication', icon: 'fas fa-map-marker-alt' },
    { number: 3, title: 'Company Documents', description: 'GST, PAN, CIN, etc.', icon: 'fas fa-id-card' },
    { number: 4, title: 'CTE & CTO/CCA Details', description: 'Consent Details', icon: 'fas fa-industry' }
  ];

  const tabs = isProcessMode ? allTabs.filter(t => t.number === 4) : allTabs;

  const resolveUrl = (p) => {
    if (!p) return '';
    const isAbs = p.startsWith('http://') || p.startsWith('https://');
    return isAbs ? p : `${api.defaults.baseURL}/${p}`;
  };

    if (embeddedAuditTarget) {
  return (
    <PlantProcess 
      clientId={id}
      type={embeddedAuditTarget.type}
      itemId={embeddedAuditTarget.id}
      onBack={() => {
        setEmbeddedAuditTarget(null);
        fetchClientDetails();
      }}
      onFinish={onAuditComplete}
    />
  );
}

  return (
    <div className={embedded ? "" : "p-6"}>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {!embedded && (
            <button
                onClick={() => navigate('/dashboard/clients')}
                className="group flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition-all hover:bg-primary-600 hover:text-white"
                title="Back to Clients"
            >
                <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1"></i>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.clientName}</h1>
            <p className="text-sm text-gray-500">Client Details</p>
            {(client.auditStartDate || client.auditEndDate) && (
              <p className="text-sm font-medium text-blue-600 mt-1">
                <i className="fas fa-calendar-alt mr-1"></i>
                Audit Period: {client.auditStartDate ? new Date(client.auditStartDate).toLocaleDateString() : 'N/A'} - {client.auditEndDate ? new Date(client.auditEndDate).toLocaleDateString() : 'N/A'}
              </p>
            )}
          </div>
        </div>
        {!embedded && (
        <div className="flex gap-3">
          {isProcessMode && (
            <button
              onClick={() => navigate(`/dashboard/client/${id}/edit`, { state: { activeTab: 'Pre - Validation', unlockAudit: true } })}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <i className="fas fa-clipboard-check"></i>
              Start Audit
            </button>
          )}
          <button
            onClick={() => navigate(`/dashboard/client/${id}/edit`)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <i className="fas fa-edit"></i>
            Edit
          </button>
        </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {tabs.length > 1 && (
          <div className="mb-8">
            <AuditStepper steps={tabs} currentStep={activeTab} onStepChange={setActiveTab} />
          </div>
        )}

        <div className="animate-fadeIn">
          {activeTab === 1 && (
            <div className="w-full mx-auto">
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    <i className="fas fa-list-alt text-primary-600"></i>
                    Overview
                  </span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                    <div className="flex">
                      <span className="w-48 text-gray-600 font-medium">Client Name:</span>
                      <span className="text-gray-900">{client.clientName}</span>
                    </div>
                    <div className="flex">
                      <span className="w-48 text-gray-600 font-medium">Trade Name:</span>
                      <span className="text-gray-900">{client.tradeName || 'N/A'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-48 text-gray-600 font-medium">Company Group Name:</span>
                      <span className="text-gray-900">{client.companyGroupName || 'N/A'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-48 text-gray-600 font-medium">Financial Year:</span>
                      <span className="text-gray-900">{client.financialYear || 'N/A'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-48 text-gray-600 font-medium">Entity Type:</span>
                      <span className="text-gray-900">{client.entityType}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 mt-6">
                    <div className="flex">
                      <span className="w-48 text-gray-600 font-medium">Assigned To:</span>
                      <span className="text-gray-900">{client.assignedTo?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-48 text-gray-600 font-medium">Assigned Email:</span>
                      <span className="text-gray-900">{client.assignedTo?.email || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Authorised Person Details */}
                  <div className="mt-8">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2 mb-4 text-primary-700">
                      Authorised Person Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Name:</span>
                        <span className="text-gray-900">{client.authorisedPerson?.name || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Contact Number:</span>
                        <span className="text-gray-900">{client.authorisedPerson?.number || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Email:</span>
                        <span className="text-gray-900">{client.authorisedPerson?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Coordinating Person Details */}
                  <div className="mt-8">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2 mb-4 text-primary-700">
                      Coordinating Person Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Name:</span>
                        <span className="text-gray-900">{client.coordinatingPerson?.name || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Contact Number:</span>
                        <span className="text-gray-900">{client.coordinatingPerson?.number || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-48 text-gray-600 font-medium">Email:</span>
                        <span className="text-gray-900">{client.coordinatingPerson?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="w-full mx-auto space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-primary-600"></i>
                    Company Address Details
                  </span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Registered Address</p>
                      <p className="text-gray-900">{client.companyDetails?.registeredAddress || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Communication Address</p>
                      <p className="text-gray-900">{client.notes || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="w-full mx-auto">
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="px-6 py-4 border-b bg-gray-50 rounded-t-xl">
                  <span className="font-semibold text-gray-700 flex items-center gap-2">
                    <i className="fas fa-file-shield text-primary-600"></i>
                    Company Documents
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  {(client.documents || [])
                    .filter(d => ['PAN', 'GST', 'CIN', 'Factory License', 'EPR Certificate'].includes(d.documentType))
                    .map((doc, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 border rounded-lg p-4">
                        <div className="flex items-center gap-4">
                          <i className="fas fa-file text-primary-600 text-xl"></i>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{doc.documentType}</p>
                            <p className="text-xs text-gray-600">
                              Number: {doc.certificateNumber || 'N/A'} • Date: {doc.certificateDate ? new Date(doc.certificateDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/client/${id}/document/${doc._id || i}`, { state: { doc } })}
                            className="px-3 py-1.5 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-eye text-xs"></i>
                            View
                          </button>
                          <a
                            href={resolveUrl(doc.filePath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-download text-xs"></i>
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  {(client.documents || []).filter(d => ['PAN', 'GST', 'CIN', 'Factory License', 'EPR Certificate', 'IEC Certificate', 'DIC/DCSSI Certificate'].includes(d.documentType)).length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-xl border">
                      <i className="fas fa-folder-open text-gray-300 text-4xl mb-3"></i>
                      <p className="text-gray-500 text-sm">No certificates uploaded</p>
                    </div>
                  )}
                </div>
                
                {/* MSME Details */}
                <div className="px-6 pb-6 border-t pt-6">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 text-primary-700">
                      MSME Details
                    </h4>
                    <div className="overflow-x-auto max-w-[calc(100vw-22rem)]">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="p-3 border-b text-sm font-semibold">Year</th>
                            <th className="p-3 border-b text-sm font-semibold">Status</th>
                            <th className="p-3 border-b text-sm font-semibold">Major Activity</th>
                            <th className="p-3 border-b text-sm font-semibold">Udyam Number</th>
                            <th className="p-3 border-b text-sm font-semibold">TurnOver (CR.)</th>
                            <th className="p-3 border-b text-sm font-semibold">Certificate</th>
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
                                    onClick={() => navigate('/dashboard/document-viewer', { state: { doc: { filePath: row.certificateFile, documentType: 'MSME Certificate', documentName: `MSME_${row.udyamNumber}` } } })}
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
                            <tr><td colSpan="6" className="p-6 text-center text-gray-400">No MSME details</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 4 && (
            <div className="w-full mx-auto space-y-8">
              {(() => {
                const plantGroups = {};
                const normalize = (name) => name ? name.trim().toLowerCase() : '';

                const processData = (list, keyName) => {
                    (list || []).forEach(item => {
                        const pName = item.plantName;
                        if (!pName) return;
                        const norm = normalize(pName);
                        if (!plantGroups[norm]) {
                            plantGroups[norm] = { 
                                displayName: pName,
                                cteDetails: [], 
                                ctoDetails: [], 
                                cteProd: [], 
                                ctoProds: [] 
                            };
                        }
                        plantGroups[norm][keyName].push(item);
                    });
                };

                processData(client.productionFacility?.cteDetailsList, 'cteDetails');
                processData(client.productionFacility?.ctoDetailsList, 'ctoDetails');
                processData(client.productionFacility?.cteProduction, 'cteProd');
                processData(client.productionFacility?.ctoProducts, 'ctoProds');

                const sortedGroups = Object.values(plantGroups).sort((a, b) => a.displayName.localeCompare(b.displayName));

                if (sortedGroups.length === 0) {
                    return (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="bg-gray-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                                <i className="fas fa-industry text-3xl text-gray-400"></i>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No Plant Details Found</h3>
                            <p className="text-gray-500 mt-1">There are no CTE or CTO/CCA details available for any plant.</p>
                        </div>
                    );
                }

                return sortedGroups.map((group, pIdx) => {
                    const { displayName: plantName, cteDetails, ctoDetails, cteProd, ctoProds } = group;
                    const plantKey = plantName || `plant-${pIdx}`;
                    const plantToggleKey = `${plantKey}-plant`;
                    const cteKey = `${plantKey}-cte`;
                    const ctoKey = `${plantKey}-cto`;
                    const prodKey = `${plantKey}-products`;
                    const isPlantExpanded = typeof expandedSections[plantToggleKey] === 'boolean' ? expandedSections[plantToggleKey] : true;
                    const isCteExpanded = !!expandedSections[cteKey];
                    const isCtoExpanded = !!expandedSections[ctoKey];
                    const isProdExpanded = !!expandedSections[prodKey];

                    // 2. Combine Consents
                    const combinedConsents = [
                        ...cteDetails.map(r => ({ ...r, type: 'CTE', _rawType: 'cte' })),
                        ...ctoDetails.map(r => ({ ...r, type: 'CTO', _rawType: 'cto' }))
                    ];

                    // 3. Combine Products
                    const combinedProducts = [
                        ...cteProd.map(r => ({ ...r, type: 'CTE', _rawType: 'cte', capacity: r.maxCapacityPerYear, capacityUnit: 'Capacity/Yr' })),
                        ...ctoProds.map(r => ({ ...r, type: 'CTO', _rawType: 'cto', capacity: r.quantity, capacityUnit: 'Quantity' }))
                    ];

                    // 4. Determine Audit Action (Single Button Logic)
                    // Priority: CTO > CTE (Assumption: Operations supersede Establishment)
                    // If CTO exists, use it. Else if CTE exists, use it.
                    let auditTarget = null;
                    let auditType = '';
                    
                    if (ctoDetails.length > 0) {
                        auditTarget = ctoDetails[0];
                        auditType = 'CTO';
                    } else if (cteDetails.length > 0) {
                        auditTarget = cteDetails[0];
                        auditType = 'CTE';
                    }

                    // Calculate Progress for the button
                    let buttonProgress = 0;
                    let buttonIsComplete = false;
                    
                    if (auditTarget) {
                        // Use completedSteps array length to calculate progress
                        const stepsCount = Array.isArray(auditTarget.completedSteps) ? auditTarget.completedSteps.length : 0;
                        // Total steps = 4 (Verification + Tab2 + Tab3 + Tab4)
                        buttonProgress = Math.min((stepsCount / 4) * 100, 100);
                        
                        // Audit is complete only if all 4 steps are done
                        buttonIsComplete = stepsCount >= 4;
                    }

                    const buttonContent = buttonIsComplete ? (
                        <><i className="fas fa-check-circle"></i> Audit Done</>
                    ) : (
                        <><i className="fas fa-clipboard-check"></i> {buttonProgress === 0 ? 'Start Audit' : `Resume (${Math.round(buttonProgress)}%)`}</>
                    );

                    return (
                        <div key={pIdx} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-8">
                            <div className="px-6 py-5 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={() => togglePlantCard(plantKey)}
                                    className="flex items-center gap-3 group"
                                    aria-expanded={isPlantExpanded}
                                >
                                    <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                                        <i className="fas fa-building text-xl"></i>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 text-left">{plantName}</h3>
                                            <p className="text-xs text-gray-500 text-left">Plant Unit</p>
                                        </div>
                                        <div className={`text-gray-500 transition-transform duration-300 ${isPlantExpanded ? 'rotate-180' : ''}`}>
                                            <FaChevronDown className="text-xs" />
                                        </div>
                                    </div>
                                </button>

                                {isProcessMode && auditTarget && (
                                    <button
                                        onClick={() => {
                                            if (embedded) {
                                                setEmbeddedAuditTarget({ type: auditType, id: auditTarget._id });
                                            } else {
                                                navigate(`/dashboard/client/${id}/process-plant/${auditType}/${auditTarget._id}`);
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
                                                opacity: buttonProgress === 0 ? 0 : 1
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
                                    <div className={`rounded-lg border transition-all duration-300 ${isCteExpanded ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-white'}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(plantKey, 'cte')}
                                            className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                                            aria-expanded={isCteExpanded}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-1 rounded-full ${isCteExpanded ? 'bg-blue-600' : 'bg-blue-500'}`}></div>
                                                <h4 className="text-sm md:text-base font-bold text-gray-800">CTE Details</h4>
                                            </div>
                                            <div className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${isCteExpanded ? 'rotate-180' : ''}`}>
                                                <FaChevronDown className="text-sm" />
                                            </div>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-300 ${isCteExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="px-4 pb-4 md:px-5 md:pb-5">
                                                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                                            <tr>
                                                                <th className="p-3 font-semibold border-b">Consent No</th>
                                                                <th className="p-3 font-semibold border-b">Dates</th>
                                                                <th className="p-3 font-semibold border-b">Location & Address</th>
                                                                <th className="p-3 font-semibold border-b">Key Personnel</th>
                                                                <th className="p-3 font-semibold border-b">Document</th>
                                                                <th className="p-3 font-semibold border-b text-center">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-sm divide-y divide-gray-100">
                                                            {cteDetails.map((r, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                    <td className="p-3 font-medium text-gray-900">
                                                                        {r.consentNo}
                                                                        {r.category && (
                                                                            <div className={`mt-1 text-[10px] inline-block px-1.5 py-0.5 rounded ${r.category === 'Red' ? 'bg-red-50 text-red-600' : r.category === 'Orange' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                                                                                {r.category}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 text-gray-600">
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-xs">Issued: {r.issuedDate ? new Date(r.issuedDate).toLocaleDateString() : '-'}</span>
                                                                            <span className="text-xs">Valid: {r.validUpto ? new Date(r.validUpto).toLocaleDateString() : '-'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 max-w-xs">
                                                                        <div className="font-medium text-gray-900 mb-1">{r.plantLocation}</div>
                                                                        <div className="text-xs text-gray-500 leading-relaxed line-clamp-2" title={r.plantAddress}>{r.plantAddress}</div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="flex flex-col gap-1">
                                                                            <div title={`Head: ${r.factoryHeadName}`}>
                                                                                <span className="text-xs font-bold text-gray-700">Hd:</span>
                                                                                <span className="text-xs text-gray-600 ml-1 truncate max-w-[100px] inline-block align-bottom">{r.factoryHeadName}</span>
                                                                            </div>
                                                                            <div title={`Contact: ${r.contactPersonName}`}>
                                                                                <span className="text-xs font-bold text-gray-700">Ct:</span>
                                                                                <span className="text-xs text-gray-600 ml-1 truncate max-w-[100px] inline-block align-bottom">{r.contactPersonName}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        {r.documentFile ? (
                                                                            <a href={resolveUrl(r.documentFile)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                                                                                <i className="fas fa-eye mr-1"></i> View
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs italic">No Doc</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        {r.verification?.status === 'Verified' ? (
                                                                            <div className="flex flex-col items-center">
                                                                                <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
                                                                                    <i className="fas fa-check-circle"></i> Verified
                                                                                </span>
                                                                                {r.verification?.verifiedBy && (
                                                                                    <span className="text-[10px] text-gray-500 mt-0.5">by {r.verification.verifiedBy.name || 'User'}</span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400 font-medium">Pending</span>
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
                                    <div className={`rounded-lg border transition-all duration-300 ${isCtoExpanded ? 'border-purple-200 bg-purple-50/40' : 'border-gray-200 bg-white'}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(plantKey, 'cto')}
                                            className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                                            aria-expanded={isCtoExpanded}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-1 rounded-full ${isCtoExpanded ? 'bg-purple-600' : 'bg-purple-500'}`}></div>
                                                <h4 className="text-sm md:text-base font-bold text-gray-800">CTO Details</h4>
                                            </div>
                                            <div className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${isCtoExpanded ? 'rotate-180' : ''}`}>
                                                <FaChevronDown className="text-sm" />
                                            </div>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-300 ${isCtoExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="px-4 pb-4 md:px-5 md:pb-5">
                                                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                                            <tr>
                                                                <th className="p-3 font-semibold border-b">Consent Order No</th>
                                                                <th className="p-3 font-semibold border-b">Dates</th>
                                                                <th className="p-3 font-semibold border-b">Location & Address</th>
                                                                <th className="p-3 font-semibold border-b">Key Personnel</th>
                                                                <th className="p-3 font-semibold border-b">Document</th>
                                                                <th className="p-3 font-semibold border-b text-center">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-sm divide-y divide-gray-100">
                                                            {ctoDetails.map((r, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                    <td className="p-3 font-medium text-gray-900">
                                                                        {r.consentOrderNo}
                                                                    </td>
                                                                    <td className="p-3 text-gray-600">
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-xs">Issued: {r.dateOfIssue ? new Date(r.dateOfIssue).toLocaleDateString() : '-'}</span>
                                                                            <span className="text-xs">Valid: {r.validUpto ? new Date(r.validUpto).toLocaleDateString() : '-'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 max-w-xs">
                                                                        <div className="font-medium text-gray-900 mb-1">{r.plantLocation}</div>
                                                                        <div className="text-xs text-gray-500 leading-relaxed line-clamp-2" title={r.plantAddress}>{r.plantAddress}</div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="flex flex-col gap-1">
                                                                            <div title={`Head: ${r.factoryHeadName}`}>
                                                                                <span className="text-xs font-bold text-gray-700">Hd:</span>
                                                                                <span className="text-xs text-gray-600 ml-1 truncate max-w-[100px] inline-block align-bottom">{r.factoryHeadName}</span>
                                                                            </div>
                                                                            <div title={`Contact: ${r.contactPersonName}`}>
                                                                                <span className="text-xs font-bold text-gray-700">Ct:</span>
                                                                                <span className="text-xs text-gray-600 ml-1 truncate max-w-[100px] inline-block align-bottom">{r.contactPersonName}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        {r.documentFile ? (
                                                                            <a href={resolveUrl(r.documentFile)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                                                                                <i className="fas fa-eye mr-1"></i> View
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs italic">No Doc</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        {r.verification?.status === 'Verified' ? (
                                                                            <div className="flex flex-col items-center">
                                                                                <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
                                                                                    <i className="fas fa-check-circle"></i> Verified
                                                                                </span>
                                                                                {r.verification?.verifiedBy && (
                                                                                    <span className="text-[10px] text-gray-500 mt-0.5">
                                                                                        by {r.verification.verifiedBy.name || 'User'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400 font-medium">Pending</span>
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
                                    <div className={`rounded-lg border transition-all duration-300 ${isProdExpanded ? 'border-blue-200 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(plantKey, 'products')}
                                            className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                                            aria-expanded={isProdExpanded}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-1 rounded-full bg-blue-400"></div>
                                                <h5 className="text-sm md:text-base font-bold text-gray-800">Plant Products & Capacity</h5>
                                            </div>
                                            <div className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${isProdExpanded ? 'rotate-180' : ''}`}>
                                                <FaChevronDown className="text-sm" />
                                            </div>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-300 ${isProdExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="px-4 pb-4 md:px-5 md:pb-5">
                                                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {combinedProducts.map((prod, idx) => (
                                                            <div key={idx} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center relative overflow-hidden">
                                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${prod.type === 'CTE' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                                                                <div className="pl-2">
                                                                    <p className="text-sm font-semibold text-gray-800">{prod.productName}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className={`text-[10px] px-1.5 rounded ${prod.type === 'CTE' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                                            {prod.type}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">Product</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-bold text-gray-700">{prod.capacity}</p>
                                                                    <p className="text-[10px] text-gray-400 uppercase">{prod.capacityUnit}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    );
                });
              })()}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ClientDetail;
