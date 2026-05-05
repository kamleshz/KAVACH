import mongoose from "mongoose";

async function connectDB() {
  try {
    const uriRaw =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.MONGO_URL ||
      null;
    const uri = uriRaw
      ? String(uriRaw).replace("localhost", "127.0.0.1")
      : null;
    if (!uri) {
      throw new Error("MONGODB_URI missing");
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Throw error to let caller know
    throw error;
  }
}

export default connectDB;
