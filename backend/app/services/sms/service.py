"""
RESQNET AI — SMS Intake Service

Processes normalized SMS messages, enforces database-backed idempotency,
coordinates geographic resolution without inventing coordinates,
and delegates to the existing incident creation service and HumAID classifier.
"""

import json
import logging
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.app.models.incident import Incident
from backend.app.models.sms import InboundSMSMessage
from backend.app.schemas.incident import IncidentCreate
from backend.app.schemas.sms import NormalizedSMSMessage
from backend.app.services.incident_service import create_incident
from backend.app.services.geocoding_service import resolve_incident_coordinates
from backend.app.services.sms.parser import parse_sms_report

logger = logging.getLogger("RESQNET.SMSService")


class SMSIntakeService:
    """
    Core intake service for normalized SMS messages.
    """

    @staticmethod
    def process_incoming_sms(
        db: Session,
        message: NormalizedSMSMessage,
    ) -> Tuple[Optional[Incident], bool, Dict[str, Any]]:
        """
        Process an incoming SMS message.
        Returns:
            (incident, is_duplicate, metadata_dict)
        """
        # 1. Idempotency Check: Prevent duplicate incidents
        existing_log = (
            db.query(InboundSMSMessage)
            .filter(InboundSMSMessage.id == message.message_id)
            .first()
        )
        if existing_log:
            logger.info(
                f"[SMS Intake] Duplicate message_id '{message.message_id}' detected. "
                f"Returning existing incident '{existing_log.incident_id}'."
            )
            incident = None
            if existing_log.incident_id:
                incident = (
                    db.query(Incident)
                    .filter(Incident.id == existing_log.incident_id)
                    .first()
                )
            return (
                incident,
                True,
                {
                    "message_id": message.message_id,
                    "incident_id": existing_log.incident_id,
                    "status": "duplicate",
                    "detail": "Duplicate message ID received. Previously processed incident returned.",
                },
            )

        # 2. Extract structured fields from message body (supporting pipe and free-text)
        parsed = parse_sms_report(message.body)

        # 3. Resolve Geographic Coordinates safely (Never invent fake coordinates!)
        resolved_coords, is_synth, loc_source = resolve_incident_coordinates(
            supplied_coords=None,
            location_name=parsed["locationName"],
            sector=None,
            explicit_synthetic_flag=False,
        )

        # 4. Formulate source provenance details
        if message.provider == "android_forwarder":
            rep_source = "sms_forwarded"
            source_summary = (
                f"SMS (Android Forwarded) [Ref: {message.message_id}] - Sender: {message.sender}"
            )
            signal_synthesis = (
                f"Community emergency SMS forwarded via volunteer Android gateway from {message.sender}. "
                f"Automated HumAID classification and 5-factor priority scoring applied."
            )
            why_prioritised = f"Forwarded SMS intake: {parsed['title']}. Requires coordinator ground verification."
        else:
            rep_source = "sms_simulated"
            source_summary = (
                f"SMS (Simulated) [Ref: {message.message_id}] - Sender: {message.sender}"
            )
            signal_synthesis = (
                f"Simulated SMS report via {message.provider} from {message.sender}. "
                f"Automated HumAID classification and 5-factor priority scoring applied."
            )
            why_prioritised = f"Simulated SMS intake: {parsed['title']}. Requires coordinator ground verification."

        # 5. Build standard IncidentCreate payload
        incident_in = IncidentCreate(
            title=parsed["title"],
            type=parsed["type"],
            sector=parsed.get("sector") or "Sector Unspecified",
            locationName=parsed["locationName"],
            coordinates=resolved_coords,
            is_synthetic_location=is_synth,
            location_source=loc_source,
            severity=parsed["severity"],
            reportReliability=65,  # Unverified SMS civilian intake baseline
            peopleAffected=parsed["peopleAffected"],
            affectedCountNumeric=parsed["affectedCountNumeric"],
            report_source=rep_source,
            source_reference=message.message_id,
            sourceSummary=source_summary,
            signalSynthesis=signal_synthesis,
            whyPrioritised=why_prioritised,
            riskFactors=parsed["riskFactors"],
            report_text=message.body,
            rawReportText=message.body,
            raw_report_text=message.body,
            run_nlp_classification=True,
        )


        # 6. Delegate to existing Incident Creation Service
        # Reuses HumAID inference, deterministic 5-factor scoring, and unverified status.
        incident = create_incident(db, incident_in)

        # 7. Record Inbound SMS log for idempotency and auditability
        sms_log = InboundSMSMessage(
            id=message.message_id,
            sender=message.sender,
            body=message.body,
            provider=message.provider,
            received_at=message.received_at,
            status="processed",
            incident_id=incident.id,
            raw_payload_json=json.dumps(message.raw_metadata or {}),
        )
        db.add(sms_log)

        try:
            db.commit()
            db.refresh(incident)
        except IntegrityError:
            # Handle concurrent race condition for identical message_id
            db.rollback()
            existing_log = (
                db.query(InboundSMSMessage)
                .filter(InboundSMSMessage.id == message.message_id)
                .first()
            )
            incident = None
            if existing_log and existing_log.incident_id:
                incident = (
                    db.query(Incident)
                    .filter(Incident.id == existing_log.incident_id)
                    .first()
                )
            return (
                incident,
                True,
                {
                    "message_id": message.message_id,
                    "incident_id": existing_log.incident_id if existing_log else None,
                    "status": "duplicate",
                    "detail": "Duplicate message ID detected during concurrent insertion.",
                },
            )

        logger.info(
            f"[SMS Intake] New incident '{incident.id}' created from SMS '{message.message_id}'."
        )

        return (
            incident,
            False,
            {
                "message_id": message.message_id,
                "incident_id": incident.id,
                "status": "created",
                "detail": "SMS incident created successfully.",
            },
        )
