import mongoose from "mongoose";

const loginActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "",
      index: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
  },
  {
    timestamps: true,
  }
);

const LoginActivityModel = mongoose.model("LoginActivity", loginActivitySchema);

export default LoginActivityModel;
