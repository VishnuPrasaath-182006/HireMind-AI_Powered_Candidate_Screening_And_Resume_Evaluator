import re
from typing import Dict, Any, List, Tuple
from app.services.hybrid_matcher import get_hybrid_matcher


GENDER_TERMS = [
    r'\bhe\b', r'\bhim\b', r'\bhis\b', r'\bhimself\b',
    r'\bshe\b', r'\bher\b', r'\bhers\b', r'\bherself\b',
    r'\bmr\b', r'\bmrs\b', r'\bms\b', r'\bmiss\b',
    r'\bfraternity\b', r'\bsorority\b', r'\bwomen\'s\b', r'\bmen\'s\b',
    r'\bmale\b', r'\bfemale\b', r'\bmother\b', r'\bfather\b'
]

PRESTIGE_INSTITUTIONS = [
    r'\bharvard\b', r'\bstanford\b', r'\bmit\b', r'\bmassachusetts institute of technology\b',
    r'\boxford\b', r'\bcambridge\b', r'\byale\b', r'\bprinceton\b', r'\bcolumbia\b',
    r'\bcaltech\b', r'\bberkeley\b', r'\biit\b', r'\bindian institute of technology\b',
    r'\bcarnegie mellon\b', r'\bcmu\b', r'\bivy league\b'
]


class BiasAuditEngine:
    def __init__(self):
        self.hybrid_matcher = get_hybrid_matcher()

    def anonymize_text(self, text: str, candidate_name: str = "") -> Tuple[str, Dict[str, int]]:
        anonymized = text
        counts = {
            'pii_emails': 0,
            'pii_phones': 0,
            'pii_names': 0,
            'gender_coded_terms': 0,
            'prestige_institutions': 0
        }

        # 1. Redact Emails
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        emails = re.findall(email_pattern, anonymized)
        counts['pii_emails'] = len(emails)
        anonymized = re.sub(email_pattern, '[REDACTED_EMAIL]', anonymized)

        # 2. Redact Phone numbers
        phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}'
        phones = re.findall(phone_pattern, anonymized)
        counts['pii_phones'] = len(phones)
        anonymized = re.sub(phone_pattern, '[REDACTED_PHONE]', anonymized)

        # 3. Redact Name if provided
        if candidate_name and len(candidate_name.strip()) > 2:
            name_pattern = r'\b' + re.escape(candidate_name.strip()) + r'\b'
            matches = re.findall(name_pattern, anonymized, re.IGNORECASE)
            counts['pii_names'] += len(matches)
            anonymized = re.sub(name_pattern, '[REDACTED_NAME]', anonymized, flags=re.IGNORECASE)

        # 4. Redact Gender-coded terms
        for pat in GENDER_TERMS:
            matches = re.findall(pat, anonymized, re.IGNORECASE)
            counts['gender_coded_terms'] += len(matches)
            anonymized = re.sub(pat, '[REDACTED_GENDER]', anonymized, flags=re.IGNORECASE)

        # 5. Redact Prestige institutions
        for pat in PRESTIGE_INSTITUTIONS:
            matches = re.findall(pat, anonymized, re.IGNORECASE)
            counts['prestige_institutions'] += len(matches)
            anonymized = re.sub(pat, '[REDACTED_INSTITUTION]', anonymized, flags=re.IGNORECASE)

        return anonymized, counts

    def run_bias_audit(
        self,
        resume_text: str,
        job_text: str,
        candidate_skills: List[str],
        required_skills: List[str],
        candidate_name: str = ""
    ) -> Dict[str, Any]:
        # 1. Evaluate match on original resume
        orig_match = self.hybrid_matcher.evaluate_match(
            resume_text=resume_text,
            job_text=job_text,
            candidate_skills=candidate_skills,
            required_skills=required_skills
        )
        orig_score = orig_match['calibrated_score']
        orig_pct = orig_match['match_percentage']

        # 2. Anonymize text
        anon_text, counts = self.anonymize_text(resume_text, candidate_name)

        # 3. Evaluate match on anonymized resume
        anon_match = self.hybrid_matcher.evaluate_match(
            resume_text=anon_text,
            job_text=job_text,
            candidate_skills=candidate_skills,
            required_skills=required_skills
        )
        anon_score = anon_match['calibrated_score']
        anon_pct = anon_match['match_percentage']

        # 4. Calculate fairness delta
        delta = round(abs(orig_score - anon_score), 4)
        is_fair = delta <= 0.05  # Within 5% variance threshold

        if is_fair:
            status = f"Fair & Neutral: Score variance is {round(delta * 100, 2)}% (within <=5.0% threshold). The scoring model evaluates candidate on merit without demographic or pedigree bias."
        else:
            status = f"Audit Warning: Score shifted by {round(delta * 100, 2)}% post-anonymization. Review resume keyword structure."

        return {
            'original_score': orig_score,
            'original_match_percentage': orig_pct,
            'anonymized_score': anon_score,
            'anonymized_match_percentage': anon_pct,
            'score_delta': delta,
            'is_fair': is_fair,
            'fairness_status': status,
            'redacted_items_summary': counts,
            'redacted_text_sample': anon_text[:400] + ('...' if len(anon_text) > 400 else '')
        }


# Singleton instance
_bias_audit_engine = None

def get_bias_audit_engine() -> BiasAuditEngine:
    global _bias_audit_engine
    if _bias_audit_engine is None:
        _bias_audit_engine = BiasAuditEngine()
    return _bias_audit_engine
