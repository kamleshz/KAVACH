import React from 'react';
import { FaClipboardCheck } from 'react-icons/fa';
import ClientDetail from '../../pages/ClientDetail';

const Audit = ({ clientId, setIsAuditComplete, setActiveTab, wasteType }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {clientId ? (
            <ClientDetail 
                clientId={clientId} 
                embedded={true} 
                initialViewMode="process"
                onAuditComplete={() => {
                    setIsAuditComplete(true);
                    setActiveTab('Post -Audit Check');
                }}
            />
            ) : (
            <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                    <FaClipboardCheck className="text-gray-400 text-2xl" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Onsite Audit Unavailable</h3>
                <p className="text-gray-500 mt-2">Please save the client data first to access onsite audit.</p>
            </div>
            )}
        </div>
    );
};
export default Audit;
