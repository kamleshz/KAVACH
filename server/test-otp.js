
import { generateOTP, getOTPExpiry, isOTPExpired } from './utils/generateOtp.js';

console.log("Testing OTP Generation...");
try {
    const otp = generateOTP();
    console.log("OTP:", otp);
    
    const expiry = getOTPExpiry(10);
    console.log("Expiry:", expiry);
    
    const expired = isOTPExpired(expiry);
    console.log("Is Expired:", expired);
    
    console.log("OTP Test Passed");
} catch (error) {
    console.error("OTP Test Failed:", error);
}
