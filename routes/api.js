// routes/api.js
const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Claim = require('../models/Claim');
const { claimLimiter } = require('../middleware/rateLimiter');

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
  // Find the first unassigned coupon
  const coupon = await Coupon.findOne({ isAssigned: false });
  
  if (!coupon) {
    // If all coupons are assigned, reset the oldest one
    const oldestClaim = await Claim.findOne().sort({ claimedAt: 1 });
    
    if (oldestClaim) {
      const couponToReset = await Coupon.findById(oldestClaim.couponId);
      if (couponToReset) {
        // Reset the coupon for reuse
        couponToReset.isAssigned = false;
        couponToReset.assignedAt = null;
        couponToReset.assignedTo = null;
        await couponToReset.save();
        
        // Remove the claim
        await Claim.deleteOne({ _id: oldestClaim._id });
        
        return couponToReset;
      }
    }
    return null;
  }
  
  return coupon;
};

// Endpoint to claim a coupon
router.post('/claim-coupon', claimLimiter, async (req, res) => {
  try {
    const ipAddress = req.ip;
    const browserId = req.cookies.browserId || req.body.browserId;
    
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
    
    // Update the coupon
    coupon.isAssigned = true;
    coupon.assignedAt = new Date();
    coupon.assignedTo = `${ipAddress}-${browserId || 'noBrowserId'}`;
    await coupon.save();
    
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