from typing import List, Dict, Any, Optional
import re


RESOURCE_DATABASE = {
    'docker': {
        'category': 'Cloud & DevOps',
        'recommendation': 'Docker for Developers: Containerization & Compose Hands-On',
        'resource_url': 'https://docs.docker.com/get-started/',
        'estimated_hours': 14,
        'expected_score_boost': '+12.5% match score boost'
    },
    'kubernetes': {
        'category': 'Cloud & DevOps',
        'recommendation': 'Kubernetes Hands-On: Core Concepts & Deployment Orchestration',
        'resource_url': 'https://kubernetes.io/docs/tutorials/',
        'estimated_hours': 20,
        'expected_score_boost': '+14.0% match score boost'
    },
    'aws': {
        'category': 'Cloud & DevOps',
        'recommendation': 'AWS Cloud Practitioner & Serverless Architecture Guide',
        'resource_url': 'https://aws.amazon.com/getting-started/',
        'estimated_hours': 25,
        'expected_score_boost': '+15.0% match score boost'
    },
    'fastapi': {
        'category': 'Backend Development',
        'recommendation': 'FastAPI Tutorial: Modern High-Performance Python Web APIs',
        'resource_url': 'https://fastapi.tiangolo.com/tutorial/',
        'estimated_hours': 10,
        'expected_score_boost': '+12.0% match score boost'
    },
    'django': {
        'category': 'Backend Development',
        'recommendation': 'Django & Django REST Framework Comprehensive Guide',
        'resource_url': 'https://docs.djangoproject.com/en/stable/intro/tutorial01/',
        'estimated_hours': 18,
        'expected_score_boost': '+11.5% match score boost'
    },
    'postgresql': {
        'category': 'Database & Data Engineering',
        'recommendation': 'PostgreSQL Mastery: Advanced Indexing & Query Optimization',
        'resource_url': 'https://www.postgresql.org/docs/current/tutorial.html',
        'estimated_hours': 12,
        'expected_score_boost': '+10.5% match score boost'
    },
    'react': {
        'category': 'Frontend Development',
        'recommendation': 'React 18 & Modern Hooks: Component Architecture & State',
        'resource_url': 'https://react.dev/learn',
        'estimated_hours': 16,
        'expected_score_boost': '+13.0% match score boost'
    },
    'typescript': {
        'category': 'Frontend Development',
        'recommendation': 'TypeScript Handbook: Strongly Typed Full-Stack Development',
        'resource_url': 'https://www.typescriptlang.org/docs/',
        'estimated_hours': 12,
        'expected_score_boost': '+11.0% match score boost'
    },
    'scikit-learn': {
        'category': 'Machine Learning',
        'recommendation': 'Applied Machine Learning with Scikit-Learn and Python',
        'resource_url': 'https://scikit-learn.org/stable/tutorial/index.html',
        'estimated_hours': 16,
        'expected_score_boost': '+12.0% match score boost'
    },
    'pytorch': {
        'category': 'Machine Learning',
        'recommendation': 'Deep Learning with PyTorch: Zero to Mastery',
        'resource_url': 'https://pytorch.org/tutorials/beginner/basics/intro.html',
        'estimated_hours': 24,
        'expected_score_boost': '+14.5% match score boost'
    },
    'tensorflow': {
        'category': 'Machine Learning',
        'recommendation': 'TensorFlow 2.x Deep Neural Networks Tutorial',
        'resource_url': 'https://www.tensorflow.org/tutorials',
        'estimated_hours': 22,
        'expected_score_boost': '+13.5% match score boost'
    },
    'redis': {
        'category': 'Backend & In-Memory Caching',
        'recommendation': 'Redis for High-Speed Caching & Message Queues',
        'resource_url': 'https://redis.io/docs/latest/develop/get-started/',
        'estimated_hours': 8,
        'expected_score_boost': '+8.5% match score boost'
    },
    'graphql': {
        'category': 'API Architecture',
        'recommendation': 'Designing Schema-Driven APIs with GraphQL',
        'resource_url': 'https://graphql.org/learn/',
        'estimated_hours': 10,
        'expected_score_boost': '+9.0% match score boost'
    }
}


