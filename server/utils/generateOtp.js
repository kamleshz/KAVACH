export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isOTPExpired = (expiryDate) => {
    return new Date() > new Date(expiryDate);
};

export const getOTPExpiry = (minutes = 10) => {
    return new Date(Date.now() + minutes * 60 * 1000);
};
