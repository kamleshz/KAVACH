import mongoose from 'mongoose';

const msmeSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  msmeStatus: { type: String, enum: ['Registered', 'Not Registered', 'Pending'], default: 'Not Registered' },
  udyamNumber: { type: String },
  enterpriseType: { type: String, enum: ['Micro', 'Small', 'Medium', 'Not Applicable'] },
  turnoverHistory: [{
    year: { type: String },
    turnover: { type: Number },
    investment: { type: Number }
  }],
  documents: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MsmeModel = mongoose.model('Msme', msmeSchema);
export default MsmeModel;
