"""
RESQNET AI — Provider-Independent SMS Adapters

Defines the abstract BaseSMSAdapter interface and the SimulatedSMSAdapter.
Allows future plug-in of real carrier/provider webhooks (Twilio, Sinch, AWS SNS)
without modifying core incident intake logic.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from backend.app.schemas.sms import NormalizedSMSMessage


class BaseSMSAdapter(ABC):
    """
    Abstract adapter for SMS providers.
    Normalizes provider-specific payloads into a standardized NormalizedSMSMessage.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. simulated, twilio, sinch)."""
        pass

    @abstractmethod
    def normalize_payload(
        self,
        raw_payload: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
    ) -> NormalizedSMSMessage:
        """
        Extract and normalize message_id, sender, body, and received_at
        from provider-specific raw payload and headers.
        """
        pass


class SimulatedSMSAdapter(BaseSMSAdapter):
    """
    Simulated SMS provider adapter for local development, testing, and automated drills.
    """

    @property
    def provider_name(self) -> str:
        return "simulated"

    def normalize_payload(
        self,
        raw_payload: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
    ) -> NormalizedSMSMessage:
        """
        Normalize simulated incoming payload.
        Accepts standard keys: message_id, sender, body, received_at, provider.
        Also supports common aliases (e.g. text/Body, from/From, id/MessageSid).
        """
        if not isinstance(raw_payload, dict):
            raise ValueError("Invalid payload: expected a JSON object.")

        msg_id = (
            raw_payload.get("message_id")
            or raw_payload.get("id")
            or raw_payload.get("MessageSid")
            or ""
        )
        if not isinstance(msg_id, str) or not msg_id.strip():
            raise ValueError("Missing or invalid 'message_id' in SMS payload.")

        sender = (
            raw_payload.get("sender")
            or raw_payload.get("from")
            or raw_payload.get("From")
            or ""
        )
        if not isinstance(sender, str) or not sender.strip():
            raise ValueError("Missing or invalid 'sender' in SMS payload.")

        body = (
            raw_payload.get("body")
            or raw_payload.get("text")
            or raw_payload.get("Body")
            or ""
        )
        if not isinstance(body, str) or not body.strip():
            raise ValueError("Missing or empty 'body' in SMS payload.")

        received_at_val = raw_payload.get("received_at")
        if isinstance(received_at_val, datetime):
            received_at = received_at_val
        elif isinstance(received_at_val, str) and received_at_val.strip():
            try:
                received_at = datetime.fromisoformat(received_at_val.replace("Z", "+00:00"))
            except Exception:
                received_at = datetime.now(timezone.utc)
        else:
            received_at = datetime.now(timezone.utc)

        provider = (raw_payload.get("provider") or self.provider_name).strip()

        return NormalizedSMSMessage(
            message_id=msg_id.strip(),
            sender=sender.strip(),
            body=body.strip(),
            received_at=received_at,
            provider=provider,
            raw_metadata=raw_payload,
        )


class AndroidForwardedSMSAdapter(BaseSMSAdapter):
    """
    Adapter for real SMS messages forwarded by an Android SMS-forwarding app
    running on a community volunteer's device.
    
    Accepts standard JSON POST webhooks and normalizes provider-independent fields.
    Preserves original sender and enforces deduplication / idempotency.
    """

    @property
    def provider_name(self) -> str:
        return "android_forwarder"

    def normalize_payload(
        self,
        raw_payload: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
    ) -> NormalizedSMSMessage:
        if not isinstance(raw_payload, dict):
            raise ValueError("Invalid payload: expected a JSON object.")

        # Extract sender (from, sender, phone, from_number)
        sender = (
            raw_payload.get("sender")
            or raw_payload.get("from")
            or raw_payload.get("From")
            or raw_payload.get("phone")
            or raw_payload.get("from_number")
            or ""
        )
        if not isinstance(sender, str) or not sender.strip():
            raise ValueError("Missing or invalid 'sender' or 'from' in forwarded SMS payload.")

        # Extract message body
        body = (
            raw_payload.get("body")
            or raw_payload.get("text")
            or raw_payload.get("message")
            or raw_payload.get("content")
            or raw_payload.get("Body")
            or ""
        )
        if not isinstance(body, str) or not body.strip():
            raise ValueError("Missing or empty message body in forwarded SMS payload.")

        # Extract or generate idempotency message identifier
        msg_id = (
            raw_payload.get("message_id")
            or raw_payload.get("id")
            or raw_payload.get("sms_id")
            or ""
        )
        if isinstance(msg_id, (int, float)):
            msg_id = str(msg_id)
        if not isinstance(msg_id, str) or not msg_id.strip():
            # If the forwarding app did not provide an explicit message ID,
            # use a deterministic hash based on sender + timestamp or body to prevent replay
            import hashlib
            ts_key = str(raw_payload.get("timestamp") or "")
            hash_input = f"{sender.strip()}:{ts_key}:{body.strip()}"
            msg_id = f"fwd-{hashlib.sha256(hash_input.encode('utf-8')).hexdigest()[:20]}"

        # Extract receipt timestamp
        received_at_val = raw_payload.get("received_at") or raw_payload.get("timestamp")
        if isinstance(received_at_val, datetime):
            received_at = received_at_val
        elif isinstance(received_at_val, (int, float)):
            # Epoch milliseconds or seconds
            try:
                if received_at_val > 1e11:  # Milliseconds
                    received_at = datetime.fromtimestamp(received_at_val / 1000.0, timezone.utc)
                else:
                    received_at = datetime.fromtimestamp(received_at_val, timezone.utc)
            except Exception:
                received_at = datetime.now(timezone.utc)
        elif isinstance(received_at_val, str) and received_at_val.strip():
            try:
                # Handle numeric string timestamp
                if received_at_val.strip().isdigit():
                    num_val = float(received_at_val.strip())
                    if num_val > 1e11:
                        received_at = datetime.fromtimestamp(num_val / 1000.0, timezone.utc)
                    else:
                        received_at = datetime.fromtimestamp(num_val, timezone.utc)
                else:
                    received_at = datetime.fromisoformat(received_at_val.replace("Z", "+00:00"))
            except Exception:
                received_at = datetime.now(timezone.utc)
        else:
            received_at = datetime.now(timezone.utc)

        return NormalizedSMSMessage(
            message_id=msg_id.strip(),
            sender=sender.strip(),
            body=body.strip(),
            received_at=received_at,
            provider=self.provider_name,
            raw_metadata=raw_payload,
        )

