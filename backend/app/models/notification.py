"""
SQLAlchemy database model for persistent RESQNET AI tactical notifications.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, UniqueConstraint

from backend.app.database.session import Base

logger = logging.getLogger("RESQNET.NotificationModel")


class Notification(Base):
    """
    Persistent notification model for disaster coordination events.
    Survives application restarts and page refreshes.
    Enforces uniqueness on (type, incident_id) to guarantee idempotency and prevent duplicate alerts.
    """
    __tablename__ = "notifications"

    id = Column(String(128), primary_key=True, index=True)
    type = Column(String(50), nullable=False, default="incident_created", index=True)
    incident_id = Column(String(64), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    source = Column(String(50), nullable=False, default="website")  # website, sms_simulated, sensor, etc.
    severity = Column(String(50), nullable=True)  # critical, high, moderate, low
    priority_score = Column(Integer, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    recipient_role = Column(String(50), nullable=False, default="coordinator")  # coordinator, responder, admin
    user_id = Column(String(64), nullable=True, index=True)  # Optional specific user ID
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    metadata_json = Column(Text, nullable=False, default="{}")

    __table_args__ = (
        UniqueConstraint("type", "incident_id", name="uq_notification_type_incident"),
    )

    @property
    def safe_metadata(self) -> Dict[str, Any]:
        """Safely deserialize metadata JSON."""
        if not self.metadata_json:
            return {}
        try:
            return json.loads(self.metadata_json)
        except Exception:
            return {}

    @safe_metadata.setter
    def safe_metadata(self, val: Any):
        """Safely serialize metadata to JSON string."""
        self.metadata_json = json.dumps(val or {})

    def to_dict(self) -> Dict[str, Any]:
        """Export serialized representation for API responses and real-time broadcasts."""
        return {
            "id": self.id,
            "type": self.type,
            "incident_id": self.incident_id,
            "title": self.title,
            "message": self.message,
            "source": self.source,
            "severity": self.severity,
            "priority_score": self.priority_score,
            "is_read": self.is_read,
            "recipient_role": self.recipient_role,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "metadata": self.safe_metadata,
        }
