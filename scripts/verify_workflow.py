#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json
import http.cookiejar
import mimetypes
import uuid
import sys

BASE_URL = "http://localhost:3000"

def log_test(step_name, passed, detail=""):
    mark = "✓" if passed else "✗"
    print(f"[{mark}] {step_name}: {'PASSED' if passed else 'FAILED'} {detail}")
    if not passed:
        sys.exit(1)

# Cookie jar for session testing
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

print("=== STARTING FULL END-TO-END WORKFLOW VERIFICATION ===")

# 1. Public Test List
try:
    req = urllib.request.Request(f"{BASE_URL}/api/tests")
    with opener.open(req) as resp:
        data = json.loads(resp.read().decode())
        passed = resp.status == 200 and data.get("success") is True and len(data.get("tests", [])) > 0
        # Ensure answerKey is NOT present
        has_leak = any("answerKey" in t for t in data["tests"])
        log_test("Public Tests Endpoint", passed and not has_leak, f"(Tests found: {len(data['tests'])}, Answer key hidden: {not has_leak})")
        sample_test_id = data["tests"][0]["id"]
except Exception as e:
    log_test("Public Tests Endpoint", False, str(e))

# 2. Public Test Details (Single Test)
try:
    req = urllib.request.Request(f"{BASE_URL}/api/tests/{sample_test_id}")
    with opener.open(req) as resp:
        data = json.loads(resp.read().decode())
        test = data.get("test", {})
        has_leak = "answerKey" in test
        passed = resp.status == 200 and test.get("id") == sample_test_id and not has_leak
        log_test("Public Test Details Security", passed, f"(Title: '{test.get('title')}', Answer key securely hidden)")
except Exception as e:
    log_test("Public Test Details Security", False, str(e))

# 3. Admin Authentication Security Check
try:
    # 3a. Unauthorized access
    unauth_req = urllib.request.Request(f"{BASE_URL}/api/admin/tests")
    try:
        opener.open(unauth_req)
        log_test("Admin Route Protection", False, "Expected 401 Unauthorized but got 200")
    except urllib.error.HTTPError as err:
        log_test("Admin Route Protection (Reject Unauth)", err.code == 401, f"(Status code: {err.code})")

    # 3b. Wrong password
    wrong_login_data = json.dumps({"password": "incorrect_password"}).encode()
    login_req = urllib.request.Request(f"{BASE_URL}/api/admin/login", data=wrong_login_data, headers={"Content-Type": "application/json"})
    try:
        opener.open(login_req)
        log_test("Admin Invalid Password Rejection", False, "Accepted bad password")
    except urllib.error.HTTPError as err:
        log_test("Admin Invalid Password Rejection", err.code == 401, "(Properly rejected)")

    # 3c. Valid login
    valid_login_data = json.dumps({"password": "jee2026admin"}).encode()
    login_req = urllib.request.Request(f"{BASE_URL}/api/admin/login", data=valid_login_data, headers={"Content-Type": "application/json"})
    with opener.open(login_req) as resp:
        login_res = json.loads(resp.read().decode())
        admin_token = login_res.get("token")
        log_test("Admin Valid Login & Session Cookie", resp.status == 200 and bool(admin_token), f"(Session token generated)")
except Exception as e:
    log_test("Admin Auth", False, str(e))

# 4. Admin Test Retrieval (With full answer keys)
try:
    admin_req = urllib.request.Request(f"{BASE_URL}/api/admin/tests")
    with opener.open(admin_req) as resp:
        data = json.loads(resp.read().decode())
        tests = data.get("tests", [])
        has_keys = any("answerKey" in t for t in tests)
        log_test("Admin Tests List (Includes Answer Keys)", resp.status == 200 and has_keys, f"(Admin tests count: {len(tests)})")
except Exception as e:
    log_test("Admin Tests List", False, str(e))

