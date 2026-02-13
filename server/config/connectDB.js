import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.replace('localhost', '127.0.0.1') : null;
if (!uri) {
  console.error("MONGODB_URI missing in environment variables");
  // Do not exit here, let the caller handle it or throw
  throw new Error("MONGODB_URI missing");
}

async function connectDB() {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Throw error to let caller know
    throw error;
  }
}

export default connectDB;
