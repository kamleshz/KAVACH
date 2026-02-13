import mongoose from "mongoose";

const msmeDetailsSchema = new mongoose.Schema({
    classificationYear: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Small', 'Medium', 'Large'],
        required: true
    },
    majorActivity: {
        type: String,
        enum: ['Manufacturing', 'Trading', 'Service'],
        required: true
    },
    udyamNumber: {
        type: String,
        required: true
    },
    turnover: {
        type: String,
        required: true
    },
    certificateFile: {
        type: String,
        default: ""
    }
});

export default msmeDetailsSchema;
