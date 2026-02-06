import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import ClientValidation from '../../pages/ClientValidation';

const PreValidation = ({ clientId, setIsPreValidationComplete, setActiveTab, setCurrentStep }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {clientId ? (
            <ClientValidation 
                clientId={clientId} 
                embedded={true} 
                onComplete={() => {
                    setIsPreValidationComplete(true);
                    setActiveTab('Audit');
                }}
            />
            ) : (
            <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                    <FaShieldAlt className="text-gray-400 text-2xl" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Pre- Audit Check Unavailable</h3>
                <p className="text-gray-500 mt-2">Please submit the client data first to access pre-validation.</p>
                <button 
                    onClick={() => { setActiveTab('Client Data'); setCurrentStep(1); }}
                    className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    Go to Client Data
                </button>
            </div>
            )}
        </div>
    );
};
export default PreValidation;
