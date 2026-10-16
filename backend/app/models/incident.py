"""
SQLAlchemy database models for RESQNET AI incident management
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from backend.app.database.session import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False, default="Emergency Incident")
    sector = Column(String(100), nullable=False, default="Sector Unspecified")
    locationName = Column(String(255), nullable=False, default="Location Unspecified")
    coordinates_json = Column(Text, nullable=False, default="[37.7749, -122.4194]")  # [lat, lng]
    
    severity = Column(String(50), nullable=False, default="moderate")  # critical, high, moderate, low
    priorityScore = Column(Integer, nullable=False, default=50)  # 0-100
    reportReliability = Column(Integer, nullable=False, default=70)
    locationConfidence = Column(Integer, nullable=False, default=70)
    
    peopleAffected = Column(String(255), nullable=False, default="Unknown count")
    affectedCountNumeric = Column(Integer, nullable=False, default=0)
    timeAgo = Column(String(100), nullable=False, default="Just now")
    timestamp = Column(String(100), nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    verificationStatus = Column(String(50), nullable=False, default="unverified")  # unverified, under_review, verified, disputed
    responseStatus = Column(String(50), nullable=False, default="triage")  # unassigned, triage, dispatched, on_scene, resolved
    assignedTeam = Column(String(255), nullable=True, default=None)

    sourceSummary = Column(Text, nullable=False, default="")
    signalSynthesis = Column(Text, nullable=False, default="")
    whyPrioritised = Column(Text, nullable=False, default="")
    riskFactors_json = Column(Text, nullable=False, default="[]")  # JSON list
    notes_json = Column(Text, nullable=False, default="[]")  # JSON list

    # NLP / HumAID Fields (Stored distinctly from verification status and priority)
    report_text = Column(Text, nullable=True)
    original_report_text = Column(Text, nullable=True)
    humaid_category = Column(String(100), nullable=True)
    humaid_confidence = Column(Float, nullable=True)
    all_probabilities_json = Column(Text, nullable=True, default="{}")
    nlp_status = Column(String(50), nullable=True)
    nlp_disclaimer = Column(Text, nullable=True)

    # Duplicate Detection & Corroboration Fields
    is_duplicate = Column(Boolean, default=False, nullable=False)
    duplicate_of_id = Column(String(64), nullable=True, index=True)
    duplicate_count = Column(Integer, default=0, nullable=False)
    dismissed_duplicates_json = Column(Text, nullable=False, default="[]")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    @property
    def coordinates(self) -> List[float]:
        try:
            return json.loads(self.coordinates_json) if self.coordinates_json else [37.7749, -122.4194]
        except Exception:
            return [37.7749, -122.4194]

    @coordinates.setter
    def coordinates(self, val: List[float]):
        self.coordinates_json = json.dumps(val)

    @property
    def riskFactors(self) -> List[str]:
        try:
            return json.loads(self.riskFactors_json) if self.riskFactors_json else []
        except Exception:
            return []

    @riskFactors.setter
    def riskFactors(self, val: List[str]):
        self.riskFactors_json = json.dumps(val)

    @property
    def notes(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.notes_json) if self.notes_json else []
        except Exception:
            return []

    @notes.setter
    def notes(self, val: List[Dict[str, Any]]):
        self.notes_json = json.dumps(val)

    @property
    def all_probabilities(self) -> Dict[str, float]:
        try:
            return json.loads(self.all_probabilities_json) if self.all_probabilities_json else {}
        except Exception:
            return {}

    @all_probabilities.setter
    def all_probabilities(self, val: Dict[str, float]):
        self.all_probabilities_json = json.dumps(val)

    @property
    def dismissed_duplicates(self) -> List[str]:
        try:
            return json.loads(self.dismissed_duplicates_json) if self.dismissed_duplicates_json else []
        except Exception:
            return []

    @dismissed_duplicates.setter
    def dismissed_duplicates(self, val: List[str]):
        self.dismissed_duplicates_json = json.dumps(val)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary matching frontend dashboard schema."""
        return {
            "id": self.id,
            "title": self.title,
            "type": self.type,
            "sector": self.sector,
            "locationName": self.locationName,
            "coordinates": self.coordinates,
            "severity": self.severity,
            "priorityScore": self.priorityScore,
            "reportReliability": self.reportReliability,
            "locationConfidence": self.locationConfidence,
            "peopleAffected": self.peopleAffected,
            "affectedCountNumeric": self.affectedCountNumeric,
            "timeAgo": self.timeAgo,
            "timestamp": self.timestamp,
            "verificationStatus": self.verificationStatus,
            "responseStatus": self.responseStatus,
            "assignedTeam": self.assignedTeam,
            "sourceSummary": self.sourceSummary,
            "signalSynthesis": self.signalSynthesis,
            "whyPrioritised": self.whyPrioritised,
            "riskFactors": self.riskFactors,
            "notes": self.notes,
            "report_text": self.report_text,
            "original_report_text": self.original_report_text,
            "rawReportText": self.original_report_text,
            "humaid_category": self.humaid_category,
            "humaidCategory": self.humaid_category,
            "humaid_confidence": self.humaid_confidence,
            "humaidConfidence": self.humaid_confidence,
            "all_probabilities": self.all_probabilities,
            "nlp_status": self.nlp_status,
            "nlp_disclaimer": self.nlp_disclaimer,
            "is_duplicate": self.is_duplicate,
            "duplicate_of_id": self.duplicate_of_id,
            "duplicate_count": self.duplicate_count,
            "dismissed_duplicates": self.dismissed_duplicates,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(String(100), nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    incidentId = Column(String(64), nullable=False, index=True)
    operator = Column(String(255), nullable=False)
    actionType = Column(String(100), nullable=False)  # VERIFICATION_STATUS_CHANGE, RESPONSE_STATUS_CHANGE, PRIORITY_OVERRIDE, etc.
    oldValue = Column(String(255), nullable=False)
    newValue = Column(String(255), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "incidentId": self.incidentId,
            "operator": self.operator,
            "actionType": self.actionType,
            "oldValue": self.oldValue,
            "newValue": self.newValue,
            "reason": self.reason,
        }


class AttentionZone(Base):
    __tablename__ = "attention_zones"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    signalDeviation = Column(String(50), nullable=False)
    signalCount = Column(String(100), nullable=False)
    confidence = Column(String(100), nullable=False)
    riskCategory = Column(String(100), nullable=False)
    populationAtRisk = Column(String(100), nullable=False)
    estimatedBarriers = Column(Text, nullable=False)
    lastReportTime = Column(String(100), nullable=False)
    coordinates_json = Column(Text, nullable=False, default="[37.7749, -122.4194]")
    scoutStatus = Column(String(100), nullable=False)
    notes = Column(Text, nullable=False)

    @property
    def coordinates(self) -> List[float]:
        try:
            return json.loads(self.coordinates_json) if self.coordinates_json else [37.7749, -122.4194]
        except Exception:
            return [37.7749, -122.4194]

    @coordinates.setter
    def coordinates(self, val: List[float]):
        self.coordinates_json = json.dumps(val)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "signalDeviation": self.signalDeviation,
            "signalCount": self.signalCount,
            "confidence": self.confidence,
            "riskCategory": self.riskCategory,
            "populationAtRisk": self.populationAtRisk,
            "estimatedBarriers": self.estimatedBarriers,
            "lastReportTime": self.lastReportTime,
            "coordinates": self.coordinates,
            "scoutStatus": self.scoutStatus,
            "notes": self.notes,
        }
