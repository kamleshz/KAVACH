import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        required: true,
        enum: [
            'PAN',
            'GST',
            'CIN',
            'Udyam',
            'CTO',
            'CTE',
            'CGWA',
            'Registration Certificate',
            'Factory License',
            'EPR Certificate',
            'IEC Certificate',
            'DIC/DCSSI Certificate',
            'Engagement Letter',
            'Signed Document',
            'E-waste Registration',
            'EEE Import Authorization',
            'Other'
        ]
    },
    documentName: {
        type: String,
        required: true
    },
    certificateNumber: {
        type: String,
        default: ""
    },
    certificateDate: {
        type: Date,
        default: null
    },
    filePath: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

export default documentSchema;
