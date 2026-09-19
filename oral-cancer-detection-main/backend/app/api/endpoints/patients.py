"""Patient management endpoints — CRUD backed by Supabase."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from supabase import Client

from app.api.deps import get_current_user
from app.db.session import get_supabase

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    age: int = Field(..., ge=0, le=150)
    gender: str = Field(..., min_length=1, max_length=20)
    phone: Optional[str] = Field(default=None, max_length=20)


class PatientOut(BaseModel):
    id: str
    user_id: str
    name: str
    age: int
    gender: str
    phone: Optional[str] = None
    created_at: str
    latest_risk_score: Optional[float] = None
    latest_risk_level: Optional[str] = None
    prediction_count: int = 0


class PredictionHistoryItem(BaseModel):
    id: str
    final_risk_score: float
    base_model_predictions: dict
    explainability_attention: dict
    feature_dependencies: dict
    clinical_insight: str
    created_at: str


class PatientDetail(PatientOut):
    predictions: List[PredictionHistoryItem] = []


# ── Helpers ──────────────────────────────────────────────────────────────────

def _extract_rows(query_result) -> list:
    if hasattr(query_result, "data"):
        return query_result.data or []
    if isinstance(query_result, dict):
        return query_result.get("data", []) or []
    return []


def _require_supabase(supabase: Optional[Client]) -> Client:
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured on the server",
        )
    return supabase


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    body: PatientCreate,
    current_user=Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    """Create a new patient record linked to the logged-in doctor."""
    sb = _require_supabase(supabase)
    patient_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    row = {
        "id": patient_id,
        "user_id": current_user.id,
        "name": body.name,
        "age": body.age,
        "gender": body.gender,
        "phone": body.phone,
        "created_at": now,
    }

    try:
        result = sb.table("patients").insert(row).execute()
        rows = _extract_rows(result)
        if rows:
            inserted = rows[0]
            return PatientOut(
                id=inserted["id"],
                user_id=inserted["user_id"],
                name=inserted["name"],
                age=inserted["age"],
                gender=inserted["gender"],
                phone=inserted.get("phone"),
                created_at=inserted["created_at"],
            )
        # Fallback: return the data we sent
        return PatientOut(**row, prediction_count=0)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create patient: {exc}",
        )


@router.get("/", response_model=List[PatientOut])
def list_patients(
    current_user=Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    """List all patients belonging to the logged-in doctor, most recent first."""
    sb = _require_supabase(supabase)

    try:
        result = (
            sb.table("patients")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
        patient_rows = _extract_rows(result)

        # Enrich with latest prediction info
        patient_ids = [p["id"] for p in patient_rows]
        prediction_map: dict[str, list] = {}
        if patient_ids:
            pred_result = (
                sb.table("predictions")
                .select("patient_id,final_risk_score,created_at")
                .in_("patient_id", patient_ids)
                .order("created_at", desc=True)
                .execute()
            )
            for pred in _extract_rows(pred_result):
                pid = pred.get("patient_id")
                if pid:
                    prediction_map.setdefault(pid, []).append(pred)

        out: list[PatientOut] = []
        for p in patient_rows:
            preds = prediction_map.get(p["id"], [])
            latest = preds[0] if preds else None
            risk_score = latest["final_risk_score"] if latest else None
            risk_level = None
            if risk_score is not None:
                risk_level = (
                    "High" if risk_score > 0.65
                    else "Medium" if risk_score > 0.35
                    else "Low"
                )
            out.append(PatientOut(
                id=p["id"],
                user_id=p["user_id"],
                name=p["name"],
                age=p["age"],
                gender=p["gender"],
                phone=p.get("phone"),
                created_at=p["created_at"],
                latest_risk_score=risk_score,
                latest_risk_level=risk_level,
                prediction_count=len(preds),
            ))

        return out

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list patients: {exc}",
        )


@router.get("/{patient_id}", response_model=PatientDetail)
def get_patient(
    patient_id: str,
    current_user=Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    """Get a single patient with their full prediction history."""
    sb = _require_supabase(supabase)

    try:
        # Fetch patient
        result = (
            sb.table("patients")
            .select("*")
            .eq("id", patient_id)
            .eq("user_id", current_user.id)
            .execute()
        )
        rows = _extract_rows(result)
        if not rows:
            raise HTTPException(status_code=404, detail="Patient not found")
        p = rows[0]

        # Fetch predictions
        pred_result = (
            sb.table("predictions")
            .select("id,final_risk_score,base_model_predictions,explainability_attention,feature_dependencies,clinical_insight,created_at")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .execute()
        )
        pred_rows = _extract_rows(pred_result)

        predictions = [
            PredictionHistoryItem(
                id=pr["id"],
                final_risk_score=pr["final_risk_score"],
                base_model_predictions=pr.get("base_model_predictions", {}),
                explainability_attention=pr.get("explainability_attention", {}),
                feature_dependencies=pr.get("feature_dependencies", {}),
                clinical_insight=pr.get("clinical_insight", ""),
                created_at=pr["created_at"],
            )
            for pr in pred_rows
        ]

        latest = predictions[0] if predictions else None
        risk_score = latest.final_risk_score if latest else None
        risk_level = None
        if risk_score is not None:
            risk_level = (
                "High" if risk_score > 0.65
                else "Medium" if risk_score > 0.35
                else "Low"
            )

        return PatientDetail(
            id=p["id"],
            user_id=p["user_id"],
            name=p["name"],
            age=p["age"],
            gender=p["gender"],
            phone=p.get("phone"),
            created_at=p["created_at"],
            latest_risk_score=risk_score,
            latest_risk_level=risk_level,
            prediction_count=len(predictions),
            predictions=predictions,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get patient: {exc}",
        )


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: str,
    current_user=Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    """Delete a patient and all linked predictions."""
    sb = _require_supabase(supabase)

    try:
        # Verify ownership
        result = (
            sb.table("patients")
            .select("id")
            .eq("id", patient_id)
            .eq("user_id", current_user.id)
            .execute()
        )
        if not _extract_rows(result):
            raise HTTPException(status_code=404, detail="Patient not found")

        # Delete predictions first, then patient
        sb.table("predictions").delete().eq("patient_id", patient_id).execute()
        sb.table("patients").delete().eq("id", patient_id).execute()

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete patient: {exc}",
        )
