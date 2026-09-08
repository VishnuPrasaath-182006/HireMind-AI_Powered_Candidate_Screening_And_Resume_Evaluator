import json
import os
import re
from typing import List, Set, Dict, Any, Tuple, Optional
from app.services.ner_extractor import find_data_file


# Canonical synonym clusters where all skills in a set represent equivalent core competencies
SYNONYM_CLUSTERS = [
    {
        "visualization", "visualisations", "visualizations", "visualisation",
        "data visualization", "data visualisation", "data visualisations", "data visualizations",
        "data viz", "dataviz", "visualizing", "visualize", "visualise"
    },
    {
        "analysis", "data analysis", "data analytics", "analytics",
        "data analysing", "data analyzing", "data analyse", "data analyze", "business analytics", "business analysis"
    },
    {
        "data science", "data scientist", "data_science"
    },
    {
        "machine learning", "ml", "machine_learning"
    },
    {
        "deep learning", "dl", "deep_learning"
    },
    {
        "artificial intelligence", "ai"
    },
    {
        "natural language processing", "nlp"
    },
    {
        "computer vision", "cv", "computer_vision"
    },
    {
        "generative ai", "gen ai", "genai", "llm", "llms", "large language models"
    },
    {
        "sql", "postgresql", "mysql", "sqlite", "postgres", "mssql", "sql server",
        "psql", "plsql", "pl/sql", "tsql", "t-sql", "oracle sql", "relational database", "rdbms"
    },
    {
        "excel", "ms excel", "microsoft excel", "advanced excel", "spreadsheets"
    },
    {
        "power bi", "powerbi", "power_bi", "ms power bi"
    },
    {
        "powerpoint", "ms powerpoint", "microsoft powerpoint", "ppt"
    },
    {
        "word", "ms word", "microsoft word"
    },
    {
        "frontend", "front end", "front-end", "frontend development", "front-end development",
        "web designing", "web design", "web development"
    },
    {
        "backend", "back end", "back-end", "backend development", "back-end development"
    },
    {
        "fullstack", "full stack", "full-stack", "full stack development"
    },
    {
        "ui/ux", "ui ux", "ui_ux", "ui design", "ux design", "user experience", "user interface"
    },
    {
        "ci/cd", "ci cd", "continuous integration", "continuous deployment"
    },
    {
        "rest api", "restful api", "rest apis", "restful apis", "api development", "apis", "rest_api"
    },
    {
        "docker", "containers", "containerization"
    },
    {
        "kubernetes", "k8s"
    },
    {
        "git", "github", "gitlab", "version control"
    },
    {
        "c++", "cpp", "c and c++", "c/c++"
    },
    {
        "c#", "csharp", "c sharp"
    },
    {
        "react", "react.js", "reactjs"
    },
    {
        "vue", "vue.js", "vuejs"
    },
    {
        "node", "node.js", "nodejs"
    },
    {
        "next.js", "nextjs", "next"
    },
    {
        "spring boot", "springboot", "spring_boot"
    },
    {
        "fastapi", "fast api"
    },
    {
        "scikit-learn", "scikit learn", "sklearn"
    },
    {
        "cybersecurity", "cyber security", "infosec", "information security"
    },
    {
        "penetration testing", "pen testing", "pentesting"
    },
    {
        "teamwork", "team work", "teamwork and collaboration", "collaboration"
    },
    {
        "problem solving", "problem-solving", "problem_solving"
    },
    {
        "data structures", "algorithms", "dsa", "data structures and algorithms", "data_structures"
    }
]

# Build quick lookup lookup index for synonyms
SYNONYM_LOOKUP: Dict[str, Set[str]] = {}
for cluster in SYNONYM_CLUSTERS:
    norm_set = {re.sub(r'\s+', ' ', s.lower().strip().replace('_', ' ').replace('-', ' ')) for s in cluster}
    for item in norm_set:
        if item not in SYNONYM_LOOKUP:
            SYNONYM_LOOKUP[item] = set()
        SYNONYM_LOOKUP[item].update(norm_set)


