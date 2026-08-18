import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Calendar,
  Briefcase,
  UserCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";
import api from "../api";

export default function AuthPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sign In State
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  // Sign Up State
  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: "",
    c_password: "",
    phone_no: "",
    dob: "", // formatted as DD/MM/YYYY
    role: "user",
    company_name: "",
    company_id: "",
    otp: "",
  });

  // Helper for DD/MM/YYYY date formatting on input
  const handleDobChange = (e) => {
    let val = e.target.value.replace(/\D/g, ""); // digits only
    if (val.length > 8) val = val.slice(0, 8);

    let formatted = "";
    if (val.length <= 2) {
      formatted = val;
    } else if (val.length <= 4) {
      formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
    } else {
      formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4, 8)}`;
    }
    setSignUpData((prev) => ({ ...prev, dob: formatted }));
  };

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const handleSendOtp = async () => {
    if (!signUpData.email || !signUpData.email.includes("@")) {
      setErrorMsg("Please enter a valid email address first to receive the OTP.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setSendingOtp(true);

    try {
      const resp = await api.post("/api/auth/send-otp", {
        email: signUpData.email.trim(),
        name: signUpData.name.trim() || "User",
      });

      setOtpSent(true);
      // Clean user input without autofilling so user manually enters the code from their email
      setSignUpData((prev) => ({ ...prev, otp: "" }));
      setSuccessMsg(`Verification code has been sent to ${signUpData.email}. Please check your inbox and enter the code below.`);
      setOtpTimer(60);
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to send verification code.";
      setErrorMsg(detail);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const response = await api.post("/api/auth/signin", {
        email: signInData.email.trim(),
        password: signInData.password,
      });

      const { access_token, user } = response.data;
      sessionStorage.setItem("access_token", access_token);
      localStorage.removeItem("access_token");
      sessionStorage.setItem("user_profile", JSON.stringify(user));
      localStorage.removeItem("user_profile");

      if (user.role === "recruiter") {
        navigate("/recruiter", { replace: true });
      } else {
        navigate("/candidate", { replace: true });
      }
    } catch (err) {
      const detail =
        err.response?.data?.detail || "Invalid email or password. Please try again.";
      setErrorMsg(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!signUpData.email || !signUpData.email.includes("@")) {
      setErrorMsg("Please provide a valid email address.");
      return;
    }

    if (!signUpData.otp || signUpData.otp.trim().length !== 6) {
      setErrorMsg("Please click 'Send OTP' and enter the 6-digit verification code sent to your email.");
      return;
    }

    // Validate and convert DD/MM/YYYY to YYYY-MM-DD
    let isoDob = "2000-01-01";
    if (signUpData.dob) {
      const parts = signUpData.dob.split("/");
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= new Date().getFullYear()) {
          isoDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          setErrorMsg("Please enter a valid Date of Birth in DD/MM/YYYY format.");
          return;
        }
      } else {
        setErrorMsg("Please enter Date of Birth in DD/MM/YYYY format (e.g. 15/08/2000).");
        return;
      }
    } else {
      setErrorMsg("Please enter your Date of Birth in DD/MM/YYYY format.");
      return;
    }

    if (signUpData.password !== signUpData.c_password) {
      setErrorMsg("Password and Confirm Password do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/auth/signup", {
        name: signUpData.name.trim(),
        email: signUpData.email.trim(),
        password: signUpData.password,
        c_password: signUpData.c_password,
        phone_no: signUpData.phone_no ? signUpData.phone_no.trim() : "9876543210",
        dob: isoDob,
        role: signUpData.role,
        company_name: signUpData.role === "recruiter" ? signUpData.company_name.trim() : null,
        company_id: signUpData.role === "recruiter" ? (signUpData.company_id || "").trim() : null,
        otp: signUpData.otp.trim(),
      });

      const { access_token, user } = response.data;
      sessionStorage.setItem("access_token", access_token);
      localStorage.removeItem("access_token");
      sessionStorage.setItem("user_profile", JSON.stringify(user));
      localStorage.removeItem("user_profile");

      if (user.role === "recruiter") {
        navigate("/recruiter", { replace: true });
      } else {
        navigate("/candidate", { replace: true });
      }
    } catch (err) {
      const detail =
        err.response?.data?.detail || "Registration failed. Please check your inputs.";
      setErrorMsg(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Top Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-3 rounded-2xl shadow-xl shadow-indigo-500/25 overflow-hidden hover:scale-105 transition-transform duration-200">
            <img src="/logo_squircle.png" alt="HireMind Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome to HireMind
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Intelligent AI Resume Screening & Multi-Factor Ranking Platform
          </p>
        </div>

        {/* Card Container */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-100/90 rounded-xl mb-6 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-150 heading-serif ${!isSignUp
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-150 heading-serif ${isSignUp
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Create Account
            </button>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 font-sans">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2 font-sans">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          {!isSignUp ? (
            /* SIGN IN FORM */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 heading-serif">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signInData.email}
                    onChange={(e) =>
                      setSignInData({ ...signInData, email: e.target.value })
                    }
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 heading-serif">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={signInData.password}
                    onChange={(e) =>
                      setSignInData({ ...signInData, password: e.target.value })
                    }
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 font-azonix"
              >
                {loading ? "Signing In..." : "Sign In to HireMind"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500 font-sans">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="font-bold text-brand-600 hover:text-brand-700 hover:underline heading-serif"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* SIGN UP FORM */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={signUpData.name}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, name: e.target.value })
                    }
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={signUpData.email}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, email: e.target.value })
                      }
                      placeholder="jane.doe@example.com"
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !signUpData.email}
                    className="px-3.5 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                  >
                    {sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                  </button>
                </div>
              </div>

              {/* Email Verification OTP Code Input Field (Shown ONLY after clicking Send OTP) */}
              {otpSent && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Verification Code (OTP)
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      value={signUpData.otp}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, otp: e.target.value })
                      }
                      placeholder="Enter 6-digit OTP code sent to your email"
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>
              )}

              {/* Role Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSignUpData({ ...signUpData, role: "user" })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${signUpData.role === "user" || signUpData.role === "user"
                      ? "bg-brand-50 border-brand-500 text-brand-700 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" /> User
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSignUpData({ ...signUpData, role: "recruiter" })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${signUpData.role === "recruiter"
                      ? "bg-brand-50 border-brand-500 text-brand-700 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" /> Recruiter
                  </button>
                </div>
              </div>

              {/* Recruiter Company Name and Company ID Inputs */}
              {signUpData.role === "recruiter" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Company Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required={signUpData.role === "recruiter"}
                        value={signUpData.company_name}
                        onChange={(e) =>
                          setSignUpData({ ...signUpData, company_name: e.target.value })
                        }
                        placeholder="e.g. Google, Zoho, Microsoft, Apex Innovations"
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Company ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Shield className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required={signUpData.role === "recruiter"}
                        value={signUpData.company_id}
                        onChange={(e) =>
                          setSignUpData({ ...signUpData, company_id: e.target.value })
                        }
                        placeholder="e.g. CMP-84920, APEX-1001, GOOG-CORP-01"
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    autoComplete="off"
                    value={signUpData.phone_no}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, phone_no: e.target.value })
                    }
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 whitespace-nowrap">
                    Date of Birth (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    autoComplete="off"
                    value={signUpData.dob}
                    onChange={handleDobChange}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={signUpData.password}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, password: e.target.value })
                    }
                    placeholder="Password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={signUpData.c_password}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, c_password: e.target.value })
                    }
                    placeholder="Confirm"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 font-azonix"
              >
                {loading ? "Creating Account..." : "Create Account"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

