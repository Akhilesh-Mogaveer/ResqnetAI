"""
RESQNET AI — Phase 1 Unit Tests: Severity & Priority Scoring Engine

Tests cover:
- Building collapse with trapped people (Critical severity, Priority >= 85)
- Explicit negation ('nobody is trapped', 'no casualties') preventing false critical alarms
- Donation, sympathy, and non-emergency messages (Low severity, Priority <= 35)
- Unverified but life-threatening reports remaining eligible for urgent triage
- Missing and unmatched locations yielding low location confidence (<= 25)
- Conservative casualty parsing ignoring household/building numbers
- Multi-class HumAID categories and probability distribution effects
- Score boundary clamps (0 <= score <= 100)
- Deterministic reproducibility for identical inputs
- End-to-end incident intake integration via FastAPI client
"""

import pytest
from backend.app.services.scoring_service import (
    calculate_incident_scores,
    calculate_incident_severity,
    calculate_priority_score,
    calculate_location_confidence,
    calculate_report_reliability,
    extract_risk_factors,
    parse_affected_count,
    is_term_negated_or_hypothetical,
    SEVERITY_CRITICAL,
    SEVERITY_HIGH,
    SEVERITY_MODERATE,
    SEVERITY_LOW,
)
from backend.app.schemas.incident import IncidentCreate


# ============================================================================
# 1. Conservative Casualty Parsing Tests
# ============================================================================

def test_parse_affected_count_extracts_people_ranges():
    """Ranges of human casualties should be parsed conservatively taking the upper estimate."""
    assert parse_affected_count("12 - 20 trapped / at risk") == 20
    assert parse_affected_count("8 injured civilians") == 8
    assert parse_affected_count("18 non-ambulatory seniors") == 18
    assert parse_affected_count("42 ICU & dialysis patients") == 42
    assert parse_affected_count("50 - 80 nearby workers") == 80


def test_parse_affected_count_ignores_non_human_objects():
    """Buildings, households, vehicles, apartments, and infrastructural units must NOT be counted as victims."""
    assert parse_affected_count("180 residential households") == 0
    assert parse_affected_count("850 apartments unpowered") == 0
    assert parse_affected_count("3 commercial buildings damaged") == 0
    assert parse_affected_count("Adjacent 3-story apartment block") == 0
    assert parse_affected_count("Track 9 Marshalling Yard") == 0
    assert parse_affected_count("Mile 4.2 Highway Underpass") == 0
    assert parse_affected_count("250kW mobile generator") == 0
    assert parse_affected_count("Unknown count") == 0
    assert parse_affected_count(None) == 0


def test_parse_affected_count_honors_explicit_negations():
    """Explicit statements of zero casualties or nobody trapped must return 0."""
    assert parse_affected_count("Nobody is trapped", "Building shook but zero casualties") == 0
    assert parse_affected_count("0 casualties reported", "All workers accounted for, no injuries") == 0
    assert parse_affected_count(None, "Roof partially collapsed but nobody is trapped inside") == 0


# ============================================================================
# 2. Location Confidence Tests
# ============================================================================

def test_calculate_location_confidence_known_sources():
    """Location confidence must reflect actual coordinate and source evidence."""
    # Direct user GPS
    assert calculate_location_confidence([19.0760, 72.8777], location_source="user_supplied") == 95

    # Verified Indian gazetteer match
    assert calculate_location_confidence([11.6854, 76.1320], location_source="geocoded_indian_gazetteer (Wayanad, Kerala)") == 85

    # Synthetic demo simulation
    assert calculate_location_confidence([37.7845, -122.3965], location_source="synthetic_demo_sf_simulation") == 70


def test_calculate_location_confidence_missing_or_unmatched():
    """Unmatched or missing coordinates must yield low confidence (<= 25), not 70."""
    # Missing coordinates with sector known
    assert calculate_location_confidence(None, location_source="unmatched_unknown", sector="East Harbor District") == 25

    # Missing coordinates with completely unspecified location
    assert calculate_location_confidence(None, location_source="unmatched_unknown", location_name="Location Unspecified", sector="Sector Unspecified") == 10

    # Empty coordinates list
    assert calculate_location_confidence([], location_source=None) == 10


# ============================================================================
# 3. Negation & Context Handling Tests
# ============================================================================

