# HireMind: AI-Powered Candidate Screening & Resume Evaluator

HireMind is an end-to-end, intelligent recruitment and resume evaluation platform designed to bridge the gap between job seekers and hiring teams. Built with a high-performance FastAPI backend and a modern React (Vite + Tailwind CSS) frontend, the system automates multi-format resume parsing, extracts technical competencies via Named Entity Recognition (NER), performs hybrid semantic and relational matching, audits for demographic bias, and delivers deep explainability alongside personalized learning paths.

---

## 1. Project Overview & Key Highlights

- **Role-Aware Architecture**: Tailored user experiences for both Candidates (resume diagnostics, ATS score optimization, upskilling roadmap) and Recruiters (job posting creation, batch candidate screening, ranked leaderboards).
- **Multi-Format Ingestion**: Robust text extraction supporting PDF, DOCX, and TXT files using fallback pipelines (PyMuPDF, pdfplumber, pypdf, python-docx).
- **Skill NER & Taxonomy Matching**: Specialized extraction of technical skills mapped against an industry-standard skill taxonomy with alias and acronym normalization.
- **Hybrid AI Matching Engine**: Combines 384-dimensional dense semantic embeddings (Sentence-Transformers / TF-IDF), Relational Skill Graph scoring, and Logistic Regression Calibrated Probability Scoring for high-precision candidate-to-job matching.
- **Comprehensive ATS Compatibility Audit**: Evaluates resume structure, section completeness, word density, fresher-friendly internship/project credits, and exact missing keyword impact percentages.
- **Explainable AI (XAI) & SWOT Analysis**: Generates structured decision rationales with Strengths, Weaknesses, Opportunities, and Threats for every candidate-job pair.
- **Fairness & Bias Audit Engine**: Redacts personally identifiable information (PII), gender-coded terms, and prestige institution names to verify scoring neutrality and variance deltas.
- **Personalized Upskilling Curriculum**: Automatically generates step-by-step learning modules for identified skill gaps, including estimated study hours and projected score boosts.
- **Interactive Visual Analytics**: Plotly-powered Skill Alignment Radar charts, multi-factor score breakdowns, and candidate comparison visual dashboards.

---

## 2. System Architecture & Tech Stack

### Backend Architecture
- **Framework**: FastAPI (Python 3.10+)
- **Database & ORM**: PostgreSQL / SQLite with SQLAlchemy 2.0
- **Authentication**: JWT Bearer Tokens, OAuth2 Password Flow, Passlib (Bcrypt hashing)
- **Natural Language Processing**:
  - Sentence-Transformers (all-MiniLM-L6-v2) with lazy loading and TF-IDF fallback
  - SpaCy (en_core_web_sm) for tokenization and entity extraction
  - Custom Relational Skill Taxonomy Graph
- **Machine Learning & Calibration**: Scikit-learn Logistic Regression probability model (calibration_model.pkl)
- **Document Processing**: PyMuPDF (fitz), pdfplumber, pypdf, python-docx
- **Data Visualization**: Plotly Graph Objects & Express for JSON/HTML chart generation

### Frontend Architecture
- **Framework**: React 19 with Vite 8
- **Routing**: React Router DOM v7 with Protected Route guards and role-based redirects
- **Styling**: Tailwind CSS 3.4 with custom design tokens, dark/light theme switching, and glassmorphism styling
- **Icons & UI Components**: Lucide React
- **Data Visualization**: Recharts & embedded Plotly interactive charts
- **HTTP Client**: Axios with automated bearer token injection and response interceptors

---

## 3. Directory & Folder Structure Breakdown

