import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  GraduationCap
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser(email.trim().toLowerCase(), password);
      login(result.access_token, result.user);
      toast.success(`Welcome back, ${result.user.name}!`);
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  function setQuickCredentials(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
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
          Video Intelligence Platform
        </h2>
        <p className="mt-1 text-sm text-slate-400 font-medium">
          Sign in to your learning & forecasting workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#25272F] py-8 px-6 sm:px-10 rounded-3xl border border-[#333642] shadow-xl text-white">
          
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="user@ex.com"
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
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-extrabold text-[#121316] bg-[#E5F842] hover:bg-[#D6EA35] shadow-md shadow-black/30 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-[#333642]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setQuickCredentials("admin@ex.com", "password")}
                className="p-2.5 rounded-xl border border-[#333642] hover:border-[#E5F842]/50 bg-[#18191E] hover:bg-[#2E313B] text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#E5F842]">
                  <Shield className="w-3.5 h-3.5 text-[#E5F842]" />
                  Admin Account
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">admin@ex.com</p>
              </button>

              <button
                type="button"
                onClick={() => setQuickCredentials("user@ex.com", "password")}
                className="p-2.5 rounded-xl border border-[#333642] hover:border-[#E5F842]/50 bg-[#18191E] hover:bg-[#2E313B] text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <GraduationCap className="w-3.5 h-3.5 text-[#E5F842]" />
                  Student Account
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">user@ex.com</p>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-[#E5F842] hover:underline">
              Create student account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
