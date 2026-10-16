"""
Database initialization and initial dataset seeding
"""

import logging
from sqlalchemy.orm import Session
from backend.app.database.session import Base, engine
from backend.app.models.incident import Incident, AuditLog, AttentionZone

logger = logging.getLogger("RESQNET.Database")

# Initial seed data directly matching the dashboard baseline
SEED_INCIDENTS = [
    {
        "id": "RQN-0427",
        "title": "Structural collapse reported",
        "type": "Structural Collapse",
        "sector": "East Harbor District",
        "locationName": "Pier 14 Logistics Complex",
        "coordinates": [37.7845, -122.3965],
        "severity": "critical",
        "priorityScore": 94,
        "reportReliability": 88,
        "locationConfidence": 92,
        "peopleAffected": "12 - 20 trapped / at risk",
        "affectedCountNumeric": 20,
        "timeAgo": "18 min ago",
        "timestamp": "2026-10-15T20:29:00Z",
        "verificationStatus": "unverified",
        "responseStatus": "triage",
        "assignedTeam": None,
        "sourceSummary": "CivicWatch Sensor #42 + 2 911 caller transcripts",
        "signalSynthesis": "Triangulated audio shockwave detection corroborated with emergency distress calls from security personnel. Optical traffic camera feed obscured by debris dust.",
        "whyPrioritised": "High potential immediate harm to human life, multiple corroborating reports, and proximity to occupied shift warehouse.",
        "riskFactors": [
            "Secondary structural settling detected",
            "Proximity to high-voltage industrial line",
            "Night shift crew sign-in logs unverified"
        ],
        "notes": [
            {"id": "n1", "author": "Dispatch Lead (Simulated)", "time": "12 min ago", "text": "Heavy rescue unit Task Force 1 placed on standby alert."}
        ],
        "report_text": "Building partially collapsed at Pier 14 warehouse after heavy tremor. Multiple workers trapped under structural beams.",
        "original_report_text": "Building partially collapsed at Pier 14 warehouse after heavy tremor. Multiple workers trapped under structural beams.",
        "humaid_category": "infrastructure_and_utility_damage",
        "humaid_confidence": 0.9412,
        "nlp_status": "SUCCESS",
    },
    {
        "id": "RQN-0428",
        "title": "Flash flooding at underpass",
        "type": "Flash Flood",
        "sector": "Northgate Expressway",
        "locationName": "Bayview Underpass (Mile 4.2)",
        "coordinates": [37.7985, -122.4120],
        "severity": "critical",
        "priorityScore": 86,
        "reportReliability": 76,
        "locationConfidence": 89,
        "peopleAffected": "6 - 10 vehicles submerged",
        "affectedCountNumeric": 10,
        "timeAgo": "24 min ago",
        "timestamp": "2026-10-15T20:23:00Z",
        "verificationStatus": "verified",
        "responseStatus": "dispatched",
        "assignedTeam": "Water Rescue Unit 3",
        "sourceSummary": "Municipal Flood Sensor WL-09 + Highway Patrol stream",
        "signalSynthesis": "Water level rose 1.4m in 18 minutes. Traffic telematics indicate 4 stationary commuter passenger vehicles trapped under bridge arch.",
        "whyPrioritised": "Rapidly rising water level with trapped civilian vehicles unable to reverse due to gridlock.",
        "riskFactors": [
            "Storm surge drainage valve blockage",
            "Nighttime zero-visibility water hazard"
        ],
        "notes": [
            {"id": "n2", "author": "Coordinator Jordan Davis", "time": "16 min ago", "text": "Dispatched Water Rescue 3. Requested highway patrol barrier closure at exit 12."}
        ],
        "report_text": "Flash flooding at Bayview Underpass. Water level rising fast, multiple vehicles submerged and drivers standing on roofs.",
        "original_report_text": "Flash flooding at Bayview Underpass. Water level rising fast, multiple vehicles submerged and drivers standing on roofs.",
        "humaid_category": "rescue_volunteering_or_donation_effort",
        "humaid_confidence": 0.8934,
        "nlp_status": "SUCCESS",
    },
    {
        "id": "RQN-0424",
        "title": "Hospital backup generator failure",
        "type": "Critical Infrastructure",
        "sector": "West Market Square",
        "locationName": "St. Jude Community Clinic",
        "coordinates": [37.7715, -122.4285],
        "severity": "critical",
        "priorityScore": 91,
        "reportReliability": 94,
        "locationConfidence": 98,
        "peopleAffected": "42 ICU & dialysis patients",
        "affectedCountNumeric": 42,
        "timeAgo": "31 min ago",
        "timestamp": "2026-10-15T20:16:00Z",
        "verificationStatus": "verified",
        "responseStatus": "on_scene",
        "assignedTeam": "Grid Engineering Squad B",
        "sourceSummary": "SCADA telemetry alarm + Facility Chief Engineer direct call",
        "signalSynthesis": "Phase 3 secondary diesel generator failed to crank after primary substation brownout. Critical UPS reserve batteries at 38% capacity.",
        "whyPrioritised": "Imminent life-support power outage affecting neonatal and critical pulmonary ventilation equipment.",
        "riskFactors": [
            "Flooded subterranean fuel reservoir access",
            "Narrow alleyway access blocked by debris"
        ],
        "notes": [
            {"id": "n3", "author": "Ops Commander", "time": "20 min ago", "text": "Mobile 250kW generator truck arrived on scene. Connecting bypass feeder cable."}
        ],
        "report_text": "Generator failure at St. Jude Clinic. Backup batteries running low, critical life support systems at risk.",
        "original_report_text": "Generator failure at St. Jude Clinic. Backup batteries running low, critical life support systems at risk.",
        "humaid_category": "infrastructure_and_utility_damage",
        "humaid_confidence": 0.9652,
        "nlp_status": "SUCCESS",
    },
    {
        "id": "RQN-0426",
        "title": "Medical assistance requested",
        "type": "Mass Casualty / Medical",
        "sector": "West Market Square",
        "locationName": "Transit Hub Metro Concourse",
        "coordinates": [37.7650, -122.4210],
        "severity": "high",
        "priorityScore": 78,
        "reportReliability": 91,
        "locationConfidence": 95,
        "peopleAffected": "8 injured civilians",
        "affectedCountNumeric": 8,
        "timeAgo": "40 min ago",
        "timestamp": "2026-10-15T20:07:00Z",
        "verificationStatus": "verified",
        "responseStatus": "dispatched",
        "assignedTeam": "Paramedic Squad 12 & 14",
        "sourceSummary": "Transit Security Dispatch + Automated AED activation",
        "signalSynthesis": "Crowd stampede after partial ceiling tile fall; 2 severe fractures and 6 lacerations reported by station master.",
        "whyPrioritised": "Dense transit concourse with multiple civilian casualties requiring rapid triage before secondary crush hazard.",
        "riskFactors": [
            "Escalator shutdown creating egress bottleneck",
            "Power flickering in lower mezzanine"
        ],
        "notes": [
            {"id": "n4", "author": "Medic Lead Ross", "time": "25 min ago", "text": "Triage station established at West Entrance plaza."}
        ],
        "report_text": "Ceiling collapse at Metro transit concourse caused stampede. Multiple people injured with bleeding and bone fractures.",
        "original_report_text": "Ceiling collapse at Metro transit concourse caused stampede. Multiple people injured with bleeding and bone fractures.",
        "humaid_category": "injured_or_dead_people",
        "humaid_confidence": 0.9781,
        "nlp_status": "SUCCESS",
    },
    {
        "id": "RQN-0421",
        "title": "Power outage & downed high-voltage line",
        "type": "Hazardous Condition",
        "sector": "South Ridge Estate",
        "locationName": "Oakcrest Ave & Ridge View Path",
        "coordinates": [37.7510, -122.4040],
        "severity": "moderate",
        "priorityScore": 64,
        "reportReliability": 67,
        "locationConfidence": 82,
        "peopleAffected": "180 residential households",
        "affectedCountNumeric": 180,
        "timeAgo": "1 hr ago",
        "timestamp": "2026-10-15T19:47:00Z",
        "verificationStatus": "under_review",
        "responseStatus": "triage",
        "assignedTeam": None,
        "sourceSummary": "Smart Meter telemetry drops + 1 citizen tweet",
        "signalSynthesis": "Grid feeder circuit 14B tripped. Arcing line reported lying across wet asphalt near school playground.",
        "whyPrioritised": "Live electrical arc hazard near public pathway; potential secondary fire ignition if storm winds pick up.",
        "riskFactors": [
            "Dense tree canopy prevents aerial drone confirmation",
            "Severe signal dropoff in South Ridge valley"
        ],
        "notes": [],
        "report_text": "High voltage power line down across Oakcrest Ave, sparks flying near the school playground.",
        "original_report_text": "High voltage power line down across Oakcrest Ave, sparks flying near the school playground.",
        "humaid_category": "infrastructure_and_utility_damage",
        "humaid_confidence": 0.9105,
        "nlp_status": "SUCCESS",
    },
    {
        "id": "RQN-0419",
        "title": "Gas leak near elementary school",
        "type": "Hazmat / Gas",
        "sector": "Old Rail Corridor",
        "locationName": "Corridor Line St & Pine",
        "coordinates": [37.7890, -122.3850],
        "severity": "high",
        "priorityScore": 82,
        "reportReliability": 84,
        "locationConfidence": 90,
        "peopleAffected": "Adjacent 3-story apartment block",
        "affectedCountNumeric": 35,
        "timeAgo": "1 hr 15 min ago",
        "timestamp": "2026-10-15T19:32:00Z",
        "verificationStatus": "unverified",
        "responseStatus": "unassigned",
        "assignedTeam": None,
        "sourceSummary": "Municipal odor detection sensor + 2 community reports",
        "signalSynthesis": "Methane sensor readout spike (480 ppm above baseline). Ground vibration from nearby rail maintenance reported preceding smell.",
        "whyPrioritised": "Explosive vapor accumulation in enclosed basement vaults.",
        "riskFactors": [
            "Underground drainage interconnection",
            "Unoccupied school building security perimeter locked"
        ],
        "notes": [],
        "report_text": "Strong smell of natural gas detected near Corridor Line St and Pine. High explosion risk.",
        "original_report_text": "Strong smell of natural gas detected near Corridor Line St and Pine. High explosion risk.",
        "humaid_category": "caution_and_advice",
        "humaid_confidence": 0.8842,
        "nlp_status": "SUCCESS",
    },
    {
        "id": "RQN-0415",
        "title": "Landslide blocking evacuation route",
        "type": "Road Blockage",
        "sector": "South Ridge Estate",
        "locationName": "Crestview Mountain Pass",
        "coordinates": [37.7420, -122.4180],
        "severity": "high",
        "priorityScore": 75,
        "reportReliability": 71,
        "locationConfidence": 85,
        "peopleAffected": "Estimated 60 vehicles turned back",
        "affectedCountNumeric": 60,
        "timeAgo": "1 hr 45 min ago",
        "timestamp": "2026-10-15T19:02:00Z",
        "verificationStatus": "verified",
        "responseStatus": "dispatched",
        "assignedTeam": "Heavy Civil Works Dozer Team",
        "sourceSummary": "Traffic camera AI motion freeze + County Sheriff radio",
        "signalSynthesis": "Mud and boulder runoff covering both northbound lanes. Evacuation corridor 3 cut off.",
        "whyPrioritised": "Blocks primary escape arterial for southern hillside neighborhoods.",
        "riskFactors": [
            "Active slope movement during continued rain",
            "Cell tower signal degraded in pass"
        ],
        "notes": [],
        "report_text": "Landslide on Crestview Mountain Pass. Both lanes blocked by mud and fallen trees, evacuation traffic stopped.",
        "original_report_text": "Landslide on Crestview Mountain Pass. Both lanes blocked by mud and fallen trees, evacuation traffic stopped.",
        "humaid_category": "infrastructure_and_utility_damage",
        "humaid_confidence": 0.9520,
        "nlp_status": "SUCCESS",
    },
    {
        "id": "RQN-0412",
        "title": "Elderly care facility water pump outage",
        "type": "Vulnerable Population Need",
        "sector": "Lower Marina Basin",
        "locationName": "Sunset Haven Assisted Living",
        "coordinates": [37.7680, -122.4450],
        "severity": "moderate",
        "priorityScore": 59,
        "reportReliability": 89,
        "locationConfidence": 96,
        "peopleAffected": "64 resident seniors",
        "affectedCountNumeric": 64,
        "timeAgo": "2 hr ago",
        "timestamp": "2026-10-15T18:47:00Z",
        "verificationStatus": "verified",
        "responseStatus": "resolved",
        "assignedTeam": "Civil Logistics Support 4",
        "sourceSummary": "Facility Director Hotline call verified by visiting nurse",
        "signalSynthesis": "Basement potable water booster pump failure due to low line pressure.",
        "whyPrioritised": "Non-ambulatory senior residents requiring continuous water supply for medical sanitization.",
        "riskFactors": ["Stairwell-only access to upper floors"],
        "notes": [
            {"id": "n5", "author": "Logistics Officer", "time": "45 min ago", "text": "Delivered 200 gallons of bottled emergency drinking water and portable booster unit."}
        ],
        "report_text": "Water booster pump failed at Sunset Haven Assisted Living. 64 elderly residents urgently need drinking water and sanitization supplies.",
        "original_report_text": "Water booster pump failed at Sunset Haven Assisted Living. 64 elderly residents urgently need drinking water and sanitization supplies.",
        "humaid_category": "requests_or_urgent_needs",
        "humaid_confidence": 0.9734,
        "nlp_status": "SUCCESS",
    }
]

