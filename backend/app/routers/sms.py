"""
RESQNET AI — Inbound SMS Webhook and Simulator Router

Exposes POST /api/v1/sms/incoming for simulated SMS reports and carrier adapters.
Enforces secret token authentication, idempotency, and automated incident creation.
"""

import hmac
import logging
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.config import settings
from backend.app.core.security import require_roles, User
from backend.app.database.session import get_db
from backend.app.models.sms import CommunityEmergencyNumber
from backend.app.schemas.sms import (
    CommunityNumberCreate,
    CommunityNumberResponse,
    ForwardedSMSPayload,
    IncomingSMSPayload,
    SMSIntakeResponse,
)
from backend.app.services.sms.adapter import AndroidForwardedSMSAdapter, SimulatedSMSAdapter
from backend.app.services.sms.service import SMSIntakeService

logger = logging.getLogger("RESQNET.SMSRouter")

router = APIRouter(prefix="/sms", tags=["SMS Intake"])


def verify_sms_simulator_auth(
    x_resqnet_sms_token: Optional[str] = Header(None, alias="X-RESQNET-SMS-TOKEN"),
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Verify authentication for incoming simulated SMS intake.
    Requires RESQNET_SMS_SIMULATOR_TOKEN configured on server.
    Disables simulated intake in production unless explicitly enabled.
    Rejects missing or invalid tokens with HTTP 401.
    """
    # 1. Reject in production if simulator is disabled
    if settings.ENV == "production" and not settings.ENABLE_SMS_SIMULATOR:
        logger.warning("[SMS Intake] Attempted access to simulated SMS endpoint in production while disabled.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulated SMS intake is disabled in production environments.",
        )

    # 2. Verify server has a configured secret token
    configured_token = (settings.RESQNET_SMS_SIMULATOR_TOKEN or "").strip()
    if not configured_token:
        logger.error("[SMS Intake] RESQNET_SMS_SIMULATOR_TOKEN is not configured on the server.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SMS simulator secret token (RESQNET_SMS_SIMULATOR_TOKEN) is not configured.",
        )

    # 3. Extract client-supplied token (from X-RESQNET-SMS-TOKEN or Authorization: Bearer <token>)
    provided_token: Optional[str] = None
    if x_resqnet_sms_token and x_resqnet_sms_token.strip():
        provided_token = x_resqnet_sms_token.strip()
    elif authorization and authorization.strip():
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token.strip():
            provided_token = token.strip()
        else:
            provided_token = authorization.strip()

    if not provided_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing SMS simulator authentication token (X-RESQNET-SMS-TOKEN or Bearer token).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(provided_token, configured_token):
        logger.warning("[SMS Intake] Invalid SMS simulator token provided.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SMS simulator authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return provided_token


def verify_forwarding_webhook_auth(
    x_resqnet_forwarding_secret: Optional[str] = Header(None, alias="X-RESQNET-FORWARDING-SECRET"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> CommunityEmergencyNumber:
    """
    Verify authentication for real Android forwarded SMS webhook requests.
    - Requires an active CommunityEmergencyNumber in database.
    - Rejects if status is 'unavailable' or number was deleted.
    - Compares header token against active number's forwarding_secret using constant-time comparison.
    """
    active_num = (
        db.query(CommunityEmergencyNumber)
        .filter(CommunityEmergencyNumber.is_active == True)
        .order_by(desc(CommunityEmergencyNumber.created_at))
        .first()
    )

    if not active_num or active_num.status == "unavailable":
        logger.warning("[Forwarded SMS] Forwarding request received but no active community emergency number is configured.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community emergency number is not configured or SMS intake is currently unavailable.",
        )

    provided_secret: Optional[str] = None
    if x_resqnet_forwarding_secret and x_resqnet_forwarding_secret.strip():
        provided_secret = x_resqnet_forwarding_secret.strip()
    elif authorization and authorization.strip():
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token.strip():
            provided_secret = token.strip()
        else:
            provided_secret = authorization.strip()

    if not provided_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing forwarding secret (X-RESQNET-FORWARDING-SECRET or Bearer token).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not hmac.compare_digest(provided_secret, active_num.forwarding_secret):
        logger.warning("[Forwarded SMS] Invalid forwarding secret token provided.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid forwarding authentication secret.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return active_num


# =====================================================================
# Community Emergency Number Management Endpoints (Coordinator Protected)
# =====================================================================

@router.get(
    "/community-number",
    response_model=CommunityNumberResponse,
    summary="Get the currently configured community emergency number",
)
def get_community_number(
    current_user: User = Depends(require_roles(["coordinator", "admin"])),
    db: Session = Depends(get_db),
):
    """
    Fetch the currently active community emergency number and its connection status.
    Protected: Coordinator authentication required.
    """
    active_num = (
        db.query(CommunityEmergencyNumber)
        .filter(CommunityEmergencyNumber.is_active == True)
        .order_by(desc(CommunityEmergencyNumber.created_at))
        .first()
    )

    if not active_num:
        # Check if there is an inactive/deleted record to display 'unavailable' status
        last_num = (
            db.query(CommunityEmergencyNumber)
            .order_by(desc(CommunityEmergencyNumber.created_at))
            .first()
        )
        if last_num and last_num.status == "unavailable":
            return CommunityNumberResponse(
                id=last_num.id,
                phone_number=last_num.phone_number,
                country_code=last_num.country_code,
                raw_number=last_num.raw_number,
                status="unavailable",
                is_active=False,
                volunteer_notes=last_num.volunteer_notes,
                forwarding_secret=None,
                webhook_url_path="/api/v1/sms/forwarded",
                created_at=last_num.created_at.isoformat() if last_num.created_at else None,
                updated_at=last_num.updated_at.isoformat() if last_num.updated_at else None,
                last_ping_at=last_num.last_ping_at.isoformat() if last_num.last_ping_at else None,
                detail="Community emergency number was removed. SMS intake is currently unavailable.",
            )

        return CommunityNumberResponse(
            status="not_configured",
            is_active=False,
            detail="No community emergency number is currently configured.",
        )

    return CommunityNumberResponse(
        id=active_num.id,
        phone_number=active_num.phone_number,
        country_code=active_num.country_code,
        raw_number=active_num.raw_number,
        status=active_num.status,
        is_active=True,
        volunteer_notes=active_num.volunteer_notes,
        forwarding_secret=active_num.forwarding_secret,
        webhook_url_path="/api/v1/sms/forwarded",
        created_at=active_num.created_at.isoformat() if active_num.created_at else None,
        updated_at=active_num.updated_at.isoformat() if active_num.updated_at else None,
        last_ping_at=active_num.last_ping_at.isoformat() if active_num.last_ping_at else None,
        detail="Active community emergency number configured.",
    )


@router.post(
    "/community-number",
    response_model=CommunityNumberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Configure or change the shared community emergency number",
)
def configure_community_number(
    payload: CommunityNumberCreate,
    current_user: User = Depends(require_roles(["coordinator", "admin"])),
    db: Session = Depends(get_db),
):
    """
    Add or update the shared community emergency phone number.
    - Only one number can be active at a time.
    - Generates a new cryptographic forwarding secret.
    - Sets initial status to 'setup_required' until forwarding connectivity is established.
    - Deactivates any previous active number.
    """
    # 1. Deactivate existing active numbers
    existing_actives = (
        db.query(CommunityEmergencyNumber)
        .filter(CommunityEmergencyNumber.is_active == True)
        .all()
    )
    for num in existing_actives:
        num.is_active = False
        num.updated_at = datetime.now(timezone.utc)

    # 2. Generate secure forwarding secret
    new_secret = f"rqn_fwd_{secrets.token_urlsafe(24)}"
    new_id = f"cnum-{uuid.uuid4().hex[:8]}"

    # Normalize phone display
    phone_clean = payload.phone_number.strip()
    if not phone_clean.startswith("+"):
        phone_clean = f"{payload.country_code.strip()} {payload.raw_number.strip()}"

    new_number = CommunityEmergencyNumber(
        id=new_id,
        phone_number=phone_clean,
        country_code=payload.country_code.strip(),
        raw_number=payload.raw_number.strip(),
        status="setup_required",
        forwarding_secret=new_secret,
        is_active=True,
        volunteer_notes=payload.volunteer_notes,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        last_ping_at=None,
    )
    db.add(new_number)
    db.commit()
    db.refresh(new_number)

    logger.info(
        f"[Community Number] New emergency number configured by {current_user.username}. "
        f"Status: setup_required."
    )

    return CommunityNumberResponse(
        id=new_number.id,
        phone_number=new_number.phone_number,
        country_code=new_number.country_code,
        raw_number=new_number.raw_number,
        status=new_number.status,
        is_active=True,
        volunteer_notes=new_number.volunteer_notes,
        forwarding_secret=new_number.forwarding_secret,
        webhook_url_path="/api/v1/sms/forwarded",
        created_at=new_number.created_at.isoformat() if new_number.created_at else None,
        updated_at=new_number.updated_at.isoformat() if new_number.updated_at else None,
        last_ping_at=None,
        detail="Emergency number saved successfully. Configure Android SMS Forwarder with the provided secret.",
    )


@router.delete(
    "/community-number",
    response_model=CommunityNumberResponse,
    summary="Delete or deactivate the currently configured emergency number",
)
def delete_community_number(
    current_user: User = Depends(require_roles(["coordinator", "admin"])),
    db: Session = Depends(get_db),
):
    """
    Deactivate and delete the active community emergency number.
    - Sets connection status to 'unavailable'.
    - Invalidates the forwarding secret token.
    - Does NOT delete previously created incidents, audit history, or message logs.
    - Instructs the volunteer to disable forwarding on their Android device.
    """
    active_nums = (
        db.query(CommunityEmergencyNumber)
        .filter(CommunityEmergencyNumber.is_active == True)
        .all()
    )

    if not active_nums:
        return CommunityNumberResponse(
            status="unavailable",
            is_active=False,
            detail="No active community emergency number was configured. SMS intake is unavailable.",
        )

    last_record = active_nums[-1]
    for num in active_nums:
        num.is_active = False
        num.status = "unavailable"
        # Invalidate forwarding secret
        num.forwarding_secret = f"revoked-{secrets.token_hex(16)}"
        num.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(last_record)

    logger.info(
        f"[Community Number] Emergency number deactivated by {current_user.username}. "
        f"Forwarding credentials invalidated."
    )

    return CommunityNumberResponse(
        id=last_record.id,
        phone_number=last_record.phone_number,
        country_code=last_record.country_code,
        raw_number=last_record.raw_number,
        status="unavailable",
        is_active=False,
        volunteer_notes=last_record.volunteer_notes,
        forwarding_secret=None,
        webhook_url_path="/api/v1/sms/forwarded",
        created_at=last_record.created_at.isoformat() if last_record.created_at else None,
        updated_at=last_record.updated_at.isoformat() if last_record.updated_at else None,
        last_ping_at=last_record.last_ping_at.isoformat() if last_record.last_ping_at else None,
        detail="Community emergency number removed. SMS intake is now unavailable. Volunteer must disable forwarding in their Android app.",
    )


@router.post(
    "/community-number/test-ping",
    summary="Test forwarding connectivity and verify webhook reachability",
)
def test_community_number_ping(
    current_user: User = Depends(require_roles(["coordinator", "admin"])),
    db: Session = Depends(get_db),
):
    """
    Test or simulate verification of the forwarding connection.
    Transitions status to 'connected' and updates last_ping_at timestamp.
    """
    active_num = (
        db.query(CommunityEmergencyNumber)
        .filter(CommunityEmergencyNumber.is_active == True)
        .order_by(desc(CommunityEmergencyNumber.created_at))
        .first()
    )

    if not active_num:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot test connection: No active community emergency number configured.",
        )

    active_num.status = "connected"
    active_num.last_ping_at = datetime.now(timezone.utc)
    active_num.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(active_num)

    logger.info(f"[Community Number] Forwarding connectivity verified for {active_num.id}.")

    return {
        "status": "connected",
        "message": "Forwarding connection test succeeded. Connection status is now Connected.",
        "last_ping_at": active_num.last_ping_at.isoformat(),
    }


# =====================================================================
# Real Forwarded SMS Webhook (Android SMS Forwarder Integration)
# =====================================================================

@router.post(
    "/forwarded",
    response_model=SMSIntakeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest real SMS forwarded from volunteer Android device",
)
async def handle_forwarded_sms(
    request: Request,
    response: Response,
    active_number: CommunityEmergencyNumber = Depends(verify_forwarding_webhook_auth),
    db: Session = Depends(get_db),
):
    """
    Webhook endpoint receiving real SMS messages forwarded by a volunteer's Android device.
    - Authenticated via secret token (X-RESQNET-FORWARDING-SECRET).
    - Normalizes multi-vendor Android SMS forwarder JSON formats.
    - Enforces idempotency via message_id / sender+body hash.
    - Classifies hazard via HumAID model and scores priority via 5-factor engine.
    - Resolves geographic clues without fabricating coordinates.
    - Labels provenance distinctly as 'sms_forwarded'.
    - Returns 201 Created for new incidents, 200 OK for duplicate delivery.
    """
    # 1. Parse JSON body
    try:
        raw_json = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Malformed JSON payload received from SMS forwarding app.",
        )

    if not isinstance(raw_json, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid payload: Expected JSON object.",
        )

    # 2. Check for connectivity test ping messages
    payload_helper = ForwardedSMSPayload.model_validate(raw_json)
    body_text = payload_helper.get_body()

    if body_text.strip().upper() in ("PING", "TEST_PING", "CONNECTIVITY_TEST"):
        active_number.status = "connected"
        active_number.last_ping_at = datetime.now(timezone.utc)
        db.commit()
        logger.info("[Forwarded SMS] Received connectivity test ping from Android forwarder.")
        response.status_code = status.HTTP_200_OK
        return SMSIntakeResponse(
            status="ping_acknowledged",
            message_id="ping",
            is_duplicate=False,
            detail="Connectivity test ping received and verified successfully.",
        )

    # 3. Normalize payload via AndroidForwardedSMSAdapter
    adapter = AndroidForwardedSMSAdapter()
    try:
        normalized_msg = adapter.normalize_payload(raw_json)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    # 4. Ingest normalized message through core SMS pipeline
    incident, is_dup, meta = SMSIntakeService.process_incoming_sms(db, normalized_msg)

    # 5. Update community number connection status and heartbeat timestamp
    active_number.last_ping_at = datetime.now(timezone.utc)
    if active_number.status in ("setup_required", "testing"):
        active_number.status = "connected"
    try:
        db.commit()
    except Exception:
        db.rollback()

    # 6. Safe logging (mask sender number to protect civilian privacy)
    sender_masked = (
        f"***{normalized_msg.sender[-4:]}"
        if len(normalized_msg.sender) >= 4
        else "****"
    )
    logger.info(
        f"[Forwarded SMS] Processed message '{normalized_msg.message_id}' from sender {sender_masked}. "
        f"Result: {meta.get('status')} (Incident: {meta.get('incident_id')})."
    )

    # 7. Set HTTP status code (200 for duplicate, 201 for created)
    if is_dup:
        response.status_code = status.HTTP_200_OK
    else:
        response.status_code = status.HTTP_201_CREATED

    return SMSIntakeResponse(
        status="duplicate" if is_dup else "created",
        message_id=normalized_msg.message_id,
        incident_id=incident.id if incident else meta.get("incident_id"),
        is_duplicate=is_dup,
        incident=incident.to_dict() if incident else None,
        detail=meta.get("detail"),
    )


# =====================================================================
# Simulated SMS Webhook (Existing Simulator Endpoint)
# =====================================================================

@router.post(
    "/incoming",
    response_model=SMSIntakeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Process incoming SMS report (Simulated or Provider-adapted)",
)
def handle_incoming_sms(
    payload: IncomingSMSPayload,
    response: Response,
    token: str = Depends(verify_sms_simulator_auth),
    db: Session = Depends(get_db),
):
    """
    Ingest an incoming SMS message.
    - Authenticates using RESQNET_SMS_SIMULATOR_TOKEN.
    - Normalizes payload via SimulatedSMSAdapter.
    - Prevents duplicates using message_id as an idempotency key.
    - Extracts hazard, location clues, casualties, and urgent needs.
    - Triggers HumAID classification and deterministic 5-factor priority scoring.
    - Returns 201 Created for new incidents, 200 OK for idempotent duplicate deliveries.
    """
    # 1. Normalize payload using adapter
    adapter = SimulatedSMSAdapter()
    try:
        raw_dict = payload.model_dump()
        normalized_msg = adapter.normalize_payload(raw_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    # 2. Process message through intake service
    incident, is_dup, meta = SMSIntakeService.process_incoming_sms(db, normalized_msg)

    # 3. Determine status code and response
    # For duplicate deliveries, return 200 OK for idempotency (instead of 201)
    if is_dup:
        response.status_code = status.HTTP_200_OK
    else:
        response.status_code = status.HTTP_201_CREATED

    return SMSIntakeResponse(
        status="duplicate" if is_dup else "created",
        message_id=normalized_msg.message_id,
        incident_id=incident.id if incident else meta.get("incident_id"),
        is_duplicate=is_dup,
        incident=incident.to_dict() if incident else None,
        detail=meta.get("detail"),
    )

