import { WASTE_TYPES } from './wasteTypes';

export const WASTE_TYPE_CONFIG = {
    [WASTE_TYPES.PLASTIC]: {
        label: 'Plastic Waste',
        key: 'PLASTIC',
        entityTypes: [
            { label: 'Producer', value: 'Producer' },
            { label: 'Importer', value: 'Importer' },
            { label: 'Brand Owner', value: 'Brand Owner' }
        ],
        documents: [
            { key: 'gst', label: 'GST Certificate', required: false },
            { key: 'cin', label: 'CIN Document', required: false },
            { key: 'pan', label: 'PAN Card', required: false },
            { key: 'factoryLicense', label: 'Factory License', required: false },
            { key: 'eprCertificate', label: 'EPR Certificate', required: false },
            { key: 'iecCertificate', label: 'IEC Certificate', required: false },
            { key: 'dicDcssiCertificate', label: 'DIC/DCSSI Certificate', required: false }
        ],
        showCteCto: true,
        showMsme: true,
        specificFields: []
    },
    [WASTE_TYPES.E_WASTE]: {
        label: 'E-Waste',
        key: 'E_WASTE',
        entityTypes: [
            { label: 'Producer of fresh EEE', value: 'Producer of fresh EEE' },
            { label: 'Producer of used EEE', value: 'Producer of used EEE' }
        ],
        documents: [
            { key: 'gst', label: 'GST Certificate', required: false },
            { key: 'cin', label: 'CIN Document', required: false },
            { key: 'pan', label: 'PAN Card', required: false }
        ],
        showCteCto: true,
        showMsme: true,
        specificFields: ['ewasteRegistration', 'eeeImportAuthorization']
    },
    [WASTE_TYPES.BATTERY]: {
        label: 'Battery Waste',
        key: 'BATTERY',
        entityTypes: [
            { label: 'Producer', value: 'Producer' },
            { label: 'Recycler', value: 'Recycler' },
            { label: 'Refurbisher', value: 'Refurbisher' }
        ],
        documents: [
            { key: 'gst', label: 'GST Certificate', required: false },
            { key: 'cin', label: 'CIN Document', required: false },
            { key: 'pan', label: 'PAN Card', required: false }
        ],
        showCteCto: true,
        showMsme: true,
        specificFields: []
    },
    [WASTE_TYPES.USED_OIL]: {
        label: 'Used Oil',
        key: 'USED_OIL',
        entityTypes: [
            { label: 'Producer', value: 'Producer' },
            { label: 'Importer', value: 'Importer' }
        ],
        documents: [
            { key: 'gst', label: 'GST Certificate', required: false },
            { key: 'cin', label: 'CIN Document', required: false },
            { key: 'pan', label: 'PAN Card', required: false }
        ],
        showCteCto: true,
        showMsme: true,
        specificFields: []
    },
    [WASTE_TYPES.ELV]: {
        label: 'ELV',
        key: 'ELV',
        entityTypes: [
            { label: 'Producer', value: 'Producer' }
        ],
        documents: [
            { key: 'gst', label: 'GST Certificate', required: false },
            { key: 'cin', label: 'CIN Document', required: false },
            { key: 'pan', label: 'PAN Card', required: false }
        ],
        showCteCto: true,
        showMsme: true,
        specificFields: []
    }
};

export const getWasteTypeConfig = (wasteType) => {
    return WASTE_TYPE_CONFIG[wasteType] || WASTE_TYPE_CONFIG[WASTE_TYPES.PLASTIC];
};
