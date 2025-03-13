// models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true 
  },
  isAssigned: { 
    type: Boolean, 
    default: false 
  },
  assignedAt: Date,
  assignedTo: String
});

module.exports = mongoose.model('Coupon', couponSchema);