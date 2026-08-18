from sqlalchemy import Integer, String, Boolean, DateTime, Column, Date, Text, Float, JSON
from datetime import datetime
from app.database import Base

class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, autoincrement=True, primary_key=True, unique=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    dob = Column(Date, nullable=False)
    phone_no = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    company_name = Column(String, nullable=True)
    company_id = Column(String, nullable=True)
    password = Column(String, nullable=False)
    c_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ========================================================
# 1. TABLE FOR USER / CANDIDATE PERSONAL RESUME UPLOADS
# ========================================================
class UserResume(Base):
    __tablename__ = "user_resumes"

    id = Column(Integer, autoincrement=True, primary_key=True, unique=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    candidate_name = Column(String(255), nullable=True)
    candidate_email = Column(String(255), nullable=True)
    candidate_phone = Column(String(100), nullable=True)
    raw_text = Column(Text, nullable=False)
    parsed_skills = Column(JSON, default=list)
    sections = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ========================================================
# 2. TABLE FOR RECRUITER CANDIDATE POOL & BATCH RESUME UPLOADS
# ========================================================
class RecruiterResume(Base):
    __tablename__ = "recruiter_resumes"

    id = Column(Integer, autoincrement=True, primary_key=True, unique=True, index=True)
    recruiter_id = Column(Integer, nullable=True, index=True)
    company_name = Column(String(255), nullable=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    candidate_name = Column(String(255), nullable=True)
    candidate_email = Column(String(255), nullable=True)
    candidate_phone = Column(String(100), nullable=True)
    raw_text = Column(Text, nullable=False)
    parsed_skills = Column(JSON, default=list)
    sections = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Alias for backward compatibility
CandidateProfile = RecruiterResume


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, autoincrement=True, primary_key=True, unique=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list)
    min_experience_years = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MatchEvaluationRecord(Base):
    __tablename__ = "match_evaluations"

    id = Column(Integer, autoincrement=True, primary_key=True, unique=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    candidate_id = Column(Integer, nullable=True, index=True)
    job_id = Column(Integer, nullable=True, index=True)
    company_name = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    job_description = Column(Text, nullable=True)
    score_improvement_delta = Column(Float, nullable=True, default=0.0)
    calibrated_score = Column(Float, nullable=False)
    cosine_similarity = Column(Float, nullable=False)
    skill_graph_score = Column(Float, nullable=False)
    exact_skill_score = Column(Float, nullable=False)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    rationale = Column(JSON, default=dict)
    learning_path = Column(JSON, default=list)
    ats_evaluation = Column(JSON, default=dict, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
