from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import UserResume, RecruiterResume, CandidateProfile, JobDescription, MatchEvaluationRecord, Users
from app.models.schemas import (
    MatchEvaluateRequest,
    MatchEvaluateResponse,
    LeaderboardResponse,
    CandidateRankItem,
    EvaluationHistoryResponse,
    EvaluationHistoryItem,
)
from app.core.authentication import get_current_user
from app.services.hybrid_matcher import get_hybrid_matcher
from app.services.ner_extractor import extract_skills_from_text
from app.services.parser import parse_structural_sections
from app.services.llm_rationale import get_rationale_engine
from app.services.learning_path import get_learning_path_engine
from app.services.ats_service import get_ats_engine

router = APIRouter(prefix="/api/match", tags=["5. AI Matching & Ranking Engine"])


def build_swot_analysis(candidate_name: str, job_title: str, match_result: dict) -> dict:
    matched_s = match_result.get("matched_exact_skills") or []
    missing_s = match_result.get("missing_skills") or []
    cosine_sim = match_result.get("cosine_similarity", 0.0) or 0.0
    exact_score = match_result.get("exact_skill_score", 0.0) or 0.0
    graph_score = match_result.get("skill_graph_score", 0.0) or 0.0
    match_pct = match_result.get("match_percentage", 0.0) or 0.0

    matched_str = ", ".join(matched_s[:4]) if matched_s else "Foundational tech baseline"
    missing_str = ", ".join(missing_s[:4]) if missing_s else "No critical skill gaps"
    est_hours = min(35, max(8, len(missing_s) * 6))

    strengths = [
        f"Verified strength in {len(matched_s)} core competencies: {matched_str}",
        f"High semantic embedding alignment ({round(cosine_sim * 100)}%) with job responsibilities",
        "Dedicated parseable skills column validated by ATS engine"
    ]

    weaknesses = [
        f"Missing target requirements: {missing_str}",
        f"Exact skill match gap ({round((1.0 - exact_score) * 100)}% unfulfilled criteria)",
        "Lower coverage on specialized infrastructure & backend tools"
    ] if missing_s else [
        "Minor experience depth variance in senior architecture areas",
        "Continuous framework version updates recommended"
    ]

    opportunities = [
        f"Fast upskilling trajectory: ~{est_hours} hours of hands-on labs to reach >85% target readiness",
        "Strong taxonomy graph adjacent capabilities accelerate role onboarding",
        "High adaptability for multi-stack cloud & software engineering projects"
    ]

    threats = [
        "High ATS keyword filter risk if candidate submits resume without target cloud keywords",
        f"Domain shift ramp-up risk for specialized {job_title} workflows"
    ] if match_pct < 60.0 else [
        "Competitive candidate talent pool in target domain",
        "Continuous skill updating recommended"
    ]

    swot_scores = {
        "strengths": round(exact_score * 50 + cosine_sim * 50, 1),
        "weaknesses": round((1.0 - exact_score) * 70, 1),
        "opportunities": round(graph_score * 85, 1),
        "threats": round((1.0 - cosine_sim) * 60, 1)
    }

    return {
        "candidate_name": candidate_name or "Candidate",
        "strengths": strengths,
        "weaknesses": weaknesses,
        "opportunities": opportunities,
        "threats": threats,
        "swot_scores": swot_scores,
        "estimated_upskill_hours": est_hours,
        "recommended_focus_area": missing_s[0] if missing_s else "Architecture & Scale"
    }


