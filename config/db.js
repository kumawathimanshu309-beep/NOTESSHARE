const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.warn('\n==================================================');
    console.warn('⚠️  MONGODB_URI is not set in environment variables.');
    console.warn('   Running application without active MongoDB connection.');
    console.warn('   Configure MONGODB_URI in your .env file to enable DB.');
    console.warn('==================================================\n');
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Failure:', error.message);
    
  }
};

module.exports = connectDB;
