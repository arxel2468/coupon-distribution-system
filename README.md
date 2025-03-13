# Round-Robin Coupon Distribution System with Abuse Prevention

This web application distributes coupons to users in a round-robin manner, with built-in mechanisms to prevent abuse through multiple claims.

## Features

- **Round-Robin Distribution**: Coupons are assigned sequentially to ensure even distribution
- **Guest Access**: No login required to claim coupons
- **Multi-layered Abuse Prevention**:
  - IP address tracking (prevents multiple claims from same network)
  - Browser fingerprinting (prevents multiple claims from same device)
  - Rate limiting (restricts number of requests per time period)
  - Time-based restrictions (one coupon claim per hour)
- **User Feedback**: Clear messaging and countdown timer for eligibility
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Security**: Helmet, CORS, cookie security

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- MongoDB database (local or Atlas)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/arxel2468/coupon-distribution-system
   cd coupon-distribution-system
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_connection_string
   ```

4. Start the application:
   ```
   npm start
   ```
   For development with auto-restart:
   ```
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

## Deployment

This application can be deployed to any Node.js hosting service:

1. Set up environment variables on your hosting platform
2. Deploy the code to your hosting provider
3. Ensure MongoDB connection is properly configured

## Abuse Prevention Strategies

The application implements multiple layers of protection against abuse:

1. **IP Address Tracking**:
   - Each coupon claim is associated with the user's IP address
   - Users cannot claim multiple coupons from the same IP address within the restricted time frame

2. **Browser Fingerprinting**:
   - A unique browser ID is generated and stored in localStorage
   - This ID is also saved as an HTTP-only cookie
   - Claims are tracked based on this browser ID to prevent multiple claims from the same browser

3. **Rate Limiting**:
   - Express Rate Limiter restricts each IP to 5 requests per hour to the claim endpoint
   - Provides protection against brute force attempts

4. **Time-based Restrictions**:
   - Users must wait one hour between coupon claims
   - A countdown timer shows the remaining wait time
   - Both IP and browser ID are checked against the time restriction

5. **Round-Robin Distribution**:
   - Ensures fair distribution of coupons
   - When all coupons are claimed, the system reuses the oldest claimed coupon

## Testing

To test the abuse prevention mechanisms:

1. Claim a coupon normally
2. Try to claim another coupon within the hour (should be prevented)
3. Try using a different browser (should still be prevented due to IP tracking)
4. If using a VPN to change IP, the browser fingerprinting should still prevent multiple claims

## API Endpoints

- `POST /api/claim-coupon`: Claim a coupon
- `GET /api/check-eligibility`: Check if user is eligible to claim a coupon
- `GET /api/coupons`: List all coupons (for administrative purposes)

## License

[ISC License](LICENSE)