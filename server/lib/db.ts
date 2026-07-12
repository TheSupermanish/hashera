import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/moltiply";

export async function connect(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
  console.log(`[db] connected to ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);
}
