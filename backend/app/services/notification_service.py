"""
RESQNET AI — Global Real-Time Notification Center Service

Provides:
1. Canonical incident-created notification trigger with duplicate protection.
2. Persistent database queries for notification history and read/unread status.
3. In-memory WebSocket connection manager for instant live updates.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import WebSocket
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.incident import Incident
from backend.app.models.notification import Notification

logger = logging.getLogger("RESQNET.NotificationService")


class NotificationBroadcaster:
    """
    Thread-safe in-memory WebSocket connection manager for tactical alerts.
    Dispatches real-time alerts to all connected authorized coordinators.
    """
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock() if hasattr(asyncio, "Lock") else None

    async def connect(self, websocket: WebSocket):
        """Register a new active WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[Notification Center] WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket."""
        self.active_connections.discard(websocket)
        logger.info(f"[Notification Center] WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Asynchronously push notification payload to all connected clients."""
        if not self.active_connections:
            return

        payload_str = json.dumps(message)
        dead_sockets: List[WebSocket] = []

        for ws in list(self.active_connections):
            try:
                await ws.send_text(payload_str)
            except Exception as e:
                logger.debug(f"[Notification Center] Failed to send to websocket: {e}")
                dead_sockets.append(ws)

        for ws in dead_sockets:
            self.active_connections.discard(ws)

    def broadcast_sync(self, message: Dict[str, Any]):
        """
        Synchronous helper to broadcast from synchronous database service methods.
        Safely schedules broadcast on current running asyncio loop without blocking.
        """
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(message), loop)
        except RuntimeError:
            # No running event loop in current thread (e.g. CLI script or synchronous worker)
            pass


# Global singleton broadcaster instance
broadcaster = NotificationBroadcaster()


def determine_reporting_source(incident: Incident) -> str:
    """
    Normalize incident source into canonical classification:
    - 'sms_simulated': Intake from simulated SMS webhook
    - 'sms': Future carrier SMS intake
    - 'sensor': Automated IoT telemetry / SCADA / sensor alerts
    - 'website': Citizen web report form
    """
    rep_source = (getattr(incident, "report_source", None) or "").lower()
    src_summary = (getattr(incident, "sourceSummary", None) or "").lower()
    loc_source = (getattr(incident, "location_source", None) or "").lower()

    if "sms_forwarded" in rep_source or "android forwarded" in src_summary or "forwarded" in rep_source:
        return "sms_forwarded"
    if "sms_simulated" in rep_source or "sms_simulated" in src_summary or "simulated sms" in src_summary:
        return "sms_simulated"
    if rep_source == "sms" or "[sms" in src_summary:
        return "sms_simulated" if "simulated" in src_summary else "sms"
    if "sensor" in rep_source or "sensor" in src_summary or "telemetry" in src_summary or loc_source == "sensor":
        return "sensor"
    if rep_source in ("website", "citizen report", "citizen report form", "public") or "form" in src_summary or "citizen" in src_summary:
        return "website"
    if rep_source:
        return rep_source
    return "website"