SEED_ZONES = [
    {
        "id": "ZONE-SR-01",
        "name": "South Ridge Estate",
        "signalDeviation": "-42%",
        "signalCount": "2 weak signals",
        "confidence": "Low confidence",
        "riskCategory": "Severe Underreporting",
        "populationAtRisk": "~4,800 residents",
        "estimatedBarriers": "Cell tower power outage & terrain shadow",
        "lastReportTime": "58m ago",
        "coordinates": [37.7480, -122.4080],
        "scoutStatus": "Unassigned",
        "notes": "Historically dense elderly demographic. Weak telemetry likely conceals extensive power & utility failures."
    },
    {
        "id": "ZONE-OR-02",
        "name": "Old Rail Corridor",
        "signalDeviation": "-33%",
        "signalCount": "2 weak signals",
        "confidence": "Low confidence",
        "riskCategory": "Signal Void",
        "populationAtRisk": "~2,100 residents",
        "estimatedBarriers": "Fiber trunk severance along freight right-of-way",
        "lastReportTime": "1h 12m ago",
        "coordinates": [37.7850, -122.3820],
        "scoutStatus": "Drone Recon Scheduled",
        "notes": "Industrial and unhoused settlement corridor. High flood vulnerability."
    },
    {
        "id": "ZONE-WM-03",
        "name": "West Market Square",
        "signalDeviation": "+18%",
        "signalCount": "6 weak signals",
        "confidence": "Medium confidence",
        "riskCategory": "Conflicted Multi-Source",
        "populationAtRisk": "~11,500 residents / commuters",
        "estimatedBarriers": "High noise-to-signal ratio from social media pings",
        "lastReportTime": "4m ago",
        "coordinates": [37.7690, -122.4240],
        "scoutStatus": "Field Unit Cross-Checking",
        "notes": "Multiple conflicting casualty estimates from transit station."
    },
    {
        "id": "ZONE-LM-04",
        "name": "Lower Marina Basin",
        "signalDeviation": "-27%",
        "signalCount": "3 weak signals",
        "confidence": "Low confidence",
        "riskCategory": "Drainage Vulnerability",
        "populationAtRisk": "~3,400 residents",
        "estimatedBarriers": "Localized power outage and phone line drops",
        "lastReportTime": "1h 35m ago",
        "coordinates": [37.7650, -122.4490],
        "scoutStatus": "Unassigned",
        "notes": "Low-elevation coastal zone prone to high-tide backup."
    }
]

