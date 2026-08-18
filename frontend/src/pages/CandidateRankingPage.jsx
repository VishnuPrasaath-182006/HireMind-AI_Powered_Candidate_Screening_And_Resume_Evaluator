import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Trophy, ShieldAlert, BarChart3, Users, Filter, Search,
  ArrowUpDown, ExternalLink, CheckCircle, AlertCircle, Sparkles,
  RefreshCw, Award, Building2, Briefcase, ChevronRight, X,
  CheckCircle2, ArrowRight, TrendingUp, Sliders, Layers,
  Compass, Eye, Check, AlertOctagon, HelpCircle, Activity,
  Zap, PieChart, ShieldCheck, Download
} from "lucide-react";
import api from "../api";
export default function CandidateRankingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryJobId = searchParams.get("job_id");
  const storedJobId = sessionStorage.getItem("active_ranked_job");
  const initialJobId = queryJobId || storedJobId || "";
  let currentUser = null;
  try {
    const rawUser = sessionStorage.getItem("user_profile");
    if (rawUser) currentUser = JSON.parse(rawUser);
  } catch (e) {}
  const recruiterCompanyName = currentUser?.company_name || currentUser?.company || "Apex Innovations & Tech Labs";
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(initialJobId);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [rankingError, setRankingError] = useState("");
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all"); // all, top, qualified, review
  const [skillFilter, setSkillFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score_desc"); // score_desc, matched_desc, missing_asc, name_asc

  // Download Count Mode: "all", "top10", "custom"
  const [downloadMode, setDownloadMode] = useState("all");
  const [customDownloadCount, setCustomDownloadCount] = useState("10");

  // Active Candidate for SWOT Analysis Drawer
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [swotModalOpen, setSwotModalOpen] = useState(false);
  // Bias Audit Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [auditCandidate, setAuditCandidate] = useState(null);
  const [auditError, setAuditError] = useState("");
  useEffect(() => {
    initRankingPage();
  }, [initialJobId]);
  const initRankingPage = async () => {
    let targetJob = initialJobId;
    try {
      const resp = await api.get("/api/jobs/");
      const list = resp.data || [];
      setJobs(list);
      if (!targetJob && list.length > 0) {
        targetJob = String(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load jobs list:", e);
    }
    if (targetJob) {
      setSelectedJobId(targetJob);
      fetchLeaderboard(targetJob);
    }
  };
  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const resp = await api.get("/api/jobs/");
      const list = resp.data || [];
      setJobs(list);
      if (list.length > 0 && !selectedJobId) {
        setSelectedJobId(String(list[0].id));
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  };
  const fetchLeaderboard = async (jobId) => {
    setLoadingRanking(true);
    setRankingError("");
    try {
      const resp = await api.get(`/api/match/leaderboard/${jobId}`);
      setLeaderboardData(resp.data);
      if (resp.data.leaderboard && resp.data.leaderboard.length > 0) {
        setSelectedCandidate(resp.data.leaderboard[0]);
      }
    } catch (err) {
      setRankingError(
        err.response?.data?.detail || "Failed to load candidate ranking for this job."
      );
    } finally {
      setLoadingRanking(false);
    }
  };
  const handleRunBiasAudit = async (candidate) => {
    setAuditCandidate(candidate);
    setAuditModalOpen(true);
    setAuditLoading(true);
    setAuditResult(null);
    setAuditError("");
    try {
      const resp = await api.post("/api/metrics/bias/audit", {
        job_id: parseInt(selectedJobId, 10),
        candidate_id: candidate.candidate_id,
        threshold: 0.5,
      });
      setAuditResult(resp.data);
    } catch (err) {
      setAuditError(err.response?.data?.detail || "Failed to execute fairness audit.");
    } finally {
      setAuditLoading(false);
    }
  };
  // Filter & Sort Logic
  const allCandidates = leaderboardData?.leaderboard || [];
  // Collect all unique skills across candidates for quick filter pills
  const allSkillsSet = new Set();
  allCandidates.forEach((c) => {
    (c.matched_skills || []).forEach((s) => allSkillsSet.add(s));
  });
  const topSkillPills = Array.from(allSkillsSet).slice(0, 8);
  const filteredCandidates = allCandidates
    .filter((c) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (c.candidate_name || "").toLowerCase().includes(q);
        const emailMatch = (c.candidate_email || "").toLowerCase().includes(q);
        const skillMatch = (c.matched_skills || []).some((s) => s.toLowerCase().includes(q));
        if (!nameMatch && !emailMatch && !skillMatch) return false;
      }
      // 2. Score Tier Filter
      if (tierFilter === "top" && c.match_percentage < 75) return false;
      if (tierFilter === "qualified" && (c.match_percentage < 50 || c.match_percentage >= 75)) return false;
      if (tierFilter === "review" && c.match_percentage >= 50) return false;
      // 3. Skill Filter
      if (skillFilter !== "all") {
        const hasSkill = (c.matched_skills || []).some(
          (s) => s.toLowerCase() === skillFilter.toLowerCase()
        );
        if (!hasSkill) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score_desc") return b.calibrated_score - a.calibrated_score;
      if (sortBy === "matched_desc") return b.matched_skills_count - a.matched_skills_count;
      if (sortBy === "missing_asc") return a.missing_skills_count - b.missing_skills_count;
      if (sortBy === "name_asc") return (a.candidate_name || "").localeCompare(b.candidate_name || "");
      return 0;
    });
  // Helper to generate the exact filename format: Company_Name=>Job_Profile-no_of_candidates.ext
  const generateDownloadFileName = (count = 0, ext = "csv") => {
    const rawCompany = activeCompany || recruiterCompanyName || "Company";
    const rawJob = currentJob?.title || leaderboardData?.job_title || "Job_Profile";
    
    const cleanCompany = rawCompany.replace(/[/\\?%*:|"<>]/g, "").trim().replace(/\s+/g, "_");
    const cleanJob = rawJob.replace(/[/\\?%*:|"<>]/g, "").trim().replace(/\s+/g, "_");

    return `${cleanCompany}=>${cleanJob}-${count}.${ext}`;
  };

  // Instant Download & Export Handlers based on in-page dropdown selection (All, Top 10, Custom)
  const getSelectedCandidatesForExport = () => {
    if (!filteredCandidates || filteredCandidates.length === 0) return [];
    
    let count = filteredCandidates.length;
    if (downloadMode === "top10") {
      count = Math.min(10, filteredCandidates.length);
    } else if (downloadMode === "custom") {
      const customNum = parseInt(customDownloadCount, 10);
      if (!isNaN(customNum) && customNum > 0) {
        count = Math.min(customNum, filteredCandidates.length);
      } else {
        count = Math.min(10, filteredCandidates.length);
      }
    }
    return filteredCandidates.slice(0, count);
  };

  const handleDownloadFilteredCSV = () => {
    const selectedCandidatesToExport = getSelectedCandidatesForExport();
    if (!selectedCandidatesToExport || selectedCandidatesToExport.length === 0) {
      alert("No candidates match the current criteria to download.");
      return;
    }

    // Exact required columns: id, name, email, swot_score
    const headers = ["id", "name", "email", "swot_score"];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = selectedCandidatesToExport.map((c, idx) => {
      const candId = c.candidate_id || c.id || idx + 1;
      const candName = c.candidate_name || `User #${candId}`;
      const candEmail = c.candidate_email || "N/A";
      const swotScore = c.match_percentage || 0;

      return [
        candId,
        escapeCSV(candName),
        escapeCSV(candEmail),
        swotScore
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const fileName = generateDownloadFileName(selectedCandidatesToExport.length, "csv");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFilteredJSON = () => {
    const selectedCandidatesToExport = getSelectedCandidatesForExport();
    if (!selectedCandidatesToExport || selectedCandidatesToExport.length === 0) {
      alert("No candidates match the current criteria to download.");
      return;
    }

    // Exact required fields: id, name, email, swot_score
    const dataToExport = selectedCandidatesToExport.map((c, idx) => ({
      id: c.candidate_id || c.id || idx + 1,
      name: c.candidate_name || `User #${c.candidate_id || idx + 1}`,
      email: c.candidate_email || "N/A",
      swot_score: c.match_percentage || 0
    }));

    const fileName = generateDownloadFileName(selectedCandidatesToExport.length, "json");
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Target Job Details
  const currentJob = jobs.find((j) => String(j.id) === String(selectedJobId));
  const activeCompany = currentJob?.company || leaderboardData?.job_title || recruiterCompanyName;
  // Compute Pool Statistics
  const totalCount = allCandidates.length;
  const eligibleCount = allCandidates.filter((c) => c.match_percentage >= 75).length;
  const qualifiedCount = allCandidates.filter((c) => c.match_percentage >= 50 && c.match_percentage < 75).length;
  const avgScore = totalCount > 0
    ? Math.round(allCandidates.reduce((acc, c) => acc + c.match_percentage, 0) / totalCount)
    : 0;
  const topScore = totalCount > 0 ? Math.max(...allCandidates.map((c) => c.match_percentage)) : 0;
  // Active SWOT profile
  const activeSwot = selectedCandidate?.swot || {
    candidate_name: selectedCandidate?.candidate_name || "Select a user",
    strengths: ["Strong verified technical foundation in skills column", "High semantic embedding similarity"],
    weaknesses: ["Missing advanced framework specialization"],
    opportunities: ["~14 hours estimated upskilling to reach 85%+ readiness"],
    threats: ["ATS keyword filtering risk without explicit JD terminology"],
    swot_scores: { strengths: 78, weaknesses: 25, opportunities: 82, threats: 20 },
    estimated_upskill_hours: 14,
    recommended_focus_area: "Cloud Architecture"
  };
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Recruiter Company Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700 mb-2 heading-serif">
            <Building2 className="w-3.5 h-3.5" /> Company: {activeCompany}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight heading-serif">
            {currentJob?.title || "Candidate Ranking & Leaderboard"}
          </h1>
          <p className="text-slate-600 text-sm mt-1 font-sans">
            Evaluated against target JD criteria with multi-factor calibrated AI scoring and SWOT analysis.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Download Count Mode Dropdown & Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
            <select
              value={downloadMode}
              onChange={(e) => setDownloadMode(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 heading-serif"
            >
              <option value="all">All Candidates ({filteredCandidates.length})</option>
              <option value="top10">Top 10 Candidates</option>
              <option value="custom">Custom Download</option>
            </select>

            {downloadMode === "custom" && (
              <input
                type="number"
                min="1"
                max={filteredCandidates.length || 100}
                value={customDownloadCount}
                onChange={(e) => setCustomDownloadCount(e.target.value)}
                placeholder="Count"
                className="w-16 text-xs font-bold text-slate-900 border border-brand-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white font-sans"
                title="Enter number of top candidates to download"
              />
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadFilteredCSV}
            disabled={filteredCandidates.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 heading-serif"
            title="Download CSV for selected candidates count"
          >
            <Download className="w-3.5 h-3.5" /> Download CSV ({getSelectedCandidatesForExport().length})
          </button>
          <button
            type="button"
            onClick={handleDownloadFilteredJSON}
            disabled={filteredCandidates.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm disabled:opacity-50 heading-serif"
            title="Export full JSON payload"
          >
            <Layers className="w-3.5 h-3.5 text-brand-600" /> JSON ({getSelectedCandidatesForExport().length})
          </button>
          <Link
            to="/recruiter"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm heading-serif"
          >
            <Briefcase className="w-3.5 h-3.5 text-brand-600" /> Back to Dashboard
          </Link>
        </div>
      </div>
      {/* KPI Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-brand-600" /> Total Evaluated
          </span>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-500">Active pool resumes</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Top Eligible (&ge; 75%)
          </span>
          <div className="text-2xl font-black text-emerald-800">{eligibleCount}</div>
          <div className="text-[11px] text-emerald-700">Immediate interview tier</div>
        </div>
        <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-brand-700 tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Top Calibrated Score
          </span>
          <div className="text-2xl font-black text-brand-800">{topScore}%</div>
          <div className="text-[11px] text-brand-700">Highest pool alignment</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-slate-600" /> Average Match Score
          </span>
          <div className="text-2xl font-black text-slate-800">{avgScore}%</div>
          <div className="text-[11px] text-slate-500">{qualifiedCount} qualified matches</div>
        </div>
      </div>
      {/* Candidate Filtering & Search Bar */}
      <div className="glass-card rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email, or skill..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          {/* Tier Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All", meta: "", count: totalCount },
              { id: "top", label: "Eligible", meta: "≥ 75%", count: eligibleCount },
              { id: "qualified", label: "Qualified", meta: "50-74%", count: qualifiedCount },
              { id: "review", label: "Review", meta: "< 50%", count: totalCount - eligibleCount - qualifiedCount }
            ].map((t) => {
              const isActive = tierFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTierFilter(t.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                    isActive
                      ? "bg-brand-600 text-white shadow-brand-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700"
                  }`}
                >
                  <span className="heading-serif">{t.label}</span>
                  {t.meta && (
                    <span className={`text-[11px] font-bold font-sans ${isActive ? "text-indigo-100" : "text-slate-600 dark:text-slate-400"}`}>
                      {t.meta}
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[11px] font-black tracking-tight font-sans ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1 heading-serif">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm focus:outline-none heading-serif"
            >
              <option value="score_desc">Highest Score</option>
              <option value="matched_desc">Most Matched Skills</option>
              <option value="missing_asc">Fewest Missing Skills</option>
              <option value="name_asc">User Name (A-Z)</option>
            </select>
          </div>
        </div>
        {/* Skill Filter Pills */}
        {topSkillPills.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
            <span className="text-xs font-bold text-slate-500 heading-serif">
              Skill Filters:
            </span>
            <button
              type="button"
              onClick={() => setSkillFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all heading-serif ${
                skillFilter === "all"
                  ? "bg-brand-100 text-brand-800 border border-brand-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Skills
            </button>
            {topSkillPills.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSkillFilter(skillFilter === s ? "all" : s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all heading-serif ${
                  skillFilter.toLowerCase() === s.toLowerCase()
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Main Ranking Grid & SWOT Analysis View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Candidate Leaderboard Cards & Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-brand-600" />
                Ranked Users ({filteredCandidates.length})
              </h3>
              {(skillFilter !== "all" || tierFilter !== "all" || searchQuery.trim()) && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  Filtered: {filteredCandidates.length} of {totalCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Click user to inspect SWOT</span>
            </div>
          </div>
          {loadingRanking ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-500" />
              <p className="text-sm font-semibold">Calculating multi-factor calibrated ranking...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No matching users found in pool</p>
              <p className="text-xs">Upload resumes in the Recruiter Dashboard or adjust search filters.</p>
              <Link
                to="/recruiter"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                Go to Recruiter Dashboard to Upload Resumes
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCandidates.map((cand) => {
                const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;
                const isTop = cand.rank === 1;
                const isSecond = cand.rank === 2;
                const isThird = cand.rank === 3;
                return (
                  <div
                    key={cand.candidate_id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs relative ${
                      isSelected
                        ? "bg-indigo-50/90 dark:bg-indigo-950/80 border-indigo-500 dark:border-indigo-400 shadow-md ring-2 ring-indigo-500/30"
                        : "bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Rank & Candidate Details */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm ${
                            isTop
                              ? "bg-amber-400 text-amber-950 ring-2 ring-amber-300"
                              : isSecond
                              ? "bg-slate-300 text-slate-800 ring-2 ring-slate-200"
                              : isThird
                              ? "bg-amber-600/80 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          #{cand.rank}
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm truncate">
                              {cand.candidate_name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                cand.match_percentage >= 75
                                  ? "bg-emerald-100 text-emerald-800"
                                  : cand.match_percentage >= 50
                                  ? "bg-brand-100 text-brand-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {cand.eligibility_tier}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {cand.candidate_email}
                          </div>
                          {/* Matched & Missing Skills Tags */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {cand.matched_skills?.slice(0, 4).map((s, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-semibold"
                              >
                                ✓ {s}
                              </span>
                            ))}
                            {cand.missing_skills?.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-semibold"
                              >
                                ✕ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Right: Calibrated Match Score Ring & Action */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Calibrated AI Match
                          </div>
                          <div
                            className={`text-xl font-black ${
                              cand.match_percentage >= 75
                                ? "text-emerald-600"
                                : cand.match_percentage >= 50
                                ? "text-brand-600"
                                : "text-amber-600"
                            }`}
                          >
                            {cand.match_percentage}%
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidate(cand);
                              setSwotModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors"
                          >
                            SWOT Graph
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunBiasAudit(cand);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
                            title="Run Fairness & Demographic Parity Audit"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* RIGHT COLUMN: Interactive SWOT Analysis Dashboard & Visual Graph (5 cols) */}
        <div className="lg:col-span-5 space-y-6 sticky top-6">
          <div className="glass-card rounded-2xl p-6 shadow-md border-2 border-indigo-200/80 bg-gradient-to-b from-white to-indigo-50/20 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" /> User SWOT Intelligence
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedCandidate?.candidate_name || "Select a User"}
                </h3>
              </div>
              {selectedCandidate && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    selectedCandidate.match_percentage >= 75
                      ? "bg-emerald-100 text-emerald-800"
                      : selectedCandidate.match_percentage >= 50
                      ? "bg-brand-100 text-brand-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {selectedCandidate.match_percentage}% Match
                </span>
              )}
            </div>
            {/* SWOT Visual Graph / Bar Quadrants */}
            <div className="space-y-3 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 heading-serif">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" /> SWOT Visual Readiness Graph
              </h4>
              {/* Strengths Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-700">S — Strengths Score</span>
                  <span className="text-emerald-800">{activeSwot.swot_scores?.strengths || 85}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${activeSwot.swot_scores?.strengths || 85}%` }}
                  />
                </div>
              </div>
              {/* Weaknesses Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-rose-700">W — Skill Gap Index</span>
                  <span className="text-rose-800">{activeSwot.swot_scores?.weaknesses || 25}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${activeSwot.swot_scores?.weaknesses || 25}%` }}
                  />
                </div>
              </div>
              {/* Opportunities Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-brand-700">O — Upskilling Velocity</span>
                  <span className="text-brand-800">{activeSwot.swot_scores?.opportunities || 80}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-300"
                    style={{ width: `${activeSwot.swot_scores?.opportunities || 80}%` }}
                  />
                </div>
              </div>
              {/* Threats Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-amber-700">T — ATS Filter / Domain Risk</span>
                  <span className="text-amber-800">{activeSwot.swot_scores?.threats || 20}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${activeSwot.swot_scores?.threats || 20}%` }}
                  />
                </div>
              </div>
            </div>
            {/* 4-Quadrant SWOT Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Strengths */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1 heading-serif">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Strengths
                </h4>
                <ul className="text-[11px] text-emerald-800 space-y-1 list-disc pl-3 font-medium">
                  {activeSwot.strengths?.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
              {/* Weaknesses */}
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1 heading-serif">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Weaknesses
                </h4>
                <ul className="text-[11px] text-rose-800 space-y-1 list-disc pl-3 font-medium">
                  {activeSwot.weaknesses?.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
              {/* Opportunities */}
              <div className="p-3.5 rounded-xl bg-brand-50/70 border border-brand-200 space-y-1.5">
                <h4 className="text-xs font-bold text-brand-900 flex items-center gap-1 heading-serif">
                  <TrendingUp className="w-3.5 h-3.5 text-brand-600" /> Opportunities
                </h4>
                <ul className="text-[11px] text-brand-800 space-y-1 list-disc pl-3 font-medium">
                  {activeSwot.opportunities?.map((o, idx) => (
                    <li key={idx}>{o}</li>
                  ))}
                </ul>
              </div>
              {/* Threats */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1 heading-serif">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-600" /> Threats
                </h4>
                <ul className="text-[11px] text-amber-800 space-y-1 list-disc pl-3 font-medium">
                  {activeSwot.threats?.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Quick Upskilling Recommendation */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs space-y-1">
              <div className="text-brand-300 font-bold uppercase tracking-wider text-[10px]">
                Target Upskilling Path
              </div>
              <p className="text-slate-300 leading-tight">
                Recommended focus on <strong>{activeSwot.recommended_focus_area}</strong> (~{activeSwot.estimated_upskill_hours}h lab) to achieve &gt; 85% role mastery.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Fairness & Bias Audit Modal */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <span>Fairness & Bias Audit (4/5ths Rule Verification)</span>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {auditLoading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs text-slate-500 font-medium">Running demographic parity & adverse impact analysis...</p>
              </div>
            ) : auditError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {auditError}
              </div>
            ) : auditResult ? (
              <div className="space-y-4 text-xs">
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  auditResult.disparate_impact_ratio >= 0.8
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider">
                      Adverse Impact Ratio
                    </div>
                    <div className="text-2xl font-black mt-0.5">
                      {auditResult.disparate_impact_ratio}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white shadow-xs">
                      {auditResult.is_fair ? "Compliant (>= 0.80)" : "Adverse Impact Flagged"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Demographic Parity Difference</div>
                    <div className="text-base font-bold text-slate-900">{auditResult.demographic_parity_difference}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Equal Opportunity Difference</div>
                    <div className="text-base font-bold text-slate-900">{auditResult.equal_opportunity_difference}</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1">
                  <div className="font-bold text-brand-300 uppercase text-[10px]">Compliance Verdict</div>
                  <p className="text-slate-300">{auditResult.verdict_summary}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}