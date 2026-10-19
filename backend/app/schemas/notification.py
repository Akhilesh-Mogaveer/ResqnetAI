"""
Pydantic schemas for RESQNET AI notification system.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    """Notification response schema."""
    id: str = Field(description="Unique notification identifier")
    type: str = Field(default="incident_created", description="Type of notification")
    incident_id: Optional[str] = Field(default=None, description="Associated incident ID if applicable")
    title: str = Field(description="Concise notification title")
    message: str = Field(description="Concise, factual notification message")
    source: str = Field(default="website", description="Intake source: website, sms_simulated, sensor, etc.")
    severity: Optional[str] = Field(default=None, description="Incident severity if known")
    priority_score: Optional[int] = Field(default=None, description="Algorithmic priority score 0-100")
    is_read: bool = Field(default=False, description="Read/unread status")
    recipient_role: str = Field(default="coordinator", description="Target recipient role")
    user_id: Optional[str] = Field(default=None, description="Target user identifier if specific")
    created_at: Optional[str] = Field(default=None, description="ISO-8601 creation timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Safe operational navigation metadata")

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    """Paginated or bounded list of notifications with unread tally."""
    notifications: List[NotificationResponse] = Field(description="List of notifications")
    unread_count: int = Field(description="Number of unread notifications")
    total_count: int = Field(description="Total number of stored notifications")


class NotificationReadUpdate(BaseModel):
    """Payload to mark notification read state."""
    is_read: bool = Field(default=True, description="Target read status")


class UnreadCountResponse(BaseModel):
    """Tally of unread notifications."""
    unread_count: int = Field(description="Number of unread notifications")