SEED_AUDIT_LOGS = [
    {
        "id": "aud-001",
        "timestamp": "2026-10-15T20:25:00Z",
        "incidentId": "RQN-0428",
        "operator": "Jordan Davis (Coordinator)",
        "actionType": "RESPONSE_STATUS_CHANGE",
        "oldValue": "Triage",
        "newValue": "Dispatched (Water Rescue Unit 3)",
        "reason": "Water levels exceeded 1.2m threshold; telemetry verified trapped motorists."
    },
    {
        "id": "aud-002",
        "timestamp": "2026-10-15T20:18:00Z",
        "incidentId": "RQN-0424",
        "operator": "Jordan Davis (Coordinator)",
        "actionType": "VERIFICATION_STATUS_CHANGE",
        "oldValue": "Under Review",
        "newValue": "Verified",
        "reason": "Cross-checked with St. Jude Facilities Command direct telephone line."
    },
    {
        "id": "aud-003",
        "timestamp": "2026-10-15T20:02:00Z",
        "incidentId": "RQN-0427",
        "operator": "System Automated Triage",
        "actionType": "PRIORITY_SCORE_CALCULATED",
        "oldValue": "0",
        "newValue": "94",
        "reason": "Initial multi-source algorithmic triage: Collapse hazard + multiple calls."
    },
    {
        "id": "aud-004",
        "timestamp": "2026-10-15T19:40:00Z",
        "incidentId": "RQN-0412",
        "operator": "Logistics Officer M. Chang",
        "actionType": "RESPONSE_STATUS_CHANGE",
        "oldValue": "Dispatched",
        "newValue": "Resolved",
        "reason": "Water delivery complete and backup pump operational."
    }
]