def create_incident_notification(db: Session, incident: Incident) -> Optional[Notification]:
    """
    Canonical notification trigger for genuinely new incidents.
    Called only after an incident is successfully persisted in SQLite.
    
    Guarantees:
    1. Idempotency: Duplicate calls with the same incident ID will never generate a second notification.
    2. Duplicate SMS delivery that returns an existing incident does not notify.
    3. Factual content: Never claims units are dispatched when they are not, and keeps unverified status visible.
    4. Safe metadata: Avoids copying private text narratives or personal data into alerts.
    5. Real-time push: Broadcasts alert to all connected coordinator WebSockets immediately.
    """
    if not incident or not incident.id:
        return None

    # 1. Duplicate check: verify no notification exists for this incident
    existing = (
        db.query(Notification)
        .filter(
            Notification.type == "incident_created",
            Notification.incident_id == incident.id,
        )
        .first()
    )
    if existing:
        logger.info(f"[Notification Center] Notification for incident '{incident.id}' already exists. Skipping duplicate creation.")
        return existing

    # 2. Determine reporting source
    source = determine_reporting_source(incident)

    # 3. Format concise, factual title and message
    if source in ("sms_simulated", "sms_forwarded", "sms"):
        title = f"New SMS report received — {incident.id}"
    elif source == "sensor":
        title = f"New sensor-generated incident — {incident.id}"
    else:
        # Website or other emergency intake
        if incident.severity in ("critical", "high"):
            title = f"New {incident.severity} incident reported — {incident.id}"
        else:
            title = f"New incident reported — {incident.id}"


    location_desc = incident.sector if (incident.sector and incident.sector != "Sector Unspecified") else incident.locationName
    status_label = incident.verificationStatus or "unverified"
    message = (
        f"{incident.title} in {location_desc}. "
        f"Priority: {incident.priorityScore}/100. Status: {status_label}."
    )

    # 4. Safe navigation metadata
    safe_metadata = {
        "incident_id": incident.id,
        "title": incident.title,
        "sector": incident.sector,
        "location_name": incident.locationName,
        "severity": incident.severity,
        "priority_score": incident.priorityScore,
        "verification_status": incident.verificationStatus,
        "response_status": incident.responseStatus,
        "source": source,
    }

    notif_id = f"notif-{uuid.uuid4().hex[:12]}"
    now_utc = datetime.now(timezone.utc)

    notification = Notification(
        id=notif_id,
        type="incident_created",
        incident_id=incident.id,
        title=title,
        message=message,
        source=source,
        severity=incident.severity,
        priority_score=incident.priorityScore,
        is_read=False,
        recipient_role="coordinator",
        user_id=None,
        created_at=now_utc,
    )
    notification.safe_metadata = safe_metadata

    # 5. Transaction-safe persistence with concurrency handling
    try:
        db.add(notification)
        db.commit()
        db.refresh(notification)
        logger.info(f"[Notification Center] Generated alert '{notification.id}' for incident '{incident.id}' (source: {source})")
    except IntegrityError:
        # Race condition handled gracefully: fetch existing record
        db.rollback()
        existing = (
            db.query(Notification)
            .filter(
                Notification.type == "incident_created",
                Notification.incident_id == incident.id,
            )
            .first()
        )
        if existing:
            return existing
        raise

    # 6. Real-time broadcast to connected coordinators
    broadcast_data = {
        "event": "incident_created",
        "notification": notification.to_dict(),
    }
    broadcaster.broadcast_sync(broadcast_data)

    return notification


def get_notifications(
    db: Session,
    unread_only: bool = False,
    limit: int = 50,
    user_id: Optional[str] = None,
) -> Tuple[List[Notification], int, int]:
    """
    Retrieve stored notifications ordered by creation time descending.
    Returns (notifications, unread_count, total_count).
    """
    base_query = db.query(Notification)
    if user_id:
        base_query = base_query.filter(
            (Notification.user_id == user_id) | (Notification.user_id.is_(None))
        )

    total_count = base_query.count()
    unread_count = base_query.filter(Notification.is_read == False).count()

    list_query = base_query
    if unread_only:
        list_query = list_query.filter(Notification.is_read == False)

    notifications = (
        list_query.order_by(desc(Notification.created_at))
        .limit(limit)
        .all()
    )

    return notifications, unread_count, total_count


def mark_notification_as_read(db: Session, notification_id: str) -> Optional[Notification]:
    """Mark an individual notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        return None

    if not notif.is_read:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
        logger.info(f"[Notification Center] Marked notification '{notification_id}' as read.")

    return notif


def mark_all_notifications_as_read(db: Session, user_id: Optional[str] = None) -> int:
    """Mark all unread notifications as read. Returns number of updated rows."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if user_id:
        query = query.filter((Notification.user_id == user_id) | (Notification.user_id.is_(None)))

    updated_count = query.update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    logger.info(f"[Notification Center] Marked {updated_count} notifications as read.")
    return updated_count


def get_unread_count(db: Session, user_id: Optional[str] = None) -> int:
    """Get current count of unread notifications."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if user_id:
        query = query.filter((Notification.user_id == user_id) | (Notification.user_id.is_(None)))
    return query.count()
