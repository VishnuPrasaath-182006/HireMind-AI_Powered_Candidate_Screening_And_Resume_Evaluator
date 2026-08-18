from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, get_db, Base
from app.models.database_models import Users, CandidateProfile, JobDescription, MatchEvaluationRecord
from app.models.schemas import (
    SignUp,
    SignIn,
    UserResponse,
    Token,
    UserUpdate,
    ChangePassword,
    ForgotPassword,
    MessageResponse
)
from app.core.authentication import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

# Import endpoint routers
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.resumes import router as resumes_router
from app.api.endpoints.jobs import router as jobs_router
from app.api.endpoints.matching import router as matching_router
from app.api.endpoints.metrics import router as metrics_router
from app.api.endpoints.analytics import router as analytics_router

# Create database tables automatically
Base.metadata.create_all(bind=engine)

tags_metadata = [
    {
        "name": "1. Authentication & Security",
        "description": "Public registration, login, JWT token issuance, password reset, and logout."
    },
    {
        "name": "2. User Profile & Directory",
        "description": "Authenticated user profile retrieval, account updates, and user management."
    },
    {
        "name": "3. Resumes & Candidates Management",
        "description": "Multi-format resume parsing (PDF, DOCX, TXT), technical skill NER extraction, and profile management."
    },
    {
        "name": "4. Job Postings",
        "description": "Creation and querying of active job postings and required skill criteria."
    },
    {
        "name": "5. AI Matching & Ranking Engine",
        "description": "Hybrid semantic vector embeddings, relational taxonomy matching, calibrated scoring, RAG rationale, and learning paths."
    },
    {
        "name": "6. Bias & Fairness Audit",
        "description": "PII and demographic redaction, fairness score delta analysis, and calibration model metrics."
    },
    {
        "name": "7. Plotly Data Visualizations & Statistics",
        "description": "Interactive Plotly visual analytics: Skill Alignment Radar, Multi-factor Breakdown, Leaderboard, and Overview Dashboard."
    }
]

app = FastAPI(
    title="AI Resume Screening & Matching Engine",
    version="2.2.0",
    description="AI-powered Resume Parser, Skill NER, Semantic Embedding Matcher, Calibrated Probabilistic Scoring, Plotly Analytics, RAG Rationale, Learning Path & Fairness Audit Platform.",
    openapi_tags=tags_metadata
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["1. Authentication & Security"], summary="Root API Health & Workflow Guide")
def root():
    return {
        "title": "AI Resume Screening & Matching API",
        "version": "2.2.0",
        "status": "online",
        "workflow": [
            "Step 1: Sign up (/api/auth/signup) or Sign in (/api/auth/signin) -> Receive Bearer JWT Token",
            "Step 2: Authorize in Swagger UI with Bearer Token",
            "Step 3: Upload Resumes (/api/resumes/upload) & Create Job Postings (/api/jobs/create)",
            "Step 4: Evaluate Candidate Matching (/api/match/evaluate) & Rank Leaderboard (/api/match/rank)",
            "Step 5: Run Bias & Fairness Audits (/api/metrics/bias-audit)",
            "Step 6: Visualize Statistics & Interactive Charts with Plotly (/api/analytics/)"
        ],
        "docs": "/docs"
    }


# Auth routes are cleanly provided by auth_router (Step 1) mounted below


@app.post(
    "/api/auth/signin",
    response_model=Token,
    tags=["1. Authentication & Security"],
    summary="1.2 Login with Email & Password to get Access Token (Public)"
)
def signin(login_data: SignIn, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.email == login_data.email).first()

    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(data={"sub": user.email, "name": user.name})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.post(
    "/api/auth/token",
    response_model=Token,
    tags=["1. Authentication & Security"],
    summary="1.3 OAuth2 Form Token (Swagger UI Authorize modal)"
)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(data={"sub": user.email, "name": user.name})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.post(
    "/api/auth/forgot-password",
    response_model=MessageResponse,
    tags=["1. Authentication & Security"],
    summary="1.4 Reset password when forgotten (Public)"
)
def forgot_password(data: ForgotPassword, db: Session = Depends(get_db)):
    if data.new_password != data.c_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and Confirm password do not match."
        )

    user = db.query(Users).filter(Users.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist."
        )

    hashed_new_pwd = hash_password(data.new_password)
    user.password = hashed_new_pwd
    user.c_password = hashed_new_pwd
    user.updated_at = datetime.utcnow()

    db.commit()
    return {"status": "success", "message": "Password has been successfully reset. You can now sign in with your new password."}