```
ResumeBuilder/
│
├── backend/                               # Python FastAPI backend service
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/
│   │   │       ├── auth.py                # Registration, sign in, token generation, profile management
│   │   │       ├── resumes.py             # Resume upload, parsing, skills extraction, candidate profiles
│   │   │       ├── jobs.py                # Job posting creation, updating, deletion, and listing
│   │   │       ├── matching.py            # Single & batch evaluation, candidate ranking, SWOT generation
│   │   │       ├── metrics.py             # Calibration metrics & demographic bias audit endpoints
│   │   │       └── analytics.py           # Plotly chart generation & HTML visualization dashboards
│   │   │
│   │   ├── core/
│   │   │   └── authentication.py          # Password hashing, JWT creation/verification, auth dependencies
│   │   │
│   │   ├── models/
│   │   │   ├── database_models.py         # SQLAlchemy models (Users, Resumes, Jobs, MatchEvaluations)
│   │   │   └── schemas.py                 # Pydantic schemas for request validation & API responses
│   │   │
│   │   ├── services/
│   │   │   ├── ats_service.py             # ATS scoring, section detection, missing keyword impact
│   │   │   ├── bias_audit.py              # PII redaction, gender/institution masking, fairness delta
│   │   │   ├── calibration.py             # Logistic regression scoring calibration service
│   │   │   ├── embedding_service.py       # Sentence-Transformers / TF-IDF text embedding & cosine similarity
│   │   │   ├── hybrid_matcher.py          # Multi-vector hybrid scoring engine
│   │   │   ├── learning_path.py           # Skill gap roadmap generator with study hours & boost estimation
│   │   │   ├── llm_rationale.py           # Decision rationale, qualitative fit assessment, recommendations
│   │   │   ├── ner_extractor.py           # SpaCy NER, skill taxonomy lookup, acronym expansion
│   │   │   ├── parser.py                  # Multi-format document parser (PDF, DOCX, TXT) & section segmenter
│   │   │   ├── plotting_service.py        # Plotly radar charts, score bars, and comparison graphs
│   │   │   └── skill_graph.py             # Relational skill graph & category-weighted scoring
│   │   │
│   │   ├── config.py                      # App settings, environment variables, JWT secret configuration
│   │   ├── database.py                    # Database connection setup, sessionmaker, Base declaration
│   │   └── main.py                        # Application entrypoint, CORS configuration, router integration
│   │
│   ├── data/
│   │   ├── calibration_metrics.json       # Pre-computed model performance metrics (Accuracy, ROC-AUC, F1)
│   │   ├── calibration_model.pkl          # Serialized scikit-learn calibration model
│   │   └── skills_taxonomy.json           # Categorized technology stack taxonomy (Languages, Cloud, ML, etc.)
│   │
│   ├── requirements.txt                   # Backend Python package dependencies
│   ├── run_server.py                      # Uvicorn startup script
│   └── sample.env                         # Sample backend environment configuration
│
├── frontend/                              # React Single Page Application (SPA)
│   ├── public/                            # Static web assets
│   ├── src/
│   │   ├── assets/                        # Images, illustrations, and logos
│   │   ├── components/
│   │   │   ├── Navbar.jsx                 # Global navigation bar with role badge, theme switcher, and auth state
│   │   │   └── ProtectedRoute.jsx         # Authentication and session validation wrapper
│   │   │
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx               # Tabbed Login, Sign Up (Candidate/Recruiter), and Password Reset
│   │   │   ├── CandidatePortal.jsx        # Candidate dashboard: resume upload, parsed skills, job matching
│   │   │   ├── RecruiterDashboard.jsx     # Recruiter hub: job creation, pool overview, batch resume uploads
│   │   │   ├── CandidateRankingPage.jsx   # Candidate leaderboard, score filtering, and batch comparison
│   │   │   ├── UserEvaluationPage.jsx     # Detailed evaluation: ATS audit, SWOT, Radar charts, Learning path
│   │   │   └── MetricsPage.jsx            # Calibration accuracy, model metrics, and system overview
│   │   │
│   │   ├── api.js                         # Axios client with interceptors for API token propagation
│   │   ├── App.jsx                        # Application root router and theme state manager
│   │   ├── index.css                      # Global Tailwind CSS styles and glassmorphism design tokens
│   │   └── main.jsx                       # React DOM entrypoint
│   │
│   ├── package.json                       # Frontend dependencies and scripts
│   ├── tailwind.config.js                 # Tailwind CSS theme extensions and color palettes
│   ├── postcss.config.js                  # PostCSS plugins setup
│   └── vite.config.js                     # Vite build configuration
│
└── vercel.json                            # Deployment configuration for frontend hosting
```

---

## 4. Core Features & Functional Modules

### 1. Multi-Stage Document Parsing & Structural Segmentation
- Extracts clean text from single/multi-column PDFs, Microsoft Word (.docx), and plain text (.txt).
- Segments resumes into structured zones: Skills, Experience, Education, Projects, and Certifications.
- Extracts contact metadata including candidate name, email address, and phone number.

