const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/moltiply";

async function connect() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
  console.log(`[db] connected to ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);
}

module.exports = { connect };
