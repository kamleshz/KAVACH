import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorEmail: {
      type: String,
      default: "",
    },
    actorRole: {
      type: String,
      default: "",
      index: true,
    },
    module: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    entityType: {
      type: String,
      default: "",
      index: true,
    },
    entityId: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "",
      index: true,
    },
    itemId: {
      type: String,
      default: "",
      index: true,
    },
    status: {
      type: String,
      default: "success",
      index: true,
    },
    message: {
      type: String,
      default: "",
    },
    changeCount: {
      type: Number,
      default: 0,
    },
    changes: {
      type: Array,
      default: [],
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true },
);

auditLogSchema.index({ clientId: 1, module: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);

export default AuditLogModel;
