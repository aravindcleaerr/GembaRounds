const mongoose = require('mongoose');

let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('MONGO_URI not set - database features will not work');
    return null;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
