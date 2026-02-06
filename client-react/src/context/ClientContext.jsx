import React, { createContext, useContext, useState, useMemo } from 'react';

const ClientContext = createContext(null);

export const ClientProvider = ({ children }) => {
    // Shared State for Add Client Workflow
    const [formData, setFormData] = useState({
        // Basic Info
        clientName: '',
        tradeName: '',
        companyGroupName: '',
        financialYear: '',
        wasteType: '', // No default - must be set by AddClient or loaded data
        entityType: 'Producer', // Default
        
        // PWP Specific
        pwpCategory: '',
        registrationStatus: '',
        unitName: '',
        facilityState: '',
        
        // E-waste Specific
        producerType: '',
        subCategoryProducer: '',

        // Address
        roAddress1: '', roAddress2: '', roAddress3: '', roState: '', roCity: '', roPincode: '',
        coAddress1: '', coAddress2: '', coAddress3: '', coState: '', coCity: '', coPincode: '',
        coSameAsRegistered: false,
        
        // Persons
        authorisedPersonName: '', authorisedPersonNumber: '', authorisedPersonEmail: '',
        authorisedPersonPan: '', authorisedPersonAddress1: '', authorisedPersonAddress2: '', authorisedPersonCity: '', authorisedPersonState: '', authorisedPersonDistrict: '', authorisedPersonPincode: '',
        
        coordinatingPersonName: '', coordinatingPersonNumber: '', coordinatingPersonEmail: '',
        coordinatingPersonPan: '', coordinatingPersonAddress1: '', coordinatingPersonAddress2: '', coordinatingPersonCity: '', coordinatingPersonState: '', coordinatingPersonDistrict: '', coordinatingPersonPincode: '',

        // Documents
        isEwasteRegistered: '',
        ewasteCertificateNumber: '', ewasteCertificateDate: '', ewasteFilePath: '', ewasteFile: null,
        isImportingEEE: '',
        eeeCertificateNumber: '', eeeCertificateDate: '', eeeFilePath: '', eeeFile: null,
        gstNumber: '', gstDate: '', gstFilePath: '', gstFile: null,
        cinNumber: '', cinDate: '', cinFilePath: '', cinFile: null,
        panNumber: '', panDate: '', panFilePath: '', panFile: null,
        factoryLicenseNumber: '', factoryLicenseDate: '', factoryLicenseFilePath: '', factoryLicenseFile: null,
        eprCertificateNumber: '', eprCertificateDate: '', eprCertificateFilePath: '', eprCertificateFile: null,
        iecCertificateNumber: '', iecCertificateDate: '', iecCertificateFilePath: '', iecCertificateFile: null,
        dicDcssiCertificateNumber: '', dicDcssiCertificateDate: '', dicDcssiCertificateFilePath: '', dicDcssiCertificateFile: null,

        // Compliance Contact
        compAuthName: '', compAuthNum: '', compAuthEmail: '',
        compCoordName: '', compCoordNum: '', compCoordEmail: '',

        // Production Facility
        totalCapitalInvestmentLakhs: '',
        groundWaterUsage: '',
        cgwaNocRequirement: '',
        cgwaNocDocument: null,
        plantLocationNumber: 0,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Consolidated Change Handler
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            if (name === 'groundWaterUsage') {
                const next = value;
                if (next === 'Yes') {
                    return { ...prev, groundWaterUsage: 'Yes', cgwaNocRequirement: 'Applicable' };
                }
                if (next === 'No') {
                    return { ...prev, groundWaterUsage: 'No', cgwaNocRequirement: 'Not Applicable', cgwaNocDocument: null };
                }
                return { ...prev, groundWaterUsage: '', cgwaNocRequirement: '', cgwaNocDocument: null };
            }
            if (name === 'coSameAsRegistered') {
                 if (checked) {
                     return {
                         ...prev,
                         coSameAsRegistered: true,
                         coAddress1: prev.roAddress1,
                         coAddress2: prev.roAddress2,
                         coAddress3: prev.roAddress3,
                         coState: prev.roState,
                         coCity: prev.roCity,
                         coPincode: prev.roPincode
                     };
                 } else {
                     return { ...prev, coSameAsRegistered: false, coAddress1: '', coAddress2: '', coAddress3: '', coState: '', coCity: '', coPincode: '' };
                 }
            }
            if (name === 'roState') {
                return { ...prev, [name]: value, roCity: '' };
            }
            if (name === 'coState') {
                return { ...prev, [name]: value, coCity: '' };
            }
            if (name === 'plantLocationNumber') {
                 const num = parseInt(value || '0');
                 return { ...prev, [name]: num };
            }
            return { ...prev, [name]: type === 'checkbox' ? checked : value };
        });
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files && files.length > 0) {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
        }
    };

    const value = useMemo(() => ({
        formData,
        setFormData,
        handleChange,
        handleFileChange,
        loading,
        setLoading,
        error,
        setError
    }), [formData, loading, error]);

    return (
        <ClientContext.Provider value={value}>
            {children}
        </ClientContext.Provider>
    );
};

export const useClientContext = () => {
    const context = useContext(ClientContext);
    if (!context) {
        throw new Error('useClientContext must be used within a ClientProvider');
    }
    return context;
};