def init_db(db: Session) -> None:
    """Create tables and seed initial records if empty."""
    Base.metadata.create_all(bind=engine)

    # Verify and add new columns to existing SQLite database if needed
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            existing_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(incidents);"))]
            if existing_cols:
                if "is_duplicate" not in existing_cols:
                    conn.execute(text("ALTER TABLE incidents ADD COLUMN is_duplicate BOOLEAN DEFAULT 0;"))
                if "duplicate_of_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE incidents ADD COLUMN duplicate_of_id VARCHAR(64);"))
                if "duplicate_count" not in existing_cols:
                    conn.execute(text("ALTER TABLE incidents ADD COLUMN duplicate_count INTEGER DEFAULT 0;"))
                if "dismissed_duplicates_json" not in existing_cols:
                    conn.execute(text("ALTER TABLE incidents ADD COLUMN dismissed_duplicates_json TEXT DEFAULT '[]';"))
                conn.commit()
    except Exception as e:
        logger.warning(f"Column check or migration notice: {e}")

    # 1. Seed incidents
    if db.query(Incident).count() == 0:
        logger.info("Seeding initial emergency incidents into SQLite database...")
        for item in SEED_INCIDENTS:
            coords = item.get("coordinates", [37.7749, -122.4194])
            risk_factors = item.get("riskFactors", [])
            notes = item.get("notes", [])
            
            incident = Incident(
                id=item["id"],
                title=item["title"],
                type=item["type"],
                sector=item["sector"],
                locationName=item["locationName"],
                severity=item["severity"],
                priorityScore=item["priorityScore"],
                reportReliability=item.get("reportReliability", 75),
                locationConfidence=item.get("locationConfidence", 80),
                peopleAffected=item.get("peopleAffected", "Unknown"),
                affectedCountNumeric=item.get("affectedCountNumeric", 0),
                timeAgo=item.get("timeAgo", "Recently"),
                timestamp=item.get("timestamp", "2026-10-15T20:00:00Z"),
                verificationStatus=item.get("verificationStatus", "unverified"),
                responseStatus=item.get("responseStatus", "triage"),
                assignedTeam=item.get("assignedTeam"),
                sourceSummary=item.get("sourceSummary", ""),
                signalSynthesis=item.get("signalSynthesis", ""),
                whyPrioritised=item.get("whyPrioritised", ""),
                report_text=item.get("report_text"),
                original_report_text=item.get("original_report_text"),
                humaid_category=item.get("humaid_category"),
                humaid_confidence=item.get("humaid_confidence"),
                nlp_status=item.get("nlp_status", "SUCCESS"),
                nlp_disclaimer="RESQNET AI Automated NLP Prediction. Not a verified emergency report.",
            )
            incident.coordinates = coords
            incident.riskFactors = risk_factors
            incident.notes = notes
            db.add(incident)
        db.commit()

    # 2. Seed Attention Zones
    if db.query(AttentionZone).count() == 0:
        logger.info("Seeding attention needed zones...")
        for z in SEED_ZONES:
            zone = AttentionZone(
                id=z["id"],
                name=z["name"],
                signalDeviation=z["signalDeviation"],
                signalCount=z["signalCount"],
                confidence=z["confidence"],
                riskCategory=z["riskCategory"],
                populationAtRisk=z["populationAtRisk"],
                estimatedBarriers=z["estimatedBarriers"],
                lastReportTime=z["lastReportTime"],
                scoutStatus=z["scoutStatus"],
                notes=z["notes"],
            )
            zone.coordinates = z["coordinates"]
            db.add(zone)
        db.commit()

    # 3. Seed Audit Logs
    if db.query(AuditLog).count() == 0:
        logger.info("Seeding initial coordinator audit logs...")
        for a in SEED_AUDIT_LOGS:
            log_entry = AuditLog(
                id=a["id"],
                timestamp=a["timestamp"],
                incidentId=a["incidentId"],
                operator=a["operator"],
                actionType=a["actionType"],
                oldValue=a["oldValue"],
                newValue=a["newValue"],
                reason=a["reason"],
            )
            db.add(log_entry)
        db.commit()
