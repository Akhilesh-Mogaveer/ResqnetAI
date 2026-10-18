"""
RESQNET AI — Base Environmental Adapter

Defines the abstract interface, validation, deduplication, and retry logic for
all environmental and hydrological data adapters.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
import httpx

from backend.app.schemas.india_environmental import (
    NormalizedEnvironmentalRecord,
    SourceStatusItem,
)

logger = logging.getLogger("RESQNET.EnvironmentalAdapters")


class BaseEnvironmentalAdapter(ABC):
    """
    Abstract base class for all meteorological and hydrological data adapters.
    Ensures strict adherence to source attribution, coordinate validation,
    missing-value handling, and explicit provenance tagging.
    """

    def __init__(self, source_id: str, name: str, timeout_seconds: float = 10.0):
        self.source_id = source_id
        self.name = name
        self.timeout_seconds = timeout_seconds

    @abstractmethod
    async def fetch_records(
        self,
        client: httpx.AsyncClient,
        limit: int = 50,
        state: Optional[str] = None,
        basin: Optional[str] = None,
    ) -> List[NormalizedEnvironmentalRecord]:
        """Fetch and normalize records from upstream official provider."""
        pass

    @abstractmethod
    async def get_status(self, client: httpx.AsyncClient) -> SourceStatusItem:
        """Verify upstream access and return current operational status."""
        pass

    @staticmethod
    def now_utc_iso() -> str:
        """Current ISO 8601 UTC timestamp."""
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def sanitize_coordinate(val: Any) -> Optional[float]:
        """
        Validate latitude / longitude values.
        Returns float if valid number, None otherwise. Never invents fake coordinates.
        """
        if val is None or val == "" or str(val).strip() in ("-", "NA", "null", "None"):
            return None
        try:
            f = float(val)
            if -180.0 <= f <= 180.0:
                return round(f, 6)
        except (ValueError, TypeError):
            pass
        return None

    @staticmethod
    def sanitize_float(val: Any) -> Optional[float]:
        """
        Parse float measurement value.
        Handles negative or sentinel values (-999, -9999, etc.) by converting them to None.
        """
        if val is None or val == "" or str(val).strip() in ("-", "NA", "null", "None", "-999", "-9999"):
            return None
        try:
            f = float(val)
            if f in (-999.0, -9999.0):
                return None
            return f
        except (ValueError, TypeError):
            return None

    @staticmethod
    def deduplicate_records(records: List[NormalizedEnvironmentalRecord]) -> List[NormalizedEnvironmentalRecord]:
        """
        Deduplicate records based on (source, station_id/station_name, measurement_type, observation_timestamp).
        Preserves original ordering.
        """
        seen: Set[Tuple[str, str, str, str]] = set()
        unique: List[NormalizedEnvironmentalRecord] = []

        for rec in records:
            key = (
                rec.source,
                str(rec.station_id or rec.station_name or ""),
                rec.measurement_type,
                str(rec.observation_timestamp or ""),
            )
            if key not in seen:
                seen.add(key)
                unique.append(rec)

        return unique

    @classmethod
    def resolve_freshness_and_classification(
        cls,
        obs_time_str: Optional[str],
        default_classification: str = "observation",
        is_simulated: bool = False,
        is_model: bool = False,
    ) -> Tuple[str, str]:
        """
        Determines (classification, freshness_status) dynamically based on the actual observation timestamp.

        Freshness thresholds (relative to current UTC time):
          - < 6 hours: 'fresh'
          - 6 to 24 hours: 'stale'
          - > 24 hours: 'historical_archive' (classification forced to 'historical')
          - missing or unparseable: 'unavailable' (classification forced to 'historical' unless model)

        Guarantees historical records from 2025 cannot appear as live or fresh in October 2026.
        """
        if is_simulated:
            return "model_estimate", "unavailable"

        if is_model:
            cls_name = "forecast" if default_classification == "forecast" else "model_estimate"
            return cls_name, "fresh"

        if not obs_time_str or str(obs_time_str).strip() in ("", "-", "NA", "null", "None"):
            return "historical", "unavailable"

        clean_str = str(obs_time_str).strip()
        parsed_dt: Optional[datetime] = None

        formats = [
            "%d-%m-%Y %H:%M",
            "%d-%m-%Y %H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M",
            "%d/%m/%Y %H:%M",
            "%d/%m/%Y %H:%M:%S",
            "%d-%m-%Y",
            "%Y-%m-%d",
        ]

        for fmt in formats:
            try:
                parsed_dt = datetime.strptime(clean_str, fmt)
                break
            except ValueError:
                continue

        if not parsed_dt:
            return "historical", "unavailable"

        # Indian telemetry records timestamps in Indian Standard Time (IST, UTC+05:30)
        from datetime import timedelta
        if parsed_dt.tzinfo is None:
            ist_tz = timezone(timedelta(hours=5, minutes=30))
            parsed_dt = parsed_dt.replace(tzinfo=ist_tz)

        now_utc = datetime.now(timezone.utc)
        diff_seconds = (now_utc - parsed_dt.astimezone(timezone.utc)).total_seconds()

        # Older than 24 hours (e.g. 2025 records viewed in October 2026)
        if diff_seconds > 24 * 3600:
            return "historical", "historical_archive"
        elif diff_seconds >= 6 * 3600:
            return default_classification, "stale"
        elif diff_seconds >= 0:
            return default_classification, "fresh"
        else:
            # Future timestamp
            if default_classification == "forecast":
                return "forecast", "fresh"
            return "historical", "unavailable"

