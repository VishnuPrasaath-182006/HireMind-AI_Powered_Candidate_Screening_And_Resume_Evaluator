import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.parser import parse_resume
from app.services.ner_extractor import extract_skills_from_text
from app.services.embedding_service import get_embedding_service
from app.services.skill_graph import get_skill_graph
from app.services.calibration import get_calibration_service
from app.services.hybrid_matcher import get_hybrid_matcher
from app.services.llm_rationale import get_rationale_engine
from app.services.learning_path import get_learning_path_engine
from app.services.bias_audit import get_bias_audit_engine
from app.services.plotting_service import get_plotting_service

client = TestClient(app)

SAMPLE_RESUME_TEXT = """
John Doe
Senior Software Engineer
Email: john.doe@example.com | Phone: +1-555-0199

SKILLS
Python, FastAPI, Docker, PostgreSQL, React, Git, Redis, AWS

EXPERIENCE
Senior Backend Developer at CloudCorp (2021 - Present)
- Developed scalable REST APIs using FastAPI and PostgreSQL.
- Orchestrated container deployments with Docker and Kubernetes on AWS.

EDUCATION
B.S. in Computer Science - Stanford University (2017 - 2021)

PROJECTS
AI Resume Parser: Built automated document parsing and skill extraction system.
"""


def test_document_parser():
    file_bytes = SAMPLE_RESUME_TEXT.encode("utf-8")
    parsed = parse_resume(file_bytes, "john_doe_resume.txt")
    
    assert parsed["file_type"] == "txt"
    assert "john.doe@example.com" in (parsed["candidate_email"] or "")
    assert "skills" in parsed["sections"]
    assert "experience" in parsed["sections"]
    assert "education" in parsed["sections"]
    assert "projects" in parsed["sections"]


def test_ner_skill_extractor():
    skills = extract_skills_from_text(SAMPLE_RESUME_TEXT)
    assert isinstance(skills, list)
    assert "python" in skills
    assert "fastapi" in skills
    assert "docker" in skills
    assert "postgresql" in skills


def test_relational_skill_graph():
    graph = get_skill_graph()
    candidate_skills = ["python", "flask", "docker", "postgresql"]
    required_skills = ["python", "django", "kubernetes"]
    
    match_result = graph.compute_skill_match(candidate_skills, required_skills)
    
    assert "python" in match_result["matched_exact_skills"]
    assert match_result["exact_skill_score"] > 0.0
    assert match_result["skill_graph_score"] >= match_result["exact_skill_score"]
    assert "django" in match_result["missing_skills"]
    assert "kubernetes" in match_result["missing_skills"]


def test_embedding_service():
    embedder = get_embedding_service()
    text1 = "Senior Python Backend Developer with FastAPI experience."
    text2 = "Looking for Python engineer building scalable microservices with FastAPI."
    text3 = "Chef specializing in authentic Italian pasta and desserts."
    
    sim_high = embedder.compute_text_similarity(text1, text2)
    sim_low = embedder.compute_text_similarity(text1, text3)
    
    assert 0.0 <= sim_high <= 1.0
    assert 0.0 <= sim_low <= 1.0
    assert sim_high > sim_low


def test_calibration_model_inference():
    calib = get_calibration_service()
    prob_high = calib.predict_probability([1.0, 1.0, 1.0])
    assert prob_high > 0.90
    
    prob_low = calib.predict_probability([0.1, 0.0, 0.0])
    assert prob_low < 0.20
    
    metrics = calib.get_metrics()
    assert "Accuracy" in metrics
    assert "ROC_AUC" in metrics


def test_hybrid_matcher():
    matcher = get_hybrid_matcher()
    resume_text = "Experienced Python, Docker, and PostgreSQL developer."
    job_text = "We need a Python developer who knows Docker, PostgreSQL, and AWS."
    
    res = matcher.evaluate_match(
        resume_text=resume_text,
        job_text=job_text,
        candidate_skills=["python", "docker", "postgresql"],
        required_skills=["python", "docker", "postgresql", "aws"]
    )
    
    assert 0.0 <= res["calibrated_score"] <= 1.0
    assert 0.0 <= res["match_percentage"] <= 100.0
    assert "python" in res["matched_exact_skills"]
    assert "aws" in res["missing_skills"]


def test_llm_rationale_engine():
    rationale_engine = get_rationale_engine()
    res = rationale_engine.generate_rationale(
        candidate_name="John Doe",
        job_title="Python Lead",
        calibrated_score=0.85,
        matched_exact=["python", "fastapi", "docker"],
        matched_related=[{"required_skill": "django", "matched_related_skill": "flask", "group": "python", "weight": 0.6}],
        missing_skills=["kubernetes"],
        cosine_similarity=0.78
    )
    
    assert "executive_summary" in res
    assert len(res["matched_strengths"]) > 0
    assert len(res["missing_critical_skills"]) > 0
    assert "Strong Match" in res["recommendation"]


def test_learning_path_engine():
    engine = get_learning_path_engine()
    path = engine.generate_learning_path(["docker", "kubernetes"])
    
    assert len(path) == 2
    assert path[0]["skill"] in ["Docker", "Kubernetes"]
    assert "resource_url" in path[0]


