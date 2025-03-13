// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const Coupon = require('./models/Coupon');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable trust proxy to get real IP addresses
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.disable('x-powered-by');

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coupon-system')
.then(() => {
  console.log('MongoDB connected');
  seedCoupons(); // Seed coupons after connection is established
})
.catch(err => console.error('MongoDB connection error:', err));

// Seed coupons if none exist
const seedCoupons = async () => {
  try {
    const count = await Coupon.countDocuments();
    if (count === 0) {
      const coupons = [
        { code: 'SAVE10' },
        { code: 'FREE15' },
        { code: 'DISCOUNT20' },
        { code: 'SPECIAL25' },
        { code: 'DEAL30' }
      ];
      await Coupon.insertMany(coupons);
      console.log('Seeded initial coupons');
    }
  } catch (error) {
    console.error('Error seeding coupons:', error);
  }
};

// API routes - DEFINE THESE BEFORE THE 404 HANDLER
app.use('/api', apiRoutes);

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404 errors - NOW THIS COMES AFTER THE ROUTES
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Handle other errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});