import numpy as np
from typing import List, Union

try:
    # pyrefly: ignore [missing-import]
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine_similarity
except ImportError:
    TfidfVectorizer = None
    sklearn_cosine_similarity = None


class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self._model_attempted = False  # Lazy load flag

    def _ensure_model_loaded(self):
        """Lazy load model on first demand to prevent Render Out of Memory on startup."""
        if not self._model_attempted:
            self._model_attempted = True
            if SentenceTransformer is not None:
                try:
                    print(f"Lazy loading SentenceTransformer '{self.model_name}' on first request...")
                    self.model = SentenceTransformer(self.model_name)
                    print("SentenceTransformer loaded successfully!")
                except Exception as e:
                    print(f"Could not load SentenceTransformer '{self.model_name}', using fallback: {e}")
                    self.model = None

    def get_embedding(self, text: str) -> List[float]:
        if not text or not text.strip():
            return [0.0] * 384

        self._ensure_model_loaded()

        if self.model is not None:
            try:
                emb = self.model.encode(text[:4000], convert_to_numpy=True)
                return emb.tolist()
            except Exception as e:
                print(f"Encoding error, using fallback: {e}")

        # Fallback pseudo-embedding with deterministic 384-dim hash projection
        vec = np.zeros(384, dtype=np.float32)
        words = text.lower().split()
        for i, w in enumerate(words):
            h = hash(w) % 384
            vec[h] += 1.0 / (1.0 + np.log1p(i + 1))
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def get_embeddings_batch(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 384), dtype=np.float32)
        
        cleaned_texts = [t[:4000] if t else "" for t in texts]

        self._ensure_model_loaded()

        if self.model is not None:
            try:
                return self.model.encode(
                    cleaned_texts,
                    batch_size=32,
                    show_progress_bar=False,
                    convert_to_numpy=True,
                    normalize_embeddings=True
                )
            except Exception as e:
                print(f"Batched encoding fallback: {e}")

        # Fallback
        embs = [self.get_embedding(t) for t in cleaned_texts]
        return np.array(embs, dtype=np.float32)

    def compute_cosine_similarity(self, vec1: Union[List[float], np.ndarray], vec2: Union[List[float], np.ndarray]) -> float:
        v1 = np.array(vec1, dtype=np.float32)
        v2 = np.array(vec2, dtype=np.float32)
        
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        sim = float(np.dot(v1, v2) / (norm1 * norm2))
        return max(0.0, min(1.0, float(sim)))

    def compute_text_similarity(self, text1: str, text2: str) -> float:
        if not text1 or not text2:
            return 0.0

        self._ensure_model_loaded()

        if self.model is not None:
            try:
                v1 = self.get_embedding(text1)
                v2 = self.get_embedding(text2)
                return self.compute_cosine_similarity(v1, v2)
            except Exception:
                pass

        # TF-IDF Fallback
        if TfidfVectorizer is not None:
            try:
                vectorizer = TfidfVectorizer().fit([text1, text2])
                tfidf = vectorizer.transform([text1, text2])
                sim = sklearn_cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
                return max(0.0, min(1.0, float(sim)))
            except Exception:
                pass

        # Word overlap fallback
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        if not words1 or not words2:
            return 0.0
        jaccard = len(words1 & words2) / len(words1 | words2)
        return float(jaccard)


# Singleton instance
_embedding_service_instance = None

def get_embedding_service() -> EmbeddingService:
    global _embedding_service_instance
    if _embedding_service_instance is None:
        _embedding_service_instance = EmbeddingService()
    return _embedding_service_instance