def test_negation_detection_prevents_false_danger_alarms():
    """Negated danger keywords must be detected to prevent false critical alarms."""
    assert is_term_negated_or_hypothetical("Roof cracked, but nobody is trapped inside.", "trapped") is True
    assert is_term_negated_or_hypothetical("Tremor felt. No casualties reported across the sector.", "casualties") is True
    assert is_term_negated_or_hypothetical("Evacuated the warehouse without injuries.", "injuries") is True
    assert is_term_negated_or_hypothetical("Annual fire simulation drill in progress at terminal 2.", "fire") is True

    # Real emergency statements are NOT negated
    assert is_term_negated_or_hypothetical("Multiple workers trapped under structural beams after tremor.", "trapped") is False
    assert is_term_negated_or_hypothetical("Heavy gas leak venting from main line, explosion danger.", "gas leak") is False


# ============================================================================
# 4. Severity Classification Tests
# ============================================================================

def test_severity_building_collapse_with_trapped_people():
    """Structural collapse with trapped people must classify as CRITICAL."""
    res = calculate_incident_scores(
        title="Warehouse partial collapse",
        report_text="Building collapsed at Pier 14 warehouse after heavy tremor. 6 workers trapped under beams.",
        humaid_category="infrastructure_and_utility_damage",
        humaid_confidence=0.94,
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        people_affected="6 workers trapped",
    )
    assert res.severity == SEVERITY_CRITICAL
    assert res.affected_count_numeric == 6
    assert res.priority_score >= 85
    assert any("entrapment" in r.lower() for r in res.risk_factors)
    assert "CRITICAL" in res.why_prioritised


def test_severity_explicit_negation_nobody_trapped():
    """Building tremor where report explicitly says nobody is trapped must NOT be critical."""
    res = calculate_incident_scores(
        title="Tremor felt at logistics facility",
        report_text="Tremor caused ceiling tile cracks, but nobody is trapped and zero casualties reported.",
        humaid_category="infrastructure_and_utility_damage",
        humaid_confidence=0.92,
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        people_affected="0 casualties",
    )
    assert res.severity == SEVERITY_MODERATE
    assert res.affected_count_numeric == 0
    assert not any("entrapment" in r.lower() for r in res.risk_factors)
    assert res.priority_score < 70


def test_severity_donation_or_sympathy_is_low():
    """Donation, volunteering, and sympathy messages must classify as LOW severity."""
    res = calculate_incident_scores(
        title="Donation inquiry for relief camp",
        report_text="Where can volunteers drop off blankets, baby formula, and clean drinking water tomorrow morning?",
        humaid_category="rescue_volunteering_or_donation_effort",
        humaid_confidence=0.96,
        coordinates=None,
        location_source="unmatched_unknown",
        people_affected="Unknown count",
    )
    assert res.severity == SEVERITY_LOW
    assert res.priority_score <= 35
    assert "LOW" in res.why_prioritised


def test_unverified_life_threatening_report_remains_urgent():
    """An unverified life-threatening report must remain high enough on the triage queue for urgent check."""
    res = calculate_incident_scores(
        title="Distress call regarding toxic ammonia plume",
        report_text="Toxic yellow ammonia cloud venting from rail car. 4 workers unconscious and coughing.",
        humaid_category="requests_or_urgent_needs",
        humaid_confidence=0.91,
        coordinates=[19.0760, 72.8777],
        location_source="geocoded_indian_gazetteer",
        people_affected="4 workers",
        verification_status="unverified",
    )
    assert res.severity == SEVERITY_CRITICAL
    # Unverified critical report must still score >= 80 to ensure immediate triage!
    assert res.priority_score >= 80
    assert any("unverified" in r.lower() for r in res.risk_factors)
    assert "unverified" in res.why_prioritised.lower()


def test_missing_unmatched_location_scoring():
    """Reports with missing GPS must register low location confidence and note unmapped coordinates."""
    res = calculate_incident_scores(
        title="Flooding reported in alleyway",
        report_text="Water entering residential ground floors. No GPS available.",
        humaid_category="infrastructure_and_utility_damage",
        coordinates=None,
        location_source="unmatched_unknown",
        sector="East Harbor District",
    )
    assert res.location_confidence <= 25
    assert any("unmapped" in r.lower() for r in res.risk_factors)
    assert "unknown / unmapped" in res.why_prioritised.lower()


# ============================================================================
# 5. HumAID Categories and Probability Distribution Tests
# ============================================================================

