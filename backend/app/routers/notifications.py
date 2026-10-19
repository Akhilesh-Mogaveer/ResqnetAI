"""
RESQNET AI — Global Real-Time Notification Center Router

Endpoints:
- GET /api/v1/notifications: List tactical notifications with unread count
- GET /api/v1/notifications/unread-count: Get current unread alert count
- PATCH /api/v1/notifications/{notification_id}/read: Mark a notification as read
- POST /api/v1/notifications/mark-all-read: Mark all notifications as read
- WebSocket /api/v1/notifications/ws: Real-time alert stream for connected coordinators
"""

import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import (
    DEV_COORDINATOR_TOKEN,
    SYSTEM_USERS,
    User,
    UserRole,
    decode_access_token,
    require_roles,
)
from backend.app.database.session import get_db
from backend.app.schemas.notification import (
    NotificationListResponse,
    NotificationReadUpdate,
    NotificationResponse,
    UnreadCountResponse,
)
from backend.app.services.notification_service import (
    broadcaster,
    get_notifications,
    get_unread_count,
    mark_all_notifications_as_read,
    mark_notification_as_read,
)

logger = logging.getLogger("RESQNET.NotificationsRouter")

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications_endpoint(
    unread_only: bool = Query(False, description="Filter to only unread notifications"),
    limit: int = Query(50, ge=1, le=200, description="Max notifications to retrieve"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["coordinator", "admin", "responder"])),
):
    """
    Retrieve stored tactical notifications for authorized coordinators and responders.
    Returns notification history ordered newest first, along with unread and total counts.
    """
    notifications, unread_count, total_count = get_notifications(
        db=db,
        unread_only=unread_only,
        limit=limit,
    )
    return {
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count,
        "total_count": total_count,
    }


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["coordinator", "admin", "responder"])),
):
    """Get the current count of unread tactical notifications."""
    count = get_unread_count(db=db)
    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read_endpoint(
    notification_id: str,
    payload: Optional[NotificationReadUpdate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["coordinator", "admin", "responder"])),
):
    """Mark an individual notification as read."""
    notification = mark_notification_as_read(db=db, notification_id=notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{notification_id}' not found.",
        )
    return notification.to_dict()


@router.post("/mark-all-read")
def mark_all_read_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["coordinator", "admin", "responder"])),
):
    """Mark all unread notifications as read."""
    updated = mark_all_notifications_as_read(db=db)
    return {"marked_read": updated, "unread_count": 0}


@router.websocket("/ws")
async def notifications_websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    Authenticated real-time WebSocket connection for tactical notifications.
    Allows authorized coordinators and responders to receive live alerts as they are generated.
    """
    # 1. Authenticate WebSocket connection
    user_authorized = False

    if token == DEV_COORDINATOR_TOKEN:
        user_authorized = True
    elif token:
        payload = decode_access_token(token)
        if payload and payload.get("role") in ("coordinator", "admin", "responder"):
            user_authorized = True
    elif settings.ENV == "development":
        # Allow dev fallback if no token provided in local development
        user_authorized = True

    if not user_authorized:
        logger.warning("[Notification Center WS] Unauthorized connection attempt rejected.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Register connection with singleton broadcaster
    await broadcaster.connect(websocket)

    try:
        while True:
            # Keepalive / ping-pong support
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if isinstance(msg, dict) and msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                if data == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
    except Exception as e:
        logger.debug(f"[Notification Center WS] Client disconnected with error: {e}")
        broadcaster.disconnect(websocket)
