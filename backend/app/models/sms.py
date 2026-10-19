"""
SQLAlchemy database model for persistent Inbound SMS message logging and idempotency.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, Column, DateTime, String, Text

from backend.app.database.session import Base


class InboundSMSMessage(Base):
    """
    Persistent log of incoming SMS messages.
    Uses message_id as primary key to guarantee idempotency and prevent duplicate incident intake.
    """
    __tablename__ = "inbound_sms_messages"

    id = Column(String(128), primary_key=True, index=True)  # Provider message_id / idempotency key
    sender = Column(String(100), nullable=False)
    body = Column(Text, nullable=False)
    provider = Column(String(50), nullable=False, default="simulated")
    received_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    status = Column(String(50), nullable=False, default="processed")  # processed, duplicate, rejected
    incident_id = Column(String(64), nullable=True, index=True)
    raw_payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "sender": self.sender,
            "body": self.body,
            "provider": self.provider,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "status": self.status,
            "incident_id": self.incident_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CommunityEmergencyNumber(Base):
    """
    Persistent configuration for the dynamic shared community emergency number.
    Only one number can be active at a time.
    Supplied by a volunteer using their mobile phone and SIM with an Android SMS forwarder.
    """
    __tablename__ = "community_emergency_numbers"

    id = Column(String(64), primary_key=True, index=True)
    phone_number = Column(String(32), nullable=False)  # Normalized E.164 or formatted string e.g. +91 98765 43210
    country_code = Column(String(8), nullable=False, default="+91")
    raw_number = Column(String(24), nullable=False)  # Digits without country code
    status = Column(String(32), nullable=False, default="setup_required")  # not_configured, setup_required, testing, connected, unavailable
    forwarding_secret = Column(String(128), nullable=False)  # Cryptographic authentication secret for Android forwarder webhook
    is_active = Column(Boolean, nullable=False, default=True)
    volunteer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_ping_at = Column(DateTime, nullable=True)

    def to_dict(self, mask_secret: bool = True) -> Dict[str, Any]:
        return {
            "id": self.id,
            "phone_number": self.phone_number,
            "country_code": self.country_code,
            "raw_number": self.raw_number,
            "status": self.status,
            "is_active": bool(self.is_active),
            "volunteer_notes": self.volunteer_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_ping_at": self.last_ping_at.isoformat() if self.last_ping_at else None,
            "forwarding_secret": "***" if mask_secret else self.forwarding_secret,
        }

