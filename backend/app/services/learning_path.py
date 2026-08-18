from typing import List, Dict, Any


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


# Singleton instance
_learning_path_engine = None

def get_learning_path_engine() -> LearningPathEngine:
    global _learning_path_engine
    if _learning_path_engine is None:
        _learning_path_engine = LearningPathEngine()
    return _learning_path_engine
