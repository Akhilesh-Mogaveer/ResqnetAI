import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def request(method, path, body=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {"error": str(e)}

print("=== 1. Health Probe ===")
code, res = request("GET", "/api/v1/health")
print(f"Health Status: {code}, Model Loaded: {res.get('model_loaded')}, SQLite: {res.get('database')}")

print("\n=== 2. Submit Incident A (Primary) ===")
incident_a = {
    "title": "Warehouse Collapse at Pier 14",
    "type": "Collapse",
    "sector": "South Port",
    "locationName": "Pier 14 Terminal 2",
    "coordinates": [37.7845, -122.3965],
    "severity": "critical",
    "priorityScore": 92,
    "report_text": "Roof of Pier 14 cargo warehouse collapsed following structural failure. 3 workers trapped near loading dock.",
    "run_nlp_classification": True
}
code, res_a = request("POST", "/api/v1/incidents", incident_a)
id_a = res_a.get("id")
print(f"Incident A: {code}, ID: {id_a}, Category: {res_a.get('humaidCategory')}, Conf: {res_a.get('humaidConfidence')}")

print("\n=== 3. Submit Incident B (Corroborating Duplicate) ===")
incident_b = {
    "title": "Structural Roof Collapse near Pier 14",
    "type": "Collapse",
    "sector": "South Port",
    "locationName": "Pier 14 Entrance",
    "coordinates": [37.7852, -122.3970],
    "severity": "critical",
    "priorityScore": 88,
    "report_text": "Massive roof collapse at Pier 14 warehouse. Workers trapped under fallen beams, emergency rescue needed.",
    "run_nlp_classification": True
}
code, res_b = request("POST", "/api/v1/incidents", incident_b)
id_b = res_b.get("id")
print(f"Incident B: {code}, ID: {id_b}, Category: {res_b.get('humaidCategory')}, Conf: {res_b.get('humaidConfidence')}")

print("\n=== 4. Query Duplicate Suggestions for Incident A ===")
code, suggestions = request("GET", f"/api/v1/incidents/{id_a}/duplicates")
print(f"Suggestions found: {len(suggestions)}")
for s in suggestions:
    print(f"Candidate: {s['candidate_id']} | Score: {s['overall_score']}% ({s.get('confidence_level')}) | Distance: {s['distance_km']}km | Sim: {round(s['text_similarity']*100, 1)}%")
    print(f"Reasons: {s['reasons']}")
    print(f"Keywords: {s['shared_keywords']}")

print("\n=== 5. Human Coordinator Review & Merge ===")
merge_payload = {
    "duplicateIncidentId": id_b,
    "operator": "Coordinator Maya Lin",
    "reason": "Corroborated by independent eyewitness report; confirms 3 workers trapped at Pier 14.",
    "updateCorroboration": True
}
code, merge_res = request("POST", f"/api/v1/incidents/{id_a}/merge-duplicate", merge_payload)
print(f"Merge Status: {code}, Duplicate Count: {merge_res.get('duplicate_count')}, Reliability: {merge_res.get('reportReliability')}%")

print("\n=== 6. Verify Candidate State ===")
code, cand_check = request("GET", f"/api/v1/incidents/{id_b}")
print(f"Candidate: is_duplicate={cand_check.get('is_duplicate')}, duplicate_of={cand_check.get('duplicate_of_id')}, responseStatus={cand_check.get('responseStatus')}")

print("\n=== 7. Audit Log Trail ===")
code, audit_logs = request("GET", f"/api/v1/audit-log?incident_id={id_a}")
for log in audit_logs:
    print(f"[{log.get('actionType')}] by {log.get('operator')}: {log.get('reason')}")