@app.post(
    "/api/auth/change-password",
    response_model=MessageResponse,
    tags=["1. Authentication & Security"],
    summary="1.5 Change password for logged-in user [Protected]"
)
def change_password(
    data: ChangePassword,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    if data.new_password != data.c_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and Confirm password do not match."
        )

    hashed_new_pwd = hash_password(data.new_password)
    current_user.password = hashed_new_pwd
    current_user.c_password = hashed_new_pwd
    current_user.updated_at = datetime.utcnow()

    db.commit()
    return {"status": "success", "message": "Password changed successfully."}


@app.post(
    "/api/auth/logout",
    response_model=MessageResponse,
    tags=["1. Authentication & Security"],
    summary="1.6 Logout user [Protected]"
)
def logout(current_user: Users = Depends(get_current_user)):
    return {
        "status": "success",
        "message": f"User {current_user.email} logged out successfully. Please clear your access token on the client."
    }


# ============================================================================
# ?? STEP 2: USER PROFILE & DIRECTORY (AUTHENTICATED)
# ============================================================================

@app.get("/me", response_model=UserResponse, tags=["2. User Profile & Directory"], summary="2.1 Get current logged-in user profile [Protected]")
@app.get("/api/auth/me", response_model=UserResponse, tags=["2. User Profile & Directory"], summary="2.2 Get profile [Protected]")
def get_me(current_user: Users = Depends(get_current_user)):
    return current_user


@app.put(
    "/me",
    response_model=UserResponse,
    tags=["2. User Profile & Directory"],
    summary="2.3 Update profile details (Name, Role, Phone, DOB) [Protected]"
)
@app.put(
    "/api/auth/profile",
    response_model=UserResponse,
    tags=["2. User Profile & Directory"],
    summary="2.4 Update profile [Protected]"
)
def update_my_profile(
    user_update: UserUpdate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.role is not None:
        current_user.role = user_update.role
    if user_update.phone_no is not None:
        current_user.phone_no = user_update.phone_no
    if user_update.dob is not None:
        current_user.dob = user_update.dob

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get(
    "/api/users",
    response_model=List[UserResponse],
    tags=["2. User Profile & Directory"],
    summary="2.5 Get all users directory with search & filtering [Protected]"
)
def get_all_users(
    skip: int = Query(0, ge=0, description="Offset"),
    limit: int = Query(20, ge=1, le=100, description="Limit"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Users)
    if role:
        query = query.filter(Users.role == role)
    if search:
        query = query.filter(
            (Users.name.ilike(f"%{search}%")) | (Users.email.ilike(f"%{search}%"))
        )
    return query.offset(skip).limit(limit).all()


@app.get(
    "/api/users/{user_id}",
    response_model=UserResponse,
    tags=["2. User Profile & Directory"],
    summary="2.6 Get user details by ID [Protected]"
)
def get_user_by_id(
    user_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    return user


@app.put(
    "/api/users/{user_id}",
    response_model=UserResponse,
    tags=["2. User Profile & Directory"],
    summary="2.7 Update specific user by ID [Protected]"
)
def update_user_by_id(
    user_id: int,
    user_update: UserUpdate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    if user_update.name is not None:
        user.name = user_update.name
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.phone_no is not None:
        user.phone_no = user_update.phone_no
    if user_update.dob is not None:
        user.dob = user_update.dob

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


@app.delete(
    "/me",
    response_model=MessageResponse,
    tags=["2. User Profile & Directory"],
    summary="2.8 Delete account [Protected]"
)
def delete_my_account(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": f"User account {current_user.email} deleted successfully."}


# ============================================================================
# ?? STEP 3 TO 7: CORE BACKEND & PLOTLY VISUALIZATIONS (MOUNTED IN ORDER)
# ============================================================================

# Step 1: Authentication & Security
app.include_router(auth_router)

# Step 3: Resumes & Candidates
app.include_router(resumes_router)

# Step 4: Job Postings
app.include_router(jobs_router)

# Step 5: AI Matching & Ranking
app.include_router(matching_router)

# Step 6: Bias & Fairness Audit
app.include_router(metrics_router)

# Step 7: Plotly Data Visualizations & Statistics
app.include_router(analytics_router)

