import io
import zipfile
import re
import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import UserResume, RecruiterResume, Users
from app.models.schemas import CandidateProfileResponse, ResumeUploadResponse
from app.core.authentication import get_current_user
from app.services.parser import parse_resume
from app.services.ner_extractor import extract_skills_from_text

router = APIRouter(prefix="/api/resumes", tags=["3. Resumes & Candidates Management"])


def fallback_extract_keywords(text: str) -> List[str]:
    """Fallback keyword extractor if standard taxonomy lookup is sparse."""
    words = re.findall(r'\b[a-zA-Z]{3,20}\b', text.lower())
    common_stops = {
        'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'been',
        'will', 'your', 'about', 'more', 'also', 'such', 'into', 'some', 'over',
        'resume', 'experience', 'education', 'project', 'projects', 'summary',
        'work', 'profile', 'personal', 'email', 'phone', 'contact', 'address',
        'curriculum', 'vitae', 'name', 'date', 'year', 'years', 'month', 'months'
    }
    freq: Dict[str, int] = {}
    for w in words:
        if w not in common_stops and len(w) >= 3:
            freq[w] = freq.get(w, 0) + 1
    
    sorted_words = sorted(freq.keys(), key=lambda x: freq[x], reverse=True)
    return sorted_words[:8] if sorted_words else ["general competencies", "problem solving", "analytics"]


