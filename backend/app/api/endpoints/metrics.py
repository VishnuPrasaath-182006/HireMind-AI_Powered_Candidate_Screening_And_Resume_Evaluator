from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import CandidateProfile, JobDescription, Users
from app.models.schemas import (
    CalibrationMetricsResponse,
    BiasAuditRequest,
    BiasAuditResponse
)
from app.core.authentication import get_current_user
from app.services.calibration import get_calibration_service
from app.services.bias_audit import get_bias_audit_engine
from app.services.ner_extractor import extract_skills_from_text

router = APIRouter(prefix="/api/metrics", tags=["6. Bias & Fairness Audit"])


@router.get("/calibration", response_model=CalibrationMetricsResponse, summary="Get calibration model evaluation metrics [Public]")
def get_calibration_metrics():
    calib = get_calibration_service()
    metrics = calib.get_metrics()
    return metrics


@router.post("/bias-audit", response_model=BiasAuditResponse, summary="Run bias & demographic fairness audit on candidate resume [Protected]")
def run_bias_audit(
    request: BiasAuditRequest,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    audit_engine = get_bias_audit_engine()
    
    resume_text = ""
    job_text = ""
    candidate_skills = []
    required_skills = []
    candidate_name = ""

    if request.candidate_id is not None:
        candidate = db.query(CandidateProfile).filter(CandidateProfile.id == request.candidate_id).first()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate with ID {request.candidate_id} not found."
            )
        resume_text = candidate.raw_text
        candidate_skills = candidate.parsed_skills or []
        candidate_name = candidate.candidate_name or ""
    elif request.raw_resume_text:
        resume_text = request.raw_resume_text
        candidate_skills = extract_skills_from_text(resume_text)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'candidate_id' or 'raw_resume_text' must be provided."
        )

    if request.job_id is not None:
        job = db.query(JobDescription).filter(JobDescription.id == request.job_id).first()
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job with ID {request.job_id} not found."
            )
        job_text = job.description
        required_skills = job.required_skills or []
    elif request.raw_job_description:
        job_text = request.raw_job_description
        required_skills = extract_skills_from_text(job_text)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'job_id' or 'raw_job_description' must be provided."
        )

    audit_result = audit_engine.run_bias_audit(
        resume_text=resume_text,
        job_text=job_text,
        candidate_skills=candidate_skills,
        required_skills=required_skills,
        candidate_name=candidate_name
    )

    return {
        "candidate_id": request.candidate_id,
        "original_score": audit_result["original_score"],
        "original_match_percentage": audit_result["original_match_percentage"],
        "anonymized_score": audit_result["anonymized_score"],
        "anonymized_match_percentage": audit_result["anonymized_match_percentage"],
        "score_delta": audit_result["score_delta"],
        "is_fair": audit_result["is_fair"],
        "fairness_status": audit_result["fairness_status"],
        "redacted_items_summary": audit_result["redacted_items_summary"],
        "redacted_text_sample": audit_result["redacted_text_sample"]
    }

