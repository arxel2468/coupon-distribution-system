// models/Claim.js
const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  ipAddress: { 
    type: String, 
    required: true 
  },
  couponId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Coupon' 
  },
  claimedAt: { 
    type: Date, 
    default: Date.now 
  },
  browserId: String
});

module.exports = mongoose.model('Claim', claimSchema);