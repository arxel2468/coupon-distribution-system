// routes/api.js
const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Claim = require('../models/Claim');
const { claimLimiter } = require('../middleware/rateLimiter');
const { validateClaimRequest } = require('../middleware/validator');


// Check if user is eligible for a coupon
const isEligibleForCoupon = async (ipAddress, browserId) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Check for claims by IP address
  const ipClaim = await Claim.findOne({
    ipAddress, 
    claimedAt: { $gte: oneHourAgo }
  });
  
  if (ipClaim) return false;
  
  // Check for claims by browser ID
  if (browserId) {
    const browserClaim = await Claim.findOne({
      browserId,
      claimedAt: { $gte: oneHourAgo }
    });
    
    if (browserClaim) return false;
  }
  
  return true;
};

// Get the next available coupon in round-robin fashion
const getNextCoupon = async () => {
  // Get all coupons sorted by code
  const allCoupons = await Coupon.find().sort({ code: 1 });
  
  if (!allCoupons.length) {
    return null;
  }

  // Get the most recent claim
  const lastClaim = await Claim.findOne().sort({ claimedAt: -1 });
  
  if (!lastClaim) {
    // If no claims exist, return the first coupon
    return allCoupons[0];
  }

  // Find the last assigned coupon
  const lastAssignedCoupon = await Coupon.findById(lastClaim.couponId);
  if (!lastAssignedCoupon) {
    return allCoupons[0];
  }

  // Find the index of the last assigned coupon
  const currentIndex = allCoupons.findIndex(c => c.code === lastAssignedCoupon.code);
  
  // Get the next coupon (wrap around to the beginning if at the end)
  const nextIndex = (currentIndex + 1) % allCoupons.length;
  
  return allCoupons[nextIndex];
};

// Endpoint to claim a coupon
router.post('/claim-coupon', [claimLimiter, validateClaimRequest], async (req, res) => {
  try {
    // Get the real client IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const browserId = req.cookies.browserId || req.body.browserId;
    
    console.log('Claim attempt from IP:', ipAddress, 'BrowserId:', browserId);
    
    // Check eligibility
    const eligible = await isEligibleForCoupon(ipAddress, browserId);
    
    if (!eligible) {
      // Calculate time remaining for the user
      const latestClaim = await Claim.findOne({
        $or: [{ ipAddress }, { browserId }]
      }).sort({ claimedAt: -1 });
      
      const timeElapsed = Date.now() - latestClaim.claimedAt;
      const timeRemaining = Math.max(0, 60 * 60 * 1000 - timeElapsed);
      const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
      
      return res.status(429).json({
        error: `You've already claimed a coupon. Please wait ${minutesRemaining} minutes before claiming another.`
      });
    }
    
    // Get next available coupon
    const coupon = await getNextCoupon();
    
    if (!coupon) {
      return res.status(404).json({ error: 'No coupons available at this time.' });
    }
    
    // Record the claim
    await Claim.create({
      ipAddress,
      couponId: coupon._id,
      browserId,
      claimedAt: new Date()
    });
    
    // Set browser ID cookie if not present
    if (!req.cookies.browserId && browserId) {
      res.cookie('browserId', browserId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
    }
    
    res.json({
      success: true,
      message: 'Coupon claimed successfully!',
      coupon: {
        code: coupon.code
      }
    });
  } catch (error) {
    console.log('Error claiming coupon:', error);
    console.error('Error claiming coupon:', error);
    res.status(500).json({ error: 'Failed to claim coupon' });
  }
});

// Check eligibility status
router.get('/check-eligibility', async (req, res) => {
  try {
    const ipAddress = req.ip;
    const browserId = req.cookies.browserId || req.query.browserId;
    
    const eligible = await isEligibleForCoupon(ipAddress, browserId);
    
    if (eligible) {
      return res.json({ eligible: true });
    }
    
    // Calculate time remaining
    const latestClaim = await Claim.findOne({
      $or: [{ ipAddress }, { browserId }]
    }).sort({ claimedAt: -1 });
    
    if (!latestClaim) {
      return res.json({ eligible: true });
    }
    
    const timeElapsed = Date.now() - latestClaim.claimedAt;
    const timeRemaining = Math.max(0, 60 * 60 * 1000 - timeElapsed);
    const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
    
    res.json({
      eligible: false,
      minutesRemaining
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// List all coupons (for admin purposes)
router.get('/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

module.exports = router;