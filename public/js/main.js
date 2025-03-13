// public/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // Generate a browser ID if not already set
    const browserId = localStorage.getItem('browserId') || Date.now().toString();
    localStorage.setItem('browserId', browserId);
    
    const claimButton = document.getElementById('claim-button');
    const couponResult = document.getElementById('coupon-result');
    const couponCode = document.getElementById('coupon-code');
    const timerContainer = document.getElementById('timer-container');
    const timerElement = document.getElementById('timer');
    const eligibilityStatus = document.getElementById('eligibility-status');
    
    let countdownInterval;
    
    // Check eligibility on page load
    checkEligibility();
    
    // Add event listener to the claim button
    claimButton.addEventListener('click', claimCoupon);
    
    // Function to claim a coupon
    async function claimCoupon() {
      try {
        claimButton.disabled = true;
        claimButton.innerText = 'Processing...';
        
        const response = await fetch('/api/claim-coupon', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ browserId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Store claim time in localStorage
          localStorage.setItem('lastClaimTime', Date.now().toString());
          
          // Show the coupon code
          couponCode.textContent = data.coupon.code;
          couponResult.classList.remove('d-none');
          
          // Update eligibility status
          eligibilityStatus.innerHTML = `<div class="alert alert-success">
            ${data.message}
          </div>`;
          
          // Start the countdown timer
          checkEligibility();
        } else {
          // Show error message
          eligibilityStatus.innerHTML = `<div class="alert alert-danger">
            ${data.error}
          </div>`;
          
          // Check eligibility to update the timer
          checkEligibility();
        }
      } catch (error) {
        console.error('Error claiming coupon:', error);
        eligibilityStatus.innerHTML = `<div class="alert alert-danger">
          Failed to claim coupon. Please try again later.
        </div>`;
      } finally {
        claimButton.disabled = false;
        claimButton.innerText = 'Claim Coupon';
      }
    }
    
    // Function to check eligibility
    async function checkEligibility() {
      try {
        const response = await fetch(`/api/check-eligibility?browserId=${browserId}`);
        const data = await response.json();
        
        if (data.eligible) {
          // User is eligible to claim a coupon
          claimButton.disabled = false;
          timerContainer.classList.add('d-none');
          localStorage.removeItem('lastClaimTime'); // Clear stored claim time
          
          if (!couponResult.classList.contains('d-none')) {
            eligibilityStatus.innerHTML = `<div class="alert alert-info">
              You can claim another coupon now!
            </div>`;
          }
        } else {
          // User is not eligible, display countdown
          claimButton.disabled = true;
          timerContainer.classList.remove('d-none');
          
          // Get the stored claim time or use server-provided minutes
          const lastClaimTime = parseInt(localStorage.getItem('lastClaimTime'));
          let remainingSeconds;
          
          if (lastClaimTime) {
            const elapsedSeconds = Math.floor((Date.now() - lastClaimTime) / 1000);
            remainingSeconds = Math.max(0, 3600 - elapsedSeconds); // 3600 seconds = 1 hour
          } else {
            remainingSeconds = data.minutesRemaining * 60;
            // Store the calculated claim time
            localStorage.setItem('lastClaimTime', (Date.now() - ((3600 - remainingSeconds) * 1000)).toString());
          }
          
          // Clear any existing interval
          if (countdownInterval) {
            clearInterval(countdownInterval);
          }
          
          // Update timer immediately
          updateTimerDisplay(remainingSeconds);
          
          // Start countdown timer
          countdownInterval = setInterval(() => {
            remainingSeconds--;
            
            if (remainingSeconds <= 0) {
              clearInterval(countdownInterval);
              checkEligibility();
            } else {
              updateTimerDisplay(remainingSeconds);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking eligibility:', error);
        eligibilityStatus.innerHTML = `<div class="alert alert-warning">
          Unable to check eligibility. Please refresh the page.
        </div>`;
      }
    }
    
    // Update timer display
    function updateTimerDisplay(remainingSeconds) {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      timerElement.textContent = `You can claim another coupon in: ${minutes}m ${seconds}s`;
    }
});