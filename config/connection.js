const mongoose = require('mongoose');
async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/social-network-api';
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('MongoDB connected');
  return mongoose.connection;
}
module.exports = { connectDatabase };
