import React, { useState, useEffect } from 'react';
import { Tabs, Spin, Alert, Card, Button, List, Tag, Empty } from 'antd';
import { FaClipboardCheck, FaCheckDouble, FaBoxes, FaLeaf, FaBullhorn, FaArrowLeft } from 'react-icons/fa';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';
import ConsentVerification from '../../../components/PlantProcessSteps/ConsentVerification';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import EWasteCategoriesCompliance from './EWasteCategoriesCompliance';
import EWasteROHSCompliance from './EWasteROHSCompliance';
import EWasteStorage from './EWasteStorage';

const EWasteAudit = ({ clientId, setIsAuditComplete, setActiveTab }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState(null);
    const [activeTabKey, setActiveTabKey] = useState('verification');
    const [productSubTab, setProductSubTab] = useState('categories');
    const [selectedConsent, setSelectedConsent] = useState(null); // For Master-Detail in Verification
    
    // Verification State (Replicated from PlantProcess)
    const [verificationStates, setVerificationStates] = useState({});
    const [verifying, setVerifying] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    useEffect(() => {
        if (clientId) {
            fetchClientDetails();
        }
    }, [clientId]);

    const fetchClientDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(clientId));
            if (response.data.success) {
                setClient(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching client:", error);
            toast.error("Failed to load client details");
        } finally {
            setLoading(false);
        }
    };

    // --- Verification Logic (Adapted from PlantProcess) ---
    const updateVerificationState = (id, field, value) => {
        setVerificationStates(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleVerify = async (status, item) => {
        const state = verificationStates[item._id] || {};
        const file = state.file;
        const remark = state.remark;

        if (status === 'Verified' && !item.verification?.document && !file) {
            toast.error('Please upload a verification proof document');
            return;
        }

        if (status === 'Verified') setVerifying(true);
        else setRejecting(true);

        try {
            const formData = new FormData();
            formData.append('type', item.type);
            formData.append('itemId', item._id);
            formData.append('verificationStatus', status);
            
            if (remark) formData.append('verificationRemark', remark);
            if (file) formData.append('document', file);
            
            await api.post(API_ENDPOINTS.CLIENT.VERIFY_FACILITY(clientId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            toast.success(`Consent ${status} successfully`);
            
            // Refresh client data to update UI
            await fetchClientDetails();
            
            // Clear local state for this item
            setVerificationStates(prev => {
                const newState = { ...prev };
                delete newState[item._id];
                return newState;
            });
            
            // If currently viewing detail, we might want to stay there or go back. 
            // For now, stay there, but data is refreshed.
            if (selectedConsent && selectedConsent._id === item._id) {
                 // We need to update selectedConsent with the new data from client
                 // But fetchClientDetails is async and sets 'client'.
                 // We'll rely on 'client' effect or just re-find it.
            }

        } catch (error) {
            console.error("Verification failed:", error);
            toast.error(error.response?.data?.message || "Verification failed");
        } finally {
            setVerifying(false);
            setRejecting(false);
        }
    };
    
    // --- Render Helpers ---

    const renderVerificationTab = () => {
        if (!client) return null;
        
        // Combine CTE and CTO lists
        const cteList = (client.productionFacility?.cteDetailsList || []).map(i => ({ ...i, type: 'CTE' }));
        const ctoList = (client.productionFacility?.ctoDetailsList || []).map(i => ({ ...i, type: 'CTO' })); // Assuming type is CTO or mapped
        // Note: In PlantProcess, CTO items have ctoCaaType. 
        // We might need to ensure 'type' property exists for the API call.
        
        const allConsents = [...cteList, ...ctoList];

        if (selectedConsent) {
            // Find the updated version of selectedConsent from client data
            const updatedConsent = allConsents.find(c => c._id === selectedConsent._id) || selectedConsent;
            
            return (
                <div>
                    <Button 
                        icon={<FaArrowLeft />} 
                        onClick={() => setSelectedConsent(null)} 
                        className="mb-4"
                    >
                        Back to List
                    </Button>
                    <ConsentVerification 
                        item={updatedConsent}
                        relatedItems={[]} // If we want to group them, we can. For now, individual.
                        verificationStates={verificationStates}
                        updateVerificationState={updateVerificationState}
                        handleVerify={handleVerify}
                        isStepReadOnly={() => false} // Or logic based on permissions
                        verifying={verifying}
                        rejecting={rejecting}
                        navigate={navigate}
                        setShowHistoryModal={() => {}} // TODO: Implement History
                        type={updatedConsent.type}
                        client={client}
                        isSaving={false}
                        handleNext={() => {}} 
                    />
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allConsents.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        No Consent Details Found. Please add them in the 'Client Data' tab.
                    </div>
                ) : (
                    allConsents.map((item, idx) => (
                        <Card 
                            key={item._id || idx} 
                            hoverable 
                            onClick={() => setSelectedConsent(item)}
                            className="border-l-4 border-l-primary-500"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <Tag color={item.type === 'CTE' ? 'blue' : 'purple'}>{item.type || 'CTO'}</Tag>
                                    <h4 className="font-bold mt-2 text-lg">{item.consentNo || item.consentOrderNo || 'N/A'}</h4>
                                    <p className="text-gray-500 text-sm">{item.plantName}</p>
                                </div>
                                <div>
                                    {item.verification?.status === 'Verified' ? (
                                        <FaClipboardCheck className="text-green-500 text-xl" />
                                    ) : item.verification?.status === 'Rejected' ? (
                                        <div className="text-red-500 font-bold text-xs">Rejected</div>
                                    ) : (
                                        <div className="text-orange-500 font-bold text-xs">Pending</div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-gray-400">
                                Valid Upto: {item.validUpto ? new Date(item.validUpto).toLocaleDateString() : 'N/A'}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        );
    };

    const renderProductCheckTab = () => {
        return (
            <div>
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
            </div>
        );
    };

    const renderAwarenessTab = () => {
        return (
            <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <FaBullhorn className="mx-auto text-4xl text-blue-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Awareness Programs</h3>
                <p className="text-gray-500">This module is under development.</p>
            </div>
        );
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Spin size="large" /></div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px]">
            <Tabs 
                activeKey={activeTabKey} 
                onChange={setActiveTabKey}
                type="line"
                className="custom-tabs"
                items={[
                    {
                        key: 'verification',
                        label: <span className="flex items-center gap-2"><FaCheckDouble /> Verification</span>,
                        children: renderVerificationTab()
                    },
                    {
                        key: 'product-check',
                        label: <span className="flex items-center gap-2"><FaBoxes /> Electric and Electronic Product Check</span>,
                        children: renderProductCheckTab()
                    },
                    {
                        key: 'awareness',
                        label: <span className="flex items-center gap-2"><FaBullhorn /> Awareness</span>,
                        children: renderAwarenessTab()
                    }
                ]}
            />

            <div className="mt-8 pt-4 border-t flex justify-end">
                <Button 
                    type="primary" 
                    size="large"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                        setIsAuditComplete(true);
                        setActiveTab('Post -Audit Check');
                    }}
                >
                    Complete Audit
                </Button>
            </div>
        </div>
    );
};

export default EWasteAudit;
