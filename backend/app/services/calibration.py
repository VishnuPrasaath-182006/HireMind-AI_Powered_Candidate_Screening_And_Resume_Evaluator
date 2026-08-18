import json
import math
import os
from typing import Dict, Any, List, Optional
import joblib
from app.services.ner_extractor import find_data_file


class CalibrationService:
    def __init__(self):
        self.model_path = find_data_file('calibration_model.pkl')
        self.metrics_path = find_data_file('calibration_metrics.json')
        self.model = None
        
        # Default pre-trained Logistic Regression parameters:
        # W1 = +5.74827567 (cosine similarity)
        # W2 = +5.97181217 (exact skill match score)
        # W3 = +0.97018444 (relational skill graph score)
        # b  = -4.36792314 (intercept)
        self.weights = [5.74827567, 5.97181217, 0.97018444]
        self.intercept = -4.36792314

        self._load_model()
        self.metrics = self._load_metrics()

    def _load_model(self):
        if self.model_path and os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                if hasattr(self.model, 'coef_') and hasattr(self.model, 'intercept_'):
                    self.weights = self.model.coef_[0].tolist()
                    self.intercept = float(self.model.intercept_[0])
            except Exception as e:
                print(f"Warning loading calibration model, using exact mathematical parameters: {e}")
                self.model = None

    def _load_metrics(self) -> Dict[str, Any]:
        if self.metrics_path and os.path.exists(self.metrics_path):
            try:
                with open(self.metrics_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Warning loading metrics: {e}")
        return {
            "Accuracy": 0.84,
            "Precision": 0.7143,
            "Recall": 0.2632,
            "F1_Score": 0.3846,
            "ROC_AUC": 0.9392
        }

    def predict_probability(self, features: List[float]) -> float:
        # features: [s_cosine, s_exact_skill, s_skill_graph]
        if self.model is not None:
            try:
                # Scikit-learn LogisticRegression predict_proba
                proba = self.model.predict_proba([features])[0][1]
                return float(max(0.0, min(1.0, proba)))
            except Exception:
                pass

        # Logistic Sigmoid: 1 / (1 + e^-(w1*x1 + w2*x2 + w3*x3 + b))
        z = sum(w * x for w, x in zip(self.weights, features)) + self.intercept
        # Guard against overflow
        if z < -50:
            return 0.0
        if z > 50:
            return 1.0
        prob = 1.0 / (1.0 + math.exp(-z))
        return float(max(0.0, min(1.0, prob)))

    def get_metrics(self) -> Dict[str, Any]:
        return {
            **self.metrics,
            "weights": self.weights,
            "intercept": self.intercept,
            "model_description": "Logistic Regression Calibration Model (W1=+5.75, W2=+5.97, W3=+0.97, b=-4.37)"
        }


# Singleton instance
_calibration_service = None

def get_calibration_service() -> CalibrationService:
    global _calibration_service
    if _calibration_service is None:
        _calibration_service = CalibrationService()
    return _calibration_service
