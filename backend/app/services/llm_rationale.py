from typing import List, Dict, Any, Optional


class LLMRationaleEngine:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    def generate_rationale(
        self,
        candidate_name: Optional[str],
        job_title: Optional[str],
        calibrated_score: float,
        matched_exact: List[str],
        matched_related: List[Dict[str, str]],
        missing_skills: List[str],
        cosine_similarity: float
    ) -> Dict[str, Any]:
        c_name = candidate_name or "The candidate"
        j_title = job_title or "this position"
        match_pct = round(calibrated_score * 100.0, 1)

        # 1. Determine recommendation tier
        if calibrated_score >= 0.75:
            rec = "Strong Match: High qualification alignment; recommended for immediate technical interview."
            sentiment = "demonstrates outstanding alignment"
        elif calibrated_score >= 0.50:
            rec = "Solid Potential: Meets core requirements with minor skill gaps; recommended for initial screening."
            sentiment = "demonstrates solid technical foundation with strong transferable experience"
        elif calibrated_score >= 0.30:
            rec = "Partial Match: Relevant background but requires training in key technologies."
            sentiment = "has foundational exposure but requires bridging specific technical competencies"
        else:
            rec = "Needs Skill Development: Significant gaps in required competencies for this specific role."
            sentiment = "currently exhibits limited overlap with the target job requirements"

        # 2. Construct 2-sentence executive summary
        exact_str = ", ".join(matched_exact[:4]) if matched_exact else "fundamental domain concepts"
        missing_str = ", ".join(missing_skills[:3]) if missing_skills else "none"
        
        sentence1 = f"{c_name} {sentiment} for the {j_title} role with a calibrated match score of {match_pct}% and semantic similarity of {round(cosine_similarity * 100, 1)}%."
        
        if missing_skills:
            sentence2 = f"The candidate offers proven strength in {exact_str}, though upskilling in {missing_str} would significantly improve role readiness."
        else:
            sentence2 = f"The candidate comprehensively covers all mandatory technical criteria including {exact_str} with zero critical skill deficits."
            
        exec_summary = f"{sentence1} {sentence2}"

        # 3. Matched strengths bullet points
        strengths = []
        for s in matched_exact:
            strengths.append(f"Direct proficiency in required technology: {s.title()}")
        for rel in matched_related:
            strengths.append(f"Transferable expertise in {rel['matched_related_skill'].title()} supporting required {rel['required_skill'].title()} ({rel['group'].replace('_', ' ').title()} ecosystem)")

        if not strengths:
            strengths.append("Broad contextual semantic overlap with job responsibilities.")

        # 4. Missing critical skills bullet points
        critical_missing = []
        for m in missing_skills:
            critical_missing.append(f"Missing required core competency: {m.title()}")

        if not critical_missing:
            critical_missing.append("No critical skill deficiencies identified.")

        return {
            "executive_summary": exec_summary,
            "matched_strengths": strengths,
            "missing_critical_skills": critical_missing,
            "recommendation": rec
        }


# Singleton instance
_rationale_engine = None

def get_rationale_engine() -> LLMRationaleEngine:
    global _rationale_engine
    if _rationale_engine is None:
        _rationale_engine = LLMRationaleEngine()
    return _rationale_engine
