from typing import List, Dict, Any, Optional
from app.services.embedding_service import get_embedding_service
from app.services.skill_graph import get_skill_graph
from app.services.calibration import get_calibration_service


class HybridMatcher:
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.skill_graph = get_skill_graph()
        self.calibration_service = get_calibration_service()

    def evaluate_match(
        self,
        resume_text: str,
        job_text: str,
        candidate_skills: List[str],
        required_skills: List[str]
    ) -> Dict[str, Any]:
        # 1. Compute Semantic Cosine Similarity on text representations
        cosine_sim = self.embedding_service.compute_text_similarity(resume_text, job_text)

        # 2. Compute Exact & Relational Skill Graph matching
        skill_match = self.skill_graph.compute_skill_match(candidate_skills, required_skills)
        exact_score = skill_match["exact_skill_score"]
        graph_score = skill_match["skill_graph_score"]

        # 3. Construct 3-element feature vector: [s_cosine, s_exact_skill, s_skill_graph]
        feature_vector = [cosine_sim, exact_score, graph_score]

        # 4. Predict calibrated match score probability
        calibrated_score = self.calibration_service.predict_probability(feature_vector)
        match_percentage = round(calibrated_score * 100.0, 2)

        return {
            "calibrated_score": round(calibrated_score, 4),
            "match_percentage": match_percentage,
            "cosine_similarity": round(cosine_sim, 4),
            "exact_skill_score": round(exact_score, 4),
            "skill_graph_score": round(graph_score, 4),
            "matched_exact_skills": skill_match["matched_exact_skills"],
            "matched_related_skills": skill_match["matched_related_skills"],
            "missing_skills": skill_match["missing_skills"]
        }

    def evaluate_batch(
        self,
        candidate_items: List[Dict[str, Any]],
        job_text: str,
        required_skills: List[str]
    ) -> List[Dict[str, Any]]:
        if not candidate_items:
            return []

        # 1. Encode job text once
        job_vec = self.embedding_service.get_embedding(job_text)
        
        # 2. Batch encode all candidate resume texts at once for instant speed
        resume_texts = [item.get("raw_text", "") for item in candidate_items]
        resume_embeddings = self.embedding_service.get_embeddings_batch(resume_texts)

        results = []
        for i, item in enumerate(candidate_items):
            cand_vec = resume_embeddings[i]
            cosine_sim = self.embedding_service.compute_cosine_similarity(cand_vec, job_vec)

            cand_skills = item.get("parsed_skills") or []
            skill_match = self.skill_graph.compute_skill_match(cand_skills, required_skills)
            exact_score = skill_match["exact_skill_score"]
            graph_score = skill_match["skill_graph_score"]

            feature_vector = [cosine_sim, exact_score, graph_score]
            calibrated_score = self.calibration_service.predict_probability(feature_vector)
            match_percentage = round(calibrated_score * 100.0, 2)

            results.append({
                "calibrated_score": round(calibrated_score, 4),
                "match_percentage": match_percentage,
                "cosine_similarity": round(cosine_sim, 4),
                "exact_skill_score": round(exact_score, 4),
                "skill_graph_score": round(graph_score, 4),
                "matched_exact_skills": skill_match["matched_exact_skills"],
                "matched_related_skills": skill_match["matched_related_skills"],
                "missing_skills": skill_match["missing_skills"]
            })

        return results


# Singleton instance
_matcher_instance = None

def get_hybrid_matcher() -> HybridMatcher:
    global _matcher_instance
    if _matcher_instance is None:
        _matcher_instance = HybridMatcher()
    return _matcher_instance
