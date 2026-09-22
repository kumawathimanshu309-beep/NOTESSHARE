require('dotenv').config();

const app = require('../app');
const connectDB = require('../config/db');

let dbPromise;

module.exports = async (req, res) => {
  try {
    if (!dbPromise) {
      dbPromise = connectDB();
    }

    await dbPromise;
    return app(req, res);
  } catch (error) {
    console.error('Vercel startup error:', error);
    return res.status(500).json({
      error: 'Server initialization failed'
    });
  }
};
