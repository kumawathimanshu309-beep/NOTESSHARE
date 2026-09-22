require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

// Initialize Database & Server
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 StudyShare Backend Server Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔧 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`==================================================\n`);
  });
};

startServer();