# 5. Create New Mock Test via Multipart Form Upload
try:
    boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    body_bytes = bytearray()

    def add_field(name, val):
        body_bytes.extend(f"--{boundary}\r\n".encode())
        body_bytes.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body_bytes.extend(f"{val}\r\n".encode())

    def add_file(name, filename, file_content, content_type="application/pdf"):
        body_bytes.extend(f"--{boundary}\r\n".encode())
        body_bytes.extend(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode())
        body_bytes.extend(f"Content-Type: {content_type}\r\n\r\n".encode())
        body_bytes.extend(file_content)
        body_bytes.extend(b"\r\n")

    # Read existing sample PDF or create test PDF bytes
    with open("/home/zen/Projects/jee-mock-portal/public/uploads/jee_main_2026_sample_paper_1.pdf", "rb") as f:
        pdf_bytes = f.read()

    add_file("pdf", "jee_2026_session2_mock.pdf", pdf_bytes)
    add_field("title", "JEE Main 2026 April Shift 1 Test")
    add_field("duration", "180")
    add_field("totalMarks", "300")
    add_field("status", "published")

    subjects_cfg = [
        {"id": "physics", "name": "Physics", "startQuestion": 1, "endQuestion": 30, "totalQuestions": 30},
        {"id": "chemistry", "name": "Chemistry", "startQuestion": 31, "endQuestion": 60, "totalQuestions": 30},
        {"id": "mathematics", "name": "Mathematics", "startQuestion": 61, "endQuestion": 90, "totalQuestions": 30}
    ]
    add_field("subjects", json.dumps(subjects_cfg))
    add_field("markingScheme", json.dumps({"correct": 4, "incorrect": -1, "unattempted": 0}))

    new_test_key = {str(i): ("A" if i % 4 == 1 else "B" if i % 4 == 2 else "C" if i % 4 == 3 else "D") for i in range(1, 91)}
    add_field("answerKey", json.dumps(new_test_key))

    body_bytes.extend(f"--{boundary}--\r\n".encode())

    upload_req = urllib.request.Request(
        f"{BASE_URL}/api/admin/tests",
        data=bytes(body_bytes),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    with opener.open(upload_req) as resp:
        data = json.loads(resp.read().decode())
        created_test = data.get("test", {})
        created_id = created_test.get("id")
        log_test("Admin Create Mock Test (Upload PDF & Key)", resp.status == 200 and bool(created_id), f"(Created Test ID: {created_id})")
except Exception as e:
    log_test("Admin Create Mock Test", False, str(e))

# 6. Replace PDF Test
try:
    rep_boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    rep_body = bytearray()
    rep_body.extend(f"--{rep_boundary}\r\n".encode())
    rep_body.extend(f'Content-Disposition: form-data; name="pdf"; filename="replaced_paper.pdf"\r\n'.encode())
    rep_body.extend(b"Content-Type: application/pdf\r\n\r\n")
    rep_body.extend(pdf_bytes)
    rep_body.extend(b"\r\n")
    rep_body.extend(f"--{rep_boundary}--\r\n".encode())

    rep_req = urllib.request.Request(
        f"{BASE_URL}/api/admin/tests/{created_id}/pdf",
        data=bytes(rep_body),
        headers={"Content-Type": f"multipart/form-data; boundary={rep_boundary}"}
    )
    with opener.open(rep_req) as resp:
        data = json.loads(resp.read().decode())
        updated_test = data.get("test", {})
        passed = resp.status == 200 and "replaced_paper.pdf" in updated_test.get("pdfFileName", "")
        log_test("Admin Replace Question Paper PDF", passed, f"(Updated PDF filename: {updated_test.get('pdfFileName')})")
except Exception as e:
    log_test("Admin Replace Question Paper PDF", False, str(e))

# 7. Student Test Attempt & Grading Workflow
try:
    # Attempt created test:
    # Let's simulate:
    # Q1 to Q10: Correct answer (+4 each = 40)
    # Q11 and Q12: Incorrect answer (-1 each = -2)
    # Q13 to Q90: Unattempted (0 each = 0)
    # Expected total score = 40 - 2 = 38 marks
    candidate_responses = {}
    for i in range(1, 11):
        candidate_responses[i] = new_test_key[str(i)] # Correct!

    candidate_responses[11] = "D" if new_test_key["11"] != "D" else "A" # Incorrect!
    candidate_responses[12] = "D" if new_test_key["12"] != "D" else "A" # Incorrect!

    submit_payload = json.dumps({
        "testId": created_id,
        "candidateResponses": candidate_responses,
        "timeTakenSeconds": 3600,
        "candidateName": "Arjun Sharma"
    }).encode()

    submit_req = urllib.request.Request(
        f"{BASE_URL}/api/tests/{created_id}/submit",
        data=submit_payload,
        headers={"Content-Type": "application/json"}
    )

    with opener.open(submit_req) as resp:
        data = json.loads(resp.read().decode())
        result = data.get("result", {})
        submission_id = data.get("submissionId")

        correct_score = result.get("totalScore") == 38
        correct_counts = (
            result.get("totalAttempted") == 12 and
            result.get("totalCorrect") == 10 and
            result.get("totalIncorrect") == 2 and
            result.get("totalUnattempted") == 78
        )
        has_subjects = len(result.get("subjectResults", [])) == 3
        has_reviews = len(result.get("questionReviews", [])) == 90

        passed = resp.status == 200 and correct_score and correct_counts and has_subjects and has_reviews
        log_test(
            "Student CBT Exam Submission & Grading",
            passed,
            f"(Score: {result.get('totalScore')}/300, Correct: {result.get('totalCorrect')}, Incorrect: {result.get('totalIncorrect')}, Left: {result.get('totalUnattempted')})"
        )
except Exception as e:
    log_test("Student CBT Exam Submission & Grading", False, str(e))

# 8. Retrieve Submission Results Card
try:
    res_req = urllib.request.Request(f"{BASE_URL}/api/results/{submission_id}")
    with opener.open(res_req) as resp:
        data = json.loads(resp.read().decode())
        res_data = data.get("result", {})
        passed = resp.status == 200 and res_data.get("submissionId") == submission_id
        log_test("Submission Results & Analytics Retrieval", passed, f"(Candidate: {res_data.get('candidateName')}, Accuracy: {res_data.get('overallAccuracy')}%)")
except Exception as e:
    log_test("Submission Results & Analytics Retrieval", False, str(e))

# 9. Clean up created test
try:
    del_req = urllib.request.Request(f"{BASE_URL}/api/admin/tests/{created_id}")
    del_req.get_method = lambda: "DELETE"
    with opener.open(del_req) as resp:
        data = json.loads(resp.read().decode())
        log_test("Admin Delete Test", resp.status == 200 and data.get("success") is True, "(Cleaned up test)")
except Exception as e:
    log_test("Admin Delete Test", False, str(e))

print("=== ALL VERIFICATION CHECKS PASSED PERFECTLY ===")
