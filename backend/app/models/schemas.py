from pydantic import BaseModel, EmailStr, Field


from typing import Optional, List, Dict, Any


from datetime import date, datetime





# ==========================================


# ?? AUTH & USER SCHEMAS


# ==========================================





class SendOtpRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = "User"

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class SignUp(BaseModel):
    name: str
    email: EmailStr
    dob: date
    phone_no: str
    role: str = "user"
    company_name: Optional[str] = None
    company_id: Optional[str] = None
    password: str
    c_password: str
    otp: Optional[str] = None

class SignIn(BaseModel):


    email: str


    password: str





class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    dob: date
    phone_no: str
    role: str
    company_name: Optional[str] = None
    company_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):


    access_token: str


    token_type: str = "bearer"


    user: UserResponse





class UserUpdate(BaseModel):


    name: Optional[str] = None


    role: Optional[str] = None


    phone_no: Optional[str] = None


    dob: Optional[date] = None





class ChangePassword(BaseModel):


    old_password: str


    new_password: str


    c_new_password: str





class ForgotPassword(BaseModel):


    email: EmailStr


    new_password: str


    c_new_password: str





class MessageResponse(BaseModel):


    status: str = "success"


    message: str








# ==========================================


# ?? RESUME & CANDIDATE SCHEMAS


# ==========================================





class CandidateProfileResponse(BaseModel):


    id: int


    filename: str


    file_type: str


    candidate_name: Optional[str] = None


    candidate_email: Optional[str] = None


    candidate_phone: Optional[str] = None


    parsed_skills: List[str] = []


    sections: Dict[str, Any] = {}


    created_at: Optional[datetime] = None





    class Config:


        from_attributes = True





class ResumeUploadResponse(BaseModel):


    message: str = "Resume parsed and profile created successfully."


    profile: CandidateProfileResponse








# ==========================================


# ?? JOB DESCRIPTION SCHEMAS


# ==========================================





class JobDescriptionCreate(BaseModel):


    title: str = Field(..., example="Senior Python Developer")


    company: str = Field(..., example="Tech Innovations Inc.")


    description: str = Field(..., example="Looking for an experienced Python and FastAPI engineer with PostgreSQL and Docker expertise.")


    required_skills: List[str] = Field(..., example=["python", "fastapi", "docker", "postgresql"])


    min_experience_years: Optional[float] = 0.0





class JobDescriptionResponse(BaseModel):


    id: int


    title: str


    company: str


    description: str


    required_skills: List[str] = []


    min_experience_years: float = 0.0


    is_active: bool = True


    created_at: Optional[datetime] = None





    class Config:


        from_attributes = True








# ==========================================


# ?? MATCHING & CALIBRATION SCHEMAS


# ==========================================





class MatchEvaluateRequest(BaseModel):
    candidate_id: Optional[int] = None
    job_id: Optional[int] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    raw_resume_text: Optional[str] = None
    raw_job_description: Optional[str] = None
    required_skills: Optional[List[str]] = None





class LearningResource(BaseModel):


    skill: str


    category: str


    recommendation: str


    resource_url: str


    estimated_hours: int


    expected_score_boost: str


    priority: str





class RationaleResponse(BaseModel):


    executive_summary: str


    matched_strengths: List[str]


    missing_critical_skills: List[str]


    recommendation: str





class MatchEvaluateResponse(BaseModel):
    history_id: Optional[int] = None
    candidate_id: Optional[int] = None
    candidate_name: Optional[str] = None
    company_name: Optional[str] = None
    job_id: Optional[int] = None
    job_title: Optional[str] = None
    calibrated_score: float = Field(..., description="Calibrated match probability in range [0.0, 1.0]")
    match_percentage: float = Field(..., description="Match percentage in range [0.0, 100.0]%")
    cosine_similarity: float
    exact_skill_score: float
    skill_graph_score: float
    matched_exact_skills: List[str]
    matched_related_skills: List[Dict[str, Any]]
    missing_skills: List[str]
    rationale: RationaleResponse
    learning_path: List[LearningResource]
    job_description: Optional[str] = None
    swot: Optional[Dict[str, Any]] = None
    comparison: Optional[Dict[str, Any]] = None
    ats_evaluation: Optional[Dict[str, Any]] = None
    recommended_roles: Optional[List[Dict[str, Any]]] = None








# ==========================================


# ?? LEADERBOARD / RANKING SCHEMAS


# ==========================================





class CandidateRankItem(BaseModel):
    rank: int
    candidate_id: int
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    calibrated_score: float = 0.0
    match_percentage: float = 0.0
    cosine_similarity: float = 0.0
    exact_skill_score: float = 0.0
    skill_graph_score: float = 0.0
    matched_skills_count: int = 0
    missing_skills_count: int = 0
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    eligibility_tier: str = "Qualified"
    swot: Optional[dict] = None

class LeaderboardResponse(BaseModel):


    job_id: int


    job_title: str


    total_candidates_evaluated: int


    leaderboard: List[CandidateRankItem]








# ==========================================


# ?? METRICS & FAIRNESS AUDIT SCHEMAS


# ==========================================





class CalibrationMetricsResponse(BaseModel):


    Accuracy: float


    Precision: float


    Recall: float


    F1_Score: float


    ROC_AUC: float


    model_description: str = "Pre-trained Logistic Regression Calibration Model (W1=5.75, W2=5.97, W3=0.97, b=-4.37)"





class BiasAuditRequest(BaseModel):


    candidate_id: Optional[int] = None


    job_id: Optional[int] = None


    raw_resume_text: Optional[str] = None


    raw_job_description: Optional[str] = None





class BiasAuditResponse(BaseModel):


    candidate_id: Optional[int] = None


    original_score: float


    original_match_percentage: float


    anonymized_score: float


    anonymized_match_percentage: float


    score_delta: float


    is_fair: bool


    fairness_status: str


    redacted_items_summary: Dict[str, int]


    redacted_text_sample: str




# ==========================================
# ?? EVALUATION HISTORY SCHEMAS
# ==========================================

class EvaluationHistoryItem(BaseModel):
    id: int
    candidate_id: Optional[int] = None
    candidate_name: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    match_percentage: float = 0.0
    cosine_similarity: Optional[float] = 0.0
    exact_skill_score: Optional[float] = 0.0
    skill_graph_score: Optional[float] = 0.0
    score_improvement_delta: Optional[float] = 0.0
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    created_at: Optional[datetime] = None

class EvaluationHistoryResponse(BaseModel):
    total_count: int = 0
    history: List[EvaluationHistoryItem] = []
