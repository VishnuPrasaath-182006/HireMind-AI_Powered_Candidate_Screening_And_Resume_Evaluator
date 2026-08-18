import json
import os
from typing import List, Set, Dict, Any, Tuple, Optional
from app.services.ner_extractor import find_data_file


class RelationalSkillGraph:
    def __init__(self, taxonomy_path: Optional[str] = None):
        if not taxonomy_path:
            taxonomy_path = find_data_file('skills_taxonomy.json')
            
        self.taxonomy: Dict[str, List[str]] = {}
        self.skill_to_group: Dict[str, str] = {}
        self.group_to_skills: Dict[str, Set[str]] = {}

        if taxonomy_path and os.path.exists(taxonomy_path):
            try:
                with open(taxonomy_path, 'r', encoding='utf-8') as f:
                    self.taxonomy = json.load(f)
            except Exception as e:
                print(f"Warning loading taxonomy for skill graph: {e}")

        for group, skills in self.taxonomy.items():
            g_norm = group.lower().strip()
            self.group_to_skills[g_norm] = set()
            
            self.skill_to_group[g_norm] = g_norm
            self.group_to_skills[g_norm].add(g_norm)

            for s in skills:
                s_norm = s.lower().strip()
                self.skill_to_group[s_norm] = g_norm
                self.group_to_skills[g_norm].add(s_norm)

    def normalize_skill(self, skill: str) -> str:
        return skill.strip().lower().replace('_', ' ')

    def compute_skill_match(
        self,
        candidate_skills: List[str],
        required_skills: List[str]
    ) -> Dict[str, Any]:
        cand_set: Set[str] = {self.normalize_skill(s) for s in candidate_skills if s.strip()}
        req_set: Set[str] = {self.normalize_skill(s) for s in required_skills if s.strip()}

        if not req_set:
            return {
                "exact_skill_score": 1.0,
                "skill_graph_score": 1.0,
                "matched_exact_skills": list(cand_set),
                "matched_related_skills": [],
                "missing_skills": []
            }

        matched_exact: List[str] = []
        matched_related: List[Dict[str, str]] = []
        missing: List[str] = []

        sql_equivalents = {'sql', 'postgresql', 'mysql', 'sqlite', 'postgres', 'mssql', 'psql'}

        for req_skill in req_set:
            # 1. Exact match check (Weight: 1.0)
            if req_skill in cand_set:
                matched_exact.append(req_skill)
                continue

            # SQL / Relational DB equivalence: postgresql & mysql represent SQL
            if req_skill in sql_equivalents and any(s in cand_set for s in sql_equivalents):
                matched_exact.append(req_skill)
                continue

            # 2. Relational group match check (Weight: 0.6)
            group = self.skill_to_group.get(req_skill)
            found_related = False
            if group:
                sibling_skills = self.group_to_skills.get(group, set()) - {req_skill}
                for sibling in sibling_skills:
                    if sibling in cand_set:
                        matched_related.append({
                            "required_skill": req_skill,
                            "matched_related_skill": sibling,
                            "group": group,
                            "weight": 0.6
                        })
                        found_related = True
                        break

            if not found_related:
                # Required skill not matched relationally
                pass

            # Any required skill not matched exactly is a missing target skill gap
            missing.append(req_skill)

        num_required = len(req_set)
        exact_score = len(matched_exact) / num_required
        
        raw_graph_score = (len(matched_exact) * 1.0 + len(matched_related) * 0.6) / num_required
        skill_graph_score = min(1.0, max(0.0, raw_graph_score))

        return {
            "exact_skill_score": round(float(exact_score), 4),
            "skill_graph_score": round(float(skill_graph_score), 4),
            "matched_exact_skills": sorted(matched_exact),
            "matched_related_skills": matched_related,
            "missing_skills": sorted(missing)
        }


# Singleton instance
_skill_graph_instance = None

def get_skill_graph() -> RelationalSkillGraph:
    global _skill_graph_instance
    if _skill_graph_instance is None:
        _skill_graph_instance = RelationalSkillGraph()
    return _skill_graph_instance
