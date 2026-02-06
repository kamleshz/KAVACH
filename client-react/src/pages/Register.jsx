import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validatePassword = (pass) => {
    let strength = 0;
    if (pass.length >= 6) strength += 1;
    if (pass.match(/[A-Z]/)) strength += 1;
    if (pass.match(/[0-9]/)) strength += 1;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 1;
    return strength;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    
    // Clear specific field error
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: '' });
    }

    if (name === 'password') {
      setPasswordStrength(validatePassword(value));
    }
  };

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^[0-9]{10}$/;

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!emailRegex.test(formData.email)) errors.email = 'Invalid email address';
    if (formData.mobile && !mobileRegex.test(formData.mobile)) {
      errors.mobile = 'Mobile number must be 10 digits';
    }
    if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile
      }).unwrap();

      if (result.success) {
        setSuccess('Registration successful! Check your email for OTP.');
        setTimeout(() => {
          setShowOtpModal(true);
          setResendDisabled(true);
          setResendTimer(30);
        }, 1500);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError(err?.message || err?.error || (typeof err === 'string' ? err : 'Network error. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.every(char => /^\d$/.test(char))) {
      const newOtp = [...otp];
      pastedData.forEach((char, index) => {
        if (index < 6) newOtp[index] = char;
      });
      setOtp(newOtp);
      document.getElementById(`otp-${Math.min(pastedData.length, 5)}`).focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setVerifyingOtp(true);
    setError('');

    try {
      const response = await api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, {
        email: formData.email,
        otp: otpCode
      });

      if (response.data.success) {
        setSuccess('Email verified successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setResendDisabled(true);
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.RESEND_VERIFY_EMAIL_OTP, {
        email: formData.email
      });

      if (response.data.success) {
        setSuccess('OTP resent successfully');
        setResendTimer(60);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to resend OTP');
        setResendDisabled(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error');
      setResendDisabled(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F9F7F5] p-4 font-sans relative overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* Background Pattern - Dotted Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.6]" style={{ 
          backgroundImage: 'radial-gradient(#E4E0DC 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
      }}></div>

      {/* Subtle Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#B8E8CE]/30 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#FCE5D4]/30 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex relative z-10 border border-[#E4E0DC]">
        
        {/* Left Side - Branding (Gradient) */}
        <div className="hidden lg:flex w-[40%] relative flex-col justify-between p-8 z-10 overflow-hidden"
             style={{
               background: 'linear-gradient(135deg, #20A65A 0%, #8CC63F 40%, #ECAA13 70%, #E85D40 100%)'
             }}
        >
           
           {/* Background Overlay Patterns */}
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
           
           {/* Top Content: Logo */}
           <div className="relative z-20">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    <i className="fas fa-shield-alt text-xl text-white"></i>
                    <i className="fas fa-leaf absolute bottom-2 right-2 text-[8px] text-white/80"></i>
                </div>
             </div>
             <h1 className="text-2xl font-bold text-white tracking-wide mb-1">EPR Kavach</h1>
             <p className="text-white/90 text-sm font-light tracking-wide">Secure Audit Management System</p>
           </div>

           {/* Bottom Content */}
           <div className="relative z-20 mt-auto">
              <h3 className="text-xl font-bold text-white mb-2">Join Our Platform</h3>
              <p className="text-white/80 text-xs leading-relaxed mb-6 max-w-sm">
                Create an account to manage your audits efficiently. Secure, reliable, and easy to use.
              </p>
              
              {/* Pagination Dots */}
              <div className="flex gap-2">
                <div className="w-6 h-1.5 rounded-full bg-white transition-all duration-300"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/60 transition-all duration-300 cursor-pointer"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/60 transition-all duration-300 cursor-pointer"></div>
              </div>
           </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-[60%] bg-white/50 p-8 md:p-10 flex flex-col justify-center relative overflow-y-auto custom-scrollbar">
          
          <div className="max-w-sm mx-auto w-full">
            
            {/* Mobile Header (Visible only on small screens) */}
            <div className="lg:hidden text-center mb-8">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#E85D40] text-white mb-3 shadow-lg">
                    <i className="fas fa-shield-alt text-lg"></i>
                </div>
                <h1 className="text-xl font-bold text-[#3D2E4A]">EPR Kavach</h1>
            </div>

            {!showOtpModal ? (
              <>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-[#3D2E4A] mb-1 tracking-tight">Create Account</h2>
                    <p className="text-[#706B77] text-xs">Please fill in the details to register</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-xs flex items-center animate-slideUp">
                    <i className="fas fa-exclamation-circle mr-2 text-sm"></i>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-[#3D2E4A] mb-1.5">Full Name</label>
                      <div className="relative group">
                        <input
                          type="text"
                          name="name"
                          placeholder="Full Name"
                          value={formData.name}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border transition-all pl-9 ${
                            fieldErrors.name ? 'border-red-300 ring-red-100' : 'border-[#E4E0DC]'
                          }`}
                        />
                        <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs"></i>
                      </div>
                      {fieldErrors.name && <p className="text-[10px] text-red-500 mt-1 ml-1">{fieldErrors.name}</p>}
                    </div>

                    {/* Mobile */}
                    <div>
                      <label className="block text-xs font-semibold text-[#3D2E4A] mb-1.5">Mobile</label>
                      <div className="relative group">
                        <input
                          type="tel"
                          name="mobile"
                          placeholder="Mobile Number"
                          value={formData.mobile}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border transition-all pl-9 ${
                            fieldErrors.mobile ? 'border-red-300 ring-red-100' : 'border-[#E4E0DC]'
                          }`}
                        />
                        <i className="fas fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs"></i>
                      </div>
                      {fieldErrors.mobile && <p className="text-[10px] text-red-500 mt-1 ml-1">{fieldErrors.mobile}</p>}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-[#3D2E4A] mb-1.5">Email Address</label>
                    <div className="relative group">
                      <input
                        type="email"
                        name="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border transition-all pl-9 ${
                          fieldErrors.email ? 'border-red-300 ring-red-100' : 'border-[#E4E0DC]'
                        }`}
                      />
                      <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs"></i>
                    </div>
                    {fieldErrors.email && <p className="text-[10px] text-red-500 mt-1 ml-1">{fieldErrors.email}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-[#3D2E4A] mb-1.5">Password</label>
                      <div className="relative group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          placeholder="Password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border transition-all pl-9 pr-9 ${
                            fieldErrors.password ? 'border-red-300 ring-red-100' : 'border-[#E4E0DC]'
                          }`}
                        />
                        <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs"></i>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#706B77] hover:text-[#3D2E4A] focus:outline-none"
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                        </button>
                      </div>
                      {/* Password Strength */}
                      {formData.password && (
                        <div className="mt-1.5 flex gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div 
                              key={i}
                              className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                                passwordStrength >= i 
                                  ? passwordStrength < 2 ? 'bg-red-500' : passwordStrength < 3 ? 'bg-yellow-500' : 'bg-green-500'
                                  : 'bg-gray-200'
                              }`}
                            ></div>
                          ))}
                        </div>
                      )}
                      {fieldErrors.password && <p className="text-[10px] text-red-500 mt-1 ml-1">{fieldErrors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-[#3D2E4A] mb-1.5">Confirm Password</label>
                      <div className="relative group">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          placeholder="Confirm"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border transition-all pl-9 pr-9 ${
                            fieldErrors.confirmPassword ? 'border-red-300 ring-red-100' : 'border-[#E4E0DC]'
                          }`}
                        />
                        <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs"></i>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#706B77] hover:text-[#3D2E4A] focus:outline-none"
                        >
                          <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && <p className="text-[10px] text-red-500 mt-1 ml-1">{fieldErrors.confirmPassword}</p>}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#E85D40] text-white py-2.5 rounded-lg font-bold shadow-md shadow-orange-500/20 hover:bg-[#D64D32] hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-sm mt-4"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus"></i>
                        Create Account
                      </>
                    )}
                  </button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#E4E0DC]"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-[#F9F7F5] px-3 text-[#706B77] font-medium">Or</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-[#706B77]">
                      Already have an account?{' '}
                      <Link 
                        to="/login" 
                        className="font-semibold text-[#E85D40] hover:text-[#D64D32] transition-colors"
                      >
                        Sign In
                      </Link>
                    </p>
                  </div>
                </form>
              </>
            ) : (
              <div className="animate-fadeIn py-2">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-[#FCE5D4] rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-envelope-open-text text-3xl text-[#E85D40]"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-[#3D2E4A] mb-2">Verify Email</h3>
                  <p className="text-[#706B77] text-sm">
                    Code sent to <span className="font-semibold text-[#3D2E4A]">{formData.email}</span>
                  </p>
                </div>

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg text-sm flex items-center animate-slideUp">
                    <i className="fas fa-check-circle mr-3 text-lg"></i>
                    {success}
                    </div>
                )}
                
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm flex items-center animate-slideUp">
                    <i className="fas fa-exclamation-circle mr-3 text-lg"></i>
                    {error}
                  </div>
                )}

                <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-[#E4E0DC] rounded-xl focus:border-[#E85D40] focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all bg-[#F4F1ED] focus:bg-white text-[#3D2E4A]"
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp}
                  className="w-full bg-[#E85D40] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:bg-[#D64D32] hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  {verifyingOtp ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle"></i>
                      Verify OTP
                    </>
                  )}
                </button>

                <div className="mt-6 text-center">
                  <p className="text-sm text-[#706B77] mb-4">
                    Didn't receive the code?
                  </p>
                  <button
                    onClick={handleResendOtp}
                    disabled={resendDisabled}
                    className="text-sm font-semibold text-[#E85D40] hover:text-[#D64D32] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-12 text-center">
                <p className="text-xs text-[#706B77]">
                  © 2025 EPR Kavach Audit. All rights reserved.
                </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
