import mongoose from "mongoose";

const procurementSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    type: { type: String, enum: ['CTE', 'CTO'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    
    registrationType: { type: String, default: "" },
    entityType: { type: String, default: "" },
    supplierCode: { type: String, default: "" },
    skuCode: { type: String, default: "" },
    componentCode: { type: String, default: "" },
    nameOfEntity: { type: String, default: "" },
    state: { type: String, default: "" },
    address: { type: String, default: "" },
    mobileNumber: { type: String, default: "" },
    plasticMaterialType: { type: String, default: "" },
    categoryOfPlastic: { type: String, default: "" },
    financialYear: { type: String, default: "" },
    dateOfInvoice: { type: String, default: "" },
    quantityTPA: { type: String, default: "" },
    recycledPlasticPercent: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    gstPaid: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },
    otherPlasticMaterialType: { type: String, default: "" },
    cat1ContainerCapacity: { type: String, default: "" },
    bankAccountNo: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Procurement", procurementSchema);
