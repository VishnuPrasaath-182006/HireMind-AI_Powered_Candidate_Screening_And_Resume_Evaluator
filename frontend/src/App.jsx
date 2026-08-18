import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import CandidatePortal from "./pages/CandidatePortal";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import CandidateRankingPage from "./pages/CandidateRankingPage";
import UserEvaluationPage from "./pages/UserEvaluationPage";

function RoleBasedRedirect() {
  const token = sessionStorage.getItem("access_token");
  if (!token) return <Navigate to="/auth" replace />;

  let user = null;
  try {
    const raw = sessionStorage.getItem("user_profile");
    if (raw) user = JSON.parse(raw);
  } catch (e) {}

  if (user?.role?.toLowerCase() === "recruiter") {
    return <Navigate to="/recruiter" replace />;
  }
  return <Navigate to="/candidate" replace />;
}

export default function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("hiremind_theme") || "light";
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="app-background text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />

            <Route
              path="/candidate"
              element={
                <ProtectedRoute>
                  <CandidatePortal />
                </ProtectedRoute>
              }
            />

            <Route
              path="/recruiter"
              element={
                <ProtectedRoute>
                  <RecruiterDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ranking"
              element={
                <ProtectedRoute>
                  <CandidateRankingPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/evaluation"
              element={
                <ProtectedRoute>
                  <UserEvaluationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/metrics"
              element={
                <ProtectedRoute>
                  <UserEvaluationPage />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="*" element={<RoleBasedRedirect />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
