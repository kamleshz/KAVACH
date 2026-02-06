import React from 'react';

const SummaryReport = ({
    handleNext,
    isSaving
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Summery Report</h2>
            <p className="text-gray-600 mb-6">Review overall compliance and generate the final summary report.</p>
            <div className="flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={isSaving}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                    {isSaving ? <i className="fas fa-spinner fa-spin"></i> : null}
                    Finish <i className="fas fa-check"></i>
                </button>
            </div>
        </div>
    );
};

export default SummaryReport;
