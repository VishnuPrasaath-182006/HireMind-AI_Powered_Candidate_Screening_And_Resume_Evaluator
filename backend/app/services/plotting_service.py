import json
from typing import Dict, Any, List, Optional
from collections import Counter

try:
    import plotly
    import plotly.graph_objects as go
    import plotly.express as px
    import plotly.io as pio
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False


class PlottingService:
    def fig_to_dict_and_html(self, fig) -> Dict[str, Any]:
        if not PLOTLY_AVAILABLE or fig is None:
            return {"plotly_json": {}, "html": "<p>Plotly unavailable.</p>"}
        try:
            plotly_json = json.loads(pio.to_json(fig))
            html = pio.to_html(fig, include_plotlyjs="cdn", full_html=False)
            return {
                "plotly_json": plotly_json,
                "html": html
            }
        except Exception as e:
            return {
                "plotly_json": {},
                "html": f"<p>Error generating chart: {e}</p>"
            }

    def create_match_radar_chart(
        self,
        candidate_skills: List[str],
        required_skills: List[str],
        matched_exact: List[str],
        matched_related: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not PLOTLY_AVAILABLE:
            return {"plotly_json": {}, "html": "<p>Plotly not installed.</p>"}

        all_skills = list(dict.fromkeys(required_skills + candidate_skills))
        if not all_skills:
            all_skills = ["Python", "FastAPI", "Docker", "Database", "Cloud"]

        req_set = {s.lower() for s in required_skills}
        cand_set = {s.lower() for s in candidate_skills}
        exact_set = {s.lower() for s in matched_exact}
        related_dict = {r["required_skill"].lower(): r["matched_related_skill"] for r in matched_related}

        job_values = []
        cand_values = []

        for skill in all_skills:
            s_low = skill.lower()
            job_val = 100 if s_low in req_set else 0
            job_values.append(job_val)

            if s_low in exact_set:
                cand_val = 100
            elif s_low in related_dict:
                cand_val = 60
            elif s_low in cand_set:
                cand_val = 80
            else:
                cand_val = 0
            cand_values.append(cand_val)

        all_skills_loop = all_skills + [all_skills[0]]
        job_values_loop = job_values + [job_values[0]]
        cand_values_loop = cand_values + [cand_values[0]]

        fig = go.Figure()

        fig.add_trace(go.Scatterpolar(
            r=job_values_loop,
            theta=all_skills_loop,
            fill="toself",
            name="Job Requirements",
            line=dict(color="#EF4444", width=2),
            fillcolor="rgba(239, 68, 68, 0.2)"
        ))

        fig.add_trace(go.Scatterpolar(
            r=cand_values_loop,
            theta=all_skills_loop,
            fill="toself",
            name="Candidate Skills",
            line=dict(color="#10B981", width=2.5),
            fillcolor="rgba(16, 185, 129, 0.3)"
        ))

        fig.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True,
                    range=[0, 100],
                    tickfont=dict(size=9, color="#6B7280"),
                    gridcolor="#E5E7EB"
                ),
                angularaxis=dict(
                    tickfont=dict(size=11, color="#1F2937", family="Arial, sans-serif"),
                    gridcolor="#E5E7EB"
                )
            ),
            showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
            title=dict(text="<b>Candidate vs. Job Skill Alignment Radar</b>", x=0.5, font=dict(size=15)),
            margin=dict(l=40, r=40, t=50, b=50),
            paper_bgcolor="white",
            plot_bgcolor="white"
        )

        return self.fig_to_dict_and_html(fig)

    def create_score_breakdown_bar(
        self,
        calibrated_score: float,
        cosine_similarity: float,
        exact_skill_score: float,
        skill_graph_score: float
    ) -> Dict[str, Any]:
        if not PLOTLY_AVAILABLE:
            return {"plotly_json": {}, "html": "<p>Plotly not installed.</p>"}

        categories = [
            "Semantic Cosine Similarity",
            "Exact Skill Match Score",
            "Relational Graph Skill Match",
            "<b>Calibrated Probabilistic Score</b>"
        ]
        scores = [
            round(cosine_similarity * 100, 1),
            round(exact_skill_score * 100, 1),
            round(skill_graph_score * 100, 1),
            round(calibrated_score * 100, 1)
        ]
        colors = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981"]

        fig = go.Figure(go.Bar(
            x=scores,
            y=categories,
            orientation="h",
            marker=dict(color=colors, line=dict(color="#1F2937", width=1)),
            text=[f"{s}%" for s in scores],
            textposition="inside",
            insidetextanchor="middle",
            textfont=dict(color="white", size=12, family="Arial, sans-serif")
        ))

        fig.update_layout(
            title=dict(text="<b>Multi-Factor Match Score Breakdown</b>", x=0.5, font=dict(size=15)),
            xaxis=dict(range=[0, 105], title="Score (%)", gridcolor="#F3F4F6"),
            yaxis=dict(autorange="reversed"),
            margin=dict(l=180, r=30, t=50, b=40),
            paper_bgcolor="white",
            plot_bgcolor="white"
        )

        return self.fig_to_dict_and_html(fig)

    def create_leaderboard_chart(
        self,
        leaderboard: List[Dict[str, Any]],
        job_title: str = "Job"
    ) -> Dict[str, Any]:
        if not PLOTLY_AVAILABLE:
            return {"plotly_json": {}, "html": "<p>Plotly not installed.</p>"}

        if not leaderboard:
            return {"plotly_json": {}, "html": "<p>No candidates evaluated yet.</p>"}

        top_candidates = leaderboard[:15]
        names = [f"#{c.get('rank', i+1)} {c.get('candidate_name', 'Candidate')}" for i, c in enumerate(top_candidates)]
        scores = [round(c.get("match_percentage", c.get("calibrated_score", 0) * 100), 1) for c in top_candidates]

        colors = []
        for s in scores:
            if s >= 75:
                colors.append("#10B981")
            elif s >= 50:
                colors.append("#3B82F6")
            elif s >= 30:
                colors.append("#F59E0B")
            else:
                colors.append("#EF4444")

        fig = go.Figure(go.Bar(
            x=names,
            y=scores,
            marker=dict(color=colors, line=dict(color="#111827", width=1)),
            text=[f"{s}%" for s in scores],
            textposition="outside",
            textfont=dict(size=11, color="#1F2937")
        ))

        fig.update_layout(
            title=dict(text=f"<b>Candidate Ranking Leaderboard - {job_title}</b>", x=0.5, font=dict(size=15)),
            yaxis=dict(range=[0, 115], title="Calibrated Match Score (%)", gridcolor="#F3F4F6"),
            xaxis=dict(tickangle=-35, tickfont=dict(size=10)),
            margin=dict(l=40, r=40, t=50, b=80),
            paper_bgcolor="white",
            plot_bgcolor="white"
        )

        return self.fig_to_dict_and_html(fig)

    def create_learning_path_boost_chart(
        self,
        current_score: float,
        learning_path: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not PLOTLY_AVAILABLE:
            return {"plotly_json": {}, "html": "<p>Plotly not installed.</p>"}

        steps = ["Current Match"]
        cumulative_scores = [round(current_score * 100, 1)]
        running = current_score * 100

        for item in learning_path:
            skill = item.get("skill", "Skill")
            boost_str = item.get("expected_score_boost", "+10.0%")
            boost_val = 10.0
            try:
                digits = "".join([c for c in boost_str if c.isdigit() or c == "."])
                if digits:
                    boost_val = float(digits)
            except Exception:
                pass

            running = min(100.0, running + boost_val)
            steps.append(f"+ {skill}")
            cumulative_scores.append(round(running, 1))

        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=steps,
            y=cumulative_scores,
            mode="lines+markers+text",
            line=dict(color="#8B5CF6", width=3, shape="spline"),
            marker=dict(size=10, color="#6D28D9", line=dict(color="white", width=2)),
            text=[f"{s}%" for s in cumulative_scores],
            textposition="top center",
            textfont=dict(size=12, color="#4C1D95", family="Arial, sans-serif"),
            fill="tozeroy",
            fillcolor="rgba(139, 92, 246, 0.15)",
            name="Projected Match Score"
        ))

        fig.update_layout(
            title=dict(text="<b>Skill-Gap Learning Roadmap - Projected Score Boost</b>", x=0.5, font=dict(size=15)),
            yaxis=dict(range=[0, 115], title="Calibrated Match Score (%)", gridcolor="#F3F4F6"),
            xaxis=dict(tickangle=-20, tickfont=dict(size=11)),
            margin=dict(l=40, r=40, t=50, b=60),
            paper_bgcolor="white",
            plot_bgcolor="white"
        )

        return self.fig_to_dict_and_html(fig)

    def create_bias_audit_chart(
        self,
        original_score: float,
        anonymized_score: float
    ) -> Dict[str, Any]:
        if not PLOTLY_AVAILABLE:
            return {"plotly_json": {}, "html": "<p>Plotly not installed.</p>"}

        orig_pct = round(original_score * 100, 1)
        anon_pct = round(anonymized_score * 100, 1)
        delta = round(abs(orig_pct - anon_pct), 2)

        fig = go.Figure(data=[
            go.Bar(
                name="Original Resume",
                x=["Score Comparison"],
                y=[orig_pct],
                marker_color="#3B82F6",
                text=[f"{orig_pct}%"],
                textposition="inside",
                textfont=dict(color="white", size=13)
            ),
            go.Bar(
                name="Anonymized (PII Redacted)",
                x=["Score Comparison"],
                y=[anon_pct],
                marker_color="#10B981",
                text=[f"{anon_pct}%"],
                textposition="inside",
                textfont=dict(color="white", size=13)
            )
        ])

        fig.update_layout(
            barmode="group",
            title=dict(text=f"<b>Bias & Fairness Audit (Score Delta: {delta}%)</b>", x=0.5, font=dict(size=15)),
            yaxis=dict(range=[0, 110], title="Match Score (%)", gridcolor="#F3F4F6"),
            legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
            margin=dict(l=40, r=40, t=50, b=50),
            paper_bgcolor="white",
            plot_bgcolor="white"
        )

        return self.fig_to_dict_and_html(fig)

    def create_overview_dashboard(
        self,
        total_candidates: int,
        total_jobs: int,
        all_skills: List[str],
        match_scores: List[float]
    ) -> Dict[str, Any]:
        if not PLOTLY_AVAILABLE:
            return {"plotly_json": {}, "html": "<p>Plotly not installed.</p>"}

        skill_counts = Counter([s.title() for s in all_skills if s]).most_common(10)
        skill_names = [k for k, v in skill_counts] or ["Python", "FastAPI", "Docker", "PostgreSQL", "React"]
        skill_freqs = [v for k, v in skill_counts] or [10, 8, 7, 6, 5]

        fig_skills = go.Figure(go.Bar(
            x=skill_names,
            y=skill_freqs,
            marker=dict(color="#3B82F6", line=dict(color="#1E3A8A", width=1)),
            text=skill_freqs,
            textposition="outside"
        ))
        fig_skills.update_layout(
            title=dict(text="<b>Top In-Demand Technical Skills</b>", x=0.5, font=dict(size=14)),
            yaxis=dict(title="Frequency"),
            xaxis=dict(tickangle=-25),
            margin=dict(l=30, r=30, t=40, b=50),
            paper_bgcolor="white",
            plot_bgcolor="white"
        )

        scores_pct = [round(s * 100, 1) for s in match_scores] if match_scores else [85.0, 92.0, 74.0, 68.0, 95.0, 81.0]
        fig_hist = go.Figure(go.Histogram(
            x=scores_pct,
            nbinsx=10,
            marker=dict(color="#10B981", line=dict(color="#065F46", width=1))
        ))
        fig_hist.update_layout(
            title=dict(text="<b>Match Score Distribution (%)</b>", x=0.5, font=dict(size=14)),
            xaxis=dict(title="Match Score (%)", range=[0, 100]),
            yaxis=dict(title="Candidate Count"),
            margin=dict(l=30, r=30, t=40, b=40),
            paper_bgcolor="white",
            plot_bgcolor="white"
        )

        return {
            "top_skills_chart": self.fig_to_dict_and_html(fig_skills),
            "score_distribution_chart": self.fig_to_dict_and_html(fig_hist),
            "summary_metrics": {
                "total_candidates": total_candidates,
                "total_jobs": total_jobs,
                "average_match_score": round(sum(scores_pct) / len(scores_pct), 1) if scores_pct else 0.0
            }
        }

    def render_standalone_match_dashboard_html(
        self,
        candidate_name: str,
        job_title: str,
        match_percentage: float,
        calibrated_score: float,
        cosine_similarity: float,
        exact_score: float,
        graph_score: float,
        matched_exact: List[str],
        missing_skills: List[str],
        exec_summary: str,
        radar_html: str,
        breakdown_html: str,
        learning_html: str
    ) -> str:
        badge_color = "#10B981" if match_percentage >= 75 else ("#3B82F6" if match_percentage >= 50 else "#F59E0B")
        exact_tags = "".join([f'<span class="skill-tag exact">{s.title()}</span>' for s in matched_exact]) if matched_exact else "<span>None</span>"
        missing_tags = "".join([f'<span class="skill-tag missing">{s.title()}</span>' for s in missing_skills]) if missing_skills else "<span>None</span>"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Match Report: {candidate_name} vs {job_title}</title>
    <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }}
        body {{ background-color: #F8FAFC; color: #1E293B; padding: 24px; }}
        .header {{ background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); color: white; padding: 28px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }}
        .header h1 {{ font-size: 24px; font-weight: 700; margin-bottom: 8px; }}
        .header p {{ color: #C7D2FE; font-size: 14px; }}
        .score-banner {{ display: flex; align-items: center; justify-content: space-between; background: white; padding: 20px 28px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
        .score-pill {{ background: {badge_color}; color: white; font-size: 24px; font-weight: 800; padding: 10px 24px; border-radius: 12px; }}
        .kpi-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }}
        .kpi-card {{ background: white; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; }}
        .kpi-card .label {{ font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; }}
        .kpi-card .val {{ font-size: 20px; font-weight: 700; color: #0F172A; }}
        .charts-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }}
        @media (max-width: 900px) {{ .charts-grid {{ grid-template-columns: 1fr; }} }}
        .chart-card {{ background: white; padding: 20px; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); min-height: 420px; }}
        .chart-card.full {{ grid-column: 1 / -1; }}
        .section-title {{ font-size: 16px; font-weight: 700; color: #1E293B; margin-bottom: 16px; }}
        .skills-container {{ display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }}
        .skill-tag {{ padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }}
        .skill-tag.exact {{ background: #DCFCE7; color: #15803D; }}
        .skill-tag.missing {{ background: #FEE2E2; color: #B91C1C; }}
        .summary-box {{ background: #EEF2FF; border-left: 4px solid #6366F1; padding: 16px 20px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #3730A3; margin-bottom: 24px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Match & Calibration Intelligence Report</h1>
        <p>Candidate: <strong>{candidate_name}</strong> | Position: <strong>{job_title}</strong></p>
    </div>

    <div class="score-banner">
        <div>
            <div style="font-size: 14px; color: #64748B; font-weight: 600;">FINAL CALIBRATED MATCH SCORE</div>
            <div style="font-size: 13px; color: #94A3B8; margin-top: 4px;">Computed via Multi-Factor Hybrid Calibration Model</div>
        </div>
        <div class="score-pill">{match_percentage}%</div>
    </div>

    <div class="summary-box">
        <strong>Executive Summary:</strong> {exec_summary}
    </div>

    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="label">Semantic Similarity</div>
            <div class="val">{round(cosine_similarity * 100, 1)}%</div>
        </div>
        <div class="kpi-card">
            <div class="label">Exact Skill Score</div>
            <div class="val">{round(exact_score * 100, 1)}%</div>
        </div>
        <div class="kpi-card">
            <div class="label">Relational Skill Score</div>
            <div class="val">{round(graph_score * 100, 1)}%</div>
        </div>
        <div class="kpi-card">
            <div class="label">Matched Exact Skills</div>
            <div class="val">{len(matched_exact)} Skills</div>
        </div>
    </div>

    <div style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #E2E8F0; margin-bottom: 24px;">
        <div class="section-title">Skills Overview</div>
        <div style="margin-bottom: 10px; font-size: 13px; font-weight: 600; color: #16A34A;">Directly Matched Skills:</div>
        <div class="skills-container">{exact_tags}</div>
        <div style="margin-top: 14px; margin-bottom: 10px; font-size: 13px; font-weight: 600; color: #DC2626;">Skill Gap Competencies:</div>
        <div class="skills-container">{missing_tags}</div>
    </div>

    <div class="charts-grid">
        <div class="chart-card">
            {radar_html}
        </div>
        <div class="chart-card">
            {breakdown_html}
        </div>
        <div class="chart-card full">
            {learning_html}
        </div>
    </div>
</body>
</html>"""


# Singleton instance
_plotting_service = None

def get_plotting_service() -> PlottingService:
    global _plotting_service
    if _plotting_service is None:
        _plotting_service = PlottingService()
    return _plotting_service