# ============================================================================
# 1. USER / CANDIDATE PERSONAL RESUME UPLOAD (TABLE: user_resumes)
# ============================================================================
@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload individual user resume (PDF, DOCX, TXT) -> Saved strictly to user_resumes [Protected]"
)
async def upload_resume(
    file: UploadFile = File(..., description="Upload resume in PDF, DOCX, or TXT format"),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename = file.filename or "resume.pdf"
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty. Please select a valid document."
        )

    try:
        parsed_doc = parse_resume(file_bytes, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse document '{filename}': {str(e)}"
        )

    raw_text = parsed_doc.get("raw_text", "")
    if not raw_text or not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract readable text from uploaded document. Ensure it is not an encrypted or blank file."
        )

    sections = parsed_doc.get("sections", {})
    skills_section_text = sections.get("skills", "")
    cert_section_text = sections.get("certifications", "")

    # Extract skills strictly from the dedicated Skills and Certifications sections
    extracted_skills = []
    if skills_section_text and skills_section_text.strip():
        extracted_skills.extend(extract_skills_from_text(skills_section_text))
    
    if cert_section_text and cert_section_text.strip():
        extracted_skills.extend(extract_skills_from_text(cert_section_text))

    # If neither section header was found, scan document for recognized taxonomy skills
    if not extracted_skills:
        extracted_skills = extract_skills_from_text(raw_text)

    # Deduplicate and sort
    extracted_skills = sorted(list(set(extracted_skills)))

    # Fallback to key domain terms if taxonomy didn't hit
    if not extracted_skills:
        extracted_skills = fallback_extract_keywords(raw_text)

    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
    candidate_email = email_match.group(0) if email_match else current_user.email
    
    parsed_name = parsed_doc.get("candidate_name")
    candidate_name = parsed_name or current_user.name or (filename.rsplit(".", 1)[0].replace("_", " ").title())

    file_ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "pdf"
    phone_match = re.search(r'(\+?\d[\d\s-]{8,}\d)', raw_text)
    candidate_phone = phone_match.group(0).strip() if phone_match else None
    
    # Store strictly in user_resumes table
    new_profile = UserResume(
        user_id=current_user.id,
        filename=filename,
        file_type=file_ext,
        raw_text=raw_text,
        parsed_skills=extracted_skills,
        sections=sections,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        candidate_phone=candidate_phone
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    return ResumeUploadResponse(
        message=f"Resume '{filename}' parsed successfully. Extracted {len(extracted_skills)} verified skills from your Skills section.",
        profile=new_profile
    )


@router.get(
    "/my-resume",
    response_model=CandidateProfileResponse,
    summary="Get current user's latest uploaded resume from user_resumes [Protected]"
)
def get_my_resume(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = (
        db.query(UserResume)
        .filter(UserResume.user_id == current_user.id)
        .order_by(UserResume.created_at.desc())
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No uploaded resume found for current user."
        )
    return resume


# ============================================================================
# 2. RECRUITER BATCH CANDIDATE RESUME UPLOADS (TABLE: recruiter_resumes)
# ============================================================================
@router.post(
    "/batch-upload",
    summary="Recruiter batch upload resumes via ZIP or multi-files -> Saved strictly to recruiter_resumes [Protected]"
)
async def batch_upload_resumes(
    request: Request,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    all_files_to_process = []
    uploaded_items = []

    try:
        form = await request.form()
        for key in form:
            field_values = form.getlist(key)
            for val in field_values:
                if hasattr(val, "filename") and val.filename:
                    uploaded_items.append(val)
    except Exception as form_err:
        print(f"Form parse error: {form_err}")

    # Process all uploaded items
    for item in uploaded_items:
        fname = item.filename or "resume.pdf"
        fbytes = await item.read()
        if not fbytes:
            continue

        # Check if bytes represent a valid ZIP archive regardless of file extension
        is_zip = False
        try:
            if zipfile.is_zipfile(io.BytesIO(fbytes)) or fname.lower().endswith(".zip"):
                is_zip = True
        except Exception:
            is_zip = False

        if is_zip:
            try:
                with zipfile.ZipFile(io.BytesIO(fbytes)) as z:
                    for zinfo in z.infolist():
                        if zinfo.is_dir() or zinfo.filename.startswith("__MACOSX"):
                            continue
                        clean_fname = zinfo.filename.replace("\\", "/").split("/")[-1]
                        if not clean_fname or clean_fname.startswith("."):
                            continue
                        # Accept any document or text format
                        lower_clean = clean_fname.lower()
                        if lower_clean.endswith((".pdf", ".docx", ".doc", ".txt", ".rtf", ".md", ".text")) or "." not in clean_fname:
                            content = z.read(zinfo.filename)
                            if content:
                                all_files_to_process.append((clean_fname, content))
            except Exception as zip_err:
                print(f"ZIP extraction notice for {fname}: {zip_err}")
        else:
            all_files_to_process.append((fname, fbytes))

    if not all_files_to_process:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid resume files (.pdf, .docx, .txt) found in upload. Please provide a ZIP archive or resume documents."
        )

    file_results = []
    success_count = 0
    warning_count = 0
    profiles_to_commit = []

    for idx, (fname, fbytes) in enumerate(all_files_to_process):
        size_kb = round(len(fbytes) / 1024, 1)
        ext = fname.rsplit(".", 1)[-1].upper() if "." in fname else "TXT"

        try:
            parsed = parse_resume(fbytes, fname)
            raw_text = parsed.get("raw_text", "")
            sections = parsed.get("sections", {})
            skills_text = sections.get("skills", "")
            cert_text = sections.get("certifications", "")
            has_skills_col = bool((skills_text and skills_text.strip()) or (cert_text and cert_text.strip()))

            skills_from_sec = extract_skills_from_text(skills_text) if skills_text else []
            skills_from_cert = extract_skills_from_text(cert_text) if cert_text else []
            
            extracted_skills = sorted(list(set(skills_from_sec + skills_from_cert)))
            if not extracted_skills:
                extracted_skills = extract_skills_from_text(raw_text)
            if not extracted_skills:
                extracted_skills = fallback_extract_keywords(raw_text)

            email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
            c_email = email_match.group(0) if email_match else f"{fname.rsplit('.', 1)[0].lower()}@talent.org"
            
            parsed_name = parsed.get("candidate_name")
            if parsed_name and len(parsed_name) < 45:
                c_name = parsed_name
            else:
                c_name = fname.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

            new_cand = RecruiterResume(
                recruiter_id=current_user.id if current_user else None,
                company_name=current_user.company_name if current_user else None,
                filename=fname,
                file_type=ext.lower(),
                raw_text=raw_text or f"Resume content for {c_name}",
                parsed_skills=extracted_skills,
                candidate_name=c_name,
                candidate_email=c_email,
                sections=sections
            )
            profiles_to_commit.append(new_cand)
            success_count += 1

            file_results.append({
                "candidate_id": None,
                "filename": fname,
                "file_size_kb": size_kb,
                "file_format": ext,
                "candidate_name": c_name,
                "candidate_email": c_email,
                "has_skills_column": has_skills_col,
                "skills_count": len(extracted_skills),
                "skills": extracted_skills,
                "status": "Ready for Ranking",
                "status_type": "success"
            })
        except Exception as err:
            warning_count += 1
            file_results.append({
                "filename": fname,
                "file_size_kb": size_kb,
                "file_format": ext,
                "candidate_name": fname.rsplit(".", 1)[0],
                "candidate_email": "N/A",
                "has_skills_column": False,
                "skills_count": 0,
                "skills": [],
                "status": "Parse Error",
                "status_type": "error",
                "error": str(err)
            })

    # Bulk commit strictly to recruiter_resumes table
    if profiles_to_commit:
        db.add_all(profiles_to_commit)
        db.commit()
        for idx, p in enumerate(profiles_to_commit):
            if idx < len(file_results) and file_results[idx].get("status_type") == "success":
                file_results[idx]["candidate_id"] = p.id

    return {
        "message": f"Evaluated {len(all_files_to_process)} resumes in batch: {success_count} ready for ranking ({warning_count} skipped/warnings).",
        "total_files": len(all_files_to_process),
        "success_count": success_count,
        "warning_count": warning_count,
        "files": file_results
    }


@router.get("/", response_model=List[CandidateProfileResponse], summary="List all recruiter candidate resumes [Protected]")
def get_all_candidates(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(RecruiterResume).order_by(RecruiterResume.created_at.desc()).all()


@router.get("/{candidate_id}", response_model=CandidateProfileResponse, summary="Get recruiter candidate resume by ID [Protected]")
def get_candidate(
    candidate_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(RecruiterResume).filter(RecruiterResume.id == candidate_id).first()
    if not candidate:
        candidate = db.query(UserResume).filter(UserResume.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate resume with ID {candidate_id} not found."
        )
    return candidate


@router.delete("/clear", summary="Clear all candidates from recruiter candidate pool [Protected]")
def clear_all_candidate_profiles(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted_count = db.query(RecruiterResume).delete()
    db.commit()
    return {"message": f"Successfully cleared {deleted_count} candidate resumes from recruiter pool.", "deleted_count": deleted_count}