def test_humaid_all_probabilities_blending():
    """Compound risk in all_probabilities lifts the hazard sub-score appropriately."""
    # When top prediction is infrastructure damage, but injured_or_dead_people has secondary probability
    scores_low_prob = calculate_incident_scores(
        title="Bridge crack",
        report_text="Crack noticed on pier support beam.",
        humaid_category="infrastructure_and_utility_damage",
        all_probabilities={"infrastructure_and_utility_damage": 0.95, "injured_or_dead_people": 0.01},
    )

    scores_high_prob = calculate_incident_scores(
        title="Bridge crack with possible injuries",
        report_text="Crack noticed on pier support beam.",
        humaid_category="infrastructure_and_utility_damage",
        all_probabilities={"infrastructure_and_utility_damage": 0.55, "injured_or_dead_people": 0.40},
    )

    # Secondary casualty probability should lift hazard sub-score
    assert scores_high_prob.priority_score >= scores_low_prob.priority_score


# ============================================================================
# 6. Score Bounds & Deterministic Reproducibility
# ============================================================================

def test_scores_strictly_stay_within_0_to_100():
    """All score outputs must strictly clamp within [0, 100]."""
    # Extreme high test
    extreme_high = calculate_incident_scores(
        title="Catastrophic earthquake multi-building collapse",
        report_text="Major earthquake. 200 workers trapped in collapsed multi-story factory. Gas leak on fire.",
        humaid_category="injured_or_dead_people",
        humaid_confidence=1.0,
        all_probabilities={"injured_or_dead_people": 1.0},
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        people_affected="200 workers",
        verification_status="verified",
        duplicate_count=10,
    )
    assert 0 <= extreme_high.priority_score <= 100
    assert 0 <= extreme_high.location_confidence <= 100
    assert 0 <= extreme_high.report_reliability <= 100
    assert extreme_high.priority_score >= 95

    # Extreme low / disputed test
    extreme_low = calculate_incident_scores(
        title="Spam rumor about flood",
        report_text="Disputed rumor on social media.",
        humaid_category="not_humanitarian",
        coordinates=None,
        location_source="unmatched_unknown",
        verification_status="disputed",
    )
    assert 0 <= extreme_low.priority_score <= 100
    assert extreme_low.priority_score <= 25


def test_deterministic_reproducibility():
    """Identical inputs must produce identical scores, risk factors, and explanations."""
    payload = dict(
        title="Substation transformer oil fire",
        report_text="Explosion at Substation 7 followed by active oil fire. Dense black smoke.",
        humaid_category="infrastructure_and_utility_damage",
        humaid_confidence=0.89,
        all_probabilities={"infrastructure_and_utility_damage": 0.89, "caution_and_advice": 0.11},
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        location_name="Substation 7",
        sector="West Market",
        people_affected="None",
        verification_status="under_review",
        duplicate_count=1,
        timestamp="2026-10-18T10:00:00Z",
    )

    run1 = calculate_incident_scores(**payload)
    run2 = calculate_incident_scores(**payload)

    assert run1.severity == run2.severity
    assert run1.priority_score == run2.priority_score
    assert run1.location_confidence == run2.location_confidence
    assert run1.report_reliability == run2.report_reliability
    assert run1.risk_factors == run2.risk_factors
    assert run1.why_prioritised == run2.why_prioritised
    assert run1.breakdown == run2.breakdown


# ============================================================================
# 7. End-to-End FastAPI Intake Integration Tests
# ============================================================================

def test_api_create_incident_runs_scoring_engine(client):
    """POST /api/v1/incidents must dynamically calculate severity and priority score."""
    payload = {
        "title": "Industrial roof collapse with trapped crew",
        "sector": "East Harbor District",
        "locationName": "Pier 14 Logistics Complex",
        "report_text": "Building partially collapsed at Pier 14 warehouse after heavy tremor. 8 workers trapped under structural beams.",
        "peopleAffected": "8 workers trapped",
        "coordinates": [19.0760, 72.8777],
        "run_nlp_classification": False,  # Test purely scoring engine logic without mocking ML
        "humaid_category": "infrastructure_and_utility_damage",
    }

    resp = client.post("/api/v1/incidents", json=payload)
    assert resp.status_code == 201
    data = resp.json()

    # Dynamic severity and priority score computed by engine
    assert data["severity"] == "critical"
    assert data["priorityScore"] >= 80
    assert data["affectedCountNumeric"] == 8
    assert data["locationConfidence"] == 95  # User supplied coordinates
    assert any("entrapment" in r.lower() for r in data["riskFactors"])
    assert "CRITICAL" in data["whyPrioritised"]


