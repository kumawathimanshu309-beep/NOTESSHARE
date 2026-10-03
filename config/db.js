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
    const conn = await mongoose.connect(mongoURI, { dbName: 'studyshare' });
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);

    // Ensure canonical academic taxonomy in background on connection
    const academicService = require('../services/academicService');
    academicService.ensureAcademicTaxonomy().catch((err) => {
      console.error('Academic taxonomy initial seed warning:', err.message || err);
    });

    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Failure:', error.message);
    
  }
};

module.exports = connectDB;
