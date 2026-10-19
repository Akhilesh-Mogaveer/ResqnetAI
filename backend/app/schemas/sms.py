"""
Pydantic schemas for SMS Intake, Provider Normalization, and Responses
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, field_validator


class NormalizedSMSMessage(BaseModel):
    """
    Standardized internal SMS representation produced by any SMS adapter.
    """
    message_id: str = Field(description="Unique provider message ID / idempotency key.")
    sender: str = Field(description="Normalized phone number or mobile identifier.")
    body: str = Field(description="Normalized message text body.")
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp message was received.")
    provider: str = Field(default="simulated", description="SMS carrier/provider name (e.g. simulated, twilio).")
    raw_metadata: Dict[str, Any] = Field(default_factory=dict, description="Raw provider headers or metadata.")


class IncomingSMSPayload(BaseModel):
    """
    Inbound SMS webhook payload accepted at POST /api/v1/sms/incoming.
    """
    message_id: str = Field(description="Simulated or provider message identifier (used as idempotency key).")
    sender: str = Field(description="Sender phone number or identifier.")
    body: str = Field(description="Raw text message content.")
    received_at: Optional[datetime] = Field(default=None, description="Optional ISO timestamp.")
    provider: Optional[str] = Field(default="simulated", description="Provider identifier.")

    @field_validator("message_id")
    def validate_message_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("message_id must be a non-empty string.")
        return v.strip()

    @field_validator("sender")
    def validate_sender(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("sender must be a non-empty string.")
        return v.strip()

    @field_validator("body")
    def validate_body(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message body cannot be empty or whitespace only.")
        return v.strip()


class SMSIntakeResponse(BaseModel):
    """
    Response returned by POST /api/v1/sms/incoming and POST /api/v1/sms/forwarded.
    """
    status: str = Field(description="'created' if a new incident was created, 'duplicate' if previously processed.")
    message_id: str = Field(description="Message ID / idempotency key.")
    incident_id: Optional[str] = Field(default=None, description="Persistent ID of the resulting incident (e.g. RQN-0430).")
    is_duplicate: bool = Field(default=False, description="True if idempotency key matched an existing message.")
    incident: Optional[Dict[str, Any]] = Field(default=None, description="The created or existing incident representation.")
    detail: Optional[str] = Field(default=None, description="Human-readable operational status or details.")


class CommunityNumberCreate(BaseModel):
    """
    Payload for configuring or changing the dynamic community emergency number.
    """
    phone_number: str = Field(description="Full E.164 formatted phone number or combined string, e.g. +91 98765 43210.")
    country_code: str = Field(default="+91", description="International country dial code, e.g. +91, +1, +44.")
    raw_number: str = Field(description="Phone digits without country code.")
    volunteer_notes: Optional[str] = Field(default=None, description="Optional notes on volunteer device, SIM, or shift schedule.")

    @field_validator("phone_number")
    def validate_phone(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("phone_number must not be empty.")
        cleaned = v.strip()
        # Verify contains at least some digits
        digits = [c for c in cleaned if c.isdigit()]
        if len(digits) < 5:
            raise ValueError("phone_number must contain at least 5 digits.")
        return cleaned

    @field_validator("raw_number")
    def validate_raw(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("raw_number must not be empty.")
        digits = [c for c in v if c.isdigit()]
        if not digits:
            raise ValueError("raw_number must contain numeric digits.")
        return "".join(digits)


class CommunityNumberResponse(BaseModel):
    """
    Response representing the currently configured community emergency number.
    """
    id: Optional[str] = None
    phone_number: Optional[str] = None
    country_code: Optional[str] = None
    raw_number: Optional[str] = None
    status: str = Field(
        default="not_configured",
        description="One of: 'not_configured', 'setup_required', 'testing', 'connected', 'unavailable'.",
    )
    is_active: bool = False
    volunteer_notes: Optional[str] = None
    forwarding_secret: Optional[str] = None
    webhook_url_path: str = "/api/v1/sms/forwarded"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_ping_at: Optional[str] = None
    detail: Optional[str] = None


class ForwardedSMSPayload(BaseModel):
    """
    Normalized incoming payload from Android SMS forwarder apps.
    Supports standard field names as well as common forwarder aliases
    ('from'/'sender', 'text'/'body'/'message'/'content', 'id'/'message_id'/'timestamp').
    """
    sender: Optional[str] = Field(default=None, description="Sender phone number or identifier.")
    body: Optional[str] = Field(default=None, description="SMS text content.")
    message_id: Optional[str] = Field(default=None, description="Optional message identifier or timestamp idempotency key.")
    received_at: Optional[datetime] = Field(default=None, description="Optional receipt timestamp.")

    # Common Android forwarding app alias fields
    from_: Optional[str] = Field(default=None, alias="from")
    phone: Optional[str] = Field(default=None)
    text: Optional[str] = Field(default=None)
    message: Optional[str] = Field(default=None)
    content: Optional[str] = Field(default=None)
    id: Optional[str] = Field(default=None)
    timestamp: Optional[Any] = Field(default=None)
    sim: Optional[str] = Field(default=None)

    model_config = {
        "populate_by_name": True,
        "extra": "ignore",
    }

    def get_sender(self) -> str:
        val = self.sender or self.from_ or self.phone or ""
        return str(val).strip()

    def get_body(self) -> str:
        val = self.body or self.text or self.message or self.content or ""
        return str(val).strip()

    def get_message_id(self) -> str:
        val = self.message_id or self.id or ""
        return str(val).strip()

