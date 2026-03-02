import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    linkPath: {
      type: String,
      default: "",
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

const NotificationModel = mongoose.model("Notification", notificationSchema);

export default NotificationModel;