@router.post("/evaluate", response_model=MatchEvaluateResponse, summary="Evaluate candidate-job match with ATS Friendliness report, precision calibration, and history tracking [Protected]")
def evaluate_match(
    request: MatchEvaluateRequest,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    matcher = get_hybrid_matcher()
    rationale_engine = get_rationale_engine()
    learning_engine = get_learning_path_engine()
    ats_engine = get_ats_engine()

    resume_text = ""
    job_text = ""
    candidate_skills: List[str] = []
    required_skills: List[str] = []
    sections: Dict[str, str] = {}
    candidate_name = current_user.name if current_user else "Candidate"
    job_title = getattr(request, "job_title", None) or "Target Position"
    company_name = getattr(request, "company_name", None) or "Apex Innovations"

    if request.candidate_id is not None:
        # Check UserResume first, then RecruiterResume
        candidate = db.query(UserResume).filter(UserResume.id == request.candidate_id).first()
        if not candidate:
            candidate = db.query(RecruiterResume).filter(RecruiterResume.id == request.candidate_id).first()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate with ID {request.candidate_id} not found."
            )
        resume_text = candidate.raw_text
        sections = candidate.sections or parse_structural_sections(resume_text)
        
        # Check if skills section exists
        skills_sec = sections.get("skills", "").strip()
        if not skills_sec and not candidate.parsed_skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Skills Section: No dedicated 'Skills' or 'Technical Skills' column was found in this candidate's resume. Please re-upload with a clearly labeled 'Skills' section."
            )
        candidate_skills = candidate.parsed_skills or extract_skills_from_text(skills_sec)
        candidate_name = candidate.candidate_name or current_user.name or f"Candidate #{candidate.id}"
    elif request.raw_resume_text:
        resume_text = request.raw_resume_text
        sections = parse_structural_sections(resume_text)
        skills_sec = sections.get("skills", "").strip()
        if not skills_sec:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Skills Section: No dedicated 'Skills' or 'Technical Skills' section was found in the provided resume. Please include a 'Skills' section listing your known competencies so it can be evaluated precisely."
            )
        candidate_skills = extract_skills_from_text(skills_sec)
        if not candidate_skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Technical Skills Found in Skills Section: Please list your technical competencies clearly under your 'Skills' section."
            )
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
        job_title = job.title
        company_name = job.company
    elif request.raw_job_description:
        job_text = request.raw_job_description
        required_skills = request.required_skills or extract_skills_from_text(job_text)
        if request.job_title:
            job_title = request.job_title
        if request.company_name:
            company_name = request.company_name
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'job_id' or 'raw_job_description' must be provided."
        )

    # 1. Evaluate ATS Friendliness & Compliance First
    ats_result = ats_engine.evaluate_ats_compatibility(
        resume_text=resume_text,
        job_description=job_text,
        candidate_skills=candidate_skills,
        required_skills=required_skills,
        sections=sections
    )

    # 2. Run Best Hybrid Multi-Factor Precision Evaluation Model
    match_result = matcher.evaluate_match(
        resume_text=resume_text,
        job_text=job_text,
        candidate_skills=candidate_skills,
        required_skills=required_skills
    )

    # 3. Compare with previous uploads / evaluations in history
    previous_eval = (
        db.query(MatchEvaluationRecord)
        .filter(MatchEvaluationRecord.user_id == current_user.id)
        .order_by(MatchEvaluationRecord.created_at.desc())
        .first()
    )

    score_delta = 0.0
    comparison_data = None

    if previous_eval:
        prev_pct = round(previous_eval.calibrated_score * 100, 2)
        curr_pct = match_result["match_percentage"]
        score_delta = round(curr_pct - prev_pct, 2)
        
        prev_matched = set(previous_eval.matched_skills or [])
        curr_matched = set(match_result["matched_exact_skills"])
        newly_acquired = list(curr_matched - prev_matched)

        improvement_status = "Score Maintained"
        if score_delta > 0:
            improvement_status = f"+{score_delta}% Improvement from previous upload"
        elif score_delta < 0:
            improvement_status = f"{score_delta}% (Review missing requirements)"

        comparison_data = {
            "has_previous": True,
            "previous_match_percentage": prev_pct,
            "current_match_percentage": curr_pct,
            "score_delta": score_delta,
            "improvement_status": improvement_status,
            "previous_eval_date": previous_eval.created_at.strftime("%b %d, %Y %H:%M") if previous_eval.created_at else "Earlier",
            "newly_acquired_skills": newly_acquired,
        }
    else:
        comparison_data = {
            "has_previous": False,
            "previous_match_percentage": None,
            "current_match_percentage": match_result["match_percentage"],
            "score_delta": 0.0,
            "improvement_status": "Initial Baseline Evaluation Recorded",
            "previous_eval_date": None,
            "newly_acquired_skills": [],
        }

    # 4. Generate Rationale & Learning Path
    rationale_data = rationale_engine.generate_rationale(
        candidate_name=candidate_name,
        job_title=job_title,
        calibrated_score=match_result["calibrated_score"],
        matched_exact=match_result["matched_exact_skills"],
        matched_related=match_result["matched_related_skills"],
        missing_skills=match_result["missing_skills"],
        cosine_similarity=match_result["cosine_similarity"]
    )

    learning_path_data = learning_engine.generate_learning_path(match_result["missing_skills"])

    # 5. Save to Database History with ATS data
    eval_record = MatchEvaluationRecord(
        user_id=current_user.id,
        candidate_id=request.candidate_id,
        job_id=request.job_id,
        company_name=company_name,
        job_title=job_title,
        job_description=job_text,
        score_improvement_delta=score_delta,
        calibrated_score=match_result["calibrated_score"],
        cosine_similarity=match_result["cosine_similarity"],
        skill_graph_score=match_result["skill_graph_score"],
        exact_skill_score=match_result["exact_skill_score"],
        matched_skills=match_result["matched_exact_skills"],
        missing_skills=match_result["missing_skills"],
        rationale=rationale_data,
        learning_path=learning_path_data,
        ats_evaluation=ats_result,
        created_at=datetime.utcnow()
    )
    db.add(eval_record)
    db.commit()
    db.refresh(eval_record)

    swot_data = build_swot_analysis(candidate_name, job_title, match_result)

    return {
        "history_id": eval_record.id,
        "candidate_id": request.candidate_id,
        "candidate_name": candidate_name,
        "company_name": company_name,
        "job_id": request.job_id,
        "job_title": job_title,
        "job_description": job_text,
        "calibrated_score": match_result["calibrated_score"],
        "match_percentage": match_result["match_percentage"],
        "cosine_similarity": match_result["cosine_similarity"],
        "exact_skill_score": match_result["exact_skill_score"],
        "skill_graph_score": match_result["skill_graph_score"],
        "matched_exact_skills": match_result["matched_exact_skills"],
        "matched_related_skills": match_result["matched_related_skills"],
        "missing_skills": match_result["missing_skills"],
        "rationale": rationale_data,
        "learning_path": learning_path_data,
        "swot": swot_data,
        "comparison": comparison_data,
        "ats_evaluation": ats_result,
    }


