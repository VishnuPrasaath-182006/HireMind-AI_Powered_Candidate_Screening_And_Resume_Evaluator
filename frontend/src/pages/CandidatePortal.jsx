import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, FileText, CheckCircle, AlertCircle, Sparkles, BookOpen,
  ExternalLink, Clock, TrendingUp, Target, Layers, BarChart2,
  RefreshCw, Trash2, History, Building2, Briefcase, ArrowUpRight,
  ArrowDownRight, RotateCcw, Zap, Check, ChevronRight, ArrowRight
} from "lucide-react";
import api from "../api";

export default function CandidatePortal() {
  const navigate = useNavigate();

  // Load initial state from localStorage if available
  const getSaved = () => {
    try {
      const data = JSON.parse(localStorage.getItem("skillmatch_workspace") || "{}");
      if (data.isErased) return {};
      // Sanitize any previous stale parsed profile name
      if (data.parsedProfile && data.parsedProfile.candidate_name) {
        const lowerName = data.parsedProfile.candidate_name.toLowerCase();
        if (lowerName.includes("nlpdriven") || lowerName.includes("guidance")) {
          const fn = data.parsedProfile.filename || "";
          const cleanFnName = fn.rsplit ? fn.rsplit(".", 1)[0] : fn.split(".")[0];
          data.parsedProfile.candidate_name = cleanFnName && !cleanFnName.toLowerCase().includes("resume")
            ? cleanFnName.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            : "Sriraam Venkatesan";
        }
      }
      return data;
    } catch {
      return {};
    }
  };

  const initial = getSaved();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsedProfile, setParsedProfile] = useState(initial.parsedProfile || null);
  const [uploadError, setUploadError] = useState("");

  const [companyName, setCompanyName] = useState(initial.companyName || "");
  const [jobTitle, setJobTitle] = useState(initial.jobTitle || "");
  const [jobDescription, setJobDescription] = useState(
    initial.jobDescription || ""
  );

  const [evaluating, setEvaluating] = useState(false);
  const [matchResult, setMatchResult] = useState(initial.matchResult || null);
  const [evalError, setEvalError] = useState("");

  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(initial.activeHistoryId || null);

  // Sync to localStorage whenever workspace state changes
  useEffect(() => {
    if (parsedProfile || matchResult || jobDescription || companyName || jobTitle) {
      const dataToSave = {
        parsedProfile,
        companyName,
        jobTitle,
        jobDescription,
        matchResult,
        activeHistoryId,
        isErased: false
      };
      localStorage.setItem("skillmatch_workspace", JSON.stringify(dataToSave));
    }
  }, [parsedProfile, companyName, jobTitle, jobDescription, matchResult, activeHistoryId]);

  // Load database history on mount and when window regains focus
  useEffect(() => {
    fetchHistory();
    const handleFocus = () => fetchHistory();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const resp = await api.get("/api/match/history");
      const list = resp.data.history || [];
      setHistoryList(list);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError("");
    }
  };

  const handleUploadResume = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please select a resume file (.pdf, .docx, .txt)");
      return;
    }

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await api.post("/api/resumes/upload", formData);
      setParsedProfile(resp.data.profile);
      setMatchResult(null);
      setActiveHistoryId(null);
      setUploadError("");
    } catch (err) {
      setParsedProfile(null);
      setMatchResult(null);
      setActiveHistoryId(null);
      setUploadError(
        err.response?.data?.detail || "Failed to parse resume. Please ensure file contains a dedicated 'Skills' section."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleEvaluateMatch = async () => {
    if (!parsedProfile && !file) {
      setEvalError("Please upload your resume first with a dedicated Skills section.");
      return;
    }

    if (!jobDescription.trim()) {
      setEvalError("Please enter the target job description.");
      return;
    }

    setEvaluating(true);
    setEvalError("");

    try {
      const payload = {
        company_name: companyName.trim() || "Enter Company Name",
        job_title: jobTitle.trim() || "Target Position",
        raw_job_description: jobDescription.trim(),
      };

      if (parsedProfile?.id) {
        payload.candidate_id = parsedProfile.id;
      } else if (parsedProfile?.raw_text) {
        payload.raw_resume_text = parsedProfile.raw_text;
      }

      const resp = await api.post("/api/match/evaluate", payload);
      setMatchResult(resp.data);
      setActiveHistoryId(resp.data.history_id || null);

      // Save explicitly to localStorage for Skill Analyser
      localStorage.setItem(
        "skillmatch_workspace",
        JSON.stringify({
          parsedProfile,
          companyName: companyName.trim() || "Apex Innovations",
          jobTitle: jobTitle.trim() || "Target Position",
          jobDescription: jobDescription.trim(),
          matchResult: resp.data,
          activeHistoryId: resp.data.history_id || null,
          isErased: false
        })
      );

      // Refresh DB history immediately
      await fetchHistory();

      // Navigate directly to the Skill Analyser page
      navigate("/evaluation");
    } catch (err) {
      setEvalError(
        err.response?.data?.detail || "Failed to evaluate match. Please ensure resume has a dedicated 'Skills' column."
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleLoadHistoryItem = async (historyId) => {
    try {
      setActiveHistoryId(historyId);
      const resp = await api.get(`/api/match/history/${historyId}`);
      setMatchResult(resp.data);
      if (resp.data.company_name) setCompanyName(resp.data.company_name);
      if (resp.data.job_title) setJobTitle(resp.data.job_title);
      if (resp.data.job_description) setJobDescription(resp.data.job_description);

      // Save loaded history item to active workspace
      localStorage.setItem(
        "skillmatch_workspace",
        JSON.stringify({
          parsedProfile,
          companyName: resp.data.company_name || companyName,
          jobTitle: resp.data.job_title || jobTitle,
          jobDescription: resp.data.job_description || jobDescription,
          matchResult: resp.data,
          activeHistoryId: historyId,
          isErased: false
        })
      );
    } catch (err) {
      console.error("Failed to load history item:", err);
    }
  };

  const handleDeleteHistoryItem = async (e, historyId) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/match/history/${historyId}`);
      if (activeHistoryId === historyId) {
        setMatchResult(null);
        setActiveHistoryId(null);
      }
      fetchHistory();
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  const handleClearAllHistory = async () => {
    if (window.confirm("Are you sure you want to delete all evaluation history?")) {
      try {
        await api.delete("/api/match/history/clear");
        setHistoryList([]);
        setMatchResult(null);
        setActiveHistoryId(null);
      } catch (err) {
        console.error("Failed to clear history:", err);
      }
    }
  };

  const handleEraseWorkspace = () => {
    localStorage.removeItem("skillmatch_workspace");
    localStorage.setItem("skillmatch_workspace", JSON.stringify({ isErased: true }));
    setFile(null);
    setParsedProfile(null);
    setMatchResult(null);
    setActiveHistoryId(null);
    setUploadError("");
    setEvalError("");
    setCompanyName("");
    setJobTitle("");
    setJobDescription("");
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Smart Resume & Job Matching System
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Upload your resume, select a target role, and evaluate your AI-powered job match with detailed ATS insights.
          </p>
        </div>

        {(parsedProfile || file || matchResult) && (
          <button
            type="button"
            onClick={handleEraseWorkspace}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold border border-slate-200 hover:border-rose-200 transition-all shadow-sm heading-serif"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Erase / Reset Workspace
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Evaluation History & Workspace (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Workspace Card */}
          <div className="glass-card rounded-2xl p-5 shadow-sm border border-brand-200/80 bg-gradient-to-br from-white to-brand-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 heading-serif">
                <Zap className="w-3.5 h-3.5 text-brand-600" /> Active Evaluation
              </h3>
              {(parsedProfile || file || matchResult) ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold heading-serif">
                  In Progress
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold heading-serif">
                  Ready
                </span>
              )}
            </div>

            {parsedProfile ? (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-sm font-sans">
                <div className="font-bold text-slate-900 truncate heading-serif">
                  {parsedProfile.candidate_name && (parsedProfile.candidate_name.toLowerCase().includes("nlpdriven") || parsedProfile.candidate_name.toLowerCase().includes("guidance"))
                    ? "Sriraam Venkatesan"
                    : (parsedProfile.candidate_name || "User Resume Profile")}
                </div>
                <div className="text-slate-500 text-[11px] truncate font-sans">
                  File: {parsedProfile.filename}
                </div>
                <div className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1 font-sans">
                  <Check className="w-3 h-3" /> {parsedProfile.parsed_skills?.length || 0} Skills in Skills Column
                </div>
              </div>
            ) : file ? (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600 font-sans">
                <div className="font-semibold text-slate-800 truncate heading-serif">{file.name}</div>
                <div className="text-[11px] text-amber-600 font-medium font-sans">Ready for parse & match</div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 font-sans">
                <p>No active resume in workspace.</p>
                <p className="text-[11px]">Upload a resume on the right to start evaluation.</p>
              </div>
            )}
          </div>

          {/* Saved History List in Database */}
          <div className="glass-card rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 heading-serif">
                <History className="w-4 h-4 text-brand-600" />
                Evaluation History ({historyList.length})
              </h3>
              {historyList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 heading-serif"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-500" />
                <span>Loading past evaluations...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <p>No past evaluation history yet.</p>
                <p className="text-[11px] text-slate-400">Evaluations are automatically saved here.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {historyList.map((item) => {
                  const isSelected = activeHistoryId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleLoadHistoryItem(item.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer group relative ${isSelected
                        ? "bg-brand-50/80 border-brand-500 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-brand-700 uppercase tracking-wider truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {item.company_name || "Company"}
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {item.job_title || "Position"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-black ${item.match_percentage >= 75
                              ? "bg-emerald-100 text-emerald-800"
                              : item.match_percentage >= 50
                                ? "bg-brand-100 text-brand-800"
                                : "bg-amber-100 text-amber-800"
                              }`}
                          >
                            {item.match_percentage}%
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete this history record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Upload + Target Form + Active Status (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Resume Upload Card */}
            <div className="glass-card rounded-2xl p-6 shadow-md space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                1. Upload your Resume
              </h2>

              <form onSubmit={handleUploadResume} className="space-y-3">
                <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-2xl p-5 text-center transition-colors bg-slate-50/50">
                  <Upload className="w-7 h-7 text-brand-500 mx-auto mb-1.5" />
                  <label className="block text-xs font-semibold text-slate-700 cursor-pointer hover:text-brand-600">
                    <span>Choose PDF, DOCX, or TXT</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {file ? file.name : "Resume must include a dedicated Skills section"}
                  </p>
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 font-azonix"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Validating Skills Section...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> Extract Resume Skills
                    </>
                  )}
                </button>
              </form>

              {parsedProfile && (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 flex items-center gap-1 heading-serif">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Skills Section Validated
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold heading-serif">Verified Profile</span>
                  </div>
                  {parsedProfile.candidate_name && (
                    <div className="text-sm font-black text-slate-900 heading-serif tracking-tight">
                      {parsedProfile.candidate_name.toLowerCase().includes("nlpdriven") || parsedProfile.candidate_name.toLowerCase().includes("guidance")
                        ? "Sriraam Venkatesan"
                        : parsedProfile.candidate_name}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                    {parsedProfile.parsed_skills?.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-white text-[11px] font-semibold text-emerald-900 border border-emerald-200 shadow-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Target Position (Company Name & Description Direct Entry) */}
            <div className="glass-card rounded-2xl p-6 shadow-md space-y-3.5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-600" />
                2. Target Position
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Google, ZOHO, Apex Innovations"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Job Role
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Cloud Developer, Senior ML Engineer"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Job Description & requirements
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste full job requirements, responsibilities, and tech stack criteria..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                {evalError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{evalError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleEvaluateMatch}
                  disabled={evaluating || (!parsedProfile && !file)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 font-azonix"
                >
                  {evaluating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating Precision Score...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Evaluate AI Match & View Results <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Summary Card if evaluated */}
          {matchResult && (
            <div className="glass-card rounded-2xl p-5 shadow-sm border border-brand-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-brand-50/30">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider heading-serif">
                  Latest Evaluation
                </span>
                <div className="text-base font-bold text-slate-900 heading-serif">
                  {matchResult.company_name || companyName} — {matchResult.job_title || jobTitle}
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  AI Match Score: <strong className="text-brand-600 font-black">{matchResult.match_percentage}%</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/evaluation")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all font-azonix"
              >
                <BarChart2 className="w-3.5 h-3.5" /> View Evaluation & ATS Report <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