def test_bias_fairness_audit():
    audit_engine = get_bias_audit_engine()
    res = audit_engine.run_bias_audit(
        resume_text=SAMPLE_RESUME_TEXT,
        job_text="Senior Python Backend Engineer with AWS knowledge.",
        candidate_skills=["python", "fastapi", "docker"],
        required_skills=["python", "fastapi", "aws"],
        candidate_name="John Doe"
    )
    
    assert "original_score" in res
    assert "anonymized_score" in res
    assert res["is_fair"] is True


def test_plotly_service_generation():
    plotter = get_plotting_service()
    
    # 1. Radar chart
    radar = plotter.create_match_radar_chart(
        candidate_skills=["python", "fastapi", "docker"],
        required_skills=["python", "fastapi", "kubernetes"],
        matched_exact=["python", "fastapi"],
        matched_related=[{"required_skill": "kubernetes", "matched_related_skill": "docker", "group": "cloud_devops", "weight": 0.6}]
    )
    assert "plotly_json" in radar
    assert "html" in radar
    assert len(radar["html"]) > 20

    # 2. Score breakdown bar
    bar = plotter.create_score_breakdown_bar(0.85, 0.78, 0.66, 0.80)
    assert "plotly_json" in bar
    assert "html" in bar

    # 3. Leaderboard chart
    leaderboard = plotter.create_leaderboard_chart([
        {"candidate_name": "Alice", "match_percentage": 92.5, "rank": 1},
        {"candidate_name": "Bob", "match_percentage": 74.0, "rank": 2}
    ], "Senior Cloud Architect")
    assert "plotly_json" in leaderboard
    assert "html" in leaderboard


def test_unauthenticated_endpoints_blocked():
    # Unauthenticated request to /api/resumes/ must return 401 Unauthorized
    resp_resumes = client.get("/api/resumes/")
    assert resp_resumes.status_code == 401

    # Unauthenticated request to /api/jobs/ must return 401 Unauthorized
    resp_jobs = client.get("/api/jobs/")
    assert resp_jobs.status_code == 401

    # Unauthenticated request to /api/match/evaluate must return 401 Unauthorized
    resp_eval = client.post("/api/match/evaluate", json={"raw_resume_text": "Python", "raw_job_description": "Python"})
    assert resp_eval.status_code == 401

    # Unauthenticated request to /api/analytics/match-chart/1/1 must return 401 Unauthorized
    resp_chart = client.get("/api/analytics/match-chart/1/1")
    assert resp_chart.status_code == 401


def test_authenticated_full_pipeline_and_plotly():
    # 1. Sign in or Sign up to get Bearer Access Token
    signin_payload = {
        "email": "vishnusomu2006@gmail.com",
        "password": "Vishnu@2006"
    }
    login_resp = client.post("/api/auth/signin", json=signin_payload)
    if login_resp.status_code != 200:
        # If user does not exist, signup
        signup_payload = {
            "name": "Vishnu Somu",
            "email": "vishnusomu2006@gmail.com",
            "dob": "2006-01-01",
            "phone_no": "9876543210",
            "role": "recruiter",
            "password": "Vishnu@2006",
            "c_password": "Vishnu@2006"
        }
        login_resp = client.post("/api/auth/signup", json=signup_payload)
    
    assert login_resp.status_code in [200, 201]
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload Resume (Authenticated)
    file_content = SAMPLE_RESUME_TEXT.encode("utf-8")
    files = {"file": ("auth_test_resume.txt", io.BytesIO(file_content), "text/plain")}
    upload_resp = client.post("/api/resumes/upload", headers=headers, files=files)
    assert upload_resp.status_code == 201
    candidate_id = upload_resp.json()["profile"]["id"]

    # 3. Create Job (Authenticated)
    job_payload = {
        "title": "Lead Cloud & AI Engineer",
        "company": "NextGen Innovations",
        "description": "Seeking Python engineer with FastAPI, Docker, and PostgreSQL skills.",
        "required_skills": ["python", "fastapi", "docker", "postgresql", "kubernetes"],
        "min_experience_years": 4.0
    }
    job_resp = client.post("/api/jobs/create", headers=headers, json=job_payload)
    assert job_resp.status_code == 201
    job_id = job_resp.json()["id"]

    # 4. Evaluate Match (Authenticated)
    eval_resp = client.post(
        "/api/match/evaluate",
        headers=headers,
        json={"candidate_id": candidate_id, "job_id": job_id}
    )
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["calibrated_score"] > 0.0

    # 5. Get Plotly Match Charts (Authenticated)
    chart_resp = client.get(f"/api/analytics/match-chart/{candidate_id}/{job_id}", headers=headers)
    assert chart_resp.status_code == 200
    chart_data = chart_resp.json()
    assert "charts" in chart_data
    assert "radar_chart" in chart_data["charts"]
    assert "score_breakdown_chart" in chart_data["charts"]
    assert "learning_path_boost_chart" in chart_data["charts"]
    assert "html" in chart_data["charts"]["radar_chart"]

    # 6. Get Plotly Leaderboard Chart (Authenticated)
    leaderboard_chart_resp = client.get(f"/api/analytics/leaderboard-chart/{job_id}", headers=headers)
    assert leaderboard_chart_resp.status_code == 200
    assert "leaderboard_chart" in leaderboard_chart_resp.json()
