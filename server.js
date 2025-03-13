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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coupon-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
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

// API routes
app.use('/api', apiRoutes);

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});