def test_api_create_incident_preserves_explicit_coordinator_override(client):
    """If a coordinator explicitly sets is_priority_overridden=True, the manual score must be preserved."""
    payload = {
        "title": "Minor water puddle outside fire station",
        "sector": "West Market",
        "locationName": "Market St",
        "report_text": "Small water accumulation on sidewalk.",
        "severity": "low",
        "priorityScore": 99,  # Manual coordinator override
        "is_priority_overridden": True,
        "is_severity_overridden": True,
        "override_reason": "VIP event priority escalation",
        "run_nlp_classification": False,
    }

    resp = client.post(
        "/api/v1/incidents",
        json=payload,
        headers={"Authorization": "Bearer dev-coordinator-token"},
    )
    assert resp.status_code == 201
    data = resp.json()

    # Manual coordinator override is preserved
    assert data["priorityScore"] == 99
    assert data["severity"] == "low"
    assert data["is_priority_overridden"] is True


# ============================================================================
# 8. Phase 1.1 Regression Tests: Historical, Collapse Context, & Persistence
# ============================================================================

def test_historical_narratives_do_not_trigger_critical():
    """Historical commemorations, memorials, and past events must not receive critical severity or inflate victims."""
    # Historical memorial
    res_memorial = calculate_incident_scores(
        title="Memorial post",
        report_text="Remembering the building collapse five years ago that trapped ten people.",
        people_affected="10 people trapped",
    )
    assert res_memorial.severity == SEVERITY_LOW
    assert res_memorial.affected_count_numeric == 0
    assert res_memorial.priority_score <= 35
    assert any("retrospective" in r.lower() or "historical" in r.lower() for r in res_memorial.risk_factors)
    assert "retrospective" in res_memorial.why_prioritised.lower() or "historical" in res_memorial.why_prioritised.lower()

    # Anniversary of past flood
    res_anniversary = calculate_incident_scores(
        title="Disaster anniversary notice",
        report_text="Anniversary of the 2018 flood that killed several people across the river basin.",
        people_affected="Unknown count",
    )
    assert res_anniversary.severity == SEVERITY_LOW
    assert res_anniversary.priority_score <= 35

    # Current emergency mentioning past event as reference MUST STILL BE DETECTED as current!
    res_current = calculate_incident_scores(
        title="Immediate flood alert",
        report_text="Water rising today like the 2018 flood, urgent rescue needed for 3 trapped residents right now!",
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        people_affected="3 trapped residents",
    )
    assert res_current.severity == SEVERITY_CRITICAL
    assert res_current.affected_count_numeric == 3
    assert res_current.priority_score >= 80

    # Current collapse mentioning 'just now'
    res_now = calculate_incident_scores(
        title="Urgent building collapse",
        report_text="A building collapsed just now and people are trapped under the rubble.",
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        people_affected="6 residents trapped",
    )
    assert res_now.severity == SEVERITY_CRITICAL
    assert res_now.priority_score >= 85


def test_collapse_contexts_unoccupied_vs_entrapment_vs_nearby_danger():
    """Distinguish unoccupied structures from confirmed entrapment and collateral nearby danger."""
    # Case A: Abandoned/unoccupied structure with confirmed no one inside -> MODERATE, priority < 70
    res_abandoned = calculate_incident_scores(
        title="Barn collapse in storm",
        report_text="An abandoned barn collapsed in the storm. Nobody was inside.",
        people_affected="None",
    )
    assert res_abandoned.severity == SEVERITY_MODERATE
    assert res_abandoned.affected_count_numeric == 0
    assert res_abandoned.priority_score < 70
    assert not any("entrapment" in r.lower() for r in res_abandoned.risk_factors)
    assert any("unoccupied" in r.lower() for r in res_abandoned.risk_factors)
    assert "unoccupied" in res_abandoned.why_prioritised.lower()

    # Case B: Building collapse with active entrapment -> CRITICAL, priority >= 85
    res_trapped = calculate_incident_scores(
        title="Apartment building collapse",
        report_text="A building collapsed and people are trapped under the rubble.",
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        people_affected="6 residents trapped",
    )
    assert res_trapped.severity == SEVERITY_CRITICAL
    assert res_trapped.priority_score >= 85
    assert any("entrapment" in r.lower() for r in res_trapped.risk_factors)

    # Case C: Empty warehouse collapse with plausible risk to nearby residents -> HIGH (urgent triage!)
    res_nearby = calculate_incident_scores(
        title="Empty warehouse structural failure",
        report_text="An empty warehouse collapsed, but nearby residents may be in danger from ruptured gas lines.",
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
    )
    assert res_nearby.severity == SEVERITY_HIGH
    assert res_nearby.priority_score >= 70
    assert any("collateral risk" in r.lower() for r in res_nearby.risk_factors)
    assert "hazard to nearby residents" in res_nearby.why_prioritised.lower()


