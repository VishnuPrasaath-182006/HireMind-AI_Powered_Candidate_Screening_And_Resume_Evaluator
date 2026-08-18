from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import UserResume, RecruiterResume, CandidateProfile, JobDescription, MatchEvaluationRecord, Users
from app.models.schemas import MatchEvaluateRequest
from app.core.authentication import get_current_user
from app.services.hybrid_matcher import get_hybrid_matcher
from app.services.learning_path import get_learning_path_engine
from app.services.bias_audit import get_bias_audit_engine
from app.services.llm_rationale import get_rationale_engine
from app.services.plotting_service import get_plotting_service
from app.services.ner_extractor import extract_skills_from_text

router = APIRouter(prefix="/api/analytics", tags=["7. Plotly Data Visualizations & Statistics"])


# ============================================================================
# ?? 1. DIRECT HTML BROWSER VIEWABLE VISUALIZATION DASHBOARDS
# ============================================================================

@router.get("/view/match/{candidate_id}/{job_id}", response_class=HTMLResponse, summary="View Live Interactive Match Visualizations Dashboard in Browser")
def view_match_dashboard_html(
    candidate_id: int,
    job_id: int,
    db: Session = Depends(get_db)
):
    candidate = db.query(UserResume).filter(UserResume.id == candidate_id).first()
    if not candidate:
        candidate = db.query(RecruiterResume).filter(RecruiterResume.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Candidate with ID {candidate_id} not found.")

    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job with ID {job_id} not found.")

    matcher = get_hybrid_matcher()
    plotter = get_plotting_service()
    learning_engine = get_learning_path_engine()
    rationale_engine = get_rationale_engine()

    match_result = matcher.evaluate_match(
        resume_text=candidate.raw_text,
        job_text=job.description,
        candidate_skills=candidate.parsed_skills or [],
        required_skills=job.required_skills or []
    )

    learning_path = learning_engine.generate_learning_path(match_result["missing_skills"])
    
    rationale = rationale_engine.generate_rationale(
        candidate_name=candidate.candidate_name,
        job_title=job.title,
        calibrated_score=match_result["calibrated_score"],
        matched_exact=match_result["matched_exact_skills"],
        matched_related=match_result["matched_related_skills"],
        missing_skills=match_result["missing_skills"],
        cosine_similarity=match_result["cosine_similarity"]
    )

    radar = plotter.create_match_radar_chart(
        candidate_skills=candidate.parsed_skills or [],
        required_skills=job.required_skills or [],
        matched_exact=match_result["matched_exact_skills"],
        matched_related=match_result["matched_related_skills"]
    )

    breakdown = plotter.create_score_breakdown_bar(
        calibrated_score=match_result["calibrated_score"],
        cosine_similarity=match_result["cosine_similarity"],
        exact_skill_score=match_result["exact_skill_score"],
        skill_graph_score=match_result["skill_graph_score"]
    )

    learning_chart = plotter.create_learning_path_boost_chart(
        current_score=match_result["calibrated_score"],
        learning_path=learning_path
    )

    html_content = plotter.render_standalone_match_dashboard_html(
        candidate_name=candidate.candidate_name or f"Candidate #{candidate.id}",
        job_title=job.title,
        match_percentage=match_result["match_percentage"],
        calibrated_score=match_result["calibrated_score"],
        cosine_similarity=match_result["cosine_similarity"],
        exact_score=match_result["exact_skill_score"],
        graph_score=match_result["skill_graph_score"],
        matched_exact=match_result["matched_exact_skills"],
        missing_skills=match_result["missing_skills"],
        exec_summary=rationale["executive_summary"],
        radar_html=radar["html"],
        breakdown_html=breakdown["html"],
        learning_html=learning_chart["html"]
    )

    return HTMLResponse(content=html_content)


@router.get("/view/leaderboard/{job_id}", response_class=HTMLResponse, summary="View Live Interactive Candidate Ranking Leaderboard in Browser")
def view_leaderboard_html(
    job_id: int,
    db: Session = Depends(get_db)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job with ID {job_id} not found.")

    candidates = db.query(CandidateProfile).all()
    matcher = get_hybrid_matcher()
    plotter = get_plotting_service()

    results = []
    for cand in candidates:
        match_res = matcher.evaluate_match(
            resume_text=cand.raw_text,
            job_text=job.description,
            candidate_skills=cand.parsed_skills or [],
            required_skills=job.required_skills or []
        )
        results.append({
            "candidate_id": cand.id,
            "candidate_name": cand.candidate_name or f"Candidate #{cand.id}",
            "calibrated_score": match_res["calibrated_score"],
            "match_percentage": match_res["match_percentage"]
        })

    results.sort(key=lambda x: x["calibrated_score"], reverse=True)
    for idx, item in enumerate(results, start=1):
        item["rank"] = idx

    chart = plotter.create_leaderboard_chart(results, job_title=job.title)

    page_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Leaderboard - {job.title}</title>
    <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Inter', sans-serif; background: #F8FAFC; padding: 24px; color: #1E293B; }}
        .card {{ background: white; padding: 24px; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    </style>
</head>
<body>
    <div class="card">
        <h2 style="margin-bottom: 8px;">Candidate Leaderboard Ranking</h2>
        <p style="color: #64748B; margin-bottom: 20px;">Position: <strong>{job.title}</strong> ({job.company or 'Apex'}) - Total Candidates Evaluated: {len(results)}</p>
        {chart['html']}
    </div>
</body>
</html>"""
    return HTMLResponse(content=page_html)


@router.get("/view/dashboard", response_class=HTMLResponse, summary="View Live System Analytics Dashboard in Browser")
def view_system_dashboard_html(
    db: Session = Depends(get_db)
):
    candidates = db.query(CandidateProfile).all()
    jobs = db.query(JobDescription).all()
    evaluations = db.query(MatchEvaluationRecord).all()

    all_skills = []
    for cand in candidates:
        if cand.parsed_skills:
            all_skills.extend(cand.parsed_skills)

    match_scores = [ev.calibrated_score for ev in evaluations if ev.calibrated_score is not None]

    plotter = get_plotting_service()
    dash = plotter.create_overview_dashboard(
        total_candidates=len(candidates),
        total_jobs=len(jobs),
        all_skills=all_skills,
        match_scores=match_scores
    )

    page_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AI Resume Screening & Matching Analytics</title>
    <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Inter', sans-serif; background: #F8FAFC; padding: 24px; color: #1E293B; }}
        .header {{ background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); color: white; padding: 28px; border-radius: 16px; margin-bottom: 24px; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }}
        .stat-card {{ background: white; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; }}
        .stat-card .label {{ font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; }}
        .stat-card .val {{ font-size: 24px; font-weight: 800; color: #0F172A; margin-top: 4px; }}
        .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
        @media (max-width: 900px) {{ .grid-2 {{ grid-template-columns: 1fr; }} }}
        .chart-box {{ background: white; padding: 20px; border-radius: 16px; border: 1px solid #E2E8F0; }}
    </style>
</head>
<body>
    <div class="header">
        <h1 style="font-size: 24px;">AI Resume Screening & Matching Intelligence Dashboard</h1>
        <p style="color: #C7D2FE; margin-top: 4px;">Real-time overview of parsed profiles, active postings, and match score distribution</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="label">Total Candidate Profiles</div>
            <div class="val">{dash['summary_metrics']['total_candidates']}</div>
        </div>
        <div class="stat-card">
            <div class="label">Active Job Postings</div>
            <div class="val">{dash['summary_metrics']['total_jobs']}</div>
        </div>
        <div class="stat-card">
            <div class="label">Average Match Score</div>
            <div class="val">{dash['summary_metrics']['average_match_score']}%</div>
        </div>
    </div>

    <div class="grid-2">
        <div class="chart-box">
            {dash['top_skills_chart']['html']}
        </div>
        <div class="chart-box">
            {dash['score_distribution_chart']['html']}
        </div>
    </div>
</body>
</html>"""
    return HTMLResponse(content=page_html)


# ============================================================================
# ?? 2. JSON API DATA ENDPOINTS (FOR FRONTEND INTEGRATION)
# ============================================================================

@router.get("/match-chart/{candidate_id}/{job_id}", summary="Plotly: Candidate-Job Match Visualizations JSON Specs [Protected]")
def get_match_chart(
    candidate_id: int,
    job_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(UserResume).filter(UserResume.id == candidate_id).first()
    if not candidate:
        candidate = db.query(RecruiterResume).filter(RecruiterResume.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Candidate with ID {candidate_id} not found.")

    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job with ID {job_id} not found.")

    matcher = get_hybrid_matcher()
    plotter = get_plotting_service()
    learning_engine = get_learning_path_engine()

    match_result = matcher.evaluate_match(
        resume_text=candidate.raw_text,
        job_text=job.description,
        candidate_skills=candidate.parsed_skills or [],
        required_skills=job.required_skills or []
    )

    learning_path = learning_engine.generate_learning_path(match_result["missing_skills"])

    radar_chart = plotter.create_match_radar_chart(
        candidate_skills=candidate.parsed_skills or [],
        required_skills=job.required_skills or [],
        matched_exact=match_result["matched_exact_skills"],
        matched_related=match_result["matched_related_skills"]
    )

    breakdown_chart = plotter.create_score_breakdown_bar(
        calibrated_score=match_result["calibrated_score"],
        cosine_similarity=match_result["cosine_similarity"],
        exact_skill_score=match_result["exact_skill_score"],
        skill_graph_score=match_result["skill_graph_score"]
    )

    learning_chart = plotter.create_learning_path_boost_chart(
        current_score=match_result["calibrated_score"],
        learning_path=learning_path
    )

    return {
        "candidate_id": candidate.id,
        "candidate_name": candidate.candidate_name,
        "job_id": job.id,
        "job_title": job.title,
        "calibrated_score": match_result["calibrated_score"],
        "match_percentage": match_result["match_percentage"],
        "view_in_browser_url": f"/api/analytics/view/match/{candidate.id}/{job.id}",
        "charts": {
            "radar_chart": radar_chart,
            "score_breakdown_chart": breakdown_chart,
            "learning_path_boost_chart": learning_chart
        }
    }


@router.get("/leaderboard-chart/{job_id}", summary="Plotly: Candidate Ranking Leaderboard Bar Chart JSON Specs [Protected]")
def get_leaderboard_chart(
    job_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job with ID {job_id} not found.")

    candidates = db.query(CandidateProfile).all()
    matcher = get_hybrid_matcher()
    plotter = get_plotting_service()

    results = []
    for cand in candidates:
        match_res = matcher.evaluate_match(
            resume_text=cand.raw_text,
            job_text=job.description,
            candidate_skills=cand.parsed_skills or [],
            required_skills=job.required_skills or []
        )
        results.append({
            "candidate_id": cand.id,
            "candidate_name": cand.candidate_name or f"Candidate #{cand.id}",
            "calibrated_score": match_res["calibrated_score"],
            "match_percentage": match_res["match_percentage"]
        })

    results.sort(key=lambda x: x["calibrated_score"], reverse=True)
    for idx, item in enumerate(results, start=1):
        item["rank"] = idx

    chart = plotter.create_leaderboard_chart(results, job_title=job.title)

    return {
        "job_id": job.id,
        "job_title": job.title,
        "total_candidates": len(results),
        "view_in_browser_url": f"/api/analytics/view/leaderboard/{job.id}",
        "leaderboard_chart": chart
    }


@router.get("/bias-chart/{candidate_id}/{job_id}", summary="Plotly: Bias & Demographic Fairness Audit Comparison Chart JSON Specs [Protected]")
def get_bias_chart(
    candidate_id: int,
    job_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(CandidateProfile).filter(CandidateProfile.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    audit_engine = get_bias_audit_engine()
    plotter = get_plotting_service()

    audit_res = audit_engine.run_bias_audit(
        resume_text=candidate.raw_text,
        job_text=job.description,
        candidate_skills=candidate.parsed_skills or [],
        required_skills=job.required_skills or [],
        candidate_name=candidate.candidate_name or ""
    )

    chart = plotter.create_bias_audit_chart(
        original_score=audit_res["original_score"],
        anonymized_score=audit_res["anonymized_score"]
    )

    return {
        "candidate_id": candidate.id,
        "job_id": job.id,
        "is_fair": audit_res["is_fair"],
        "fairness_status": audit_res["fairness_status"],
        "bias_audit_chart": chart
    }


@router.get("/overview-dashboard", summary="Plotly: System Overview Statistics & Analytics Dashboard JSON Specs [Protected]")
def get_overview_dashboard(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidates = db.query(CandidateProfile).all()
    jobs = db.query(JobDescription).all()
    evaluations = db.query(MatchEvaluationRecord).all()

    all_skills = []
    for cand in candidates:
        if cand.parsed_skills:
            all_skills.extend(cand.parsed_skills)

    match_scores = [ev.calibrated_score for ev in evaluations if ev.calibrated_score is not None]

    plotter = get_plotting_service()
    dashboard = plotter.create_overview_dashboard(
        total_candidates=len(candidates),
        total_jobs=len(jobs),
        all_skills=all_skills,
        match_scores=match_scores
    )

    return dashboard


@router.post("/custom-chart", summary="Plotly: Generate Interactive Charts from Raw Text Evaluation [Protected]")
def create_custom_chart(
    request: MatchEvaluateRequest,
    current_user: Users = Depends(get_current_user)
):
    matcher = get_hybrid_matcher()
    plotter = get_plotting_service()
    learning_engine = get_learning_path_engine()

    resume_text = request.raw_resume_text or ""
    job_text = request.raw_job_description or ""
    
    cand_skills = extract_skills_from_text(resume_text)
    req_skills = request.required_skills or extract_skills_from_text(job_text)

    match_result = matcher.evaluate_match(
        resume_text=resume_text,
        job_text=job_text,
        candidate_skills=cand_skills,
        required_skills=req_skills
    )

    learning_path = learning_engine.generate_learning_path(match_result["missing_skills"])

    radar_chart = plotter.create_match_radar_chart(
        candidate_skills=cand_skills,
        required_skills=req_skills,
        matched_exact=match_result["matched_exact_skills"],
        matched_related=match_result["matched_related_skills"]
    )

    breakdown_chart = plotter.create_score_breakdown_bar(
        calibrated_score=match_result["calibrated_score"],
        cosine_similarity=match_result["cosine_similarity"],
        exact_skill_score=match_result["exact_skill_score"],
        skill_graph_score=match_result["skill_graph_score"]
    )

    learning_chart = plotter.create_learning_path_boost_chart(
        current_score=match_result["calibrated_score"],
        learning_path=learning_path
    )

    return {
        "match_percentage": match_result["match_percentage"],
        "charts": {
            "radar_chart": radar_chart,
            "score_breakdown_chart": breakdown_chart,
            "learning_path_boost_chart": learning_chart
        }
    }