ROLE_TAXONOMY_DATABASE = [
    {
        "role_title": "Full Stack Software Engineer",
        "category": "Software Engineering",
        "description": "Design and construct end-to-end responsive web applications, robust REST/GraphQL APIs, database architectures, and cloud deployments.",
        "core_skills": ["javascript", "react", "html", "css", "python", "fastapi", "sql", "postgresql", "git", "rest", "node", "typescript", "springboot", "java"],
        "recommended_path": "Modern Full-Stack Mastery (Next.js, FastAPI & Docker)",
        "salary_range": "$95,000 - $145,000 / yr",
        "growth_outlook": "High Demand (25% 5-yr growth)"
    },
    {
        "role_title": "AI / ML Solutions Engineer",
        "category": "Artificial Intelligence & Data Science",
        "description": "Develop and deploy scalable predictive machine learning models, NLP pipelines, vector retrieval architectures (RAG), and LLM integrations.",
        "core_skills": ["python", "nlp", "ai", "machine learning", "fastapi", "scikit-learn", "pytorch", "tensorflow", "postgresql", "groq", "ollama", "data science"],
        "recommended_path": "Generative AI, LangChain, & Vector RAG Architectures",
        "salary_range": "$115,000 - $175,000 / yr",
        "growth_outlook": "Extremely High (38% 5-yr growth)"
    },
    {
        "role_title": "Backend & Cloud API Architect",
        "category": "Backend & Cloud Infrastructure",
        "description": "Build high-throughput asynchronous microservices, distributed caching layers, relational schemas, and containerized cloud services.",
        "core_skills": ["python", "fastapi", "django", "java", "springboot", "postgresql", "mysql", "sql", "docker", "redis", "aws", "git"],
        "recommended_path": "Distributed Microservices, Caching & Kubernetes",
        "salary_range": "$105,000 - $160,000 / yr",
        "growth_outlook": "High Demand (22% 5-yr growth)"
    },
    {
        "role_title": "Frontend UI/UX Application Engineer",
        "category": "Frontend & Creative Tech",
        "description": "Create stunning, accessible, high-performance web applications with modular component architecture, state management, and modern styling.",
        "core_skills": ["react", "javascript", "typescript", "html", "css", "canva", "adobe photoshop", "adobe illustrator", "frontend", "ui", "ux"],
        "recommended_path": "Advanced React, Tailwind & Design Systems",
        "salary_range": "$90,000 - $135,000 / yr",
        "growth_outlook": "Moderate to High (18% 5-yr growth)"
    },
    {
        "role_title": "Data Platform & Analytics Engineer",
        "category": "Data Engineering",
        "description": "Design ETL pipelines, optimize complex SQL aggregation queries, manage data warehouses, and surface business intelligence telemetry.",
        "core_skills": ["sql", "postgresql", "mysql", "python", "database management", "algorithms", "data structures", "analytics", "power bi"],
        "recommended_path": "Big Data Warehousing, dbt, & Modern Data Stacks",
        "salary_range": "$100,000 - $150,000 / yr",
        "growth_outlook": "High Demand (28% 5-yr growth)"
    },
    {
        "role_title": "DevOps & Cloud Systems Engineer",
        "category": "Cloud & Infrastructure",
        "description": "Automate continuous integration and continuous deployment pipelines, manage container orchestration, and enforce cloud security.",
        "core_skills": ["docker", "kubernetes", "aws", "git", "github", "linux", "ci/cd", "terraform", "python", "networking"],
        "recommended_path": "AWS Certified Solutions Architect & Kubernetes (CKA)",
        "salary_range": "$110,000 - $165,000 / yr",
        "growth_outlook": "High Demand (26% 5-yr growth)"
    }
]


class LearningPathEngine:
    def generate_learning_path(self, missing_skills: List[str]) -> List[Dict[str, Any]]:
        learning_path: List[Dict[str, Any]] = []

        for index, skill in enumerate(missing_skills):
            skill_clean = skill.strip().lower()
            res = RESOURCE_DATABASE.get(skill_clean)

            if res:
                learning_path.append({
                    'skill': skill.title(),
                    'category': res['category'],
                    'recommendation': res['recommendation'],
                    'resource_url': res['resource_url'],
                    'estimated_hours': res['estimated_hours'],
                    'expected_score_boost': res['expected_score_boost'],
                    'priority': 'High' if index < 2 else 'Medium'
                })
            else:
                learning_path.append({
                    'skill': skill.title(),
                    'category': 'Technical Competency',
                    'recommendation': f'Mastering {skill.title()}: Official Documentation & Hands-On Labs',
                    'resource_url': f'https://devdocs.io/#q={skill_clean}',
                    'estimated_hours': 12,
                    'expected_score_boost': '+9.5% match score boost',
                    'priority': 'Medium' if index < 3 else 'Nice to Have'
                })

        return learning_path

    def recommend_career_roles(self, candidate_skills: List[str], raw_text: str = "") -> List[Dict[str, Any]]:
        """Compute alignment score between candidate skills/resume and predefined industry career profiles."""
        cand_skill_set = {s.strip().lower().replace('_', '').replace(' ', '') for s in (candidate_skills or [])}
        text_lower = raw_text.lower() if raw_text else ""
        
        recommendations = []
        for role in ROLE_TAXONOMY_DATABASE:
            core = role["core_skills"]
            matched = []
            missing = []
            
            for s in core:
                s_norm = s.replace('_', '').replace(' ', '')
                if s_norm in cand_skill_set or (text_lower and s in text_lower):
                    matched.append(s.title().replace('Ai', 'AI').replace('Nlp', 'NLP').replace('Sql', 'SQL').replace('Ui', 'UI').replace('Ux', 'UX'))
                else:
                    missing.append(s.title().replace('Ai', 'AI').replace('Nlp', 'NLP').replace('Sql', 'SQL').replace('Ui', 'UI').replace('Ux', 'UX'))
            
            # Weighted alignment match score
            raw_pct = (len(matched) / max(1, len(core))) * 100
            if raw_pct > 0:
                match_pct = min(98.0, raw_pct + 18.0)
            else:
                match_pct = 35.0
                
            recommendations.append({
                "role_title": role["role_title"],
                "category": role["category"],
                "description": role["description"],
                "fit_percentage": round(match_pct, 1),
                "matched_skills": matched,
                "missing_skills": missing[:4],
                "recommended_path": role["recommended_path"],
                "salary_range": role["salary_range"],
                "growth_outlook": role["growth_outlook"]
            })
            
        recommendations.sort(key=lambda x: x["fit_percentage"], reverse=True)
        return recommendations[:4]


# Singleton instance
_learning_path_engine = None

def get_learning_path_engine() -> LearningPathEngine:
    global _learning_path_engine
    if _learning_path_engine is None:
        _learning_path_engine = LearningPathEngine()
    return _learning_path_engine
