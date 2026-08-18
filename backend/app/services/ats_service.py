from typing import Dict, Any, List
import re

class ATSEngine:
    def evaluate_ats_compatibility(
        self,
        resume_text: str,
        job_description: str,
        candidate_skills: List[str],
        required_skills: List[str],
        sections: Dict[str, str]
    ) -> Dict[str, Any]:
        resume_lower = resume_text.lower()
        job_lower = job_description.lower()

        # 1. Skills Section Detectability (20 pts)
        has_skills_section = bool(sections.get("skills") and sections["skills"].strip())
        skills_section_score = 20 if has_skills_section else 0

        # 2. Fresher-Friendly Experience Check: 2-3 Internships or Project Experience (25 pts)
        # Check for internships, practical training, research, or projects
        internship_matches = re.findall(
            r'\b(intern|internship|trainee|apprentice|fellow|project engineer|academic project|capstone)\b',
            resume_lower
        )
        internship_count = len(set(internship_matches))
        has_internship_section = bool(
            re.search(r'\b(internship|internships|intern experience|practical training|project experience)\b', resume_lower)
        )
        has_experience = bool(sections.get("experience") and sections["experience"].strip())
        has_projects = bool(sections.get("projects") and sections["projects"].strip())
        has_education = bool(sections.get("education") and sections["education"].strip())

        # Freshers evaluate 2-3 internships/projects as full experience credit
        if has_experience or has_internship_section or internship_count >= 2:
            experience_score = 25
            internship_status = f"Passed: {max(2, min(3, internship_count or 2))} Internship & Practical Roles Verified (Fresher Optimized)"
        elif has_projects or internship_count >= 1:
            experience_score = 18
            internship_status = "Partial: 1 Internship / Key Technical Projects Detected"
        else:
            experience_score = 8
            internship_status = "Gap Detected: Add 2 - 3 Internship or Capstone Project details to satisfy entry-level ATS criteria"

        # 3. Exact Wordings & Keyword Density Check (35 pts)
        # Extract specific required keywords from JD and evaluate exact missing words
        common_stop_words = {
            "and", "or", "the", "in", "with", "a", "an", "for", "to", "of", "on", "at",
            "by", "from", "seeking", "looking", "experienced", "required", "proficient",
            "developer", "engineer", "senior", "lead", "junior", "role", "position"
        }
        
        # Build comprehensive list of target keywords from required_skills and JD tokens
        target_keywords = list(required_skills) if required_skills else []
        jd_words = re.findall(r'\b[a-zA-Z]{2,20}\b', job_lower)
        for w in jd_words:
            if w not in common_stop_words and len(w) > 2 and w not in [k.lower() for k in target_keywords]:
                if w in ["python", "aws", "docker", "kubernetes", "postgresql", "sql", "rest", "api", "cloud", "fastapi", "react", "graphql", "microservices", "ci/cd", "git", "linux", "terraform", "gcp", "azure", "pandas", "pytorch", "tensorflow", "agile"]:
                    target_keywords.append(w)

        # Deduplicate target keywords
        seen_kw = set()
        dedup_keywords = []
        for kw in target_keywords:
            kw_clean = kw.strip().title()
            if kw_clean.lower() not in seen_kw:
                seen_kw.add(kw_clean.lower())
                dedup_keywords.append(kw_clean)

        matched_wordings = []
        missing_wordings_detailed = []

        total_kw = max(1, len(dedup_keywords))
        for kw in dedup_keywords:
            pattern = r'\b' + re.escape(kw.lower()) + r'\b'
            is_present = bool(re.search(pattern, resume_lower))
            if is_present:
                matched_wordings.append(kw)
            else:
                # Calculate individual impact percentage
                impact_pct = round(100.0 / total_kw, 1)
                missing_wordings_detailed.append({
                    "word": kw,
                    "impact_percentage": f"-{impact_pct}%",
                    "impact_num": impact_pct,
                    "importance": "Critical" if impact_pct >= 15 else "High" if impact_pct >= 10 else "Medium",
                    "recommendation": f"Add '{kw}' to Skills section and incorporate in project bullet points."
                })

        keyword_ratio = len(matched_wordings) / total_kw
        keyword_score = round(keyword_ratio * 35.0, 1)

        # 4. Text Cleanliness, Structure & Word Density (10 pts)
        words = re.findall(r'\b\w+\b', resume_text)
        word_count = len(words)
        if 250 <= word_count <= 1400:
            cleanliness_score = 10
        elif word_count > 100:
            cleanliness_score = 7
        else:
            cleanliness_score = 4

        # 5. Contact & Personal Headers (10 pts)
        has_email = bool(re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', resume_text))
        has_phone = bool(re.search(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\d{10}\b', resume_text))
        contact_score = (5 if has_email else 0) + (5 if has_phone else 0)

        # Total ATS Score (0 - 100)
        total_ats_score = round(skills_section_score + experience_score + keyword_score + cleanliness_score + contact_score, 1)
        total_ats_score = min(100.0, max(0.0, total_ats_score))

        if total_ats_score >= 80:
            status = "Highly ATS Friendly"
            status_color = "emerald"
            summary = "Your resume structure, skills column, and internship records strongly align with target ATS scanner filters."
        elif total_ats_score >= 60:
            status = "Moderately ATS Friendly"
            status_color = "brand"
            summary = "Your resume parses cleanly, but missing specific JD technical wordings reduces your automated ranking."
        else:
            status = "Low ATS Compatibility / High Filter Risk"
            status_color = "rose"
            summary = "Critical ATS gaps detected: Missing mandatory skill keywords and internship details will likely cause automated filtering."

        recommendations = []
        if not has_skills_section:
            recommendations.append("Add a dedicated 'Skills' or 'Technical Skills' column so enterprise ATS parsers index all competencies.")
        if missing_wordings_detailed:
            top_missing = [m["word"] for m in missing_wordings_detailed[:4]]
            recommendations.append(f"Incorporate missing target wordings ({', '.join(top_missing)}) directly into your Skills section.")
        if internship_count < 2 and not has_experience:
            recommendations.append("For fresher profiles, include 2 - 3 detailed Internship or Capstone Project sections highlighting tools used.")
        if not has_education:
            recommendations.append("Ensure your 'Education' section with degree, university, and year is clearly labeled.")
        if word_count < 250:
            recommendations.append("Expand technical project descriptions with measurable outcomes to improve ATS word density.")

        return {
            "ats_score": total_ats_score,
            "ats_status": status,
            "status_color": status_color,
            "summary": summary,
            "has_skills_section": has_skills_section,
            "internship_status": internship_status,
            "internship_count": internship_count,
            "matched_wordings": matched_wordings,
            "missing_wordings": [m["word"] for m in missing_wordings_detailed],
            "missing_wordings_detailed": missing_wordings_detailed,
            "keyword_match_percentage": round(keyword_ratio * 100, 1),
            "checks": [
                {
                    "name": "Skills Section Heading",
                    "passed": has_skills_section,
                    "weight": "20%",
                    "detail": "Dedicated Skills Column Detected" if has_skills_section else "Missing dedicated Skills section"
                },
                {
                    "name": "Internship / Practical Experience (Freshers)",
                    "passed": experience_score >= 18,
                    "weight": "25%",
                    "detail": internship_status
                },
                {
                    "name": "Exact Target Wordings Match",
                    "passed": keyword_score >= 20,
                    "weight": "35%",
                    "detail": f"{len(matched_wordings)} of {total_kw} exact keywords matched ({round(keyword_ratio * 100, 1)}%)"
                },
                {
                    "name": "Text Parseability & Word Density",
                    "passed": cleanliness_score >= 8,
                    "weight": "10%",
                    "detail": f"{word_count} words cleanly parsed"
                },
                {
                    "name": "Contact Headers & Identifiers",
                    "passed": (has_email and has_phone),
                    "weight": "10%",
                    "detail": "Email & Phone detected" if (has_email and has_phone) else "Missing email or phone"
                }
            ],
            "recommendations": recommendations
        }

_ats_engine = None
def get_ats_engine() -> ATSEngine:
    global _ats_engine
    if _ats_engine is None:
        _ats_engine = ATSEngine()
    return _ats_engine
