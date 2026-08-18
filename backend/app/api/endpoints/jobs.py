from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import JobDescription, Users
from app.models.schemas import JobDescriptionCreate, JobDescriptionResponse
from app.core.authentication import get_current_user
from app.services.ner_extractor import extract_skills_from_text

router = APIRouter(prefix="/api/jobs", tags=["4. Job Postings"])


@router.post("/", response_model=JobDescriptionResponse, status_code=status.HTTP_201_CREATED, summary="Create a new job posting [Protected]")
@router.post("/create", response_model=JobDescriptionResponse, status_code=status.HTTP_201_CREATED, summary="Create a new job posting [Protected]")
def create_job(
    job_in: JobDescriptionCreate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    explicit_skills = [s.strip().lower() for s in job_in.required_skills if s.strip()]
    extracted_from_desc = extract_skills_from_text(job_in.description)
    req_skills = sorted(list(set(explicit_skills + extracted_from_desc)))
    if not req_skills:
        req_skills = explicit_skills or extracted_from_desc

    # Use current user company name if not provided
    company_name = job_in.company or current_user.company_name or "Apex Innovations & Tech Labs"

    job = JobDescription(
        title=job_in.title,
        company=company_name,
        description=job_in.description,
        required_skills=req_skills,
        min_experience_years=job_in.min_experience_years or 0.0,
        is_active=True
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job


@router.get("/", response_model=List[JobDescriptionResponse], summary="List active job postings [Protected]")
def list_jobs(
    skip: int = 0,
    limit: int = 100,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    jobs = db.query(JobDescription).filter(JobDescription.is_active == True).order_by(JobDescription.created_at.desc()).offset(skip).limit(limit).all()
    return jobs


@router.get("/{job_id}", response_model=JobDescriptionResponse, summary="Get job description by ID [Protected]")
def get_job_by_id(
    job_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job posting with ID {job_id} not found."
        )
    return job