@router.get("/history", response_model=EvaluationHistoryResponse, summary="Get evaluation history for current candidate [Protected]")
def get_user_evaluation_history(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    records = (
        db.query(MatchEvaluationRecord)
        .filter((MatchEvaluationRecord.user_id == current_user.id) | (MatchEvaluationRecord.user_id.is_(None)))
        .order_by(MatchEvaluationRecord.created_at.desc())
        .limit(50)
        .all()
    )

    history_items = []
    for r in records:
        history_items.append(
            EvaluationHistoryItem(
                id=r.id,
                candidate_id=r.candidate_id,
                candidate_name=current_user.name,
                company_name=r.company_name or "Company",
                job_title=r.job_title or "Target Position",
                job_description=r.job_description,
                match_percentage=round((r.calibrated_score or 0.0) * 100, 2),
                cosine_similarity=round(r.cosine_similarity or 0.0, 4),
                exact_skill_score=round(r.exact_skill_score or 0.0, 4),
                skill_graph_score=round(r.skill_graph_score or 0.0, 4),
                score_improvement_delta=r.score_improvement_delta or 0.0,
                matched_skills=r.matched_skills or [],
                missing_skills=r.missing_skills or [],
                created_at=r.created_at or datetime.utcnow(),
            )
        )

    return EvaluationHistoryResponse(total_count=len(history_items), history=history_items)


@router.get("/history/{history_id}", response_model=MatchEvaluateResponse, summary="Get full details for a past evaluation record [Protected]")
def get_history_detail(
    history_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = (
        db.query(MatchEvaluationRecord)
        .filter(MatchEvaluationRecord.id == history_id, MatchEvaluationRecord.user_id == current_user.id)
        .first()
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation history record with ID {history_id} not found."
        )

    comparison_data = {
        "has_previous": True,
        "previous_match_percentage": None,
        "current_match_percentage": round(rec.calibrated_score * 100, 2),
        "score_delta": rec.score_improvement_delta or 0.0,
        "improvement_status": "Saved Record",
        "previous_eval_date": rec.created_at.strftime("%b %d, %Y %H:%M") if rec.created_at else "",
        "newly_acquired_skills": [],
    }

    swot_match_result = {
        "matched_exact_skills": rec.matched_skills or [],
        "missing_skills": rec.missing_skills or [],
        "cosine_similarity": rec.cosine_similarity or 0.0,
        "exact_skill_score": rec.exact_skill_score or 0.0,
        "skill_graph_score": rec.skill_graph_score or 0.0,
        "match_percentage": round((rec.calibrated_score or 0.0) * 100, 2)
    }
    swot_data = build_swot_analysis(current_user.name, rec.job_title or "Target Position", swot_match_result)

    return {
        "history_id": rec.id,
        "candidate_id": rec.candidate_id,
        "candidate_name": current_user.name,
        "company_name": rec.company_name,
        "job_id": rec.job_id,
        "job_title": rec.job_title,
        "job_description": rec.job_description,
        "calibrated_score": rec.calibrated_score,
        "match_percentage": round(rec.calibrated_score * 100, 2),
        "cosine_similarity": rec.cosine_similarity,
        "exact_skill_score": rec.exact_skill_score,
        "skill_graph_score": rec.skill_graph_score,
        "matched_exact_skills": rec.matched_skills or [],
        "matched_related_skills": [],
        "missing_skills": rec.missing_skills or [],
        "rationale": rec.rationale or {
            "executive_summary": "Evaluation record retrieved from database history.",
            "matched_strengths": rec.matched_skills or [],
            "missing_critical_skills": rec.missing_skills or [],
            "recommendation": "Review learning resources to boost match percentage."
        },
        "learning_path": rec.learning_path or [],
        "swot": swot_data,
        "comparison": comparison_data,
        "ats_evaluation": rec.ats_evaluation or None,
    }


@router.delete("/history/{history_id}", summary="Delete an evaluation record [Protected]")
def delete_history_item(
    history_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = (
        db.query(MatchEvaluationRecord)
        .filter(MatchEvaluationRecord.id == history_id, MatchEvaluationRecord.user_id == current_user.id)
        .first()
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation history record with ID {history_id} not found."
        )
    db.delete(rec)
    db.commit()
    return {"message": f"Evaluation record {history_id} deleted successfully."}


@router.delete("/history/clear", summary="Clear all evaluation history for current user [Protected]")
def clear_all_history(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(MatchEvaluationRecord).filter(MatchEvaluationRecord.user_id == current_user.id).delete()
    db.commit()
    return {"message": "All evaluation history cleared successfully."}


@router.get("/leaderboard/{job_id}", response_model=LeaderboardResponse, summary="Get ranked candidate leaderboard with detailed SWOT analysis for a job [Protected]")
def get_job_leaderboard(
    job_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found."
        )

    candidates = db.query(RecruiterResume).all()
    if not candidates:
        return LeaderboardResponse(
            job_id=job.id,
            job_title=job.title,
            total_candidates_evaluated=0,
            leaderboard=[]
        )

    matcher = get_hybrid_matcher()
    scored_candidates = []

    cand_data = [{"raw_text": c.raw_text, "parsed_skills": c.parsed_skills} for c in candidates]
    match_results = matcher.evaluate_batch(
        candidate_items=cand_data,
        job_text=job.description,
        required_skills=job.required_skills or []
    )

    for idx, cand in enumerate(candidates):
        match_result = match_results[idx]

        match_pct = match_result["match_percentage"]
        matched_s = match_result.get("matched_exact_skills") or match_result.get("matched_skills") or []
        missing_s = match_result.get("missing_skills") or []

        # Determine Eligibility Tier
        if match_pct >= 75.0:
            eligibility_tier = "Top Eligible"
        elif match_pct >= 50.0:
            eligibility_tier = "Qualified"
        else:
            eligibility_tier = "Needs Review"

        # Generate Candidate-Specific SWOT Analysis
        matched_str = ", ".join(matched_s[:4]) if matched_s else "Foundational tech baseline"
        missing_str = ", ".join(missing_s[:4]) if missing_s else "No critical skill gaps"
        est_hours = min(35, max(8, len(missing_s) * 6))

        strengths = [
            f"Verified strength in {len(matched_s)} core competencies: {matched_str}",
            f"High semantic embedding alignment ({round(match_result['cosine_similarity']*100)}%) with job responsibilities",
            "Dedicated parseable skills column validated by ATS engine"
        ]

        weaknesses = [
            f"Missing target requirements: {missing_str}",
            f"Exact skill match gap ({round((1.0 - match_result['exact_skill_score']) * 100)}% unfulfilled criteria)",
            "Lower coverage on advanced infrastructure tools"
        ] if missing_s else [
            "Minor experience depth variance in senior architecture areas",
            "Continuous framework version updates recommended"
        ]

        opportunities = [
            f"Fast upskilling trajectory: ~{est_hours} hours of hands-on labs to reach >85% target readiness",
            "Strong taxonomy graph adjacent capabilities accelerate role onboarding",
            "High adaptability for multi-stack cloud orchestration projects"
        ]

        threats = [
            "High ATS keyword filter risk if candidate submits resume without target cloud keywords",
            f"Domain shift ramp-up risk for specialized {job.title} workflows"
        ] if match_pct < 60.0 else [
            "Competitive offer timeline from other tech enterprises",
            "Continuous compensation benchmarking recommended"
        ]

        swot_scores = {
            "strengths": round(match_result["exact_skill_score"] * 50 + match_result["cosine_similarity"] * 50, 1),
            "weaknesses": round((1.0 - match_result["exact_skill_score"]) * 70, 1),
            "opportunities": round(match_result["skill_graph_score"] * 85, 1),
            "threats": round((1.0 - match_result["cosine_similarity"]) * 60, 1)
        }

        swot = {
            "candidate_name": cand.candidate_name or f"Candidate #{cand.id}",
            "strengths": strengths,
            "weaknesses": weaknesses,
            "opportunities": opportunities,
            "threats": threats,
            "swot_scores": swot_scores,
            "estimated_upskill_hours": est_hours,
            "recommended_focus_area": missing_s[0] if missing_s else "Leadership & Scale"
        }

        scored_candidates.append({
            "candidate_id": cand.id,
            "candidate_name": cand.candidate_name or f"Candidate #{cand.id}",
            "candidate_email": cand.candidate_email or "talent@candidate.org",
            "calibrated_score": match_result["calibrated_score"],
            "match_percentage": match_pct,
            "cosine_similarity": match_result["cosine_similarity"],
            "exact_skill_score": match_result["exact_skill_score"],
            "skill_graph_score": match_result["skill_graph_score"],
            "matched_skills_count": len(matched_s),
            "missing_skills_count": len(missing_s),
            "matched_skills": matched_s,
            "missing_skills": missing_s,
            "eligibility_tier": eligibility_tier,
            "swot": swot
        })

    # Sort candidates by calibrated score descending
    scored_candidates.sort(key=lambda x: x["calibrated_score"], reverse=True)

    leaderboard = []
    for rank_idx, cand_data in enumerate(scored_candidates, start=1):
        leaderboard.append(
            CandidateRankItem(
                rank=rank_idx,
                candidate_id=cand_data["candidate_id"],
                candidate_name=cand_data["candidate_name"],
                candidate_email=cand_data["candidate_email"],
                calibrated_score=round(cand_data["calibrated_score"], 4),
                match_percentage=cand_data["match_percentage"],
                cosine_similarity=round(cand_data["cosine_similarity"], 4),
                exact_skill_score=round(cand_data["exact_skill_score"], 4),
                skill_graph_score=round(cand_data["skill_graph_score"], 4),
                matched_skills_count=cand_data["matched_skills_count"],
                missing_skills_count=cand_data["missing_skills_count"],
                matched_skills=cand_data["matched_skills"],
                missing_skills=cand_data["missing_skills"],
                eligibility_tier=cand_data["eligibility_tier"],
                swot=cand_data["swot"]
            )
        )

    return LeaderboardResponse(
        job_id=job.id,
        job_title=job.title,
        total_candidates_evaluated=len(leaderboard),
        leaderboard=leaderboard
    )

@router.post("/rank", response_model=LeaderboardResponse, summary="Trigger candidate ranking for a job [Protected]")
def trigger_job_ranking(
    job_id: int = Query(...),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_job_leaderboard(job_id=job_id, current_user=current_user, db=db)
