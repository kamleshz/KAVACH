export const verifyEmailTemplate = ({ name, otp }) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - EPR Kavach</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #e6f7f5 0%, #d0f0e3 100%);">
    <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2ca58d, #118d7e); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">EPR Kavach Audit</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Verify Your Email Address</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <h2 style="color: #2ca58d; margin: 0 0 20px 0;">Hello ${name}!</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for registering with EPR Kavach Audit. To complete your registration and verify your email address, please use the OTP below:
            </p>
            
            <div style="background: linear-gradient(135deg, #e6f7f5, #d0f0e3); border-left: 4px solid #2ca58d; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
                <h1 style="color: #2ca58d; margin: 0; font-size: 42px; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                ⏱️ This OTP will expire in <strong>10 minutes</strong>.<br/>
                🔒 For security reasons, please do not share this code with anyone.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #999; font-size: 13px; line-height: 1.5; margin: 0;">
                    If you didn't request this verification, please ignore this email or contact our support team.
                </p>
            </div>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 EPR Kavach Audit. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;
};

export const loginOtpTemplate = ({ name, otp }) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login OTP - EPR Kavach</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #e6f7f5 0%, #d0f0e3 100%);">
    <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2ca58d, #118d7e); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">EPR Kavach Audit</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Secure Login Verification</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <h2 style="color: #2ca58d; margin: 0 0 20px 0;">Hello ${name}!</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We received a login request for your EPR Kavach Audit account. Use the OTP below to complete your login:
            </p>
            
            <div style="background: linear-gradient(135deg, #e6f7f5, #d0f0e3); border-left: 4px solid #2ca58d; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Login OTP</p>
                <h1 style="color: #2ca58d; margin: 0; font-size: 42px; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                ⏱️ This OTP will expire in <strong>10 minutes</strong>.<br/>
                🔒 For security reasons, please do not share this code with anyone.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #999; font-size: 13px; line-height: 1.5; margin: 0;">
                    If you didn't attempt to log in, please ignore this email and consider changing your password.
                </p>
            </div>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 EPR Kavach Audit. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;
};

export const forgotPasswordTemplate = ({ name, otp }) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - EPR Kavach</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #e6f7f5 0%, #d0f0e3 100%);">
    <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #d97706, #b45309); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">EPR Kavach Audit</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Password Reset Request</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <h2 style="color: #d97706; margin: 0 0 20px 0;">Hello ${name}!</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We received a request to reset your password. Use the OTP below to reset your password:
            </p>
            
            <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-left: 4px solid #d97706; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Reset OTP</p>
                <h1 style="color: #d97706; margin: 0; font-size: 42px; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                ⏱️ This OTP will expire in <strong>10 minutes</strong>.<br/>
                🔒 For security reasons, please do not share this code with anyone.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #999; font-size: 13px; line-height: 1.5; margin: 0;">
                    If you didn't request a password reset, please ignore this email or contact our support team immediately.
                </p>
            </div>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 EPR Kavach Audit. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;
};
