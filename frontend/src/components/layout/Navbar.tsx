import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Shield,
  LogOut,
  ChevronDown,
  MessagesSquare,
  GraduationCap,
  Trophy,
  Award
} from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const user = authUser || { name: "User", email: "user@ex.com", role: "student" };

  const getInitials = (name: string) => {
    if (!name) return "US";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navItems = [
    { label: "Courses", path: "/courses", icon: BookOpen },
    ...(!isAdmin
      ? [
          { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
          { label: "Generate Quiz", path: "/quiz", icon: GraduationCap },
          { label: "My Scores", path: "/scores", icon: Trophy },
          { label: "Generate Summary", path: "/summary", icon: FileText },
          { label: "Generate Notes", path: "/notes", icon: FileText },
          { label: "Instructor Chat", path: "/doubts", icon: MessagesSquare }
        ]
      : [
          { label: "Student Q&A", path: "/doubts", icon: MessagesSquare },
          { label: "Mastery Roster", path: "/roster", icon: Award },
          { label: "Admin Panel", path: "/admin", icon: Shield, badge: "Admin" }
        ])
  ];

  const isActive = (path: string) => {
    if (path === "/courses") {
      return (
        (location.pathname === "/courses" || location.pathname.startsWith("/courses/") || location.pathname === "/") &&
        !location.pathname.includes("/roster") &&
        !location.pathname.includes("/mastery")
      );
    }
    if (path === "/roster") {
      return (
        location.pathname === "/roster" ||
        location.pathname.includes("/roster") ||
        location.pathname.includes("/mastery")
      );
    }
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
    }
    if (path === "/scores") {
      return location.pathname === "/scores" || location.pathname === "/quiz-history";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#18191E]/95 backdrop-blur-md border-b border-[#333642] shadow-sm shrink-0">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & Subtitle */}
          <div 
            onClick={() => navigate(isAdmin ? "/courses" : "/")}
            className="flex items-center gap-3.5 cursor-pointer select-none group"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#25272F] border border-[#333642] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <svg 
                className="w-6 h-6 text-[#E5F842]" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-lg tracking-tight">
                  VIDEO INTELLIGENCE
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-[#E5F842] text-[#121316] rounded-full">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block font-medium">
                Adaptive Learning & Performance Forecasting Platform
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#22242B] p-1.5 rounded-2xl border border-[#333642]">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-[#E5F842] text-[#121316] shadow-sm font-extrabold"
                      : "text-slate-400 hover:text-white hover:bg-[#2C2E37]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-[#121316]" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 text-[10px] font-extrabold rounded-md ${active ? "bg-[#121316] text-[#E5F842]" : "bg-[#E5F842] text-[#121316]"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile Pill / Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 p-1.5 pr-3.5 rounded-2xl bg-[#25272F] border border-[#333642] hover:border-[#E5F842]/60 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#E5F842] text-[#121316] flex items-center justify-center font-extrabold text-sm">
                {getInitials(user.name)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-bold text-white leading-tight">
                  {user.name}
                </div>
                <div className="text-[11px] font-medium text-slate-400 capitalize">
                  {isAdmin ? "Instructor / Admin" : "Learner Account"}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 bg-[#25272F] rounded-2xl shadow-2xl border border-[#333642] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-[#333642]">
                    <p className="text-sm font-bold text-white">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md ${
                      isAdmin ? "bg-[#E5F842] text-[#121316]" : "bg-[#2E313B] text-slate-300 border border-[#3C3F4D]"
                    }`}>
                      {isAdmin ? "Admin Account" : "Student Account"}
                    </span>
                  </div>

                  <div className="p-1.5 space-y-1">
                    {!isAdmin && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate("/scores");
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-[#18191E] hover:text-white font-semibold transition-colors cursor-pointer"
                      >
                        <Trophy className="w-4 h-4 text-[#E5F842]" />
                        My Quiz Scores & Attempts
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
