"""
RESQNET AI — Environmental Data Source Adapters
"""

from backend.app.services.adapters.base_adapter import BaseEnvironmentalAdapter
from backend.app.services.adapters.nwdp_cwc_adapter import NwdpCwcAdapter
from backend.app.services.adapters.imd_adapter import ImdAdapter
from backend.app.services.adapters.open_meteo_adapter import OpenMeteoAdapter

__all__ = [
    "BaseEnvironmentalAdapter",
    "NwdpCwcAdapter",
    "ImdAdapter",
    "OpenMeteoAdapter",
]