def test_intake_overrides_persistence_and_independence(db_session):
    """
    Intake priority and severity overrides must persist across DB reload and remain independent.
    A priority-only override must not mark severity as overridden, and vice-versa.
    """
    from backend.app.services.incident_service import create_incident, get_incident_by_id
    from backend.app.core.security import SYSTEM_USERS

    coord_user = SYSTEM_USERS["coordinator"]

    # 1. Priority-only override
    inc_prio = create_incident(
        db_session,
        IncidentCreate(
            title="Priority Only Override",
            priorityScore=92,
            is_priority_overridden=True,
            override_reason="Field commander radio confirmed priority update",
            run_nlp_classification=False,
            coordinates=[19.0760, 72.8777],
        ),
        current_user=coord_user,
    )
    db_session.expire_all()
    reloaded_prio = get_incident_by_id(db_session, inc_prio.id)
    prio_dict = reloaded_prio.to_dict()
    assert prio_dict["priorityScore"] == 92
    assert prio_dict["is_priority_overridden"] is True
    assert prio_dict["is_severity_overridden"] is False

    # 2. Severity-only override
    inc_sev = create_incident(
        db_session,
        IncidentCreate(
            title="Severity Only Override",
            severity="critical",
            is_severity_overridden=True,
            override_reason="Severe embankment breach observed on-scene",
            run_nlp_classification=False,
            coordinates=[19.0760, 72.8777],
        ),
        current_user=coord_user,
    )
    db_session.expire_all()
    reloaded_sev = get_incident_by_id(db_session, inc_sev.id)
    sev_dict = reloaded_sev.to_dict()
    assert sev_dict["severity"] == "critical"
    assert sev_dict["is_severity_overridden"] is True
    assert sev_dict["is_priority_overridden"] is False

    # 3. Combined override
    inc_both = create_incident(
        db_session,
        IncidentCreate(
            title="Combined Override",
            priorityScore=22,
            severity="low",
            is_priority_overridden=True,
            is_severity_overridden=True,
            override_reason="False alarm verified by ground sensor",
            run_nlp_classification=False,
            coordinates=[19.0760, 72.8777],
        ),
        current_user=coord_user,
    )
    db_session.expire_all()
    reloaded_both = get_incident_by_id(db_session, inc_both.id)
    both_dict = reloaded_both.to_dict()
    assert both_dict["priorityScore"] == 22
    assert both_dict["severity"] == "low"
    assert both_dict["is_priority_overridden"] is True
    assert both_dict["is_severity_overridden"] is True


