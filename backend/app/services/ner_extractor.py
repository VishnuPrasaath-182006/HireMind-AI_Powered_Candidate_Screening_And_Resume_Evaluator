import json
import os
import re
from typing import List, Set, Dict, Any, Optional

try:
    # pyrefly: ignore [missing-import]
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        nlp = spacy.blank("en")
except Exception:
    nlp = None


def find_data_file(filename: str) -> Optional[str]:
    possible_paths = [
        os.path.join(os.getcwd(), 'data', filename),
        os.path.join(os.path.dirname(__file__), '..', '..', 'data', filename),
        os.path.join(os.path.dirname(__file__), '..', 'data', filename),
        os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'data', filename),
        os.path.abspath(os.path.join(r'c:\Users\Dell\Music\Vishnu\Skills\Hackathon\ResumeBuilder\data', filename))
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return os.path.abspath(p)
    return None


class SkillNERExtractor:
    def __init__(self, taxonomy_path: Optional[str] = None):
        if not taxonomy_path:
            taxonomy_path = find_data_file('skills_taxonomy.json')
        
        self.taxonomy: Dict[str, List[str]] = {}
        self.all_skills: Set[str] = set()
        self.skill_to_category: Dict[str, str] = {}
        
        if taxonomy_path and os.path.exists(taxonomy_path):
            try:
                with open(taxonomy_path, 'r', encoding='utf-8') as f:
                    self.taxonomy = json.load(f)
            except Exception as e:
                print(f"Warning loading taxonomy: {e}")
        
        # Populate skills vocabulary
        for category, skills in self.taxonomy.items():
            cat_norm = category.lower().replace('_', ' ')
            self.all_skills.add(cat_norm)
            self.skill_to_category[cat_norm] = category
            
            for s in skills:
                s_norm = s.lower().strip()
                self.all_skills.add(s_norm)
                self.skill_to_category[s_norm] = category

        # Common industry skills aliases & variants
        self.aliases = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'c and c++ programming': 'c++',
            'c and c++': 'c++',
            'c programming': 'c',
            'c++ programming': 'c++',
            'java programming': 'java',
            'python programming': 'python',
            'springboot': 'spring_boot',
            'spring boot': 'spring_boot',
            'react.js': 'react',
            'reactjs': 'react',
            'vuejs': 'vue',
            'vue.js': 'vue',
            'nextjs': 'next.js',
            'next.js': 'next.js',
            'nodejs': 'node',
            'node.js': 'node',
            'html5': 'html',
            'css3': 'css',
            'front-end development': 'frontend',
            'frontend development': 'frontend',
            'web designing': 'web designing',
            'web design': 'web designing',
            'web development': 'frontend',
            'teamwork and collaboration': 'teamwork and collaboration',
            'team work': 'teamwork',
            'collaboration': 'collaboration',
            'photography': 'photography',
            'photographer': 'photography',
            'vs code': 'vs code',
            'vscode': 'vs code',
            'visual studio code': 'vs code',
            'eclipse': 'eclipse',
            'github': 'github',
            'git': 'git',
            'microsoft powerpoint': 'microsoft powerpoint',
            'powerpoint': 'microsoft powerpoint',
            'ppt': 'microsoft powerpoint',
            'microsoft word': 'microsoft word',
            'ms word': 'microsoft word',
            'word': 'microsoft word',
            'canva': 'canva',
            'adobe photoshop': 'adobe photoshop',
            'photoshop': 'adobe photoshop',
            'adobe illustrator': 'adobe illustrator',
            'illustrator': 'adobe illustrator',
            'power bi': 'power bi',
            'powerbi': 'power bi',
            'power_bi': 'power bi',
            'data science': 'data science',
            'data_science': 'data science',
            'data analysis': 'data analysis',
            'data_analysis': 'data analysis',
            'data visualization': 'data visualization',
            'data_visualization': 'data visualization',
            'visualization': 'visualization',
            'ai': 'ai',
            'artificial intelligence': 'artificial intelligence',
            'machine learning': 'machine learning',
            'machine_learning': 'machine learning',
            'python programming': 'python',
            'java programming': 'java',
            'c programming': 'c',
            'c++ programming': 'c++',
            'postgres': 'postgresql',
            'mysql': 'mysql',
            'sqlite': 'sqlite',
            'mssql': 'sql',
            'sql server': 'sql',
            'oracle sql': 'sql',
            'plsql': 'sql',
            'pl/sql': 'sql',
            'psql': 'postgresql',
            'k8s': 'kubernetes',
            'ml': 'machine learning',
            'dl': 'deep_learning',
            'nlp': 'nlp',
            'cv': 'computer_vision',
            'genai': 'generative_ai',
            'gen ai': 'generative_ai',
            'fast api': 'fastapi',
            'scikit learn': 'scikit-learn',
            'sklearn': 'scikit-learn',
            'aws cloud': 'aws',
            'gcp': 'gcp',
            'azure cloud': 'azure',
            'pyspark': 'apache_spark',
            'spark': 'apache_spark',
            'pen testing': 'penetration_testing',
            'pentesting': 'penetration_testing',
            'infosec': 'cybersecurity',
            'ux': 'ui_ux',
            'ui/ux': 'ui_ux',
            'eth': 'ethereum'
        }

    def normalize_skill(self, skill_name: str) -> str:
        s = skill_name.strip().lower().replace('_', ' ')
        return self.aliases.get(s, s)

    def extract_skills(self, text: str) -> Dict[str, Any]:
        if not text:
            return {"skills": [], "categorized_skills": {}}

        text_lower = text.lower()
        extracted: Set[str] = set()

        # 1. Line-by-line & bullet-item direct extraction (Preserving every item in the resume's skills list)
        lines = re.split(r'[\n\r•|\*]+', text)
        for line in lines:
            line_cleaned = line.strip().strip('-').strip('.').strip().lower()
            if not line_cleaned:
                continue
            
            # If line contains sub-categories like "Languages & Frameworks: HTML, CSS, JavaScript..."
            if ':' in line_cleaned:
                sub_parts = line_cleaned.split(':', 1)[-1]
                parts = re.split(r'[,;/\t|•&]+', sub_parts)
            else:
                parts = re.split(r'[,;/\t|•&]+', line_cleaned)

            for p in parts:
                p_clean = p.strip().strip('.').strip()
                if not p_clean:
                    continue

                # Check aliases
                if p_clean in self.aliases:
                    extracted.add(self.aliases[p_clean])
                    if 'c and c++' in p_clean:
                        extracted.add('c')
                        extracted.add('c++')
                    continue

                # Check specific terms
                if 'springboot' in p_clean or 'spring boot' in p_clean:
                    extracted.add('spring_boot')
                if 'react' in p_clean:
                    extracted.add('react')
                if 'javascript' in p_clean:
                    extracted.add('javascript')
                if 'html' in p_clean:
                    extracted.add('html')
                if 'css' in p_clean:
                    extracted.add('css')
                if 'powerpoint' in p_clean:
                    extracted.add('microsoft powerpoint')
                if 'word' in p_clean and 'password' not in p_clean:
                    extracted.add('microsoft word')
                if 'canva' in p_clean:
                    extracted.add('canva')
                if 'photoshop' in p_clean:
                    extracted.add('adobe photoshop')
                if 'illustrator' in p_clean:
                    extracted.add('adobe illustrator')
                if 'vs code' in p_clean or 'vscode' in p_clean:
                    extracted.add('vs code')
                if 'eclipse' in p_clean:
                    extracted.add('eclipse')
                if 'github' in p_clean:
                    extracted.add('github')
                if 'git' in p_clean and 'github' not in p_clean:
                    extracted.add('git')

                norm = self.normalize_skill(p_clean)
                if norm in self.all_skills:
                    extracted.add(norm)

        # 2. Regex word-boundary exact matching against all known taxonomy skills
        for skill in self.all_skills:
            pattern = r'(?:\b|_)' + re.escape(skill) + r'(?:\b|_)'
            if re.search(pattern, text_lower):
                extracted.add(self.normalize_skill(skill))

        # 3. Check aliases
        for alias, target in self.aliases.items():
            pattern = r'\b' + re.escape(alias) + r'\b'
            if re.search(pattern, text_lower):
                extracted.add(target)
                if 'c and c++' in alias:
                    extracted.add('c')
                    extracted.add('c++')

        # 4. If PostgreSQL, MySQL, SQLite or database variants are present, represent 'sql' as well
        sql_variants = {'postgresql', 'mysql', 'sqlite', 'postgres', 'mssql', 'psql'}
        if any(s in extracted for s in sql_variants):
            extracted.add('sql')

        # 5. Filter to ensure every item in extracted is a recognized skill or alias
        filtered_extracted: Set[str] = set()
        for s in extracted:
            s_norm = self.normalize_skill(s)
            if s_norm in self.all_skills or s_norm in self.aliases.values():
                filtered_extracted.add(s_norm)

        categorized: Dict[str, List[str]] = {}
        for skill in filtered_extracted:
            cat = self.skill_to_category.get(skill, 'other')
            if cat not in categorized:
                categorized[cat] = []
            categorized[cat].append(skill)

        sorted_skills = sorted(list(filtered_extracted))
        return {
            "skills": sorted_skills,
            "categorized_skills": categorized
        }


# Singleton instance
_extractor_instance = None

def get_skill_extractor() -> SkillNERExtractor:
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = SkillNERExtractor()
    return _extractor_instance


def extract_skills_from_text(text: str) -> List[str]:
    extractor = get_skill_extractor()
    result = extractor.extract_skills(text)
    return result["skills"]
