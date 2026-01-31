import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI.replace('localhost', '127.0.0.1');
if (!uri) throw new Error("MONGODB_URI missing");

async function connectDB() {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4     // ← THIS FIXES 80% OF WINDOWS ETIMEOUT ISSUES
    });

    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connect error:", err.message);
    process.exit(1);
  }
}

export default connectDB;