def are_skills_equivalent(skill_a: str, skill_b: str) -> bool:
    """Check if two skills represent the exact same core competency."""
    a = re.sub(r'\s+', ' ', skill_a.lower().strip().replace('_', ' ').replace('-', ' '))
    b = re.sub(r'\s+', ' ', skill_b.lower().strip().replace('_', ' ').replace('-', ' '))
    
    # Standardize UK vs US spellings
    a = a.replace('visualisation', 'visualization').replace('analysing', 'analyzing').replace('visualise', 'visualize')
    b = b.replace('visualisation', 'visualization').replace('analysing', 'analyzing').replace('visualise', 'visualize')
    
    if a == b:
        return True
    
    if a in SYNONYM_LOOKUP and b in SYNONYM_LOOKUP[a]:
        return True
        
    if b in SYNONYM_LOOKUP and a in SYNONYM_LOOKUP[b]:
        return True

    # Compound / Substring matching (e.g., 'visualization' and 'data visualization')
    if (a == "visualization" and "visualization" in b) or (b == "visualization" and "visualization" in a):
        return True
    if (a in ["analysis", "analytics"] and ("analysis" in b or "analytics" in b)) or (b in ["analysis", "analytics"] and ("analysis" in a or "analytics" in a)):
        return True
    if (a == "excel" and "excel" in b) or (b == "excel" and "excel" in a):
        return True
    if (a == "powerpoint" and "powerpoint" in b) or (b == "powerpoint" and "powerpoint" in a):
        return True
    if (a == "word" and "word" in b and "password" not in b) or (b == "word" and "word" in a and "password" not in a):
        return True
    if (a == "photoshop" and "photoshop" in b) or (b == "photoshop" and "photoshop" in a):
        return True
    if (a == "illustrator" and "illustrator" in b) or (b == "illustrator" and "illustrator" in a):
        return True

    return False


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
                s_norm = s.lower().strip().replace('_', ' ')
                self.skill_to_group[s_norm] = g_norm
                self.group_to_skills[g_norm].add(s_norm)

    def normalize_skill(self, skill: str) -> str:
        s = skill.strip().lower().replace('_', ' ').replace('-', ' ')
        s = s.replace('visualisation', 'visualization').replace('analysing', 'analyzing').replace('visualise', 'visualize')
        return re.sub(r'\s+', ' ', s)

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

        for req_skill in req_set:
            # 1. Exact or Synonym match check (Weight: 1.0)
            is_matched = False
            
            if req_skill in cand_set:
                matched_exact.append(req_skill)
                is_matched = True
            else:
                for cand_skill in cand_set:
                    if are_skills_equivalent(req_skill, cand_skill):
                        matched_exact.append(req_skill)
                        is_matched = True
                        break

            if is_matched:
                continue

            # 2. Relational group match check (Weight: 0.6)
            group = self.skill_to_group.get(req_skill)
            found_related = False
            if group:
                sibling_skills = self.group_to_skills.get(group, set()) - {req_skill}
                for sibling in sibling_skills:
                    if sibling in cand_set or any(are_skills_equivalent(sibling, c) for c in cand_set):
                        matched_related.append({
                            "required_skill": req_skill,
                            "matched_related_skill": sibling,
                            "group": group,
                            "weight": 0.6
                        })
                        found_related = True
                        break

            # Any required skill not matched exactly/synonymously is a missing target skill gap
            missing.append(req_skill)

        num_required = len(req_set)
        exact_score = len(matched_exact) / num_required
        
        raw_graph_score = (len(matched_exact) * 1.0 + len(matched_related) * 0.6) / num_required
        skill_graph_score = min(1.0, max(0.0, raw_graph_score))

        return {
            "exact_skill_score": round(float(exact_score), 4),
            "skill_graph_score": round(float(skill_graph_score), 4),
            "matched_exact_skills": sorted(list(set(matched_exact))),
            "matched_related_skills": matched_related,
            "missing_skills": sorted(list(set(missing)))
        }


# Singleton instance
_skill_graph_instance = None

def get_skill_graph() -> RelationalSkillGraph:
    global _skill_graph_instance
    if _skill_graph_instance is None:
        _skill_graph_instance = RelationalSkillGraph()
    return _skill_graph_instance