def test_missing_coordinates_on_disk_sqlite_with_not_null(tmp_path):
    """
    Test creating, committing, and reloading an incident with unknown coordinates
    in an on-disk SQLite database whose table schema enforces coordinates_json TEXT NOT NULL.
    Verifies that 'null' string storage prevents IntegrityError while returning coordinates=None.
    """
    import sqlite3
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from backend.app.schemas.incident import IncidentCreate
    from backend.app.services.incident_service import create_incident, get_incident_by_id

    db_path = tmp_path / "test_not_null.db"

    # Create SQLite database with explicit NOT NULL constraint on coordinates_json matching production DDL
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE incidents (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            type VARCHAR(100) NOT NULL,
            sector VARCHAR(100) NOT NULL,
            locationName VARCHAR(255) NOT NULL,
            coordinates_json TEXT NOT NULL,
            severity VARCHAR(50) NOT NULL,
            priorityScore INTEGER NOT NULL,
            reportReliability INTEGER NOT NULL,
            locationConfidence INTEGER NOT NULL,
            peopleAffected VARCHAR(255) NOT NULL,
            affectedCountNumeric INTEGER NOT NULL,
            timeAgo VARCHAR(100) NOT NULL,
            timestamp VARCHAR(100) NOT NULL,
            verificationStatus VARCHAR(50) NOT NULL,
            responseStatus VARCHAR(50) NOT NULL,
            assignedTeam VARCHAR(255),
            sourceSummary TEXT NOT NULL,
            signalSynthesis TEXT NOT NULL,
            whyPrioritised TEXT NOT NULL,
            riskFactors_json TEXT NOT NULL,
            notes_json TEXT NOT NULL,
            report_text TEXT,
            original_report_text TEXT,
            humaid_category VARCHAR(100),
            humaid_confidence FLOAT,
            all_probabilities_json TEXT,
            nlp_status VARCHAR(50),
            nlp_disclaimer TEXT,
            created_at DATETIME,
            updated_at DATETIME,
            is_duplicate BOOLEAN DEFAULT 0,
            duplicate_of_id VARCHAR(64),
            duplicate_count INTEGER DEFAULT 0,
            dismissed_duplicates_json TEXT DEFAULT '[]',
            is_synthetic_location BOOLEAN DEFAULT 0,
            location_source TEXT DEFAULT "unknown"
        )
    """)
    cursor.execute("""
        CREATE TABLE audit_logs (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            timestamp VARCHAR(100) NOT NULL,
            incidentId VARCHAR(64) NOT NULL,
            operator VARCHAR(255) NOT NULL,
            actionType VARCHAR(100) NOT NULL,
            oldValue VARCHAR(255) NOT NULL,
            newValue VARCHAR(255) NOT NULL,
            reason TEXT NOT NULL,
            created_at DATETIME
        )
    """)
    conn.commit()
    conn.close()

    engine = create_engine(f"sqlite:///{db_path}")
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Create incident with completely missing coordinates and unmatched location
        inc_in = IncidentCreate(
            title="Unmapped Location Incident",
            locationName="Nowhere Specific",
            sector="Sector Unspecified",
            report_text="Water accumulation on unmapped service lane.",
            coordinates=None,
            run_nlp_classification=False,
        )
        created = create_incident(session, inc_in)
        assert created.id is not None
        assert created.coordinates is None

        # Verify underlying raw SQLite database stores 'null' string without violating NOT NULL
        raw_conn = sqlite3.connect(str(db_path))
        raw_cur = raw_conn.cursor()
        raw_row = raw_cur.execute("SELECT coordinates_json FROM incidents WHERE id = ?", (created.id,)).fetchone()
        assert raw_row[0] == "null"
        raw_conn.close()

        # Reload through fresh SQLAlchemy session
        session.close()
        fresh_session = Session()
        reloaded = get_incident_by_id(fresh_session, created.id)
        assert reloaded is not None
        assert reloaded.coordinates is None
        data = reloaded.to_dict()
        assert data["coordinates"] is None
        assert data["locationConfidence"] <= 25
        fresh_session.close()
    finally:
        engine.dispose()


# ============================================================================
# Phase 2: Reliable Incident Rescoring Regression Tests
# ============================================================================

def test_duplicate_reports_increase_affected_count_and_rescore_priority(db_session):
    """
    Merging a duplicate report must:
    1. Update primary affected-person count if duplicate reported more casualties.
    2. Recalculate priority based on increased scale and corroboration.
    3. Persist changes to the database.
    4. Create an audit log for PRIORITY_RESCORING.
    """
    from backend.app.services.incident_service import create_incident, get_incident_by_id, get_audit_logs
    from backend.app.services.duplicate_service import merge_duplicate_reports

    primary_in = IncidentCreate(
        id="RQN-P2-01",
        title="East Wing Water Pipe Rupture",
        type="Infrastructure",
        sector="East Harbor",
        locationName="Harbor Complex Wing A",
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        report_text="Water line burst in corridor. 1 person slipped.",
        people_affected="1 person injured",
        affectedCountNumeric=1,
        run_nlp_classification=False,
    )
    primary = create_incident(db_session, primary_in)
    initial_priority = primary.priorityScore
    assert primary.affectedCountNumeric == 1

    dup_in = IncidentCreate(
        id="RQN-P2-02",
        title="Basement Inundation and Electrical Hazard",
        type="Infrastructure",
        sector="East Harbor",
        locationName="Harbor Complex Basement",
        coordinates=[19.0762, 72.8779],
        location_source="user_supplied",
        report_text="Flooding spreading to power room. 7 workers trapped behind security gate.",
        people_affected="7 workers trapped",
        affectedCountNumeric=7,
        run_nlp_classification=False,
    )
    duplicate = create_incident(db_session, dup_in)

    # Perform coordinator merge
    merged_prim, merged_dup, merge_audit = merge_duplicate_reports(
        db=db_session,
        primary_id=primary.id,
        duplicate_id=duplicate.id,
        operator="Coordinator Alex Rivera",
        reason="Corroborated ground reports of escalating structural flood.",
        update_corroboration=True,
    )

    # Verify primary affected-person count increased to 7
    assert merged_prim.affectedCountNumeric == 7
    assert "7 workers" in merged_prim.peopleAffected or "7" in merged_prim.peopleAffected
    assert merged_prim.duplicate_count == 1

    # Verify priority score increased due to higher casualty scale and corroboration
    assert merged_prim.priorityScore > initial_priority

    # Verify database persistence after reloading record
    reloaded = get_incident_by_id(db_session, primary.id)
    assert reloaded.affectedCountNumeric == 7
    assert reloaded.priorityScore == merged_prim.priorityScore
    assert reloaded.duplicate_count == 1

    # Verify audit logs
    audits = get_audit_logs(db_session, incident_id=primary.id)
    rescore_log = next((l for l in audits if l.actionType == "PRIORITY_RESCORING"), None)
    assert rescore_log is not None
    assert int(rescore_log.newValue) == merged_prim.priorityScore
    assert rescore_log.oldValue == str(initial_priority)
    assert "duplicate" in rescore_log.reason.lower()


def test_verification_status_changes_affect_priority_and_persist(db_session):
    """
    Verification status transitions must automatically rescore priority and persist:
    - Moving to 'verified' boosts verification sub-score.
    - Moving to 'disputed' applies disputed penalty (capped at 25).
    - Creates PRIORITY_RESCORING audit logs for meaningful changes.
    """
    from backend.app.services.incident_service import (
        create_incident,
        get_incident_by_id,
        update_incident_verification,
        get_audit_logs,
    )

    inc_in = IncidentCreate(
        id="RQN-P2-03",
        title="Chemical storage odor leak",
        type="Hazardous Material",
        sector="North Industrial",
        locationName="Warehouse 4",
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        report_text="Strong sulfur smell outside warehouse. 2 guards feeling dizzy.",
        people_affected="2 guards",
        affectedCountNumeric=2,
        run_nlp_classification=False,
    )
    inc = create_incident(db_session, inc_in)
    unverified_priority = inc.priorityScore

    # Transition 1: unverified -> verified
    updated_ver = update_incident_verification(
        db=db_session,
        incident_id=inc.id,
        new_status="verified",
        operator="Captain Morgan",
        reason="Field inspection confirmed minor chemical leak.",
    )
    assert updated_ver.verificationStatus == "verified"
    assert updated_ver.priorityScore > unverified_priority
    verified_priority = updated_ver.priorityScore

    # Transition 2: verified -> disputed
    updated_disp = update_incident_verification(
        db=db_session,
        incident_id=inc.id,
        new_status="disputed",
        operator="Lead Hazmat Inspector",
        reason="False alarm; odor was from certified municipal sewage clearing.",
    )
    assert updated_disp.verificationStatus == "disputed"
    assert updated_disp.priorityScore <= 25
    disputed_priority = updated_disp.priorityScore

    # Verify persistence after reloading from DB
    reloaded = get_incident_by_id(db_session, inc.id)
    assert reloaded.verificationStatus == "disputed"
    assert reloaded.priorityScore == disputed_priority

    # Verify audit logs
    audits = get_audit_logs(db_session, incident_id=inc.id)
    rescore_logs = [l for l in audits if l.actionType == "PRIORITY_RESCORING"]
    assert len(rescore_logs) >= 2
    # One rescore for verified transition
    assert any(l.oldValue == str(unverified_priority) and l.newValue == str(verified_priority) for l in rescore_logs)
    # One rescore for disputed transition
    assert any(l.oldValue == str(verified_priority) and l.newValue == str(disputed_priority) for l in rescore_logs)


def test_manual_overrides_survive_automatic_rescoring(db_session):
    """
    Manual priority and severity overrides must NOT be overwritten by automatic rescoring,
    whether triggered by verification changes or duplicate merges.
    """
    from backend.app.services.incident_service import (
        create_incident,
        get_incident_by_id,
        update_incident_verification,
        get_audit_logs,
    )
    from backend.app.services.duplicate_service import merge_duplicate_reports
    from backend.app.core.security import SYSTEM_USERS

    inc_in = IncidentCreate(
        id="RQN-P2-04",
        title="School basement dampness",
        type="Flood",
        sector="South Suburbs",
        locationName="Public School 12",
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        report_text="Water seepage in basement storage room.",
        people_affected="None",
        affectedCountNumeric=0,
        severity="low",
        priorityScore=94,  # Coordinator manually overrides priority to 94 (e.g. VIP event)
        is_priority_overridden=True,
        is_severity_overridden=True,
        override_reason="VIP event priority adjustment",
        run_nlp_classification=False,
    )
    primary = create_incident(db_session, inc_in, current_user=SYSTEM_USERS["coordinator"])
    assert primary.priorityScore == 94
    assert primary.severity == "low"
    assert primary.is_priority_overridden is True
    assert primary.is_severity_overridden is True

    # Action 1: Change verification status
    updated = update_incident_verification(
        db=db_session,
        incident_id=primary.id,
        new_status="verified",
        operator="Coordinator Jordan",
        reason="Field team confirmed dampness.",
    )
    # Priority and severity must NOT be overwritten!
    assert updated.priorityScore == 94
    assert updated.severity == "low"

    # Action 2: Merge duplicate with higher casualty count
    dup_in = IncidentCreate(
        id="RQN-P2-05",
        title="Basement pump short circuit",
        type="Flood",
        sector="South Suburbs",
        locationName="Public School 12",
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        report_text="Pump short-circuited. 4 staff members evacuated.",
        people_affected="4 staff evacuated",
        affectedCountNumeric=4,
        severity="high",
        run_nlp_classification=False,
    )
    duplicate = create_incident(db_session, dup_in)

    merged_prim, _, _ = merge_duplicate_reports(
        db=db_session,
        primary_id=primary.id,
        duplicate_id=duplicate.id,
        operator="Coordinator Jordan",
        reason="Merging pump incident into primary school incident.",
    )
    # Merged evidence updates affected count
    assert merged_prim.affectedCountNumeric == 4
    # But manual priority and severity overrides remain untouched!
    assert merged_prim.priorityScore == 94
    assert merged_prim.severity == "low"

    # Verify reload from DB
    reloaded = get_incident_by_id(db_session, primary.id)
    assert reloaded.priorityScore == 94
    assert reloaded.severity == "low"
    assert reloaded.is_priority_overridden is True
    assert reloaded.is_severity_overridden is True

    # Overridden fields must not have PRIORITY_RESCORING or SEVERITY_RESCORING audit entries
    audits = get_audit_logs(db_session, incident_id=primary.id)
    assert not any(l.actionType in ("PRIORITY_RESCORING", "SEVERITY_RESCORING") for l in audits)


def test_no_duplicate_audit_logs_when_nothing_changes(db_session):
    """
    Audit logs must only be created when meaningful changes occur.
    Redundant status updates or rescorings that produce identical scores must avoid duplicate logs.
    """
    from backend.app.services.incident_service import (
        create_incident,
        update_incident_verification,
        rescore_incident,
        get_audit_logs,
    )
    from backend.app.services.duplicate_service import dismiss_duplicate_suggestion

    inc_in = IncidentCreate(
        id="RQN-P2-06",
        title="Traffic signal blinking amber",
        type="Infrastructure",
        sector="Downtown",
        locationName="5th and Broadway",
        coordinates=[19.0760, 72.8777],
        location_source="user_supplied",
        report_text="Signal controller blinking amber. Traffic flowing slowly.",
        people_affected="None",
        affectedCountNumeric=0,
        run_nlp_classification=False,
    )
    inc = create_incident(db_session, inc_in)
    initial_audit_count = len(get_audit_logs(db_session, incident_id=inc.id))

    # 1. Verification transition to the SAME status (unverified -> unverified)
    update_incident_verification(
        db=db_session,
        incident_id=inc.id,
        new_status="unverified",
        operator="System",
        reason="Redundant check",
    )
    assert len(get_audit_logs(db_session, incident_id=inc.id)) == initial_audit_count

    # 2. Rescore incident with identical inputs
    _, new_logs = rescore_incident(
        db=db_session,
        incident=inc,
        reason="Routine health rescore",
        commit=True,
    )
    assert len(new_logs) == 0
    assert len(get_audit_logs(db_session, incident_id=inc.id)) == initial_audit_count

    # 3. Dismissal idempotency
    inc2_in = IncidentCreate(
        id="RQN-P2-07",
        title="Traffic light outage 5th Ave",
        type="Infrastructure",
        sector="Downtown",
        locationName="5th and Broadway",
        coordinates=[19.0761, 72.8778],
        location_source="user_supplied",
        report_text="Signal completely out at 5th and Broadway.",
        run_nlp_classification=False,
    )
    inc2 = create_incident(db_session, inc2_in)

    # First dismissal creates logs
    dismiss_duplicate_suggestion(db_session, inc.id, inc2.id)
    dismiss_audits_1 = len(get_audit_logs(db_session, incident_id=inc.id))

    # Second dismissal of same pair produces NO new audit logs
    dismiss_duplicate_suggestion(db_session, inc.id, inc2.id)
    dismiss_audits_2 = len(get_audit_logs(db_session, incident_id=inc.id))
    assert dismiss_audits_1 == dismiss_audits_2

