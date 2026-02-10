import React, { useState } from 'react';
import { Tooltip, Button } from 'antd';
import { 
    HistoryOutlined, 
    CheckCircleFilled, 
    BankOutlined, 
    EnvironmentOutlined, 
    IdcardOutlined, 
    PhoneOutlined, 
    MailOutlined, 
    SafetyCertificateOutlined, 
    CloseCircleFilled, 
    ClockCircleFilled, 
    FileTextOutlined, 
    FilePdfOutlined, 
    CheckOutlined,
    CloseOutlined,
    EyeOutlined,
    ProfileOutlined,
    LoadingOutlined,
    ArrowRightOutlined
} from '@ant-design/icons';
import DocumentViewerModal from '../DocumentViewerModal';
import api from '../../services/api';

const ConsentVerification = ({
    item,
    relatedItems,
    verificationStates,
    updateVerificationState,
    handleVerify,
    isStepReadOnly,
    verifying,
    rejecting,
    navigate,
    setShowHistoryModal,
    type,
    client,
    isSaving,
    handleNext
}) => {
    // Document Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState('');
    const [viewerName, setViewerName] = useState('');

    const resolveUrl = (p) => {
        if (!p) return '';
        const isAbs = p.startsWith('http://') || p.startsWith('https://');
        return isAbs ? p : `${api.defaults.baseURL}/${p}`;
    };

    const handleViewDocument = (filePath, docType, docName) => {
        setViewerUrl(resolveUrl(filePath));
        setViewerName(docName || docType);
        setViewerOpen(true);
    };

    return (
        <div className="space-y-8">
            
            {item.verification?.status === 'Verified' && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm animate-fadeIn mb-6">
                    <div className="bg-green-100 p-2.5 rounded-full text-green-600">
                        <CheckCircleFilled className="text-lg" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-green-800">Verification Complete</p>
                        <div className="flex flex-col">
                            <p className="text-xs text-green-600 mt-0.5">This facility has been verified successfully.</p>
                            {item.verification?.verifiedBy && (
                                <p className="text-xs text-green-700 mt-1 font-medium">
                                    Verified by: {item.verification.verifiedBy.name || 'User'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Plant & Contact Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Plant Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <BankOutlined className="text-primary-500" />
                            Plant Information
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Plant Name</p>
                            <p className="font-medium text-gray-900">{item.plantName}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                            <p className="font-medium text-gray-900 flex items-center gap-2">
                                <EnvironmentOutlined className="text-gray-300" />
                                {item.plantLocation}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Address</p>
                            <p className="font-medium text-gray-900">{item.plantAddress}</p>
                        </div>
                    </div>
                </div>

                {/* Contact Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <IdcardOutlined className="text-primary-500" />
                            Contact Details
                        </h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Factory Head</h3>
                            <div>
                                <p className="font-medium text-gray-900">{item.factoryHeadName}</p>
                                <p className="text-xs text-gray-500">{item.factoryHeadDesignation}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <PhoneOutlined className="text-gray-300 text-xs w-4" /> {item.factoryHeadMobile}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <MailOutlined className="text-gray-300 text-xs w-4" /> {item.factoryHeadEmail}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Contact Person</h3>
                            <div>
                                <p className="font-medium text-gray-900">{item.contactPersonName}</p>
                                <p className="text-xs text-gray-500">{item.contactPersonDesignation}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <PhoneOutlined className="text-gray-300 text-xs w-4" /> {item.contactPersonMobile}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <MailOutlined className="text-gray-300 text-xs w-4" /> {item.contactPersonEmail}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Verification Cards List */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b pb-4">
                    <SafetyCertificateOutlined className="text-primary-600" />
                    Consent Verification
                </h3>

                {(relatedItems.length > 0 ? relatedItems : [item]).map((relItem) => {
                    const state = verificationStates[relItem._id] || {};
                    const file = state.file;
                    const remark = state.remark !== undefined ? state.remark : (relItem.verification?.remark || '');
                    const isVerified = relItem.verification?.status === 'Verified';
                    const isRejected = relItem.verification?.status === 'Rejected';

                    return (
                        <div key={relItem._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Card Header */}
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-md text-sm font-bold ${
                                        relItem.type === 'CTE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                    }`}>
                                        {relItem.type}
                                    </span>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">{relItem.type === 'CTE' ? 'Consent No' : 'Order No'}</p>
                                        <p className="font-bold text-gray-900 text-lg">{relItem.consentNo || relItem.consentOrderNo}</p>
                                    </div>
                                </div>
                                <div>
                                    {isVerified ? (
                                        <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                                            <CheckCircleFilled /> Verified
                                        </span>
                                    ) : isRejected ? (
                                        <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                                            <CloseCircleFilled /> Rejected
                                        </span>
                                    ) : (
                                        <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                                            <ClockCircleFilled /> Pending
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Left: Details & User Document */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Valid Upto</p>
                                            <p className={`font-medium ${
                                                relItem.validUpto && new Date(relItem.validUpto) < new Date() ? 'text-red-600' : 'text-gray-900'
                                            }`}>
                                                {relItem.validUpto ? new Date(relItem.validUpto).toLocaleDateString() : 'N/A'}
                                                {relItem.validUpto && new Date(relItem.validUpto) < new Date() && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Exp</span>}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Issue Date</p>
                                            <p className="font-medium text-gray-900">
                                                {relItem.issuedDate || relItem.dateOfIssue ? new Date(relItem.issuedDate || relItem.dateOfIssue).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                        {relItem.type !== 'CTE' && (
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">CTO/CCA Type</p>
                                                <p className="font-medium text-gray-900">{relItem.ctoCaaType || '-'}</p>
                                            </div>
                                        )}
                                        {relItem.type !== 'CTE' && (
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Industry Type</p>
                                                <p className="font-medium text-gray-900">{relItem.industryType || '-'}</p>
                                            </div>
                                        )}
                                        {relItem.category && (
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Category</p>
                                                <p className="font-medium text-gray-900">{relItem.category}</p>
                                            </div>
                                        )}
                                        {relItem.type !== 'CTE' && !relItem.category && (
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Category</p>
                                                <p className="font-medium text-gray-900">-</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                        <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                            <FileTextOutlined /> User Document
                                        </h4>
                                        {relItem.documentFile ? (
                                            <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-500">
                                                        <FilePdfOutlined />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">Uploaded File</span>
                                                </div>
                                                <button
                                                    onClick={() => handleViewDocument(relItem.documentFile, 'User Document', relItem.type === 'CTE' ? `CTE_${relItem.consentNo}` : `CTO_${relItem.consentOrderNo}`)}
                                                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-bold transition-colors"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No document uploaded.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Verification Form */}
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Verification Action</h4>
                                        <Tooltip title="View History">
                                            <Button 
                                                type="text" 
                                                size="small" 
                                                icon={<HistoryOutlined />} 
                                                onClick={() => setShowHistoryModal(true)} 
                                            />
                                        </Tooltip>
                                    </div>
                                    
                                    {/* Upload Proof */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-700 mb-2">
                                            Verification Proof {(!relItem.verification?.document && !file) && <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                onChange={(e) => updateVerificationState(relItem._id, 'file', e.target.files[0])}
                                                disabled={isStepReadOnly()}
                                                className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 ${isStepReadOnly() ? 'cursor-not-allowed opacity-60' : ''}`}
                                            />
                                            {file && (
                                                <p className="mt-1 text-xs text-primary-600 font-medium flex items-center gap-1">
                                                    <CheckOutlined /> Selected: {file.name}
                                                </p>
                                            )}
                                        </div>
                                        {relItem.verification?.document && (
                                            <div className="mt-2 flex items-center gap-2 text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 w-fit">
                                                <CheckCircleFilled /> 
                                                <span>Proof Uploaded</span>
                                                <button onClick={() => handleViewDocument(relItem.verification.document, 'Verification Proof', `Proof_${relItem._id}`)} className="underline font-bold ml-1">View</button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Remarks */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-700 mb-2">Remarks</label>
                                        <textarea
                                            value={remark}
                                            onChange={(e) => updateVerificationState(relItem._id, 'remark', e.target.value)}
                                            disabled={isStepReadOnly()}
                                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                                            rows="2"
                                            placeholder="Enter remarks..."
                                        ></textarea>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleVerify('Verified', relItem)}
                                            disabled={verifying || rejecting || isStepReadOnly()}
                                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <CheckOutlined /> Verify
                                        </button>
                                        <button
                                            onClick={() => handleVerify('Rejected', relItem)}
                                            disabled={verifying || rejecting || isStepReadOnly()}
                                            className="flex-1 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <CloseOutlined /> Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {(type === 'CTO' || (Array.isArray(relatedItems) && relatedItems.some((ri) => ri?.type === 'CTO'))) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <ProfileOutlined className="text-primary-500" />
                            CTO/CCA Additional Details
                        </h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Capital Investment (Lakhs)</div>
                                <div className="mt-2 text-sm font-semibold text-gray-900">{client?.productionFacility?.totalCapitalInvestmentLakhs ?? '-'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ground/Bore Well Water Usage</div>
                                <div className="mt-2 text-sm font-semibold text-gray-900">{client?.productionFacility?.groundWaterUsage || '-'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">CGWA NOC Requirement</div>
                                <div className="mt-2 text-sm font-semibold text-gray-900">{client?.productionFacility?.cgwaNocRequirement || '-'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">CGWA NOC Document</div>
                                <div className="mt-2">
                                    {client?.productionFacility?.cgwaNocDocument ? (
                                        <button
                                            onClick={() => handleViewDocument(client.productionFacility.cgwaNocDocument, 'CGWA', 'CGWA NOC')}
                                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                        >
                                            <EyeOutlined className="mr-1" /> View
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-xs italic">No Doc</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                    <h4 className="font-bold text-gray-800">Regulations Covered under CTO</h4>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {Array.isArray(client?.productionFacility?.regulationsCoveredUnderCto) && client.productionFacility.regulationsCoveredUnderCto.length ? (
                                    client.productionFacility.regulationsCoveredUnderCto.map((r) => (
                                        <span key={r} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            {r}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-gray-400 text-sm italic">Not selected</span>
                                )}
                            </div>

                            {Array.isArray(client?.productionFacility?.regulationsCoveredUnderCto) && client.productionFacility.regulationsCoveredUnderCto.includes('Water') && (
                                <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="p-3 font-semibold border-b w-20">SR No</th>
                                                <th className="p-3 font-semibold border-b">Description (water consumption / waste)</th>
                                                <th className="p-3 font-semibold border-b w-48">Permitted quantity</th>
                                                <th className="p-3 font-semibold border-b w-24">UOM</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-gray-100">
                                            {(Array.isArray(client?.productionFacility?.waterRegulations) && client.productionFacility.waterRegulations.length ? client.productionFacility.waterRegulations : [{}]).map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                                    <td className="p-3 text-gray-700">{row?.description || '-'}</td>
                                                    <td className="p-3 text-gray-700">{row?.permittedQuantity || '-'}</td>
                                                    <td className="p-3 text-gray-700">{row?.uom || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {Array.isArray(client?.productionFacility?.regulationsCoveredUnderCto) && client.productionFacility.regulationsCoveredUnderCto.includes('Air') && (
                                <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="p-3 font-semibold border-b w-20">SR No</th>
                                                <th className="p-3 font-semibold border-b">Parameters</th>
                                                <th className="p-3 font-semibold border-b w-80">Permissible annual / daily limit</th>
                                                <th className="p-3 font-semibold border-b w-24">UOM</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-gray-100">
                                            {(Array.isArray(client?.productionFacility?.airRegulations) && client.productionFacility.airRegulations.length ? client.productionFacility.airRegulations : [{}]).map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                                    <td className="p-3 text-gray-700">{row?.parameter || '-'}</td>
                                                    <td className="p-3 text-gray-700">{row?.permittedLimit || '-'}</td>
                                                    <td className="p-3 text-gray-700">{row?.uom || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {Array.isArray(client?.productionFacility?.regulationsCoveredUnderCto) && client.productionFacility.regulationsCoveredUnderCto.some((r) => {
                                const lower = (r || '').toString().trim().toLowerCase();
                                return lower === 'hazardous waste' || lower === 'hazardous wate';
                            }) && (
                                <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-green-100 text-gray-700 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="p-3 font-semibold border-b w-20">SR No</th>
                                                <th className="p-3 font-semibold border-b">Name of Hazardous Waste</th>
                                                <th className="p-3 font-semibold border-b">Facility &amp; Mode of Disposal</th>
                                                <th className="p-3 font-semibold border-b w-40">Quantity MT/YR</th>
                                                <th className="p-3 font-semibold border-b w-24">UOM</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-gray-100">
                                            {(Array.isArray(client?.productionFacility?.hazardousWasteRegulations) && client.productionFacility.hazardousWasteRegulations.length ? client.productionFacility.hazardousWasteRegulations : [{}]).map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-3 font-bold text-gray-800">{idx + 1}</td>
                                                    <td className="p-3 text-gray-700">{row?.nameOfHazardousWaste || '-'}</td>
                                                    <td className="p-3 text-gray-700">{row?.facilityModeOfDisposal || '-'}</td>
                                                    <td className="p-3 text-gray-700">{row?.quantityMtYr || '-'}</td>
                                                    <td className="p-3 text-gray-700">{row?.uom || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                    onClick={handleNext}
                    disabled={isSaving}
                    className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                    {isSaving ? <LoadingOutlined spin /> : null}
                    Next Step <ArrowRightOutlined />
                </button>
            </div>

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                documentUrl={viewerUrl}
                documentName={viewerName}
            />
        </div>
    );
};

export default ConsentVerification;