### 2. Domain-Specific Skill NER & Relational Graph
- Identifies technical skills, frameworks, databases, developer tools, and methodologies.
- Handles common aliases (e.g., js -> javascript, k8s -> kubernetes, py -> python, postgres -> postgresql).
- Computes Exact Skill Matches (weight: 1.0) and Relational Graph Matches (weight: 0.6) for adjacent technologies in the same family.

### 3. Hybrid AI Matching & Scoring Formula
Match scores are determined by combining three distinct signal vectors into a pre-trained probabilistic calibration model:
- **Semantic Cosine Similarity (s1)**: Dense vector embeddings computed over the resume text and job description.
- **Exact Skill Coverage (s2)**: Proportion of required skills directly matched in the candidate's resume.
- **Relational Skill Graph Score (s3)**: Weighted coverage including relationally adjacent skills.
- **Logistic Regression Probability Calibration**:
  Score = Sigmoid(w1 * s1 + w2 * s2 + w3 * s3 + b)
  Where w1 = 2.24, w2 = 3.87, w3 = 3.21, and b = -4.80.

### 4. ATS Optimization & Fresher Compatibility
- **Keyword Density Analysis**: Computes the ratio of matched versus missing target job keywords.
- **Impact Percentage Breakdown**: Quantifies the specific score penalty incurred by each missing keyword.
- **Fresher-Optimized Experience Logic**: Awards full experience credit for 2-3 validated internships or capstone project experiences.
- **Structural Integrity Check**: Validates standard headings, word count boundaries (250–1400 words), and parseability.

### 5. Ethical AI, PII Redaction & Bias Auditing
- Automatically detects and redacts:
  - Direct PII: Email addresses, phone numbers, full names.
  - Demographic Signals: Gender-coded pronouns and terms.
  - Pedigree Bias: Prestige academic institutions (e.g., Ivy League, IITs, Oxbridge).
- Evaluates the match score both before and after anonymization.
- Verifies fairness status (variance delta <= 5.0%) to confirm candidate evaluation is purely merit-based.

### 6. Actionable Upskilling Roadmap & SWOT Analysis
- **SWOT Matrix**: Outlines Strengths, Weaknesses, Opportunities, and Threats for individual candidate applications.
- **Curated Learning Modules**: Provides recommended study topics, estimated completion hours, documentation resources, and expected match score improvements for every identified gap.

### 7. Interactive Analytics & Leaderboard
- **Plotly Radar Charts**: Visualizes candidate skill proficiencies against job requirements.
- **Factor Breakdown Bars**: Visual representation of semantic similarity, exact skill match, and graph relational match contributions.
- **Recruiter Leaderboard**: Real-time ranking with filters for score thresholds and search queries.

---

## 5. Database Schema & Data Models

| Table Name | Primary Purpose | Key Fields |
| :--- | :--- | :--- |
| **users** | User account management & authentication | id, name, email, role (candidate/recruiter), password, dob, phone_no, company_name |
| **user_resumes** | Individual candidate uploaded resumes | id, user_id, filename, file_type, candidate_name, parsed_skills (JSON), sections (JSON), raw_text |
| **recruiter_resumes** | Recruiter candidate pool & batch uploads | id, recruiter_id, company_name, filename, candidate_name, parsed_skills (JSON), sections (JSON), raw_text |
| **job_descriptions** | Job openings & requirement criteria | id, title, company, description, required_skills (JSON), min_experience_years, is_active |
| **match_evaluations** | Historical evaluation records & analytics | id, user_id, candidate_id, job_id, calibrated_score, cosine_similarity, matched_skills, missing_skills, ats_evaluation (JSON), learning_path (JSON), rationale (JSON) |

---

## 6. API Route Overview

### 1. Authentication & User Profile (/api/auth, /me, /api/users)
- `POST /api/auth/signup` - Register a new candidate or recruiter account
- `POST /api/auth/signin` - Authenticate with email and password to receive a Bearer JWT
- `POST /api/auth/token` - OAuth2 password request form for Swagger UI integration
- `POST /api/auth/forgot-password` - Reset account password
- `POST /api/auth/change-password` - Change password for authenticated users
- `GET /me` or `GET /api/auth/me` - Retrieve logged-in user profile
- `PUT /me` or `PUT /api/auth/profile` - Update user profile details
- `GET /api/users` - Directory listing with search and role filters

