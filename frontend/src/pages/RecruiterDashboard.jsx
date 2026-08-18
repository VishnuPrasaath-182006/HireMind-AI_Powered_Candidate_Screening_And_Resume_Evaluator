import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Briefcase, Upload, FolderUp, FileArchive, Trophy, ShieldAlert,
  BarChart3, Users, CheckCircle, AlertCircle, Sparkles, RefreshCw,
  Award, Building2, Trash2, History, RotateCcw, Check, FileText,
  Layers, ArrowRight, Clock, ExternalLink, Filter, HelpCircle,
  FileCheck2, AlertOctagon, PlusCircle, CheckCircle2, SlidersHorizontal,
  FileCode, Database, UserCheck, HardDrive
} from "lucide-react";
import api from "../api";

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // Get current logged-in user profile to obtain company name
  let currentUser = null;
  try {
    const rawUser = sessionStorage.getItem("user_profile");
    if (rawUser) currentUser = JSON.parse(rawUser);
  } catch (e) { }

  const userCompanyName = currentUser?.company_name || currentUser?.company || "Apex Innovations & Tech Labs";

  // Upload & Extraction State (supports large archives with 100+ files)
  const [uploadMode, setUploadMode] = useState("zip"); // zip, folder, multi
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");
  const [batchUploadResult, setBatchUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");

  // Existing Candidate Profiles in Database
  const [candidatePool, setCandidatePool] = useState([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [clearingPool, setClearingPool] = useState(false);

  // Target Job Description (JD) Inputs (Persisted so page changes/ranking results do not reset it)
  const [customJd, setCustomJd] = useState(() => {
    try {
      const saved = localStorage.getItem("recruiter_custom_jd");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      title: "Lead Cloud & AI Engineer",
      required_skills: "Python, FastAPI, Docker, PostgreSQL, Kubernetes, AWS, Microservices, REST API, AI/ML",
      description: "Lead cloud and AI engineering projects, build scalable microservices, deploy AI solutions, and manage Kubernetes-based cloud infrastructure.",
      min_experience_years: 2.0
    };
  });

  // Save customJd to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("recruiter_custom_jd", JSON.stringify(customJd));
    } catch (e) {}
  }, [customJd]);

  // Ranking trigger state
  const [ranking, setRanking] = useState(false);
  const [rankError, setRankError] = useState("");

  const handleRefreshWorkspace = () => {
    setCustomJd({
      title: "",
      required_skills: "",
      description: "",
      min_experience_years: 2.0
    });
    setSelectedFiles([]);
    setBatchUploadResult(null);
    setUploadError("");
    setRankError("");
    try {
      localStorage.removeItem("recruiter_custom_jd");
    } catch (e) {}
  };

  useEffect(() => {
    fetchCandidatePool();
  }, []);

  const fetchCandidatePool = async () => {
    setLoadingPool(true);
    try {
      const resp = await api.get("/api/resumes/");
      setCandidatePool(resp.data || []);
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoadingPool(false);
    }
  };

  const handleClearAllResumes = async () => {
    if (!window.confirm("Are you sure you want to clear all candidate resume profiles from the database?")) {
      return;
    }
    setClearingPool(true);
    try {
      await api.delete("/api/resumes/clear");
      setCandidatePool([]);
      setBatchUploadResult(null);
      setSelectedFiles([]);
    } catch (err) {
      console.error("Failed to clear resumes:", err);
    } finally {
      setClearingPool(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles(filesArr);
      setUploadError("");
    }
  };

  const handleUploadBatch = async (e) => {
    e?.preventDefault();
    if (selectedFiles.length === 0) {
      setUploadError("Please select a ZIP archive, folder, or resume files first.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadProgressMsg(
      selectedFiles.length > 1
        ? `Unpacking and evaluating ${selectedFiles.length} resume files with Skills validation...`
        : "Unpacking large ZIP archive and parsing 100+ resumes with Skills validation..."
    );

    const formData = new FormData();
    selectedFiles.forEach((f) => {
      formData.append("files", f);
    });

    try {
      const resp = await api.post("/api/resumes/batch-upload", formData);
      setBatchUploadResult(resp.data);
      await fetchCandidatePool();
      setSelectedFiles([]);
    } catch (err) {
      console.error("Batch upload error:", err);
      const detail = err.response?.data?.detail || err.message;
      setUploadError(
        detail || "Failed to process batch upload. Please ensure files are valid resumes (.pdf, .docx, .txt, .zip)."
      );
    } finally {
      setUploading(false);
      setUploadProgressMsg("");
    }
  };

  const handleRankAllAndNavigate = async () => {
    if (!customJd.title.trim() || !customJd.description.trim()) {
      setRankError("Please fill in Job Title, Required Skills, and Job Description criteria.");
      return;
    }

    setRanking(true);
    setRankError("");
    setUploadError("");

    try {
      // If recruiter has selected resume files or a ZIP file, auto-upload & unpack them first
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((f) => {
          formData.append("files", f);
        });
        try {
          const upResp = await api.post("/api/resumes/batch-upload", formData);
          setBatchUploadResult(upResp.data);
          await fetchCandidatePool();
        } catch (uploadErr) {
          console.error("Upload error during ranking:", uploadErr);
          const detail = uploadErr.response?.data?.detail || uploadErr.message;
          setUploadError(detail || "Failed to process selected batch resumes.");
          setRanking(false);
          return;
        }
      }

      const skillsArray = customJd.required_skills
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);

      // Use POST /api/jobs/create endpoint with all required attributes
      const resp = await api.post("/api/jobs/create", {
        title: customJd.title.trim() || "Lead Cloud & AI Engineer",
        company: userCompanyName || "Apex Innovations",
        description: customJd.description.trim(),
        required_skills: skillsArray,
        min_experience_years: parseFloat(customJd.min_experience_years) || 2.0,
      });

      const targetJobId = String(resp.data.id);

      // Keep inputs preserved in the dashboard; do not wipe out inputs
      // Navigate directly to the Candidate Ranking Page
      navigate(`/ranking?job_id=${targetJobId}`);
    } catch (err) {
      console.error("Job create error:", err);
      const detail = err.response?.data?.detail || err.message;
      setRankError(detail || "Failed to create target Job Description.");
      setRanking(false);
    }
  };

  // Active candidates count based on chosen dataset source
  const activeCandidatesCount = candidatePool.length;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header (Direct Link to Ranking removed as requested) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Batch Resume Intake & Candidate Ranking Engine
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Upload large ZIP archives with 100+ resumes, configure target JD criteria, and execute multi-factor calibrated ranking.
          </p>
        </div>
      </div>

      {/* Main Grid: Upload Section (6 cols) + Target Position & Dataset Card (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* LEFT: Batch Resume Upload (Supports 100+ Resumes & Large ZIPs) */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          <div className="glass-card rounded-2xl p-6 shadow-md flex-1 flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-brand-600" />
                1. Batch Resume Upload (ZIP / Folder / Multi-File)
              </h2>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                100+ Resumes Supported
              </span>
            </div>

            {/* Upload Format Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100/80 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setUploadMode("zip");
                  setSelectedFiles([]);
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all heading-serif ${uploadMode === "zip"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <FileArchive className="w-3.5 h-3.5" /> ZIP Archive (.zip)
              </button>

              <button
                type="button"
                onClick={() => {
                  setUploadMode("folder");
                  setSelectedFiles([]);
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all heading-serif ${uploadMode === "folder"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <FolderUp className="w-3.5 h-3.5" /> Entire Folder
              </button>

              <button
                type="button"
                onClick={() => {
                  setUploadMode("multi");
                  setSelectedFiles([]);
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all heading-serif ${uploadMode === "multi"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Layers className="w-3.5 h-3.5" /> Multi-Resumes
              </button>
            </div>

            {/* Drag & Drop File Zone */}
            <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-2xl p-8 text-center transition-colors bg-slate-50/50 space-y-3 flex-1 flex flex-col items-center justify-center min-h-[260px]">
              <Upload className="w-8 h-8 text-brand-500 mx-auto" />

              <div>
                <label className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer heading-serif block">
                  <span>
                    {uploadMode === "zip"
                      ? "Click to choose large .ZIP Archive (Up to 100+ resumes)"
                      : uploadMode === "folder"
                        ? "Click to choose Folder Directory (All resumes inside)"
                        : "Click to select multiple PDF/DOCX/TXT files"}
                  </span>

                  {uploadMode === "zip" && (
                    <input
                      ref={zipInputRef}
                      type="file"
                      accept=".zip,.pdf,.docx,.doc,.txt"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  )}

                  {uploadMode === "folder" && (
                    <input
                      ref={folderInputRef}
                      type="file"
                      webkitdirectory="true"
                      directory="true"
                      multiple
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  )}

                  {uploadMode === "multi" && (
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,.pdf,.docx,.doc,.txt"
                      multiple
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  )}
                </label>
                <p className="text-[11px] text-slate-500 mt-1 font-sans">
                  Supports bulk extraction of 100+ resumes with automated Skills column validation
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="w-full p-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span className="truncate">
                      {selectedFiles.length === 1
                        ? selectedFiles[0].name
                        : `${selectedFiles.length} files selected (${selectedFiles[0].name}, ...)`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-slate-400 hover:text-rose-600 text-xs px-2 py-0.5 rounded bg-white/60 border border-brand-200 flex-shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleUploadBatch}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 font-azonix"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {uploadProgressMsg || "Evaluating batch resumes..."}
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" /> Parse & Extract Resumes Batch ({selectedFiles.length} Selected)
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT: Target Position & Leaderboard Ranking (Form strictly matching User Image 1) */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          <div className="glass-card rounded-2xl p-6 shadow-md flex-1 flex flex-col justify-between space-y-5 border-2 border-brand-200/80 bg-gradient-to-br from-white to-brand-50/20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brand-600" />
                2. Target Position & Leaderboard Ranking
              </h2>
              <button
                type="button"
                onClick={handleRefreshWorkspace}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-brand-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                title="Clear job title, skills, and description fields"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" /> Refresh Workspace
              </button>
            </div>

            {/* FORM FIELDS (Job Title, Required Skills, Target JD Criteria) */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-brand-200/80 shadow-xs space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 heading-serif">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={customJd.title}
                    onChange={(e) => setCustomJd({ ...customJd, title: e.target.value })}
                    placeholder="e.g. Lead Cloud & AI Engineer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-2xs font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 heading-serif">
                    Required Skills (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    value={customJd.required_skills}
                    onChange={(e) => setCustomJd({ ...customJd, required_skills: e.target.value })}
                    placeholder="Python, FastAPI, Docker, PostgreSQL, Kubernetes, AWS, Microservices, REST API, AI/ML"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-2xs font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 heading-serif">
                    Job Description & Criteria
                  </label>
                  <textarea
                    rows={3}
                    value={customJd.description}
                    onChange={(e) => setCustomJd({ ...customJd, description: e.target.value })}
                    placeholder="Lead cloud and AI engineering projects, build scalable microservices, deploy AI solutions, and manage Kubernetes-based cloud infrastructure."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 leading-relaxed shadow-2xs font-sans"
                  />
                </div>
              </div>



              {/* ACTIVE RESUMES STATUS BANNER */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-bold flex items-center gap-1.5 heading-serif">
                  <HardDrive className="w-3.5 h-3.5 text-brand-600" />
                  Active Resumes for Evaluation:
                </span>
                <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-xs font-sans">
                  {activeCandidatesCount} Resumes Ready
                </span>
              </div>

              {rankError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{rankError}</span>
                </div>
              )}

              {/* PROMINENT ACTION BUTTON: ONLY ENTRY POINT TO CANDIDATE RANKING PAGE */}
              <button
                type="button"
                onClick={handleRankAllAndNavigate}
                disabled={ranking}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 font-azonix"
              >
                {ranking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating Resumes Against JD...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" /> Rank All Candidates & Open Ranking Page <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED FILE DETAILS LIST TABLE & EXTRACTION STATUS */}
      <div className="glass-card rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-brand-600" />
              {`Active Saved User Resumes (${candidatePool.length} Users)`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified skills column detection and parsed profile attributes for individual resumes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {candidatePool.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllResumes}
                disabled={clearingPool}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200 heading-serif"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All Resumes
              </button>
            )}
            <button
              type="button"
              onClick={fetchCandidatePool}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors heading-serif"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh List
            </button>
          </div>
        </div>

        {/* File Cards / Table */}
        {loadingPool ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-500" />
            <span>Loading resume records...</span>
          </div>
        ) : activeCandidatesCount === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-1">
            <FileArchive className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No resumes uploaded yet (0 Users in Pool).</p>
            <p>Upload a ZIP file or folder above to populate users.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 heading-serif">
                <tr>
                  <th className="py-3 px-3.5">File Name & Format</th>
                  <th className="py-3 px-3.5">User Name</th>
                  <th className="py-3 px-3.5">Skills Column Status</th>
                  <th className="py-3 px-3.5">Extracted Skills Count</th>
                  <th className="py-3 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {candidatePool.map((item, idx) => {
                  const fname = item.filename || `candidate_resume_${idx + 1}.pdf`;
                  const format = item.file_format || fname.split(".").pop().toUpperCase();
                  const cName = item.candidate_name || "Applicant";
                  const skills = item.parsed_skills || item.skills || [];
                  const hasCol = item.has_skills_column !== false;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase heading-serif ${format === "PDF"
                                ? "bg-rose-100 text-rose-800"
                                : format === "DOCX"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                          >
                            {format}
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-[200px] heading-serif">
                            {fname}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{cName}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.candidate_email || "Email Verified"}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        {hasCol ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Dedicated Skills Column
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Missing Skills Column
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-black text-slate-800">
                          {skills.length} Technical Skills
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[240px]">
                          {skills.slice(0, 5).join(", ")}
                          {skills.length > 5 ? "..." : ""}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Ready for Ranking
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
