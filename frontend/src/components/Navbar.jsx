import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Trophy,
  UserCheck,
  Briefcase,
  BarChart3,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Mail,
  Shield,
  Sun,
  Moon,
} from "lucide-react";
import api from "../api";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Theme Management (Light / Dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("hiremind_theme") || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("hiremind_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Close dropdown when clicking outside - called unconditionally at top level
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hide top navigation bar ONLY on /auth without violating React rules of hooks
  if (location.pathname === "/auth") {
    return null;
  }

  const token = sessionStorage.getItem("access_token");
  let user = null;
  try {
    const rawUser = sessionStorage.getItem("user_profile");
    if (rawUser) user = JSON.parse(rawUser);
  } catch (e) {
    user = null;
  }

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (e) {}
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("user_profile");
    localStorage.removeItem("user_profile");
    sessionStorage.removeItem("active_ranked_job");
    setProfileDropdownOpen(false);
    navigate("/auth", { replace: true });
  };

  const isActive = (path) => location.pathname === path;
  const userRole = (user?.role || "user").toLowerCase();

  // Navigation Items per Role: Recruiter has Dashboard & Candidate Ranking; User has Portal & Evaluation
  let navItems = [
    { label: "User Portal", path: "/candidate", icon: UserCheck },
    { label: "User Evaluation", path: "/evaluation", icon: BarChart3 },
  ];

  if (userRole === "recruiter") {
    navItems = [
      { label: "Recruiter Dashboard", path: "/recruiter", icon: Briefcase },
      { label: "Candidate Ranking", path: "/ranking", icon: Trophy },
    ];
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <Link
              to={token ? (userRole === "recruiter" ? "/recruiter" : "/candidate") : "/auth"}
              className="flex items-center gap-3 group"
            >
              <img
                src="/logo_squircle.png"
                alt="HireMind Logo"
                className="w-10 h-10 rounded-xl object-cover shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200"
              />
              <div className="flex flex-col">
                <span className="text-xl font-black font-adorn bg-gradient-to-r from-slate-900 via-brand-800 to-brand-600 dark:from-white dark:via-indigo-200 dark:to-brand-400 bg-clip-text text-transparent tracking-tight">
                  HireMind
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider -mt-0.5 hidden sm:block">
                  {userRole === "recruiter" ? "Recruiter Portal" : "User Portal"}
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Navigation Links & User Profile Dropdown */}
          <div className="hidden md:flex items-center gap-4">
            {token && (
              <div className="flex items-center space-x-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all duration-150 heading-serif ${active
                          ? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 shadow-xs font-bold border border-brand-200/80 dark:border-brand-800"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-semibold"
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {token ? (
              <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800 flex items-center gap-2" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center text-xs font-bold uppercase shadow-xs">
                    {user?.name ? user.name.charAt(0) : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900 dark:text-white leading-tight max-w-[130px] truncate heading-serif">
                      {user?.name || "User"}
                    </div>
                    <div className="text-[9px] text-brand-600 dark:text-brand-400 font-extrabold uppercase tracking-wider">
                      {userRole === "recruiter" ? "Recruiter" : "User"}
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${profileDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User Details Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-t-2xl">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-0.5 heading-serif">
                        Signed in as
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm truncate heading-serif">
                        {user?.name || "User Name"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {user?.email || "user@example.com"}
                      </div>
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold heading-serif">
                          <Shield className="w-3 h-3" /> Role: {userRole === "recruiter" ? "Recruiter" : "User"}
                        </span>
                      </div>
                    </div>

                    {/* Theme Switcher Options with Icons in User Details */}
                    <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1.5 px-1 heading-serif">
                        Theme Preference
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setTheme("light")}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all heading-serif ${theme === "light"
                              ? "bg-white text-amber-600 shadow-xs border border-slate-200/80 font-bold"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span>Light</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme("dark")}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all heading-serif ${theme === "dark"
                              ? "bg-slate-900 text-indigo-300 shadow-xs border border-slate-700 font-bold"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                          <Moon className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Dark</span>
                        </button>
                      </div>
                    </div>

                    {/* Logout Option */}
                    <div className="p-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors heading-serif"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out / Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Theme icon button when logged out */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                </button>
                <Link
                  to="/auth"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-500/20 transition-all"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between mb-2">
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">{user?.name || "User"}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</div>
            </div>
            <span className="px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-300 text-[10px] font-bold uppercase">
              {userRole === "recruiter" ? "Recruiter" : "User"}
            </span>
          </div>

          {/* Theme switcher on mobile */}
          <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Theme</span>
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-md ${theme === "light" ? "bg-white text-amber-500 shadow-xs" : "text-slate-500"}`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-md ${theme === "dark" ? "bg-slate-900 text-indigo-300 shadow-xs" : "text-slate-500"}`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium ${active ? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold" : "text-slate-600 dark:text-slate-300"}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center justify-center gap-2 transition-colors border border-rose-100 dark:border-rose-900"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