### 2. Resumes & Candidates (/api/resumes)
- `POST /api/resumes/upload` - Upload and parse a resume file (PDF, DOCX, TXT)
- `POST /api/resumes/parse-raw` - Parse raw resume text directly
- `GET /api/resumes/my-resumes` - List resumes belonging to the authenticated candidate
- `GET /api/resumes/pool` - List all candidate profiles in the recruiter pool
- `GET /api/resumes/{resume_id}` - Retrieve details and parsed skills for a specific resume
- `DELETE /api/resumes/{resume_id}` - Remove a resume from the database

### 3. Job Postings (/api/jobs)
- `POST /api/jobs/create` - Create a new job description with required skills
- `GET /api/jobs/list` - Fetch all active job postings with search and skill filters
- `GET /api/jobs/{job_id}` - Retrieve detailed information for a specific job
- `PUT /api/jobs/{job_id}` - Update job posting details and required skills
- `DELETE /api/jobs/{job_id}` - Deactivate or remove a job posting

### 4. AI Matching & Ranking (/api/match)
- `POST /api/match/evaluate` - Evaluate match between a candidate resume and a job posting
- `POST /api/match/rank` - Batch evaluate and rank all candidates for a specific job opening
- `GET /api/match/history` - Retrieve previous evaluation records for the logged-in candidate

### 5. Fairness & Model Metrics (/api/metrics)
- `GET /api/metrics/calibration` - Return Logistic Regression weights, intercept, and evaluation metrics
- `POST /api/metrics/bias-audit` - Execute PII and demographic redaction to audit scoring fairness

### 6. Plotly Visual Analytics (/api/analytics)
- `GET /api/analytics/charts/radar/{candidate_id}/{job_id}` - Generate Skill Alignment Radar chart JSON
- `GET /api/analytics/charts/breakdown/{candidate_id}/{job_id}` - Generate multi-factor score breakdown JSON
- `GET /api/analytics/view/match/{candidate_id}/{job_id}` - Render interactive standalone HTML visual dashboard

---

## 7. Frontend Pages & Portals

1. **Authentication Portal (/auth)**: Clean card interface for logging in, registering with candidate or recruiter roles, and password recovery.
2. **Candidate Portal (/candidate)**: Dedicated workflow for job seekers to upload resumes, inspect extracted skills, view target job matches, and initiate diagnostic evaluations.
3. **Recruiter Dashboard (/recruiter)**: Management hub for recruiters to post jobs, manage candidate pools, trigger batch evaluations, and upload candidate resumes in bulk.
4. **Candidate Ranking Leaderboard (/ranking)**: Dynamic leaderboard sorting candidates by calibrated match percentage with quick access to full candidate profiles.
5. **Detailed User Evaluation Page (/evaluation)**: Comprehensive analytics dashboard displaying:
   - Overall Calibrated Score & Match Breakdown
   - ATS Compatibility & Missing Keyword Impact Table
   - Decision Rationale & SWOT Analysis
   - Interactive Plotly Skill Alignment Radar Chart
   - Customized Upskilling Roadmap with Completion Timelines
   - Demographic Bias & Fairness Audit Summary

---

## 8. Local Setup & Installation

### Prerequisites
- Python 3.10 or higher
- Node.js 18.0 or higher
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables by creating a `.env` file based on `sample.env`:
   ```env
   DATABASE_URL=sqlite:///./hiremind.db
   SECRET_KEY=your_super_secret_jwt_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ```
5. Start the FastAPI development server:
   ```bash
   python run_server.py
   # Or using uvicorn directly:
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
6. Access interactive API documentation at `/docs` (Swagger UI) and `/redoc` (ReDoc) on port 8000.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web application on port 5173.

---

## 9. Key Benefits & Summary

- **For Candidates**: Pinpoint exact ATS keyword gaps, understand why a resume matches or misses job criteria, and follow tailored upskilling paths to maximize hiring potential.
- **For Recruiters & Talent Teams**: Screen hundreds of applicants in seconds with calibrated ranking, eliminate unconscious hiring bias through automated PII redactions, and make data-backed hiring decisions with transparent scoring rationales.
