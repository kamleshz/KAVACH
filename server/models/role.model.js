import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Provide role name"],
        unique: true,
        uppercase: true, // Ensure roles are always uppercase (e.g., ADMIN, USER)
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    permissions: [{
        type: String // We can expand this later if needed
    }]
}, {
    timestamps: true
});

const RoleModel = mongoose.model("Role", roleSchema);

export default RoleModel;
