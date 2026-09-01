import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await registerUser(name.trim(), email.trim().toLowerCase(), password, "student");
      const loginResult = await loginUser(email.trim().toLowerCase(), password);
      login(loginResult.access_token, loginResult.user);
      toast.success("Account created successfully!");
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to create student account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white">
      <Toaster position="top-right" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#25272F] border border-[#333642] text-[#E5F842] shadow-lg shadow-black/40 mb-4">
          <svg className="w-7 h-7 text-[#E5F842]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create Student Account
        </h2>
        <p className="mt-1 text-sm text-slate-400 font-medium">
          Start watching videos, querying with AI & tracking mastery
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#25272F] py-8 px-6 sm:px-10 rounded-3xl border border-[#333642] shadow-xl text-white">
          
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#18191E] text-white placeholder-slate-500 rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="student@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#18191E] text-white placeholder-slate-500 rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#18191E] text-white placeholder-slate-500 rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#18191E] text-white placeholder-slate-500 rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-extrabold text-[#121316] bg-[#E5F842] hover:bg-[#D6EA35] shadow-md shadow-black/30 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-[#E5F842] hover:underline">
              Sign in here
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
