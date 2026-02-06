import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';
import { 
    FaClipboardCheck, 
    FaCheckCircle, 
    FaTimesCircle, 
    FaFileUpload, 
    FaBuilding, 
    FaBoxOpen,
    FaArrowLeft,
    FaIndustry,
    FaPhone,
    FaEnvelope,
    FaUser,
    FaFileAlt,
    FaArrowRight,
    FaEdit,
    FaEye,
    FaChevronDown
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import ProductComplianceStep from '../components/ProductComplianceStep';

// New Consent Verification Row Component matching the image
const ConsentVerificationRow = ({ item, type, onVerify, isSubmitting, resolveUrl }) => {
    const [localRemark, setLocalRemark] = useState(item.verification?.remark || '');
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState(item.verification?.status || 'Pending');

    const handleVerify = (newStatus) => {
        setStatus(newStatus);
        onVerify(newStatus, localRemark, file);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
            {/* Header Line */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${type === 'CTE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {type}
                    </span>
                    <span className="text-gray-500 text-xs font-bold uppercase">Consent No</span>
                    <h4 className="font-bold text-gray-800 text-lg">{item.consentNo || item.consentOrderNo}</h4>
                </div>
                {status === 'Verified' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                        <FaCheckCircle /> Verified
                    </span>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Panel: Details */}
                <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Valid Upto</p>
                            <p className="font-semibold text-gray-700">{item.validUpto ? new Date(item.validUpto).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Issue Date</p>
                            <p className="font-semibold text-gray-700">{item.issuedDate ? new Date(item.issuedDate).toLocaleDateString() : (item.dateOfIssue ? new Date(item.dateOfIssue).toLocaleDateString() : '-')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Category</p>
                            <p className="font-semibold text-gray-700">{item.category || '-'}</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <FaFileAlt className="text-blue-500" />
                            <div>
                                <p className="text-xs font-bold text-blue-700">User Document</p>
                                <p className="text-xs text-blue-500">{item.documentFile ? 'Uploaded File' : 'No file uploaded'}</p>
                            </div>
                        </div>
                        {item.documentFile && (
                            <a 
                                href={resolveUrl(item.documentFile)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-white text-blue-600 text-xs font-bold rounded border border-blue-200 hover:bg-blue-50"
                            >
                                View
                            </a>
                        )}
                    </div>
                </div>

                {/* Right Panel: Verification Action */}
                <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h5 className="font-bold text-gray-700 text-sm uppercase">Verification Action</h5>
                        {/* Reset icon if needed */}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Verification Proof</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="file" 
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                />
                                {item.verification?.proofDoc && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                        <FaCheckCircle /> Proof Uploaded
                                    </span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                            <div className="relative">
                                <textarea 
                                    value={localRemark}
                                    onChange={(e) => setLocalRemark(e.target.value)}
                                    className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder={status === 'Rejected' ? "Enter reason for rejection..." : "Enter remarks..."}
                                    rows="2"
                                />
                                <FaEdit className="absolute right-2 bottom-2 text-gray-400 text-xs" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => handleVerify('Verified')}
                                disabled={isSubmitting}
                                className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                                    status === 'Verified' 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                            >
                                <FaCheckCircle /> Verify
                            </button>
                            <button 
                                onClick={() => handleVerify('Rejected')}
                                disabled={isSubmitting}
                                className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                                    status === 'Rejected'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                                }`}
                            >
                                <FaTimesCircle /> Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Generic Card for other items (Production/Compliance) - kept for Step 2
const VerificationCard = ({ title, subtitle, status, remark, onVerify, isSubmitting }) => {
    const [localRemark, setLocalRemark] = useState(remark || '');
    const [file, setFile] = useState(null);
    const [showActions, setShowActions] = useState(false);

    const handleAction = (newStatus) => {
        onVerify(newStatus, localRemark, file);
        setShowActions(false);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-gray-800">{title}</h4>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                    {status !== 'Pending' && (
                         <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {status === 'Verified' ? <FaCheckCircle /> : <FaTimesCircle />} {status}
                        </span>
                    )}
                </div>
                <button 
                    onClick={() => setShowActions(!showActions)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                >
                    {showActions ? 'Cancel' : 'Verify'}
                </button>
            </div>

            {showActions && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Proof Document</label>
                            <input 
                                type="file" 
                                onChange={(e) => setFile(e.target.files[0])}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                            <textarea 
                                value={localRemark}
                                onChange={(e) => setLocalRemark(e.target.value)}
                                className="w-full text-sm p-2 border border-gray-300 rounded"
                                placeholder="Enter remarks..."
                                rows="2"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleAction('Verified')}
                                disabled={isSubmitting}
                                className="flex-1 bg-green-600 text-white py-2 rounded text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                            >
                                Verify
                            </button>
                            <button 
                                onClick={() => handleAction('Rejected')}
                                disabled={isSubmitting}
                                className="flex-1 bg-red-100 text-red-600 py-2 rounded text-sm font-bold hover:bg-red-200 disabled:opacity-50"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ClientAudit = () => {
    // viewState: 'clientList' | 'plantList' | 'verification'
    const [viewState, setViewState] = useState('clientList');
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientData, setClientData] = useState(null);
    const [selectedPlant, setSelectedPlant] = useState(null); // Contains the grouped plant data
    const [loading, setLoading] = useState(false);
    const [verifiedClients, setVerifiedClients] = useState([]);

    // Fetch verified clients on mount
    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const fetchVerifiedClients = async () => {
            setLoading(true);
            try {
                const response = await api.get(API_ENDPOINTS.CLIENT.GET_ALL, {
                    params: { validationStatus: 'Verified' },
                    signal
                });
                if (response.data.success) {
                    setVerifiedClients(response.data.data || []);
                }
            } catch (err) {
                if (err.code === 'ERR_CANCELED') return;
                console.error("Failed to fetch clients", err);
                toast.error("Failed to fetch verified clients");
            } finally {
                setLoading(false);
            }
        };

        if (viewState === 'clientList') {
            fetchVerifiedClients();
        }

        return () => {
            controller.abort();
        };
    }, [viewState]);

    const [isAuditStarted, setIsAuditStarted] = useState(false);
    const [activeTab, setActiveTab] = useState('verification'); // 'verification' | 'compliance'
    const [verificationStep, setVerificationStep] = useState(1);
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (plantKey, section) => {
        const key = `${plantKey}-${section}`;
        setExpandedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Helper to process plant groups (copied/adapted from ClientDetail)
    // Moved up to be accessible in handleClientSelect
    const getPlantGroupsForData = (data) => {
        if (!data) return [];
        const plantGroups = {};
        const normalize = (name) => name ? name.trim().toLowerCase() : '';

        const processData = (list, keyName) => {
            (list || []).forEach((item, originalIndex) => {
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
                // Store original index for updates
                plantGroups[norm][keyName].push({ ...item, originalIndex });
            });
        };

        processData(data.productionFacility?.cteDetailsList, 'cteDetails');
        processData(data.productionFacility?.ctoDetailsList, 'ctoDetails');
        processData(data.productionFacility?.cteProduction, 'cteProd');
        processData(data.productionFacility?.ctoProducts, 'ctoProds');

        return Object.values(plantGroups).sort((a, b) => a.displayName.localeCompare(b.displayName));
    };

    const handleClientSelect = async (client) => {
        setLoading(true);
        try {
            const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(client._id));
            if (response.data.success) {
                const data = response.data.data;
                setClientData(data);
                setSelectedClient(client);
                
                // Auto-select plant if possible or requested
                const groups = getPlantGroupsForData(data);
                if (groups.length > 0) {
                    // "one Plant" - select the first/only one and go directly to verification
                    const firstGroup = groups[0];
                    setSelectedPlant(firstGroup);
                    
                    // Update audit status if needed
                    if (data.clientStatus !== 'AUDIT') {
                        try {
                            await api.put(API_ENDPOINTS.CLIENT.UPDATE(data._id), { clientStatus: 'AUDIT' });
                            data.clientStatus = 'AUDIT'; // Optimistic update
                        } catch (e) {
                            console.error("Status update failed", e);
                        }
                    }
                    setIsAuditStarted(true);
                    setViewState('verification');
                    setActiveTab('verification');
                } else {
                    // Fallback if no plants found, though user said "one Plant"
                    setViewState('plantList');
                }
            }
        } catch (err) {
            toast.error("Failed to fetch client details");
        } finally {
            setLoading(false);
        }
    };

    const refreshClientData = async () => {
        if (!selectedClient) return;
        try {
            const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(selectedClient._id));
            if (response.data.success) {
                setClientData(response.data.data);
            }
        } catch (err) {
            console.error("Failed to refresh data", err);
        }
    };

    const handleStartPlantAudit = async (plantGroup) => {
        setSelectedPlant(plantGroup);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Ensure audit status is set on the client if not already
        if (clientData && clientData.clientStatus !== 'AUDIT') {
             try {
                await api.put(API_ENDPOINTS.CLIENT.UPDATE(clientData._id), { clientStatus: 'AUDIT' });
                setIsAuditStarted(true);
                // Update local data
                setClientData(prev => ({ ...prev, clientStatus: 'AUDIT' }));
             } catch (err) {
                 console.error("Failed to update status", err);
                 toast.error("Could not update client status, but continuing...");
             }
        } else {
            setIsAuditStarted(true);
        }
        setViewState('verification');
        setActiveTab('verification');
        setVerificationStep(1);
    };

    const handleBack = () => {
        if (viewState === 'verification') {
            setViewState('plantList');
            setSelectedPlant(null);
        } else if (viewState === 'plantList') {
            setViewState('clientList');
            setClientData(null);
            setSelectedClient(null);
        }
    };

    const handleUpdate = async (path, index, status, remark, file) => {
        if (!clientData) return;
        try {
            if (file) {
                const formData = new FormData();
                formData.append('document', file);
                formData.append('documentType', 'Verification Proof');
                await api.post(API_ENDPOINTS.CLIENT.UPLOAD_DOC(clientData._id), formData);
            }

            const updatePath = `productionFacility.${path}.${index}.verification`;
            const payload = {
                [`${updatePath}.status`]: status,
                [`${updatePath}.remark`]: remark,
                [`${updatePath}.verifiedAt`]: new Date(),
                [`${updatePath}.verifiedBy`]: 'Auditor'
            };

            await api.put(API_ENDPOINTS.CLIENT.UPDATE(clientData._id), payload);
            toast.success("Status updated");
            
            // Refetch to keep data fresh
            const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(clientData._id));
            if (response.data.success) {
                setClientData(response.data.data);
                // Update selectedPlant with new data
                // We need to re-find the plant group. 
                // Since selectedPlant is a derived object, we should probably re-derive it or just rely on re-render if we generated it in render.
                // But we stored it in state. Let's rely on re-rendering the Plant List logic to get fresh data, 
                // but for Verification view we are using 'selectedPlant'.
                // Better approach: Don't store 'selectedPlant' object in state, store 'selectedPlantName' and derive it.
            }
        } catch (err) {
            toast.error("Update failed");
        }
    };

    // Helper to process plant groups (copied/adapted from ClientDetail)
    const getPlantGroups = () => {
        if (!clientData) return [];
        const plantGroups = {};
        const normalize = (name) => name ? name.trim().toLowerCase() : '';

        const processData = (list, keyName) => {
            (list || []).forEach((item, originalIndex) => {
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
                // Store original index for updates
                plantGroups[norm][keyName].push({ ...item, originalIndex });
            });
        };

        processData(clientData.productionFacility?.cteDetailsList, 'cteDetails');
        processData(clientData.productionFacility?.ctoDetailsList, 'ctoDetails');
        processData(clientData.productionFacility?.cteProduction, 'cteProd');
        processData(clientData.productionFacility?.ctoProducts, 'ctoProds');

        return Object.values(plantGroups).sort((a, b) => a.displayName.localeCompare(b.displayName));
    };

    // Current active plant group data (derived)
    const activePlantGroup = selectedPlant && clientData ? getPlantGroups().find(g => g.displayName === selectedPlant.displayName) : null;

    // Helper to resolve URL
    const resolveUrl = (p) => {
        if (!p) return '';
        const isAbs = p.startsWith('http://') || p.startsWith('https://');
        return isAbs ? p : `${api.defaults.baseURL}/${p}`;
    };

    if (loading) return <div className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Loading...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
            {/* Header / Back Button */}
            {viewState !== 'clientList' && (
                <div className="p-4 border-b border-gray-100 flex items-center gap-4">
                    <button 
                        onClick={handleBack}
                        className="text-gray-500 hover:text-gray-700 flex items-center gap-2 font-medium"
                    >
                        <FaArrowLeft /> Back
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">
                            {viewState === 'plantList' ? `Plants - ${clientData?.clientName}` : `Audit: ${activePlantGroup?.displayName}`}
                        </h2>
                    </div>
                </div>
            )}

            <div className="p-6">
                {viewState === 'clientList' && (
                    <div className="animate-fadeIn">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Ready for Audit</h2>
                            <p className="text-gray-500 text-sm">Select a pre-validated client to begin audit</p>
                        </div>
                        
                        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse bg-white">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Client Name</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Group Name</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Status</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {verifiedClients.length > 0 ? (
                                        verifiedClients.map(client => (
                                            <tr key={client._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-medium text-gray-800">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                                                            {client.clientName.charAt(0)}
                                                        </div>
                                                        {client.clientName}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-600">{client.companyGroupName || '-'}</td>
                                                <td className="p-4">
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100 flex w-fit items-center gap-1">
                                                        <FaCheckCircle className="text-[10px]" /> Verified
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleClientSelect(client)}
                                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
                                                    >
                                                        Start Audit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="p-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                        <FaClipboardCheck className="text-2xl text-gray-300" />
                                                    </div>
                                                    <p className="font-medium text-gray-600">No verified clients found</p>
                                                    <p className="text-sm mt-1">Complete pre-validation for clients to see them here.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {viewState === 'plantList' && (
                    <div className="animate-fadeIn space-y-6">
                        {getPlantGroups().length === 0 ? (
                             <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="bg-white rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <FaIndustry className="text-2xl text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No Plant Details Found</h3>
                                <p className="text-gray-500 mt-1">This client has no plant data recorded.</p>
                            </div>
                        ) : (
                            getPlantGroups().map((group, idx) => {
                                const { displayName: plantName, cteDetails, ctoDetails, cteProd, ctoProds } = group;
                                const plantKey = plantName || `plant-${idx}`;
                                const cteKey = `${plantKey}-cte`;
                                const ctoKey = `${plantKey}-cto`;
                                const prodKey = `${plantKey}-products`;
                                const isCteExpanded = !!expandedSections[cteKey];
                                const isCtoExpanded = !!expandedSections[ctoKey];
                                const isProdExpanded = !!expandedSections[prodKey];

                                // Combine Products
                                const combinedProducts = [
                                    ...cteProd.map(r => ({ ...r, type: 'CTE', _rawType: 'cte', capacity: r.maxCapacityPerYear, capacityUnit: r.unit || 'MT/Year' })),
                                    ...ctoProds.map(r => ({ ...r, type: 'CTO', _rawType: 'cto', capacity: r.quantity, capacityUnit: r.unit || 'MT' }))
                                ];

                                // Audit Button Logic
                                let auditTarget = null;
                                if (ctoDetails.length > 0) auditTarget = ctoDetails[0];
                                else if (cteDetails.length > 0) auditTarget = cteDetails[0];

                                let buttonProgress = 0;
                                let buttonIsComplete = false;
                                if (auditTarget) {
                                    const stepsCount = Array.isArray(auditTarget.completedSteps) ? auditTarget.completedSteps.length : 0;
                                    buttonProgress = Math.min((stepsCount / 4) * 100, 100);
                                    buttonIsComplete = stepsCount >= 4;
                                }

                                const buttonContent = buttonIsComplete ? (
                                    <><FaCheckCircle /> Audit Done</>
                                ) : (
                                    <><FaClipboardCheck /> {buttonProgress === 0 ? 'Start Audit' : `Resume (${Math.round(buttonProgress)}%)`}</>
                                );

                                return (
                                    <div key={idx} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-8">
                                        {/* Plant Header */}
                                        <div className="px-6 py-5 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                                                    <FaBuilding className="text-xl" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-900">{plantName}</h3>
                                                    <p className="text-xs text-gray-500">Plant Unit</p>
                                                </div>
                                            </div>

                                            {/* Start Audit Button */}
                                            <button
                                                onClick={() => handleStartPlantAudit(group)}
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
                                        </div>

                                        <div className="p-6 space-y-8">
                                            {cteDetails.length > 0 && (
                                                <div
                                                    className={`rounded-lg border transition-all duration-300 ${
                                                        isCteExpanded ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-white'
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSection(plantKey, 'cte')}
                                                        className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                                                        aria-expanded={isCteExpanded}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-8 w-1 rounded-full ${isCteExpanded ? 'bg-blue-600' : 'bg-blue-500'}`}></div>
                                                            <h4 className="text-sm md:text-base font-bold text-gray-800">
                                                                CTE Details
                                                            </h4>
                                                        </div>
                                                        <div
                                                            className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${
                                                                isCteExpanded ? 'rotate-180' : ''
                                                            }`}
                                                        >
                                                            <FaChevronDown className="text-sm" />
                                                        </div>
                                                    </button>
                                                    <div
                                                        className={`overflow-hidden transition-all duration-300 ${
                                                            isCteExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                                                        }`}
                                                    >
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
                                                                        {cteDetails.map((r, i) => (
                                                                            <tr key={i} className="hover:bg-gray-50">
                                                                                <td className="p-3 font-medium text-gray-900">
                                                                                    {r.consentNo}
                                                                                    {r.category && (
                                                                                        <div
                                                                                            className={`mt-1 text-[10px] inline-block px-1.5 py-0.5 rounded ${
                                                                                                r.category === 'Red'
                                                                                                    ? 'bg-red-50 text-red-600'
                                                                                                    : r.category === 'Orange'
                                                                                                        ? 'bg-orange-50 text-orange-600'
                                                                                                        : 'bg-green-50 text-green-600'
                                                                                            }`}
                                                                                        >
                                                                                            {r.category}
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3 text-gray-600">
                                                                                    <div className="flex flex-col gap-1">
                                                                                        <span className="text-xs">
                                                                                            Issued:{' '}
                                                                                            {r.issuedDate ? new Date(r.issuedDate).toLocaleDateString() : '-'}
                                                                                        </span>
                                                                                        <span className="text-xs">
                                                                                            Valid:{' '}
                                                                                            {r.validUpto ? new Date(r.validUpto).toLocaleDateString() : '-'}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-3 max-w-xs">
                                                                                    <div className="font-medium text-gray-900 mb-1">{r.plantLocation}</div>
                                                                                    <div
                                                                                        className="text-xs text-gray-500 leading-relaxed line-clamp-2"
                                                                                        title={r.plantAddress}
                                                                                    >
                                                                                        {r.plantAddress}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    <div className="flex flex-col gap-1">
                                                                                        <div title={`Head: ${r.factoryHeadName}`}>
                                                                                            <span className="text-xs font-bold text-gray-700">Hd:</span>
                                                                                            <span className="text-xs text-gray-600 ml-1 truncate max-w-[100px] inline-block align-bottom">
                                                                                                {r.factoryHeadName}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div title={`Contact: ${r.contactPersonName}`}>
                                                                                            <span className="text-xs font-bold text-gray-700">Ct:</span>
                                                                                            <span className="text-xs text-gray-600 ml-1 truncate max-w-[100px] inline-block align-bottom">
                                                                                                {r.contactPersonName}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {r.documentFile ? (
                                                                                        <a
                                                                                            href={resolveUrl(r.documentFile)}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                                                                        >
                                                                                            <FaFileUpload className="mr-1" /> View
                                                                                        </a>
                                                                                    ) : (
                                                                                        <span className="text-gray-400 text-xs italic">No Doc</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3 text-center">
                                                                                    {r.verification?.status === 'Verified' ? (
                                                                                        <div className="flex flex-col items-center">
                                                                                            <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
                                                                                                <FaCheckCircle /> Verified
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

                                            {ctoDetails.length > 0 && (
                                                <div
                                                    className={`rounded-lg border transition-all duration-300 ${
                                                        isCtoExpanded ? 'border-purple-200 bg-purple-50/40' : 'border-gray-200 bg-white'
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSection(plantKey, 'cto')}
                                                        className="w-full flex items-center justify-between px-4 py-3 md:px-5 md:py-3"
                                                        aria-expanded={isCtoExpanded}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-8 w-1 rounded-full ${isCtoExpanded ? 'bg-purple-600' : 'bg-purple-500'}`}></div>
                                                            <h4 className="text-sm md:text-base font-bold text-gray-800">
                                                                CTO Details
                                                            </h4>
                                                        </div>
                                                        <div
                                                            className={`ml-4 flex items-center justify-center text-gray-500 transition-transform duration-300 ${
                                                                isCtoExpanded ? 'rotate-180' : ''
                                                            }`}
                                                        >
                                                            <FaChevronDown className="text-sm" />
                                                        </div>
                                                    </button>
                                                    <div
                                                        className={`overflow-hidden transition-all duration-300 ${
                                                            isCtoExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                                                        }`}
                                                    >
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
                                                                        {ctoDetails.map((r, i) => (
                                                                            <tr key={i} className="hover:bg-gray-50">
                                                                                <td className="p-3 font-medium text-gray-900">{r.consentOrderNo}</td>
                                                                                <td className="p-3 text-gray-600">
                                                                                    <div className="flex flex-col gap-1">
                                                                                        <span className="text-xs">
                                                                                            Issued:{' '}
                                                                                            {r.dateOfIssue ? new Date(r.dateOfIssue).toLocaleDateString() : '-'}
                                                                                        </span>
                                                                                        <span className="text-xs">
                                                                                            Valid:{' '}
                                                                                            {r.validUpto ? new Date(r.validUpto).toLocaleDateString() : '-'}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-3 max-w-xs">
                                                                                    <div className="font-medium text-gray-900 mb-1">{r.plantLocation}</div>
                                                                                    <div
                                                                                        className="text-xs text-gray-500 leading-relaxed line-clamp-2"
                                                                                        title={r.plantAddress}
                                                                                    >
                                                                                        {r.plantAddress}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    <div className="flex flex-col gap-1">
                                                                                        <div title={`Head: ${r.factoryHeadName}`}>
                                                                                            <span className="text-xs font-bold text-gray-700">Hd:</span>
                                                                                            <span className="text-xs text-gray-600 ml-1 truncate max-w-[100px] inline-block align-bottom">
                                                                                                {r.factoryHeadName}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div title={`Contact: ${r.contactPersonName}`}>
                                                                                            <span className="text-xs font-bold text-gray-700">Ct:</span>
                                                                                            <span className="text-xs text-gray-600 ml-1 truncate max-w-[100px] inline-block align-bottom">
                                                                                                {r.contactPersonName}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {r.documentFile ? (
                                                                                        <a
                                                                                            href={resolveUrl(r.documentFile)}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                                                                        >
                                                                                            <FaFileUpload className="mr-1" /> View
                                                                                        </a>
                                                                                    ) : (
                                                                                        <span className="text-gray-400 text-xs italic">No Doc</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3 text-center">
                                                                                    {r.verification?.status === 'Verified' ? (
                                                                                        <div className="flex flex-col items-center">
                                                                                            <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1">
                                                                                                <FaCheckCircle /> Verified
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
                                                <div
                                                    className={`rounded-lg border transition-all duration-300 ${
                                                        isProdExpanded ? 'border-blue-200 bg-gray-50' : 'border-gray-200 bg-white'
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSection(plantKey, 'products')}
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
                                                                isProdExpanded ? 'rotate-180' : ''
                                                            }`}
                                                        >
                                                            <FaChevronDown className="text-sm" />
                                                        </div>
                                                    </button>
                                                    <div
                                                        className={`overflow-hidden transition-all duration-300 ${
                                                            isProdExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                                                        }`}
                                                    >
                                                        <div className="px-4 pb-4 md:px-5 md:pb-5">
                                                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                    {combinedProducts.map((prod, pIdx) => (
                                                                        <div
                                                                            key={pIdx}
                                                                            className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center relative overflow-hidden"
                                                                        >
                                                                            <div
                                                                                className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                                                    prod.type === 'CTE' ? 'bg-blue-400' : 'bg-purple-400'
                                                                                }`}
                                                                            ></div>
                                                                            <div className="pl-2">
                                                                                <p className="text-sm font-semibold text-gray-800">{prod.productName}</p>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    <span
                                                                                        className={`text-[10px] px-1.5 rounded ${
                                                                                            prod.type === 'CTE'
                                                                                                ? 'bg-blue-50 text-blue-600'
                                                                                                : 'bg-purple-50 text-purple-600'
                                                                                        }`}
                                                                                    >
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
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {viewState === 'verification' && activePlantGroup && (
                    <div className="animate-fadeIn space-y-8">
                                {/* Plant & Contact Information */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Plant Information */}
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <FaIndustry className="text-orange-500" /> Plant Information
                                        </h3>
                                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase">Plant Name</p>
                                                <p className="font-semibold text-gray-800 text-lg">{activePlantGroup.displayName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase">Location</p>
                                                <p className="font-medium text-gray-700 flex items-center gap-2">
                                                    {activePlantGroup.cteDetails[0]?.plantLocation || activePlantGroup.ctoDetails[0]?.plantLocation || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase">Address</p>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    {activePlantGroup.cteDetails[0]?.plantAddress || activePlantGroup.ctoDetails[0]?.plantAddress || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Details */}
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <FaPhone className="text-orange-500" /> Contact Details
                                        </h3>
                                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Factory Head</p>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-gray-800">{activePlantGroup.cteDetails[0]?.factoryHeadName || '-'}</p>
                                                    <p className="text-xs text-gray-500">Manager</p>
                                                    <div className="pt-2 space-y-1">
                                                        <p className="text-xs flex items-center gap-2 text-gray-600"><FaPhone className="text-[10px]" /> {activePlantGroup.cteDetails[0]?.factoryHeadMobileNo || '-'}</p>
                                                        <p className="text-xs flex items-center gap-2 text-gray-600"><FaEnvelope className="text-[10px]" /> {activePlantGroup.cteDetails[0]?.factoryHeadEmailId || '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Contact Person</p>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-gray-800">{activePlantGroup.cteDetails[0]?.contactPersonName || '-'}</p>
                                                    <p className="text-xs text-gray-500">Executive</p>
                                                    <div className="pt-2 space-y-1">
                                                        <p className="text-xs flex items-center gap-2 text-gray-600"><FaPhone className="text-[10px]" /> {activePlantGroup.cteDetails[0]?.contactPersonMobileNo || '-'}</p>
                                                        <p className="text-xs flex items-center gap-2 text-gray-600"><FaEnvelope className="text-[10px]" /> {activePlantGroup.cteDetails[0]?.contactPersonEmailId || '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs Navigation */}
                                <div className="flex border-b border-gray-200 bg-white mb-6 sticky top-0 z-10">
                                    <button
                                        onClick={() => setActiveTab('verification')}
                                        className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                                            activeTab === 'verification'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <FaClipboardCheck /> Verification
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('compliance')}
                                        className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                                            activeTab === 'compliance'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <FaBoxOpen /> Product Compliance
                                    </button>
                                </div>

                                {activeTab === 'verification' && (
                                    <div className="animate-fadeIn">
                                        {(() => {
                                            const plantDetails = activePlantGroup.cteDetails[0] || activePlantGroup.ctoDetails[0] || {};
                                            return (
                                                <>
                                        {/* Stepper Navigation */}
                                        <div className="relative mb-8 px-4">
                                            <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-1 bg-gray-200 -z-0 mx-8 md:mx-16">
                                                <div 
                                                    className="h-full bg-green-500 transition-all duration-300"
                                                    style={{ width: `${((verificationStep - 1) / 2) * 100}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between relative z-0">
                                                {['Plant Info', 'Contact Details', 'Consent Verification'].map((label, idx) => {
                                                    const stepNum = idx + 1;
                                                    const isActive = verificationStep === stepNum;
                                                    const isCompleted = verificationStep > stepNum;
                                                    return (
                                                        <div key={idx} className="flex flex-col items-center bg-white px-2 cursor-pointer" onClick={() => isCompleted ? setVerificationStep(stepNum) : null}>
                                                            <div 
                                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${
                                                                    isActive ? 'border-orange-500 bg-orange-50 text-orange-600 scale-110' : 
                                                                    isCompleted ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 bg-white text-gray-400'
                                                                }`}
                                                            >
                                                                {isCompleted ? <FaCheckCircle /> : stepNum}
                                                            </div>
                                                            <span className={`text-xs font-bold mt-2 uppercase ${isActive ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                                                {label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Step 1: Plant Info */}
                                        {verificationStep === 1 && (
                                            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 animate-fadeIn">
                                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 border-b pb-4">
                                                    <FaIndustry className="text-blue-500" /> Plant Information
                                                </h3>
                                                
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 uppercase">Plant Name</label>
                                                        <p className="text-lg font-bold text-gray-800">{activePlantGroup.displayName}</p>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-400 uppercase">Location</label>
                                                            <p className="font-medium text-gray-700">{activePlantGroup.cteDetails[0]?.plantLocation || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-400 uppercase">Plot No / Survey No</label>
                                                            <p className="font-medium text-gray-700">{activePlantGroup.cteDetails[0]?.plotNo || '-'}</p>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 uppercase">Address</label>
                                                        <p className="font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                            {activePlantGroup.cteDetails[0]?.plantAddress || '-'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-8 flex justify-end">
                                                    <button 
                                                        onClick={() => setVerificationStep(2)}
                                                        className="px-8 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md flex items-center gap-2"
                                                    >
                                                        Next: Contact Details <FaArrowRight />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 2: Contact Details */}
                                        {verificationStep === 2 && (
                                            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 animate-fadeIn">
                                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 border-b pb-4">
                                                    <FaUser className="text-purple-500" /> Contact Details
                                                </h3>

                                                <div className="grid grid-cols-1 gap-8">
                                                    {/* Factory Head */}
                                                    <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                                                        <h4 className="font-bold text-purple-800 mb-4 flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-sm">FH</div>
                                                            Factory Head
                                                        </h4>
                                                        <div className="space-y-3 pl-10">
                                                            <div>
                                                                <label className="text-xs font-bold text-gray-400 uppercase">Name</label>
                                                                <p className="font-bold text-gray-800">{plantDetails.factoryHeadName || '-'}</p>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <p className="flex items-center gap-2 text-sm text-gray-600"><FaPhone className="text-purple-400" /> {plantDetails.factoryHeadMobileNo || '-'}</p>
                                                                <p className="flex items-center gap-2 text-sm text-gray-600"><FaEnvelope className="text-purple-400" /> {plantDetails.factoryHeadEmailId || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Contact Person */}
                                                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                                        <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-sm">CP</div>
                                                            Contact Person
                                                        </h4>
                                                        <div className="space-y-3 pl-10">
                                                            <div>
                                                                <label className="text-xs font-bold text-gray-400 uppercase">Name</label>
                                                                <p className="font-bold text-gray-800">{plantDetails.contactPersonName || '-'}</p>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <p className="flex items-center gap-2 text-sm text-gray-600"><FaPhone className="text-blue-400" /> {plantDetails.contactPersonMobileNo || '-'}</p>
                                                                <p className="flex items-center gap-2 text-sm text-gray-600"><FaEnvelope className="text-blue-400" /> {plantDetails.contactPersonEmailId || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-8 flex justify-between">
                                                    <button 
                                                        onClick={() => setVerificationStep(1)}
                                                        className="px-6 py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors flex items-center gap-2"
                                                    >
                                                        <FaArrowLeft /> Back
                                                    </button>
                                                    <button 
                                                        onClick={() => setVerificationStep(3)}
                                                        className="px-8 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md flex items-center gap-2"
                                                    >
                                                        Next: Consent Verification <FaArrowRight />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 3: Consent Verification */}
                                        {verificationStep === 3 && (
                                            <div className="animate-fadeIn space-y-8">
                                                <div className="flex items-center justify-between">
                                                    <button 
                                                        onClick={() => setVerificationStep(2)}
                                                        className="text-gray-500 font-bold hover:text-gray-700 text-sm flex items-center gap-2"
                                                    >
                                                        <FaArrowLeft /> Back to Contact Details
                                                    </button>
                                                </div>

                                                {/* Consent Verification */}
                                                <div>
                                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                        <FaClipboardCheck className="text-orange-500" /> Consent Verification
                                                    </h3>
                                                    
                                                    {activePlantGroup.cteDetails.length === 0 && activePlantGroup.ctoDetails.length === 0 && (
                                                        <p className="text-gray-500 italic">No consents to verify.</p>
                                                    )}
                                                    
                                                    {activePlantGroup.cteDetails.map((item, idx) => (
                                                        <ConsentVerificationRow 
                                                            key={`cte-${idx}`}
                                                            item={item}
                                                            type="CTE"
                                                            resolveUrl={resolveUrl}
                                                            onVerify={(s, r, f) => handleUpdate('cteDetailsList', item.originalIndex, s, r, f)}
                                                        />
                                                    ))}
                                                    
                                                    {activePlantGroup.ctoDetails.map((item, idx) => (
                                                        <ConsentVerificationRow 
                                                            key={`cto-${idx}`}
                                                            item={item}
                                                            type="CTO"
                                                            resolveUrl={resolveUrl}
                                                            onVerify={(s, r, f) => handleUpdate('ctoDetailsList', item.originalIndex, s, r, f)}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Production Capacity & Products */}
                                                <div>
                                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                        <FaBoxOpen className="text-gray-400" /> Production Capacity & Products
                                                    </h3>
                                                    {activePlantGroup.cteProd.length === 0 && activePlantGroup.ctoProds.length === 0 && (
                                                        <p className="text-gray-500 italic">No products to verify.</p>
                                                    )}
                                                    
                                                    <div className="flex flex-col gap-4">
                                                        {activePlantGroup.cteProd.map((item, idx) => (
                                                            <VerificationCard 
                                                                key={`prod-cte-${idx}`}
                                                                title={item.productName}
                                                                subtitle={`Capacity: ${item.maxCapacityPerYear} ${item.unit || 'MT/Year'}`}
                                                                status={item.verification?.status || 'Pending'}
                                                                remark={item.verification?.remark}
                                                                onVerify={(s, r, f) => handleUpdate('cteProduction', item.originalIndex, s, r, f)}
                                                            />
                                                        ))}
                                                        {activePlantGroup.ctoProds.map((item, idx) => (
                                                            <VerificationCard 
                                                                key={`prod-cto-${idx}`}
                                                                title={item.productName}
                                                                subtitle={`Quantity: ${item.quantity} ${item.unit || 'MT'}`}
                                                                status={item.verification?.status || 'Pending'}
                                                                remark={item.verification?.remark}
                                                                onVerify={(s, r, f) => handleUpdate('ctoProducts', item.originalIndex, s, r, f)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        </>
                                            );
                                        })()}
                                    </div>
                                )}

                                {activeTab === 'compliance' && (
                                    <div className="animate-fadeIn">
                                        <div className="mb-4 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                                <FaClipboardCheck className="text-gray-400" /> Detailed Compliance
                                            </h3>
                                            {/* We can add a refresh button here if needed */}
                                        </div>
                                        <ProductComplianceStep 
                                            client={clientData} 
                                            refreshData={refreshClientData}
                                            plantNameFilter={activePlantGroup.displayName}
                                        />
                                    </div>
                                )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientAudit;
