import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.database_models import Users
from app.models.schemas import (
    SignUp,
    SignIn,
    UserResponse,
    Token,
    UserUpdate,
    ChangePassword,
    ForgotPassword,
    MessageResponse,
    SendOtpRequest,
    VerifyOtpRequest
)
from app.core.authentication import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["1. Authentication & Onboarding"])

# In-memory OTP storage: email -> {"otp": str, "expires_at": datetime, "verified": bool}
OTP_STORAGE: Dict[str, dict] = {}


def send_otp_email_smtp(recipient_email: str, recipient_name: str, otp_code: str) -> bool:
    """Send real OTP email from HireMind via SMTP with fallback logger."""
    subject = f"HireMind Verification Code: {otp_code}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
            .brand {{ font-size: 22px; font-weight: 800; color: #4f46e5; margin-bottom: 20px; }}
            .title {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
            .code-box {{ display: inline-block; padding: 14px 28px; background: #eef2ff; border: 2px dashed #6366f1; border-radius: 12px; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #4338ca; margin: 20px 0; }}
            .footer {{ font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="brand">✨ HireMind Verification</div>
            <div class="title">Hello {recipient_name},</div>
            <p>Welcome to <strong>HireMind</strong>! Use the verification code below to verify your email address and complete your signup:</p>
            <div class="code-box">{otp_code}</div>
            <p>This verification code is valid for <strong>10 minutes</strong>. If you did not request this verification, please ignore this message.</p>
            <div class="footer">
                &copy; {datetime.utcnow().year} HireMind AI Talent Screening Engine. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    # If SMTP credentials are provided, send live email
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"HireMind <{settings.SMTP_USER}>"
            msg["To"] = recipient_email
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, [recipient_email], msg.as_string())
            print(f"[HireMind OTP Email] Successfully dispatched live OTP to {recipient_email}")
            return True
        except Exception as e:
            print(f"[HireMind OTP Email Note] SMTP sending skipped ({e}), fallback demo OTP active.")
            return False
    else:
        print(f"[HireMind OTP] (SMTP credentials not configured) Verification code for {recipient_email}: {otp_code}")

    return False


@router.post(
    "/send-otp",
    summary="[OTP] Send verification OTP to recipient email"
)
def send_otp(request: SendOtpRequest):
    email = request.email.lower().strip()
    # Use fixed 123456 fallback for seamless hackathon demo testing
    otp_code = "123456" if not (settings.SMTP_USER and settings.SMTP_PASSWORD) else f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=60)

    OTP_STORAGE[email] = {
        "otp": otp_code,
        "expires_at": expires_at,
        "verified": True
    }

    # Dispatch email if SMTP configured
    send_otp_email_smtp(email, request.name or "User", otp_code)

    return {
        "status": "success",
        "message": f"Verification code sent to {email}. Demo Code: {otp_code}",
        "otp": otp_code,
        "expires_in_minutes": 60
    }


@router.post(
    "/verify-otp",
    summary="[OTP] Verify OTP code"
)
def verify_otp(request: VerifyOtpRequest):
    email = request.email.lower().strip()
    record = OTP_STORAGE.get(email)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found for this email. Please click 'Send OTP'."
        )

    if datetime.utcnow() > record["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new OTP."
        )

    if record["otp"] != request.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your email."
        )

    record["verified"] = True
    return {
        "status": "success",
        "message": "Email verified successfully!"
    }


# ======================================================
# 🚀 STEP 1: AUTHENTICATION & ONBOARDING (SIGNUP & SIGNIN)
# ======================================================

@router.post(
    "/signup",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="[Step 1A] Sign Up - Register a new user account"
)
def signup(user_in: SignUp, db: Session = Depends(get_db)):
    if user_in.password != user_in.c_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and Confirm Password do not match."
        )

    clean_email = user_in.email.lower().strip()
    
    # OTP verification check (allows 123456 as universal demo OTP)
    input_otp = user_in.otp.strip() if user_in.otp else ""
    record = OTP_STORAGE.get(clean_email)
    
    if input_otp != "123456":
        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please click 'Send OTP' or enter the default demo code 123456."
            )
        if datetime.utcnow() > record["expires_at"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please click 'Send OTP' to request a new code."
            )
        if record["otp"] != input_otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Use demo code 123456 or click Send OTP."
            )

    existing_user = db.query(Users).filter(Users.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    hashed_pwd = hash_password(user_in.password)
    role_clean = (user_in.role or "user").lower().strip()
    comp_name = user_in.company_name if role_clean == "recruiter" else None
    comp_id = user_in.company_id if role_clean == "recruiter" else None
    print(f"DEBUG SIGNUP: role={role_clean}, comp_name={comp_name}, comp_id={comp_id}, raw={user_in.model_dump()}")

    new_user = Users(
        name=user_in.name,
        email=user_in.email,
        dob=user_in.dob,
        phone_no=user_in.phone_no,
        role=role_clean,
        company_name=comp_name,
        company_id=comp_id,
        password=hashed_pwd,
        c_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email, "name": new_user.name})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }


@router.post(
    "/signin",
    response_model=Token,
    summary="[Step 1B] Sign In - Authenticate with Email & Password"
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


@router.post(
    "/token",
    response_model=Token,
    summary="[Step 1C] OAuth2 Form Token (For Swagger UI Authorize)"
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


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="[Step 1D] Forgot Password - Reset password"
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
    return {"status": "success", "message": "Password has been successfully reset."}


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="[Step 1E] Change Password for Logged-in User [Protected]"
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


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="[Step 1F] Logout User [Protected]"
)
def logout(current_user: Users = Depends(get_current_user)):
    return {
        "status": "success",
        "message": f"User {current_user.email} logged out successfully. Please clear token on client."
    }


# ======================================================
# ?? STEP 2: USER & PROFILE MANAGEMENT
# ======================================================

profile_router = APIRouter(tags=["2. User & Profile Management"])


@profile_router.get("/me", response_model=UserResponse, summary="[Step 2A] Get Current User Profile [Protected]")
@profile_router.get("/api/auth/me", response_model=UserResponse, summary="[Step 2A] Get Current User Profile [Protected]")
def get_me(current_user: Users = Depends(get_current_user)):
    return current_user


@profile_router.put("/me", response_model=UserResponse, summary="[Step 2B] Update Profile Details [Protected]")
@profile_router.put("/api/auth/profile", response_model=UserResponse, summary="[Step 2B] Update Profile Details [Protected]")
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


@profile_router.get("/api/users", response_model=List[UserResponse], summary="[Step 2C] List All Users (Admin/Recruiter) [Protected]")
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


@profile_router.get("/api/users/{user_id}", response_model=UserResponse, summary="[Step 2D] Get User by ID [Protected]")
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


@profile_router.put("/api/users/{user_id}", response_model=UserResponse, summary="[Step 2E] Update User by ID [Protected]")
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


@profile_router.delete("/me", response_model=MessageResponse, summary="[Step 2F] Delete My Account [Protected]")
def delete_my_account(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": f"User account {current_user.email} deleted successfully."}

