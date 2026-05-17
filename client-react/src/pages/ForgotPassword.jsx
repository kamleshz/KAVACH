import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import { FaArrowLeft, FaKey, FaSpinner } from "react-icons/fa";
import api from "../services/api";
import { API_ENDPOINTS } from "../services/apiEndpoints";

const STEP_META = {
  1: {
    title: "Forgot Password",
    description: "Enter your email to receive a reset code",
  },
  2: {
    title: "Verify OTP",
    description: "Enter the 6-digit code sent to your email",
  },
  3: {
    title: "Reset Password",
    description: "Create a new password for your account",
  },
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const otpInputRefs = useRef([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const stepMeta = STEP_META[step];

  const otpValue = useMemo(() => otp.join(""), [otp]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (step === 2) {
      otpInputRefs.current[0]?.focus();
    }
  }, [step]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    resetMessages();

    try {
      const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email,
      });
      if (response.data.success) {
        setSuccess("OTP resent successfully");
        setResendTimer(30);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    try {
      const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email,
      });
      if (response.data.success) {
        setSuccess(response.data.message || "OTP sent successfully");
        setResendTimer(30);
        setStep(2);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < otp.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const nextOtp = [...otp];
    pasted.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });
    setOtp(nextOtp);
    otpInputRefs.current[Math.min(pasted.length - 1, 5)]?.focus();
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    if (otpValue.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post(API_ENDPOINTS.AUTH.VERIFY_FORGOT_OTP, {
        email,
        otp: otpValue,
      });

      if (response.data.success) {
        setSuccess(response.data.message || "OTP verified successfully");
        setStep(3);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        email,
        otp: otpValue,
        newPassword,
        confirmPassword,
      });

      if (response.data.success) {
        setSuccess("Password reset successfully. Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center bg-[#F9F7F5] p-4 relative overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div
        className="absolute inset-0 z-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(#E4E0DC 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#B8E8CE]/30 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#FCE5D4]/30 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex relative z-10 border border-[#E4E0DC] min-h-0">
        <div
          className="hidden lg:flex w-[40%] relative flex-col justify-between p-8 z-10 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #20A65A 0%, #8CC63F 40%, #ECAA13 70%, #E85D40 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative z-20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <SafetyCertificateOutlined className="text-xl text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide mb-1">
              EPR Kavach
            </h1>
            <p className="text-white/90 text-xs font-light tracking-wide">
              Recover account access securely
            </p>
          </div>

          <div className="relative z-20 space-y-3 my-auto">
            {[
              {
                icon: <SafetyCertificateOutlined className="text-white text-sm" />,
                title: "Secure Recovery",
                text: "Email-based verification before reset",
              },
              {
                icon: <TeamOutlined className="text-white text-sm" />,
                title: "Fast Access",
                text: "Complete reset in three guided steps",
              },
              {
                icon: <LineChartOutlined className="text-white text-sm" />,
                title: "Audit Ready",
                text: "Get back to client workflows quickly",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="group bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs mb-0.5">
                      {card.title}
                    </h3>
                    <p className="text-white/80 text-[10px]">{card.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative z-20 opacity-0">
            <p className="text-[10px] text-white/60 font-light">
              © 2025 EPR Kavach Audit. All rights reserved.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-[60%] bg-white p-8 md:p-10 flex flex-col justify-center relative max-h-[90vh] overflow-y-auto">
          <div className="max-w-sm mx-auto w-full">
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#20A65A] to-[#E85D40] text-white mb-3 shadow-lg">
                <SafetyCertificateOutlined className="text-lg" />
              </div>
              <h1 className="text-xl font-bold text-[#3D2E4A]">EPR Kavach</h1>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                {[1, 2, 3].map((stepIndex) => {
                  const isActive = stepIndex === step;
                  const isDone = stepIndex < step;
                  return (
                    <div
                      key={stepIndex}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        isDone || isActive ? "bg-[#E85D40]" : "bg-[#E4E0DC]"
                      }`}
                    />
                  );
                })}
              </div>
              <h2 className="text-2xl font-bold text-[#3D2E4A] mb-1 tracking-tight">
                {stepMeta.title}
              </h2>
              <p className="text-[#706B77] text-xs">
                {step === 2
                  ? `${stepMeta.description} for ${email}`
                  : stepMeta.description}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-xs flex items-center">
                <ExclamationCircleOutlined className="mr-2 text-sm" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg text-xs flex items-center">
                <CheckCircleOutlined className="mr-2 text-sm" />
                <span className="flex-1">{success}</span>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-semibold text-[#3D2E4A] mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative group">
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border border-[#E4E0DC] transition-all pl-10"
                      placeholder="name@company.com"
                      required
                    />
                    <MailOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E85D40] text-white py-2.5 rounded-lg font-bold shadow-md shadow-orange-500/20 hover:bg-[#F27519] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Code"
                  )}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div className="text-center mb-1">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FCE5D4] mb-3">
                    <FaKey className="text-xl text-[#E85D40]" />
                  </div>
                  <p className="text-xs text-[#706B77]">
                    Paste the code or type it one digit at a time.
                  </p>
                </div>

                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpInputRefs.current[index] = element;
                      }}
                      id={`forgot-otp-${index}`}
                      inputMode="numeric"
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-12 text-center text-lg font-bold bg-[#F4F1ED] border border-[#E4E0DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white text-[#3D2E4A]"
                      aria-label={`OTP digit ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E85D40] text-white py-2.5 rounded-lg font-bold shadow-md shadow-orange-500/20 hover:bg-[#F27519] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      resetMessages();
                      setStep(1);
                    }}
                    className="text-[#706B77] hover:text-[#3D2E4A] font-medium transition-colors"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || loading}
                    className={`font-medium transition-colors ${
                      resendTimer > 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-[#E85D40] hover:text-[#F27519]"
                    }`}
                  >
                    {resendTimer > 0
                      ? `Resend in ${resendTimer}s`
                      : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-semibold text-[#3D2E4A] mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative group">
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border border-[#E4E0DC] transition-all pl-10"
                      placeholder="Enter a new password"
                      required
                      minLength={6}
                    />
                    <LockOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-semibold text-[#3D2E4A] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F4F1ED] rounded-lg text-sm text-[#3D2E4A] placeholder-[#706B77] focus:outline-none focus:ring-2 focus:ring-[#E85D40] focus:bg-white border border-[#E4E0DC] transition-all pl-10"
                      placeholder="Confirm your new password"
                      required
                      minLength={6}
                    />
                    <LockOutlined className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#706B77] group-focus-within:text-[#E85D40] transition-colors duration-300 text-xs" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E85D40] text-white py-2.5 rounded-lg font-bold shadow-md shadow-orange-500/20 hover:bg-[#F27519] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-xs text-[#706B77] hover:text-[#3D2E4A] font-medium transition-colors"
              >
                <FaArrowLeft className="mr-2" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
