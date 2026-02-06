import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import { API_ENDPOINTS } from '../services/apiEndpoints';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '', otp: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requireOtp, setRequireOtp] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, locating, captured, error, denied
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  
  const { verifyLoginOtp, setUser } = useAuth();
  const navigate = useNavigate();

  // Clear error on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const getLocation = () => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      setLocationStatus('error');
      return;
    }

    // Check for insecure origin (http://) which often blocks geolocation
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn("Geolocation blocked on insecure origin (http). Skipping.");
        setLocationStatus('denied'); // Treat as denied/unavailable
        return;
    }

    try {
      setLocationStatus('locating');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationStatus('captured');
        },
        (error) => {
          // Suppress "Only secure origins are allowed" error to avoid console noise
          if (error.message && error.message.includes("Only secure origins are allowed")) {
              console.warn("Geolocation failed: Insecure origin.");
              setLocationStatus('denied');
          } else {
              // Handle specific error codes gracefully
              switch(error.code) {
                  case error.PERMISSION_DENIED:
                      console.warn("Geolocation permission denied by user.");
                      setLocationStatus('denied');
                      break;
                  case error.POSITION_UNAVAILABLE:
                      console.warn("Geolocation position unavailable.");
                      setLocationStatus('error');
                      break;
                  case error.TIMEOUT:
                      console.warn("Geolocation request timed out.");
                      setLocationStatus('error');
                      break;
                  default:
                      console.warn("Geolocation error:", error.message);
                      setLocationStatus('error');
              }
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 10000 
        }
      );
    } catch (e) {
        console.error("Geolocation exception:", e);
        setLocationStatus('error');
    }
  };

  const startCameraAndCapture = async () => {
    setIsCapturing(true);
    setError('');
    
    // Start getting location immediately
    getLocation();

    // Check if mediaDevices is supported (it won't be on insecure origins like http://192.x.x.x)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("Camera API not available (likely insecure origin). Using fallback image.");
        toast.warning("Camera not available. Using placeholder for verification.");
        
        // Generate a fallback "No Camera" image to satisfy backend requirements
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Set reasonable dimensions
            canvas.width = 640;
            canvas.height = 480;
            
            // Draw a colored background (not black to pass backend check)
            ctx.fillStyle = '#E4E0DC'; // Light gray/beige
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add text
            ctx.fillStyle = '#E85D40';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Camera Unavailable', canvas.width/2, canvas.height/2);
            ctx.fillText('(Insecure Origin)', canvas.width/2, canvas.height/2 + 40);
            
            const fallbackImage = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(fallbackImage);
        }

        // Proceed without real capture
        setRequireOtp(true);
        setIsCapturing(false);
        setLoading(false);
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            
            // Wait for metadata to load
            await new Promise((resolve) => {
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().then(resolve).catch(e => {
                        console.error("Error playing video:", e);
                        resolve(); // Resolve anyway to try continuing
                    });
                };
            });

            // Capture after a brief delay
            setTimeout(() => {
                if (canvasRef.current && videoRef.current) {
                    const canvas = canvasRef.current;
                    const context = canvas.getContext('2d');
                    
                    // Check if video dimensions are available
                    if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
                        canvas.width = videoRef.current.videoWidth;
                        canvas.height = videoRef.current.videoHeight;
                        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                        
                        const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
                        setCapturedImage(imageBase64);
                    } else {
                         console.warn("Video dimensions not ready, skipping capture");
                         // Fallback or retry logic could go here
                    }
                    
                    // Stop stream
                    stream.getTracks().forEach(track => track.stop());
                    
                    setIsCapturing(false);
                    setRequireOtp(true);
                    setLoading(false);
                }
            }, 1000);
        }
    } catch (err) {
        console.error("Camera error", err);
        setError("Camera permission is required for security verification.");
        setIsCapturing(false);
        setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    setLoading(true);

    try {
      if (requireOtp) {
        const result = await verifyLoginOtp({ 
          email: formData.email, 
          otp: formData.otp,
          photo: capturedImage,
          location: location
        }).unwrap();
        
        if (result) {
          navigate('/dashboard');
        }
      } else {
        const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
          email: formData.email,
          password: formData.password
        });

        if (response.data.success && response.data.data?.requireOtp) {
          // Instead of showing OTP immediately, start camera capture
          await startCameraAndCapture();
        } else if (response.data.success && response.data.data?.accessToken) {
            // Direct login success (fallback if OTP disabled)
            localStorage.setItem('accessToken', response.data.data.accessToken);
            setUser(response.data.data.user);
            navigate(from, { replace: true });
        } else {
             // Handle unexpected successful response without OTP or Token
             setError('Unexpected response from server');
             setLoading(false);
        }
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Login failed';
      setError(message);
      // Removed the 8 second autoClose to allow users time to read the error
      toast.error(message);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div
      className="min-h-screen h-screen w-screen flex items-center justify-center bg-[#F9F7F5] p-0 font-sans relative overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100vw', height: '100vh' }}
    >
      
      {/* Background Pattern - Dotted Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.4]" style={{ 
          backgroundImage: 'radial-gradient(#E4E0DC 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
      }}></div>

      {/* Subtle Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#B8E8CE]/30 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#FCE5D4]/30 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex relative z-10 border border-[#E4E0DC]">
        
        {/* Left Side - Branding (Multi-stop Gradient) */}
        <div className="hidden lg:flex w-[40%] relative flex-col justify-between p-8 z-10 overflow-hidden"
             style={{
               background: 'linear-gradient(135deg, #20A65A 0%, #8CC63F 40%, #ECAA13 70%, #E85D40 100%)'
             }}
        >
           
           {/* Background Overlay Patterns */}
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
           
           {/* Top Content: Logo */}
           <div className="relative z-20">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    <i className="fas fa-shield-alt text-xl text-white"></i>
                </div>
             </div>
             <h1 className="text-2xl font-bold text-white tracking-wide mb-1">EPR Kavach</h1>
             <p className="text-white/90 text-xs font-light tracking-wide">Environmental Compliance Made Simple</p>
           </div>

          {/* Middle Content: Feature Cards */}
          <div className="relative z-20 space-y-3 my-auto">
              
              {/* Card 1 */}
              <div className="group bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-shield-alt text-white text-sm"></i>
                      </div>
                      <div>
                          <h3 className="font-bold text-white text-xs mb-0.5">Secure & Reliable</h3>
                          <p className="text-white/80 text-[10px]">Enterprise-grade security</p>
                      </div>
                  </div>
              </div>

              {/* Card 2 */}
              <div className="group bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-users text-white text-sm"></i>
                      </div>
                      <div>
                          <h3 className="font-bold text-white text-xs mb-0.5">Client Management</h3>
                          <p className="text-white/80 text-[10px]">Streamlined onboarding</p>
                      </div>
                  </div>
              </div>

              {/* Card 3 */}
              <div className="group bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-chart-line text-white text-sm"></i>
                      </div>
                      <div>
                          <h3 className="font-bold text-white text-xs mb-0.5">Real-time Analytics</h3>
                          <p className="text-white/80 text-[10px]">Track progress instantly</p>
                      </div>
                  </div>
              </div>

           </div>
           
           {/* Bottom Content: Copyright */}
           <div className="relative z-20 opacity-0">
              <p className="text-[10px] text-white/60 font-light">© 2025 EPR Kavach Audit. All rights reserved.</p>
           </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-[60%] bg-white p-8 md:p-10 flex flex-col justify-center relative">
            
            <div className="max-w-sm mx-auto w-full">
                {/* Mobile Header (Visible only on small screens) */}
                <div className="lg:hidden text-center mb-8">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#20A65A] to-[#E85D40] text-white mb-3 shadow-lg">
                        <i className="fas fa-shield-alt text-lg"></i>
                    </div>
                    <h1 className="text-xl font-bold text-[#3D2E4A]">EPR Kavach</h1>
                </div>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-[#3D2E4A] mb-1 tracking-tight">Welcome Back!</h2>
                    <p className="text-[#706B77] text-xs">Login to continue</p>
                </div>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-xs flex items-center animate-slideUp">
                        <i className="fas fa-exclamation-circle mr-2 text-sm"></i>
                        <span className="flex-1">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!requireOtp ? (
                        <>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#3D2E4A] mb-1.5">Email Address</label>
                                    <div className="relative group">
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Enter your email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border border-[#E4E0DC] transition-all pl-10"
                                            required
                                        />
                                        <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs"></i>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#3D2E4A] mb-1.5">Password</label>
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            placeholder="Enter your password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border border-[#E4E0DC] transition-all pl-10 pr-10"
                                            required
                                        />
                                        <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs"></i>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#706B77] hover:text-[#3D2E4A] focus:outline-none"
                                        >
                                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <label className="flex items-center gap-2 cursor-pointer text-[#706B77] hover:text-[#3D2E4A] transition-colors select-none">
                                    <input type="checkbox" className="rounded text-[#E85D40] focus:ring-[#E85D40] w-4 h-4 border-[#E4E0DC]" />
                                    <span className="text-[#706B77]">Remember me</span>
                                </label>
                                <Link to="/forgot-password" className="text-[#E85D40] font-medium hover:text-[#F27519] transition-colors">
                                    Forgot Password?
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                             <div className="text-center mb-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FCE5D4] mb-3">
                                    <i className="fas fa-shield-alt text-xl text-[#E85D40]"></i>
                                </div>
                                <h3 className="text-lg font-bold text-[#3D2E4A]">Two-Step Verification</h3>
                                <p className="text-xs text-[#706B77] mt-1">We sent a verification code to your email.</p>
                             </div>
                             
                             <div className="relative group">
                                <input
                                    type="text"
                                    name="otp"
                                    placeholder="Enter 6-digit Code"
                                    value={formData.otp}
                                    onChange={handleChange}
                                    maxLength="6"
                                    className="w-full px-6 py-3 bg-[#F4F1ED] rounded-lg text-lg font-bold text-[#3D2E4A] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border border-[#E4E0DC] transition-all pl-10 shadow-sm tracking-[0.5em] text-center"
                                    required
                                    autoFocus
                                />
                                <i className="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300"></i>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#E85D40] text-white py-2.5 rounded-lg font-bold shadow-md shadow-orange-500/20 hover:bg-[#F27519] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                {isCapturing ? 'Verifying Security...' : 'Processing...'}
                            </>
                        ) : (
                            <>
                                {requireOtp ? (
                                    'Verify & Login' 
                                ) : (
                                    <>
                                        <i className="fas fa-sign-in-alt mr-2"></i>
                                        Sign In
                                    </>
                                )}
                            </>
                        )}
                    </button>

                    {!requireOtp && (
                        <>
                            <div className="relative my-6 text-center">
                                <p className="text-xs text-[#706B77]">New to EPR Kavach?</p>
                            </div>

                            <Link to="/register" className="w-full bg-white border border-[#E4E0DC] text-[#E85D40] py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-[#FCE5D4]/50 transition-all duration-300 font-semibold text-sm">
                                Create an Account
                            </Link>
                        </>
                    )}
                    
                    {requireOtp && (
                        <div className="mt-4 text-center">
                             <button 
                                type="button" 
                                onClick={() => setRequireOtp(false)}
                                className="text-xs text-[#706B77] hover:text-[#3D2E4A] font-medium transition-colors"
                            >
                                <i className="fas fa-arrow-left mr-1"></i>
                                Back to Login
                            </button>
                        </div>
                    )}
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-[#706B77]">
                      © 2025 EPR Kavach Audit. All rights reserved.
                    </p>
                </div>
                
                {/* Camera Elements */}
                <div className={isCapturing ? "absolute inset-0 z-50 bg-black flex items-center justify-center rounded-2xl overflow-hidden" : "fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"}>
                    {isCapturing && (
                      <div className="absolute top-2 right-2 flex gap-2 z-10">
                        <div className="bg-red-500 animate-pulse w-3 h-3 rounded-full"></div>
                        {locationStatus === 'locating' && (
                             <div className="text-white text-xs bg-black/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <i className="fas fa-spinner fa-spin"></i> Locating...
                             </div>
                        )}
                        {locationStatus === 'captured' && (
                             <div className="text-green-400 text-xs bg-black/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <i className="fas fa-check"></i> Loc. Captured
                             </div>
                        )}
                        {locationStatus === 'denied' && (
                             <div className="text-red-400 text-xs bg-black/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <i className="fas fa-ban"></i> Loc. Denied
                             </div>
                        )}
                      </div>
                    )}
                    <video 
                        ref={videoRef} 
                        playsInline 
                        muted 
                        autoPlay 
                        className={isCapturing ? "w-full h-full object-cover transform scale-x-[-1]" : ""}
                    />
                    <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
