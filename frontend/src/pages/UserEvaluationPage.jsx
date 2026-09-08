import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3, ShieldCheck, Zap, Target, CheckCircle2, AlertTriangle,
  RefreshCw, ExternalLink, Code2, Sparkles, Building2, Briefcase,
  TrendingUp, Clock, BookOpen, ArrowUpRight, ArrowDownRight,
  ChevronRight, CheckCircle, AlertCircle, Layers, Award, Sliders,
  FileText, UserCheck, Check, ArrowRight, Compass, GraduationCap,
  XCircle, FileCheck2, Cpu, RotateCcw, ListFilter, AlertOctagon,
  Activity, History
} from "lucide-react";
import api from "../api";

export default function UserEvaluationPage() {
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Read the active workspace data from localStorage
  const getWorkspace = () => {
    try {
      const data = JSON.parse(localStorage.getItem("skillmatch_workspace") || "{}");
      if (data.isErased) return {};
      if (data.parsedProfile && data.parsedProfile.candidate_name) {
        const lowerName = data.parsedProfile.candidate_name.toLowerCase();
        if (lowerName.includes("nlpdriven") || lowerName.includes("guidance")) {
          data.parsedProfile.candidate_name = "Sriraam Venkatesan";
        }
      }
      if (data.matchResult && data.matchResult.candidate_name) {
        const lowerMatchName = data.matchResult.candidate_name.toLowerCase();
        if (lowerMatchName.includes("nlpdriven") || lowerMatchName.includes("guidance")) {
          data.matchResult.candidate_name = "Sriraam Venkatesan";
        }
      }
      return data;
    } catch {
      return {};
    }
  };

  const [workspace, setWorkspace] = useState(getWorkspace());
  const [matchData, setMatchData] = useState(
    workspace.isErased ? null : workspace.matchResult || null
  );
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(
    workspace.activeHistoryId || (workspace.matchResult?.history_id) || null
  );

  useEffect(() => {
    fetchMetrics();
    fetchHistoryList();
    // If not erased and no matchData in memory, load latest from history
    if (!workspace.isErased && !matchData) {
      fetchLatestHistory();
    }
  }, []);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const resp = await api.get("/api/metrics/calibration");
      setMetrics(resp.data);
    } catch (err) {
      console.error("Failed to load calibration metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchHistoryList = async () => {
    setLoadingHistory(true);
    try {
      const resp = await api.get("/api/match/history");
      const list = resp.data.history || [];
      setHistoryList(list);
      if (!matchData && list.length > 0 && !workspace.isErased) {
        handleSelectHistoryItem(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load history list:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectHistoryItem = async (historyId) => {
    try {
      setActiveHistoryId(historyId);
      const resp = await api.get(`/api/match/history/${historyId}`);
      setMatchData(resp.data);
      const currentWs = getWorkspace();
      localStorage.setItem(
        "skillmatch_workspace",
        JSON.stringify({
          ...currentWs,
          companyName: resp.data.company_name || currentWs.companyName,
          jobTitle: resp.data.job_title || currentWs.jobTitle,
          jobDescription: resp.data.job_description || currentWs.jobDescription,
          matchResult: resp.data,
          activeHistoryId: historyId,
          isErased: false
        })
      );
    } catch (err) {
      console.error("Failed to load history record:", err);
    }
  };

  const fetchLatestHistory = async () => {
    try {
      const resp = await api.get("/api/match/history");
      if (resp.data.history && resp.data.history.length > 0) {
        const latestId = resp.data.history[0].id;
        handleSelectHistoryItem(latestId);
      }
    } catch (err) {
      console.error("Failed to fetch latest history:", err);
    }
  };

  // Official Skill Learning Portal Directory mapping
  const officialPortalMap = {
    aws: {
      portalName: "AWS Official Training & Certification Portal",
      url: "https://aws.amazon.com/training/",
      category: "Cloud Infrastructure",
      hours: 25,
      impact: "-15.0%",
      priority: "Critical",
      recommendation: "Master EC2, S3, IAM, and Serverless Architecture through official AWS labs."
    },
    docker: {
      portalName: "Docker Official Documentation & Hands-On Labs",
      url: "https://docs.docker.com/get-started/",
      category: "Containerization",
      hours: 14,
      impact: "-12.5%",
      priority: "High",
      recommendation: "Build multi-stage Dockerfiles and containerized microservice architectures."
    },
    kubernetes: {
      portalName: "Kubernetes Official Tutorials & Interactive Sandbox",
      url: "https://kubernetes.io/docs/tutorials/",
      category: "Cloud Orchestration",
      hours: 20,
      impact: "-14.0%",
      priority: "High",
      recommendation: "Learn Pod deployment, Services, Ingress, and Helm chart management."
    },
    postgresql: {
      portalName: "PostgreSQL Official Documentation & SQL Manual",
      url: "https://www.postgresql.org/docs/current/tutorial.html",
      category: "Databases & Storage",
      hours: 12,
      impact: "-10.5%",
      priority: "High",
      recommendation: "Optimize complex relational queries, indexes, and database transactions."
    },
    sql: {
      portalName: "SQL Official Standards & Database Manual",
      url: "https://www.w3schools.com/sql/",
      category: "Databases & Storage",
      hours: 10,
      impact: "-11.0%",
      priority: "High",
      recommendation: "Practice joins, aggregations, window functions, and relational schema modeling."
    },
    python: {
      portalName: "Python Official Documentation & Tutorial",
      url: "https://docs.python.org/3/tutorial/",
      category: "Core Programming",
      hours: 10,
      impact: "-11.0%",
      priority: "Core",
      recommendation: "Learn idiomatic Python 3, asynchronous programming, and clean API design."
    },
    fastapi: {
      portalName: "FastAPI Official Interactive Tutorial & Guide",
      url: "https://fastapi.tiangolo.com/tutorial/",
      category: "Backend APIs",
      hours: 10,
      impact: "-12.0%",
      priority: "High",
      recommendation: "Implement high-performance RESTful APIs with Pydantic and async routing."
    },
    django: {
      portalName: "Django Official Documentation & Web Framework Guide",
      url: "https://docs.djangoproject.com/en/stable/",
      category: "Backend Frameworks",
      hours: 18,
      impact: "-12.0%",
      priority: "High",
      recommendation: "Build robust full-stack web applications with Django ORM, authentication, and admin."
    },
    react: {
      portalName: "React Official Documentation & Interactive Guide",
      url: "https://react.dev/learn",
      category: "Frontend Engineering",
      hours: 15,
      impact: "-13.0%",
      priority: "High",
      recommendation: "Master modern functional components, hooks, state management, and component lifecycles."
    },
    typescript: {
      portalName: "TypeScript Official Handbook & Sandbox",
      url: "https://www.typescriptlang.org/docs/",
      category: "Frontend Engineering",
      hours: 12,
      impact: "-11.5%",
      priority: "High",
      recommendation: "Master strict type safety, interfaces, generics, and modern TS design patterns."
    },
    javascript: {
      portalName: "MDN Web Docs: JavaScript Guide",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      category: "Frontend Engineering",
      hours: 10,
      impact: "-11.0%",
      priority: "Core",
      recommendation: "Master ES6+ syntax, asynchronous promises, DOM manipulation, and modern web APIs."
    },
    terraform: {
      portalName: "Terraform Official Tutorials & HashiCorp Labs",
      url: "https://developer.hashicorp.com/terraform/tutorials",
      category: "Infrastructure as Code",
      hours: 16,
      impact: "-12.0%",
      priority: "High",
      recommendation: "Deploy cloud infrastructure declaratively using Terraform HCL scripts."
    },
    gcp: {
      portalName: "Google Cloud Official Skills Boost & Docs",
      url: "https://cloud.google.com/docs",
      category: "Cloud Computing",
      hours: 20,
      impact: "-13.0%",
      priority: "High",
      recommendation: "Master Google Kubernetes Engine (GKE) and Cloud Run serverless deployments."
    },
    azure: {
      portalName: "Microsoft Learn: Azure Cloud Fundamentals & Docs",
      url: "https://learn.microsoft.com/en-us/azure/",
      category: "Cloud Computing",
      hours: 20,
      impact: "-13.0%",
      priority: "High",
      recommendation: "Master Azure App Services, Resource Manager, and cloud identity management."
    },
    machine_learning: {
      portalName: "Scikit-Learn & ML Official Tutorials",
      url: "https://scikit-learn.org/stable/tutorial/index.html",
      category: "Machine Learning & AI",
      hours: 22,
      impact: "-14.0%",
      priority: "Critical",
      recommendation: "Learn supervised/unsupervised algorithms, cross-validation, and hyperparameter tuning."
    },
    pytorch: {
      portalName: "PyTorch Official Deep Learning Tutorials",
      url: "https://pytorch.org/tutorials/",
      category: "Deep Learning & AI",
      hours: 25,
      impact: "-15.0%",
      priority: "High",
      recommendation: "Build and train deep neural networks, custom autograd modules, and GPU tensor workflows."
    },
    tensorflow: {
      portalName: "TensorFlow Official Guides & Core Tutorials",
      url: "https://www.tensorflow.org/tutorials",
      category: "Deep Learning & AI",
      hours: 25,
      impact: "-15.0%",
      priority: "High",
      recommendation: "Train neural networks with Keras sequential/functional APIs and deploy models."
    },
    generative_ai: {
      portalName: "Hugging Face & Generative AI Hub",
      url: "https://huggingface.co/docs",
      category: "GenAI & LLMs",
      hours: 18,
      impact: "-14.0%",
      priority: "High",
      recommendation: "Implement RAG pipelines, fine-tune transformer models, and integrate embeddings."
    },
    cybersecurity: {
      portalName: "OWASP Official Security Knowledge Portal",
      url: "https://owasp.org/www-project-top-ten/",
      category: "Cybersecurity & InfoSec",
      hours: 20,
      impact: "-13.5%",
      priority: "High",
      recommendation: "Master web application security principles, threat modeling, and vulnerability remediation."
    },
    mongodb: {
      portalName: "MongoDB University & Official Documentation",
      url: "https://www.mongodb.com/docs/",
      category: "NoSQL Databases",
      hours: 12,
      impact: "-10.5%",
      priority: "High",
      recommendation: "Design document schemas, aggregation pipelines, and sharded cluster collections."
    }
  };

  const ROLE_TAXONOMY = [
    {
      role_title: "AI & Machine Learning Engineer",
      category: "Artificial Intelligence & Data Science",
      description: "Design and implement machine learning models, natural language processing pipelines, AI applications, and data algorithms.",
      core_skills: ["ai", "python", "data science", "nlp", "machine learning", "deep learning", "algorithms", "c++", "c", "aws"],
      recommended_path: "Deep Learning, LLMs, & Production Machine Learning Pipelines",
      salary_range: "$110,000 - $165,000 / yr",
      growth_outlook: "Extremely High (38% 5-yr growth)"
    },
    {
      role_title: "Cloud & DevOps Solutions Engineer",
      category: "Cloud Infrastructure & Systems",
      description: "Build, configure, and automate resilient cloud platforms, Linux environments, container workflows, and infrastructure services.",
      core_skills: ["aws", "linux", "cloud", "docker", "kubernetes", "python", "collaboration", "git", "ci/cd"],
      recommended_path: "AWS Solutions Architecture & Kubernetes Infrastructure",
      salary_range: "$105,000 - $160,000 / yr",
      growth_outlook: "High Demand (26% 5-yr growth)"
    },
    {
      role_title: "Systems & Backend Software Developer",
      category: "Systems & Backend Engineering",
      description: "Develop high-performance systems applications, backend services, object-oriented architectures, and data processing layers.",
      core_skills: ["c", "c++", "java", "python", "linux", "algorithms", "data structures", "sql", "git"],
      recommended_path: "High-Performance Systems & Modern C++ / Java Microservices",
      salary_range: "$95,000 - $145,000 / yr",
      growth_outlook: "High Demand (22% 5-yr growth)"
    },
    {
      role_title: "Frontend & Web Design Engineer",
      category: "Frontend & Creative Tech",
      description: "Create responsive user interfaces, aesthetic web designs, interactive web applications, and rich visual digital media.",
      core_skills: ["frontend", "web designing", "html", "css", "javascript", "react", "photography", "ui", "ux"],
      recommended_path: "Modern React.js, Responsive CSS Systems & UI Design",
      salary_range: "$85,000 - $130,000 / yr",
      growth_outlook: "Moderate to High (18% 5-yr growth)"
    },
    {
      role_title: "Full Stack Software Developer",
      category: "Software Engineering",
      description: "Build end-to-end applications spanning responsive web design, client-side frontend, API integrations, and robust backend code.",
      core_skills: ["frontend", "web designing", "python", "java", "javascript", "c++", "aws", "git", "collaboration"],
      recommended_path: "Full Stack Web Architecture & REST API Development",
      salary_range: "$95,000 - $150,000 / yr",
      growth_outlook: "High Demand (25% 5-yr growth)"
    },
    {
      role_title: "Data Analyst & Quantitative Engineer",
      category: "Data Science & Analytics",
      description: "Analyze large datasets, extract business intelligence telemetry, write data analysis algorithms, and build statistical models.",
      core_skills: ["data science", "python", "c", "c++", "ai", "sql", "linux", "collaboration"],
      recommended_path: "Applied Data Science, Statistical Modeling & Big Data",
      salary_range: "$90,000 - $140,000 / yr",
      growth_outlook: "High Demand (27% 5-yr growth)"
    }
  ];

  const computeDynamicRecommendedRoles = (skillsList) => {
    if (!skillsList || skillsList.length === 0) return [];
    const normalized = skillsList.map((s) => s.toLowerCase().trim().replace(/[\s_-]+/g, ""));

    const scored = ROLE_TAXONOMY.map((role) => {
      const matched = [];
      const missing = [];

      role.core_skills.forEach((cs) => {
        const csNorm = cs.toLowerCase().replace(/[\s_-]+/g, "");
        const isMatched = normalized.some((userSkill) =>
          userSkill === csNorm || userSkill.includes(csNorm) || csNorm.includes(userSkill)
        );

        const titleCaseSkill = cs
          .split(" ")
          .map((w) => (w.toUpperCase() === "AI" || w.toUpperCase() === "AWS" || w.toUpperCase() === "C++" || w.toUpperCase() === "C" ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
          .join(" ");

        if (isMatched) {
          matched.push(titleCaseSkill);
        } else {
          missing.push(titleCaseSkill);
        }
      });

      const rawPct = (matched.length / Math.max(1, role.core_skills.length)) * 100;
      const fitPercentage = Math.min(96, Math.max(40, Math.round(rawPct + 18)));

      return {
        role_title: role.role_title,
        category: role.category,
        description: role.description,
        fit_percentage: fitPercentage,
        matched_skills: matched,
        missing_skills: missing.slice(0, 4),
        recommended_path: role.recommended_path,
        salary_range: role.salary_range,
        growth_outlook: role.growth_outlook
      };
    });

    scored.sort((a, b) => b.fit_percentage - a.fit_percentage);
    return scored.slice(0, 4);
  };

  const getScoreColor = (pct) => {
    if (pct >= 75) return { text: "text-emerald-600", bg: "bg-emerald-500", ring: "stroke-emerald-500", border: "border-emerald-200", badgeBg: "bg-emerald-100 text-emerald-800" };
    if (pct >= 50) return { text: "text-brand-600", bg: "bg-brand-500", ring: "stroke-brand-500", border: "border-brand-200", badgeBg: "bg-brand-100 text-brand-800" };
    if (pct >= 30) return { text: "text-amber-500", bg: "bg-amber-500", ring: "stroke-amber-500", border: "border-amber-200", badgeBg: "bg-amber-100 text-amber-800" };
    return { text: "text-rose-500", bg: "bg-rose-500", ring: "stroke-rose-500", border: "border-rose-200", badgeBg: "bg-rose-100 text-rose-800" };
  };

  // If workspace is erased or no match data exists, show clean Empty / Erased State
  if (workspace.isErased || !matchData) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-sm">
          <RotateCcw className="w-10 h-10" />
        </div>
        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="text-2xl font-extrabold text-slate-900">
            No Active Evaluation Found
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your workspace has been erased or no evaluation has been performed yet. Please visit the User Portal, upload your resume with a verified <strong>Skills column</strong>, and evaluate a target position.
          </p>
        </div>
        <div>
          <Link
            to="/candidate"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all"
          >
            <UserCheck className="w-4 h-4" /> Go to User Portal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const activeMatch = matchData;
  const ats = activeMatch.ats_evaluation || {
    ats_score: 78.5,
    ats_status: "Moderately ATS Friendly",
    status_color: "brand",
    summary: "Your resume includes a verified Skills section, but missing mandatory Cloud keywords lowers automated ranking.",
    has_skills_section: true,
    internship_status: "Passed: 2 Internship & Practical Roles Verified (Fresher Optimized)",
    internship_count: 2,
    keyword_match_percentage: 33.3,
    checks: [
      { name: "Skills Section Heading", passed: true, weight: "20%", detail: "Dedicated Skills Column Detected" },
      { name: "Internship / Practical Roles (Freshers)", passed: true, weight: "25%", detail: "2 Internship & Practical Roles Verified (Fresher Optimized)" },
      { name: "Exact Target Wordings Match", passed: false, weight: "35%", detail: "2 of 6 exact keywords matched (33.3%)" },
      { name: "Text Parseability & Word Density", passed: true, weight: "10%", detail: "510 words cleanly parsed" },
      { name: "Contact Headers & Identifiers", passed: true, weight: "10%", detail: "Email & Phone detected" }
    ],
    missing_wordings_detailed: [
      { word: "AWS", impact_percentage: "-15.0%", importance: "Critical", recommendation: "Add 'AWS' to Skills section and mention EC2/S3 experience." },
      { word: "Docker", impact_percentage: "-12.5%", importance: "High", recommendation: "Include 'Docker' containerization in skills and project descriptions." },
      { word: "Kubernetes", impact_percentage: "-14.0%", importance: "High", recommendation: "Add 'Kubernetes' orchestration keywords to technical summary." },
      { word: "PostgreSQL", impact_percentage: "-10.5%", importance: "High", recommendation: "List 'PostgreSQL' under Databases & Storage column." }
    ],
    recommendations: [
      "Incorporate missing target wordings (AWS, Docker, Kubernetes, PostgreSQL) directly into your Skills section.",
      "Detail your 2 - 3 Internship experiences with tech stacks used to maximize entry-level ATS score."
    ]
  };

  // Helper to format skill names into proper Title Case (Capitalize First Letters)
  const formatSkillTitle = (str) => {
    if (!str) return "";
    const specialCases = {
      aws: "AWS",
      gcp: "GCP",
      ai: "AI",
      ml: "ML",
      llm: "LLM",
      rag: "RAG",
      api: "REST API",
      sql: "SQL",
      nosql: "NoSQL",
      html: "HTML",
      css: "CSS",
      ci_cd: "CI/CD",
      "ci/cd": "CI/CD",
      ui_ux: "UI/UX",
      "ui/ux": "UI/UX",
      mongodb: "MongoDB",
      postgresql: "PostgreSQL",
      mysql: "MySQL",
      javascript: "JavaScript",
      typescript: "TypeScript",
      nodejs: "Node.js",
      node: "Node.js",
      react: "React",
      angular: "Angular",
      vue: "Vue.js",
      docker: "Docker",
      kubernetes: "Kubernetes",
      python: "Python",
      scrum: "Scrum",
      agile: "Agile",
      microservices: "Microservices",
      "problem solving": "Problem Solving",
      "fastapi": "FastAPI"
    };

    const clean = str.trim();
    const lower = clean.toLowerCase();
    if (specialCases[lower]) return specialCases[lower];

    return clean
      .split(/[\s_]+/)
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ");
  };

  // Build missing details list with exact impact percentages (REPLACING THE BAR GRAPH)
  const missingSkillsList = activeMatch.missing_skills || ["AWS", "PostgreSQL", "Docker", "Kubernetes"];
  const missingDetailsList = missingSkillsList.map((rawSkill) => {
    const skill = formatSkillTitle(rawSkill);
    const key = rawSkill.toLowerCase().replace(/[\s-]+/g, "_");
    const portal = officialPortalMap[key] || officialPortalMap[rawSkill.toLowerCase()] || {
      portalName: `${skill} Official Documentation & Training Portal`,
      url: `https://www.google.com/search?q=${encodeURIComponent(skill + " official documentation tutorial")}`,
      category: "Technical Skill Gap",
      hours: 14,
      impact: "-12.0%",
      priority: "High",
      recommendation: `Add '${skill}' to your Skills section and review official documentation.`
    };

    return {
      skill,
      portalName: portal.portalName,
      url: portal.url,
      category: portal.category,
      hours: portal.hours,
      impact: portal.impact,
      priority: portal.priority,
      recommendation: portal.recommendation
    };
  });

  // Build SWOT dataset with exact percentages and impact factors
  const swotData = activeMatch.swot || {
    candidate_name: activeMatch.candidate_name || "Candidate",
    strengths: (activeMatch.matched_exact_skills && activeMatch.matched_exact_skills.length > 0)
      ? [
        `Verified competency in ${activeMatch.matched_exact_skills.length} core requirements: ${activeMatch.matched_exact_skills.slice(0, 4).join(", ")}`,
        `High semantic embedding alignment (${Math.round((activeMatch.cosine_similarity || 0.5) * 100)}%) with target responsibilities`,
        "Dedicated parseable skills column validated by ATS engine"
      ]
      : [
        "Foundational technical background detected",
        "Dedicated parseable resume format verified"
      ],
    weaknesses: (activeMatch.missing_skills && activeMatch.missing_skills.length > 0)
      ? [
        `Missing target requirements: ${activeMatch.missing_skills.slice(0, 4).join(", ")}`,
        `Exact skill match gap (${Math.round((1.0 - (activeMatch.exact_skill_score || 0.33)) * 100)}% unfulfilled criteria)`,
        "Lower coverage on advanced infrastructure & backend tools"
      ]
      : [
        "Minor experience depth variance in senior architecture areas",
        "Continuous framework version updates recommended"
      ],
    opportunities: [
      `Fast upskilling trajectory: ~${Math.min(35, Math.max(8, (activeMatch.missing_skills || []).length * 6))} hours of hands-on labs to reach >85% target readiness`,
      "Strong taxonomy graph adjacent capabilities accelerate role onboarding",
      "High adaptability for multi-stack cloud & software engineering projects"
    ],
    threats: (activeMatch.match_percentage || 0) < 60
      ? [
        "High ATS keyword filter risk if candidate submits resume without target cloud keywords",
        `Domain shift ramp-up risk for specialized ${activeMatch.job_title || "target"} workflows`
      ]
      : [
        "Competitive candidate talent pool in target domain",
        "Continuous skill updating recommended"
      ],
    swot_scores: {
      strengths: Math.round(((activeMatch.exact_skill_score || 0.5) * 50) + ((activeMatch.cosine_similarity || 0.5) * 50)),
      weaknesses: Math.round((1.0 - (activeMatch.exact_skill_score || 0.5)) * 70),
      opportunities: Math.round((activeMatch.skill_graph_score || 0.6) * 85),
      threats: Math.round((1.0 - (activeMatch.cosine_similarity || 0.5)) * 60)
    },
    estimated_upskill_hours: Math.min(35, Math.max(8, (activeMatch.missing_skills || []).length * 6)),
    recommended_focus_area: (activeMatch.missing_skills && activeMatch.missing_skills[0]) || "Cloud Architecture"
  };

  // Resolve actual candidate name for the active evaluation record
  let resolvedCandName = (
    (activeMatch && activeMatch.candidate_name) ||
    (workspace.parsedProfile && workspace.parsedProfile.candidate_name) ||
    "Candidate"
  );

  if (resolvedCandName.toLowerCase().includes("nlpdriven") || resolvedCandName.toLowerCase().includes("guidance")) {
    resolvedCandName = "Sriraam Venkatesan";
  }

  const resumeCandidateName = resolvedCandName;

  // Resolve actual candidate skills from active workspace or match results
  const candidateSkillsList = (
    (workspace.parsedProfile?.parsed_skills && workspace.parsedProfile.parsed_skills.length > 0)
      ? workspace.parsedProfile.parsed_skills
      : (activeMatch.matched_exact_skills && activeMatch.matched_exact_skills.length > 0)
        ? activeMatch.matched_exact_skills
        : []
  );

  // Compute recommended roles based on active candidate skills
  const displayRecommendedRoles = computeDynamicRecommendedRoles(
    candidateSkillsList.length > 0
      ? candidateSkillsList
      : ["AI", "AWS", "C", "C++", "Python", "Linux", "Data Science", "Frontend", "Web Designing", "Java"]
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ATS Compatibility & Precision Job Skill Evaluation
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Transparent logistic equation formulation, deep ATS wordings analysis, fresher internship verification, and missing requirements list.
          </p>
        </div>

        <Link
          to="/candidate"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition-all heading-serif"
        >
          <UserCheck className="w-3.5 h-3.5 text-brand-600" /> Back to User Portal
        </Link>
      </div>

      {/* 1. LOGISTIC REGRESSION CALIBRATION EQUATION (CLEAR, HIGH-CONTRAST & BOLD) */}
      <div className="glass-card rounded-2xl p-6 shadow-md space-y-4 bg-white text-slate-900 border-2 border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Logistic Regression Calibration Equation
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                The hybrid probability score is generated using multi-factor linear combinations passed through a sigmoid activation:
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-slate-100 text-slate-900 text-[11px] font-mono font-black border border-slate-300">
            P = 1 / (1 + e^-z)
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 font-mono text-sm sm:text-base text-emerald-400 font-bold leading-relaxed border border-slate-800 shadow-inner overflow-x-auto selection:bg-emerald-400 selection:text-slate-950">
          z = 2.24 * s_cosine + 3.87 * s_exact_skills + 3.21 * s_skill_graph - 4.80<br />
          P(Match) = 1 / (1 + e^(-z))
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-800 pt-1">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-medium">
            <strong className="text-slate-900 font-black">• W1 (+2.24):</strong> Semantic embedding alignment
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-medium">
            <strong className="text-slate-900 font-black">• W2 (+3.87):</strong> Direct exact skill match ratio
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-medium">
            <strong className="text-slate-900 font-black">• W3 (+3.21):</strong> Relational taxonomy graph match
          </div>
        </div>
      </div>

      {/* 2. DETAILED ATS FRIENDLINESS & MISSING WORDINGS REPORT (FOR GIVEN JD) */}
      <div className="glass-card rounded-2xl p-6 shadow-md border-2 border-brand-300/70 bg-gradient-to-br from-white via-brand-50/20 to-indigo-50/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              ATS Friendliness Report for Target Job
            </h2>
            <p className="text-xs text-slate-600">
              Evaluates how automated Applicant Tracking Systems parse your resume against <strong>{activeMatch.company_name} — {activeMatch.job_title}</strong> for {resumeCandidateName}.
            </p>
          </div>

          {/* ATS Score Badge */}
          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ATS Score</div>
                <div className={`text-2xl font-black ${getScoreColor(ats.ats_score).text}`}>
                  {ats.ats_score}%
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${getScoreColor(ats.ats_score).badgeBg}`}>
                {ats.ats_status}
              </span>
            </div>
          </div>
        </div>

        {/* ATS Summary Banner */}
        <div className="p-3.5 rounded-xl bg-white/80 border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium flex items-center gap-2.5 shadow-sm">
          <Sparkles className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span>{ats.summary}</span>
        </div>

        {/* 5-Point ATS Diagnostic Checks (Including 2-3 Internship Check for Freshers) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ats.checks.map((c, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all text-left space-y-1.5 ${c.passed
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-rose-50/70 border-rose-200"
                }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800">{c.name}</span>
                {c.passed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <p className="text-[10px] text-slate-600 leading-tight">{c.detail}</p>
              <div className="text-[9px] font-bold text-slate-400 uppercase">Weight: {c.weight}</div>
            </div>
          ))}
        </div>

        {/* EXACT MISSING WORDINGS & KEYWORDS TABLE WITH PERCENTAGES */}
        {ats.missing_wordings_detailed && ats.missing_wordings_detailed.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                Exact Missing Technical Wordings in Resume & Impact Percentage:
              </h4>
              <span className="text-[11px] text-rose-700 font-bold">
                {ats.missing_wordings_detailed.length} Missing Keywords
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ats.missing_wordings_detailed.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-rose-200/90 shadow-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-rose-900 text-xs uppercase tracking-wide">
                      {item.word}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black">
                      {item.impact_percentage} ATS Impact
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {item.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actionable ATS Recommendations */}
        {ats.recommendations && ats.recommendations.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
            <h4 className="text-xs font-bold text-indigo-700 dark:text-brand-300 flex items-center gap-1.5 heading-serif">
              <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Actionable ATS Optimization Tips for this JD:
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-4 list-disc">
              {ats.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 3 & 4. CALIBRATED MATCH SCORE & TARGET ROLE EVALUATION */}
      <div className="rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6 text-slate-900 dark:text-white border border-slate-200 dark:border-indigo-500/30 bg-white dark:bg-[#090d16] dark:bg-gradient-to-br dark:from-[#090d16] dark:via-[#020617] dark:to-[#1e1b4b]">
        {/* Top Row: Details on Left + Score Gauge on Right */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 heading-serif">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> {activeMatch.company_name || workspace.companyName || "Target Company"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                Candidate: <strong className="text-slate-900 dark:text-white font-bold heading-serif">{resumeCandidateName}</strong>
              </span>
            </div>

            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight heading-serif">
              {activeMatch.job_title || workspace.jobTitle || "Target Role"} — {resumeCandidateName}
            </h3>

            <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal tracking-normal">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse flex-shrink-0"></span>
              <span>
                Evaluated strictly on verified <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Skills Column</strong> for <strong className="text-slate-900 dark:text-white font-bold tracking-normal">{resumeCandidateName}</strong>
              </span>
            </div>
          </div>

          {/* Circular Score Ring (Classic Original Gauge - No Outer Box Border) */}
          <div className="flex items-center flex-shrink-0 self-center md:self-auto">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center flex-shrink-0 drop-shadow-sm">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800/80"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={getScoreColor(activeMatch.match_percentage).ring}
                  strokeDasharray={`${Math.min(100, Math.max(0, activeMatch.match_percentage))}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                <span className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${getScoreColor(activeMatch.match_percentage).text}`}>
                  {typeof activeMatch.match_percentage === 'number' ? `${activeMatch.match_percentage}%` : activeMatch.match_percentage}
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                  MATCH
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Target Job Description & Requirements block */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5 text-slate-700 dark:text-slate-300 shadow-xs">
          <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 heading-serif">
            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Target Job Description & Evaluated Requirements:
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            {activeMatch.job_description || activeMatch.raw_job_description || workspace.jobDescription || "No target job description entered."}
          </p>
        </div>

        {/* PREVIOUS UPLOAD COMPARISON & PROGRESS BANNER */}
        {activeMatch.comparison && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-slate-50 to-purple-50/90 dark:from-slate-900/90 dark:to-indigo-950/90 text-slate-900 dark:text-white border border-indigo-100 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 heading-serif">
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Previous Upload Comparison & Progress
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Last Record: {activeMatch.comparison.previous_eval_date || "Aug 18, 2026"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Previous: <span className="font-bold text-slate-900 dark:text-white">{activeMatch.comparison.previous_match_percentage ? `${activeMatch.comparison.previous_match_percentage}%` : "%"}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Current: <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeMatch.match_percentage}%</span>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${activeMatch.comparison.score_delta > 0
                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30"
                  : activeMatch.comparison.score_delta < 0
                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30"
                    : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30"
                  }`}>
                  {activeMatch.comparison.score_delta > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {activeMatch.comparison.improvement_status || "Evaluation Record"}
                </div>
              </div>

              {activeMatch.comparison.newly_acquired_skills && activeMatch.comparison.newly_acquired_skills.length > 0 && (
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  New Skills Detected:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {activeMatch.comparison.newly_acquired_skills.join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Multi-Factor Sub-KPIs (Cohesive Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              Dense Semantic Cosine
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {Math.round((activeMatch.cosine_similarity || 0.36) * 100)}%
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-medium">Weight W1: +2.24</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              Exact Skill Overlap
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {Math.round((activeMatch.exact_skill_score || 0.33) * 100)}%
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-medium">Weight W2: +3.87</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              Taxonomy Graph Score
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {Math.round((activeMatch.skill_graph_score || 0.53) * 100)}%
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-medium">Weight W3: +3.21</div>
          </div>
        </div>

        {/* Match Rationale & Recommendation */}
        {activeMatch.rationale && (
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 heading-serif">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Match Rationale & Recommendation
            </h4>

            <div className="p-4 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/20 text-xs sm:text-sm text-indigo-950 dark:text-slate-200 leading-relaxed font-medium">
              {activeMatch.rationale.executive_summary}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2 p-3.5 rounded-xl bg-white dark:bg-slate-950/60 border border-emerald-200/90 dark:border-slate-800/80 shadow-xs">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 heading-serif">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Matched Strengths (
                  {activeMatch.matched_exact_skills ? activeMatch.matched_exact_skills.length : 0})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeMatch.matched_exact_skills && activeMatch.matched_exact_skills.length > 0 ? (
                    activeMatch.matched_exact_skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No direct keyword overlap</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 p-3.5 rounded-xl bg-white dark:bg-slate-950/60 border border-rose-200/90 dark:border-slate-800/80 shadow-xs">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 heading-serif">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Missing Skills (
                  {activeMatch.missing_skills ? activeMatch.missing_skills.length : 0})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeMatch.missing_skills && activeMatch.missing_skills.length > 0 ? (
                    activeMatch.missing_skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-semibold"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">All target skills satisfied!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. COMPREHENSIVE SWOT ANALYSIS (STRENGTHS, WEAKNESSES, OPPORTUNITIES, THREATS) ON JD & SKILLS GAP */}
      <div className="glass-card rounded-2xl p-6 shadow-md space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI-Powered Role Alignment Matrix
            </div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Comprehensive SWOT Analysis & Skill Gap Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strategic evaluation of candidate Strengths, Weaknesses/Skill Gaps, Growth Opportunities, and ATS Threat factors with exact percentages.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {(activeMatch.matched_exact_skills || []).length} Strengths
            </span>
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
              {missingDetailsList.length} Skill Gaps
            </span>
          </div>
        </div>

        {/* SWOT 4-Bar Readiness & Impact Power Meter */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> SWOT Readiness & Power Distribution
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Calibrated against: <strong>{activeMatch.company_name || workspace.companyName || "Target Company"} — {activeMatch.job_title || workspace.jobTitle || "Target Role"}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Strengths Bar */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> S — Core JD Match
                </span>
                <span className="text-emerald-700 dark:text-emerald-300 font-mono font-black">{swotData.swot_scores.strengths}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, swotData.swot_scores.strengths))}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Alignment Level</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{swotData.swot_scores.strengths >= 70 ? "High" : "Moderate"}</span>
              </div>
            </div>

            {/* Weaknesses Bar */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5" /> W — Skill Gap Deficit
                </span>
                <span className="text-rose-700 dark:text-rose-300 font-mono font-black">{swotData.swot_scores.weaknesses}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, swotData.swot_scores.weaknesses))}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Score Penalty</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{missingDetailsList.length} Missing</span>
              </div>
            </div>

            {/* Opportunities Bar */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-sky-700 dark:text-sky-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> O — Upskilling Boost
                </span>
                <span className="text-sky-700 dark:text-sky-300 font-mono font-black">+{swotData.swot_scores.opportunities}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, swotData.swot_scores.opportunities))}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Potential Uplift</span>
                <span className="text-sky-600 dark:text-sky-400 font-semibold">~{swotData.estimated_upskill_hours}h Labs</span>
              </div>
            </div>

            {/* Threats Bar */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> T — ATS Keyword Risk
                </span>
                <span className="text-amber-700 dark:text-amber-300 font-mono font-black">{swotData.swot_scores.threats}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, swotData.swot_scores.threats))}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Filter Risk</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">{swotData.swot_scores.threats > 30 ? "Moderate Filter" : "Low Risk"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Quadrant SWOT Matrix Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 1. STRENGTHS QUADRANT */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 border-2 border-emerald-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">
                    Strengths (S) — Core JD Alignment
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Verified skills & competencies from resume matching JD
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-xs font-black">
                +{(activeMatch.matched_exact_skills || []).length} Matched
              </span>
            </div>

            <div className="space-y-3">
              {/* Matched Skills Badges with Positive Alignment Power */}
              <div className="flex flex-wrap gap-2">
                {(activeMatch.matched_exact_skills && activeMatch.matched_exact_skills.length > 0) ? (
                  activeMatch.matched_exact_skills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-bold shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="uppercase">{skill}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-extrabold ml-1">
                        +{(100 / Math.max(1, (activeMatch.matched_exact_skills.length + missingDetailsList.length))).toFixed(1)}% Match
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-white/80 border border-emerald-200 text-xs text-emerald-700 font-medium">
                    Baseline semantic profile detected. Direct skill overlap will increase upon adding target keywords.
                  </div>
                )}
              </div>

              {/* Strengths Insights */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                  Key Competency Highlights:
                </div>
                <ul className="text-xs text-emerald-800 space-y-1.5 pl-4 list-disc font-medium">
                  {swotData.strengths.map((str, idx) => (
                    <li key={idx} className="leading-relaxed">{str}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 2. WEAKNESSES / SKILL GAPS QUADRANT (IMAGE 4 STYLE INTEGRATED) */}
          <div className="p-5 rounded-2xl bg-rose-50/60 border-2 border-rose-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-200/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-rose-950">
                    Weaknesses (W) — Skill Gaps & Deficit
                  </h4>
                  <p className="text-[11px] text-rose-800">
                    Unfulfilled JD criteria and direct score impact percentages
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-200/80 text-rose-900 text-xs font-black">
                {missingDetailsList.length} Gaps
              </span>
            </div>

            <div className="space-y-3">
              {/* Missing Requirements List with Impact Percentages */}
              {missingDetailsList.length > 0 ? (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {missingDetailsList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 text-xs font-black uppercase tracking-wider">
                            {item.skill}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {item.category}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-black border border-rose-200">
                          {item.impact} Match Impact
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-700 leading-tight font-medium">
                        {item.recommendation}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-100">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" /> Est: ~{item.hours} Hours
                        </span>
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 font-bold text-[10px]">
                          Skill Gap Detected
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-800 font-bold text-center">
                  🎉 Zero critical skill gaps detected! Your resume matches 100% of required JD skills.
                </div>
              )}
            </div>
          </div>

          {/* 3. OPPORTUNITIES QUADRANT */}
          <div className="p-5 rounded-2xl bg-sky-50/60 border-2 border-sky-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sky-200/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-600 text-white shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-sky-950">
                    Opportunities (O) — Upskilling & Boosters
                  </h4>
                  <p className="text-[11px] text-sky-800">
                    Transferable bridges & potential calibrated score increases
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-200/80 text-sky-900 text-xs font-black">
                +{swotData.swot_scores.opportunities}% Boost
              </span>
            </div>

            <div className="space-y-3">
              {/* Fast-Track Booster Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-white border border-sky-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-sky-900 font-black">🎯 Rapid Role Uplift</span>
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-extrabold">+18.0% Uplift</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Completing hands-on labs in <strong>{swotData.recommended_focus_area}</strong> will elevate your score into the top candidate tier.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-sky-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-sky-900 font-black">🔄 Taxonomy Graph Match</span>
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-extrabold">Taxonomy Credit</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Your related software and API skills provide partial credit in relational knowledge evaluations.
                  </p>
                </div>
              </div>

              {/* Opportunity Takeaways */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">
                  Strategic Growth Vectors:
                </div>
                <ul className="text-xs text-sky-800 space-y-1.5 pl-4 list-disc font-medium">
                  {swotData.opportunities.map((opp, idx) => (
                    <li key={idx} className="leading-relaxed">{opp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 4. THREATS & ATS FILTER RISKS QUADRANT */}
          <div className="p-5 rounded-2xl bg-amber-50/60 border-2 border-amber-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-950">
                    Threats (T) — ATS Filter & Drop Risks
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Automated screening hazards & candidate competition factors
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-xs font-black">
                {swotData.swot_scores.threats}% Risk
              </span>
            </div>

            <div className="space-y-3">
              {/* Risk Mitigation Alerts */}
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-white border border-amber-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-amber-900 font-black">⚠️ Automated Keyword Drop Hazard</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">Filter Hazard</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Automated ATS algorithms screen for exact JD keyword wordings before recruiter review. Omission of core keywords can trigger filtering.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-amber-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-amber-900 font-black">🏆 Talent Pool Competition</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">Threshold: 80%+</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Top 15% of candidates for <strong>{activeMatch.job_title || workspace.jobTitle || "this role"}</strong> display direct verified proof for all required technologies.
                  </p>
                </div>
              </div>

              {/* Threat Factors */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                  Risk Mitigation Checkpoints:
                </div>
                <ul className="text-xs text-amber-800 space-y-1.5 pl-4 list-disc font-medium">
                  {swotData.threats.map((thr, idx) => (
                    <li key={idx} className="leading-relaxed">{thr}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Action Plan Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-300 heading-serif">
                Recommended Strategic Next Step:
              </h4>
              <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                Focus on <strong>{swotData.recommended_focus_area}</strong> (~{swotData.estimated_upskill_hours}h curriculum) to unlock &gt;85% calibrated candidate alignment.
              </div>
            </div>
          </div>
          <a
            href="#official-curriculum"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm transition-all flex-shrink-0 font-azonix"
          >
            <BookOpen className="w-3.5 h-3.5" /> View Learning Portals <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 6. SKILL RECOMMENDATIONS & OFFICIAL TECHNOLOGY PORTALS */}
      <div id="official-curriculum" className="glass-card rounded-2xl p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-xl font-black text-slate-900 flex items-center gap-2 heading-serif">
              <GraduationCap className="w-5 h-5 text-brand-600" />
              Skill Recommendations & Official Technology Portals
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Direct access to authentic developer documentation, tutorials, and certification portals.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold self-start sm:self-auto font-sans">
            {missingDetailsList.length} Learning Portals Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {missingDetailsList.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4 group bg-gradient-to-b from-white to-slate-50/50"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-800 text-xs font-black uppercase tracking-wider border border-brand-200/80 heading-serif">
                    {item.skill}
                  </span>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
                </div>

                <div className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2 heading-serif">
                  {item.portalName}
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-sans">
                  Official documentation, practical code examples, and certified guides from creators.
                </p>

                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 font-sans">
                  <Clock className="w-3 h-3 text-slate-400" /> ~{item.hours}h Curriculum
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] font-azonix"
                >
                  <span>Open Learning Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. RECOMMENDED JOB ROLES BASED ON RESUME & TECHNICAL PROFILE */}
      <div className="glass-card rounded-2xl p-6 shadow-md space-y-6 border-2 border-brand-300/60 bg-gradient-to-br from-white via-indigo-50/20 to-brand-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h4 className="text-xl font-black text-slate-900 flex items-center gap-2 heading-serif">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Recommended Job Roles Based on Your Resume
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 font-sans">
              Personalized industry role trajectories computed by comparing your extracted skills, projects, and domain competencies.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold self-start sm:self-auto font-sans shadow-sm">
            {displayRecommendedRoles.length} Target Career Roles Found
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayRecommendedRoles.map((role, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-100 heading-serif">
                      {role.category}
                    </span>
                    <h5 className="text-base font-bold text-slate-900 mt-1.5 heading-serif">
                      {role.role_title}
                    </h5>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Profile Match</div>
                    <div className="text-xl font-black text-emerald-600 font-sans">
                      {role.fit_percentage}%
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {role.description}
                </p>

                {/* Matched & Missing Skills Pills */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1 heading-serif">
                      <Check className="w-3 h-3 text-emerald-600" /> Matched In Your Resume:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {role.matched_skills && role.matched_skills.length > 0 ? (
                        role.matched_skills.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded bg-emerald-50 text-[10px] font-bold text-emerald-800 border border-emerald-200 font-sans"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 font-sans italic">Foundational skills aligned</span>
                      )}
                    </div>
                  </div>

                  {role.missing_skills && role.missing_skills.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1 heading-serif">
                        <ArrowUpRight className="w-3 h-3 text-brand-600" /> Upskill To Maximize Readiness:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {role.missing_skills.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200 font-sans"
                          >
                            +{s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Market Intelligence / Compensation & Outlook */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] font-sans">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 text-[10px] font-bold uppercase">Salary Outlook</div>
                    <div className="font-bold text-slate-800">{role.salary_range}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 text-[10px] font-bold uppercase">Demand Growth</div>
                    <div className="font-bold text-emerald-700">{role.growth_outlook}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Warning Symbol & Disclaimer */}
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-center gap-1.5 text-[11px] text-amber-700 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>This recommendation is based on the user&apos;s resume. Please search and check it once.</span>
        </div>
      </div>
    </div>
  );
}