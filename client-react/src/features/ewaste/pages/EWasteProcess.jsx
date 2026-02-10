import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, Button, Tooltip, Tabs, Card, Tag } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { FaCheckDouble, FaBoxes, FaBullhorn, FaCheck, FaArrowLeft, FaClipboardCheck } from 'react-icons/fa';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';
import useAuth from '../../../hooks/useAuth';
import ConsentVerification from '../../../components/PlantProcessSteps/ConsentVerification';
import EWasteCategoriesCompliance from '../components/EWasteCategoriesCompliance';
import EWasteROHSCompliance from '../components/EWasteROHSCompliance';
import EWasteStorage from '../components/EWasteStorage';
import EWasteAwareness from '../components/EWasteAwareness';
import { toast } from 'react-toastify';

const EWasteProcess = ({ clientId: propClientId, type: propType, itemId: propItemId, onBack }) => {
    const params = useParams();
    const clientId = propClientId || params.clientId;
    const type = propType || params.type;
    const itemId = propItemId || params.itemId;
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [client, setClient] = useState(null);
    const [item, setItem] = useState(null);
    
    // Steps State
    const [activeTab, setActiveTab] = useState('verification');
    const [productSubTab, setProductSubTab] = useState('categories');
    const [completedSteps, setCompletedSteps] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Verification State
    const [verificationStates, setVerificationStates] = useState({});
    const [verifying, setVerifying] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [relatedItems, setRelatedItems] = useState([]);

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const notify = (type, text, duration = 4000) => {
        const id = `${Date.now()}-${Math.random()}`;
        const entry = { id, type, text, duration, started: false };
        setNotifications(prev => [...prev, entry]);
        setTimeout(() => {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, started: true } : n));
        }, 20);
        if (duration > 0) {
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, duration);
        }
    };
    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Steps Configuration
    const steps = [
        { id: 'verification', label: 'Verification', description: 'CTE & CTO/CCA Details', icon: <FaCheckDouble /> },
        { id: 'product-check', label: 'Product Check', description: 'EEE & RoHS Compliance', icon: <FaBoxes /> },
        { id: 'awareness', label: 'Awareness', description: 'Awareness Programs', icon: <FaBullhorn /> },
    ];

    const currentStepIndex = steps.findIndex(step => step.id === activeTab);

    // Fetch Data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const clientRes = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(clientId));
            if (clientRes.data.success) {
                const clientData = clientRes.data.data;
                setClient(clientData);

                // Find the specific item (CTE/CTO)
                let foundItem = null;
                if (type === 'CTE') {
                    foundItem = clientData.productionFacility?.cteDetailsList?.find(i => i._id === itemId);
                } else {
                    foundItem = clientData.productionFacility?.ctoDetailsList?.find(i => i._id === itemId);
                }

                if (foundItem) {
                    setItem(foundItem);
                    
                    // Normalize completed steps
                    if (foundItem.completedSteps) {
                        if (Array.isArray(foundItem.completedSteps)) {
                            setCompletedSteps(foundItem.completedSteps);
                        } else if (typeof foundItem.completedSteps === 'string') {
                            try {
                                setCompletedSteps(JSON.parse(foundItem.completedSteps));
                            } catch (e) {
                                console.error("Error parsing completedSteps", e);
                            }
                        }
                    } else if (foundItem.verification?.status === 'Verified') {
                        setCompletedSteps(['verification']);
                    }
                } else {
                    setError('Audit item not found');
                }
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [clientId, type, itemId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Find related items (same plant)
    useEffect(() => {
        if (client && item) {
            const normalize = (name) => name ? name.trim().toLowerCase() : '';
            const currentPlantName = normalize(item.plantName);
            if (!currentPlantName) {
                setRelatedItems([]);
                return;
            }

            const allCte = (client.productionFacility?.cteDetailsList || []).map(i => ({...i, type: 'CTE'}));
            const allCto = (client.productionFacility?.ctoDetailsList || []).map(i => ({...i, type: 'CTO'}));
            
            const matches = [...allCte, ...allCto].filter(i => normalize(i.plantName) === currentPlantName);
            setRelatedItems(matches);
        }
    }, [client, item]);

    // Verification Handlers
    const updateVerificationState = (id, field, value) => {
        setVerificationStates(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleVerify = async (status, targetItem) => {
        const state = verificationStates[targetItem._id] || {};
        const file = state.file;
        const remark = state.remark;

        if (status === 'Verified' && !targetItem.verification?.document && !file) {
            notify('error', 'Please upload a verification proof document');
            return;
        }

        if (status === 'Verified') setVerifying(true);
        else setRejecting(true);

        const newSteps = [...completedSteps];
        if (status === 'Verified' && !newSteps.includes('verification')) {
            newSteps.push('verification');
        }

        const formData = new FormData();
        formData.append('type', targetItem.type || type); // Ensure type is correct
        formData.append('itemId', targetItem._id);
        formData.append('verificationStatus', status);
        formData.append('completedSteps', JSON.stringify(newSteps));

        if (file) formData.append('document', file);
        if (remark) formData.append('verificationRemark', remark);

        try {
            const response = await api.post(API_ENDPOINTS.CLIENT.VERIFY_FACILITY(clientId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                notify('success', `${status} successfully`);
                setCompletedSteps(newSteps);
                fetchData(); // Refresh data
            }
        } catch (err) {
            console.error(err);
            notify('error', err.response?.data?.message || 'Verification failed');
        } finally {
            setVerifying(false);
            setRejecting(false);
        }
    };

    const handleNext = async (currentStepId) => {
        if (!completedSteps.includes(currentStepId)) {
            const newSteps = [...completedSteps, currentStepId];
            setCompletedSteps(newSteps);
            
            // Persist step completion if needed
            // Ideally verification persistence handles 'verification' step.
            // For other steps, we might need a separate API or piggyback on data save.
        }

        const currentIndex = steps.findIndex(s => s.id === currentStepId);
        if (currentIndex < steps.length - 1) {
            setActiveTab(steps[currentIndex + 1].id);
        } else {
            notify('success', 'Audit Process Completed!');
        }
    };

    const isStepReadOnly = (stepId) => {
        // Logic for read-only if needed (e.g. based on role or status)
        return false; 
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );
    
    if (error) return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="text-red-600 bg-white p-6 rounded-lg shadow-lg">
                <i className="fas fa-exclamation-circle text-4xl mb-4 block text-center"></i>
                <p className="text-lg font-semibold">{error}</p>
                <Button onClick={() => navigate(-1)} className="mt-4 w-full">Go Back</Button>
            </div>
        </div>
    );

    if (!item) return <div className="p-6">Item not found</div>;

    return (
        <div className={`min-h-screen bg-gray-50 pb-12 ${onBack ? '' : '-m-6'}`}>
            {/* Header Section */}
            <div className="bg-white shadow-sm border-b">
                <div className="w-full mx-auto px-2 py-3">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    if (!isSaving) {
                                        if (onBack) {
                                            onBack();
                                        } else {
                                            navigate(`/dashboard/client/${clientId}`, { state: { viewMode: 'process' } });
                                        }
                                    }
                                }}
                                className={`group flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-all ${
                                    isSaving 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-gray-100 text-gray-500 hover:bg-primary-600 hover:text-white'
                                }`}
                                title="Back to Client Details"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1"></i>
                                )}
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-gray-900 m-0 leading-tight">
                                        {item.plantName || client.clientName}
                                    </h1>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <Tooltip title="View Change History">
                                <Button 
                                    type="primary" 
                                    ghost 
                                    icon={<HistoryOutlined />} 
                                    onClick={() => notify('info', 'History feature coming soon')}
                                    className="flex items-center gap-2 font-medium"
                                >
                                    History
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {notifications.map(n => (
                    <div
                        key={n.id}
                        className={`min-w-[260px] max-w-sm rounded-lg px-3 py-2 shadow-sm flex items-center justify-between relative ${
                            n.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {n.type === 'error' ? <i className="fas fa-exclamation-circle"></i> : <i className="fas fa-check-circle"></i>}
                            <span className="text-sm font-medium">{n.text}</span>
                        </div>
                        <button
                            onClick={() => dismissNotification(n.id)}
                            className={`text-white/90 hover:text-white`}
                            title="Dismiss"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <div
                            className="absolute left-0 bottom-0 h-0.5 bg-white/80"
                            style={{
                                width: n.started ? '0%' : '100%',
                                transition: `width ${n.duration}ms linear`
                            }}
                        />
                    </div>
                ))}
            </div>

            <div className="w-full mx-auto px-2 py-8">
                {/* Progress Stepper */}
                <div className="mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        {/* Mobile Compact Stepper */}
                        <div className="md:hidden p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">
                                    Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].label}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {Math.round(((currentStepIndex + 1) / steps.length) * 100)}% Complete
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Desktop Full Stepper */}
                        <div className="hidden md:flex flex-row">
                            {steps.map((step, index) => {
                                const isCurrent = index === currentStepIndex;
                                const isCompleted = completedSteps.includes(step.id);
                                
                                return (
                                    <div key={step.id} className="flex-1 flex items-center relative group">
                                        <button
                                            onClick={() => setActiveTab(step.id)}
                                            className={`flex-1 flex items-center px-6 py-4 transition-colors relative ${
                                                isCurrent ? 'bg-white' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-colors ${
                                                isCompleted 
                                                    ? 'bg-green-600 border-green-600 text-white' 
                                                    : isCurrent 
                                                        ? 'border-primary-600 text-primary-600 bg-white' 
                                                        : 'border-gray-300 text-gray-500 bg-white'
                                            }`}>
                                                {isCompleted ? (
                                                    <FaCheck />
                                                ) : (
                                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                                )}
                                            </div>
                                            <div className="ml-4 text-left">
                                                <p className={`text-sm font-bold ${
                                                    isCompleted ? 'text-green-700' : isCurrent ? 'text-primary-700' : 'text-gray-500'
                                                }`}>
                                                    {step.label}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {step.description}
                                                </p>
                                            </div>
                                            
                                            {/* Active Bottom Border */}
                                            {isCurrent && (
                                                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-600"></div>
                                            )}
                                        </button>
                                        
                                        {/* Chevron Separator (hidden for last item) */}
                                        {index < steps.length - 1 && (
                                            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 text-gray-300">
                                                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Step Content */}
                {activeTab === 'verification' && (
                    <ConsentVerification
                        item={item}
                        relatedItems={relatedItems}
                        verificationStates={verificationStates}
                        updateVerificationState={updateVerificationState}
                        handleVerify={handleVerify}
                        isStepReadOnly={isStepReadOnly}
                        verifying={verifying}
                        rejecting={rejecting}
                        navigate={navigate}
                        setShowHistoryModal={() => {}}
                        type={type}
                        client={client}
                        isSaving={isSaving}
                        handleNext={() => handleNext('verification')}
                    />
                )}

                {activeTab === 'product-check' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px]">
                        {/* Custom Tabs */}
                        <div className="mb-6">
                            <div className="bg-gray-100 p-1.5 rounded-lg">
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'categories', label: 'Categories Wise EEE Compliance' },
                                        { id: 'rohs', label: 'RoHS Compliance' },
                                        { id: 'storage', label: 'Storage E-Waste' }
                                    ].map((tab) => {
                                        const isCurrent = productSubTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setProductSubTab(tab.id)}
                                                className={`
                                                    flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all min-w-[140px]
                                                    ${isCurrent 
                                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                                    }
                                                `}
                                            >
                                                <span className={isCurrent ? "font-bold" : ""}>{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="mt-4">
                            {productSubTab === 'categories' && <EWasteCategoriesCompliance clientId={clientId} clientName={client?.clientName} />}
                            {productSubTab === 'rohs' && <EWasteROHSCompliance clientId={clientId} />}
                            {productSubTab === 'storage' && <EWasteStorage clientId={clientId} />}
                        </div>

                        <div className="mt-8 pt-4 border-t flex justify-end">
                            <Button 
                                type="primary" 
                                size="large"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleNext('product-check')}
                            >
                                Next Step
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'awareness' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                        <EWasteAwareness clientId={clientId} />
                        <div className="mt-8 pt-4 border-t flex justify-end">
                            <Button 
                                type="primary" 
                                size="large"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleNext('awareness')}
                            >
                                Complete Audit
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EWasteProcess;
