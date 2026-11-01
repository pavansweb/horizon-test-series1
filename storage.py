import os
import json
import uuid
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
TESTS_FILE = os.path.join(DATA_DIR, 'tests.json')
SUBMISSIONS_FILE = os.path.join(DATA_DIR, 'submissions.json')

def ensure_data_files():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(TESTS_FILE):
        with open(TESTS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, indent=2)
    if not os.path.exists(SUBMISSIONS_FILE):
        with open(SUBMISSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump({}, f, indent=2)

def load_tests():
    ensure_data_files()
    try:
        with open(TESTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading tests: {e}")
        return []

def save_tests(tests):
    ensure_data_files()
    with open(TESTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(tests, f, indent=2)

def get_test_by_id(test_id, public_only=False):
    tests = load_tests()
    for t in tests:
        if str(t.get('id')) == str(test_id):
            if public_only:
                # Return sanitized public copy without answerKey
                public_copy = dict(t)
                public_copy.pop('answerKey', None)
                # Compute totalQuestions
                total_q = sum(s.get('totalQuestions', 0) for s in t.get('subjects', []))
                public_copy['totalQuestions'] = total_q
                return public_copy
            return t
    return None

def save_test(test_data):
    tests = load_tests()
    test_id = test_data.get('id')
    now = datetime.utcnow().isoformat() + 'Z'
    
    if not test_id:
        test_id = str(uuid.uuid4())
        test_data['id'] = test_id
        test_data['createdAt'] = now
        test_data['updatedAt'] = now
        tests.append(test_data)
    else:
        found = False
        for i, t in enumerate(tests):
            if str(t.get('id')) == str(test_id):
                test_data['updatedAt'] = now
                test_data['createdAt'] = t.get('createdAt', now)
                tests[i] = test_data
                found = True
                break
        if not found:
            test_data['createdAt'] = now
            test_data['updatedAt'] = now
            tests.append(test_data)
            
    save_tests(tests)
    return test_data

def delete_test(test_id):
    tests = load_tests()
    new_tests = [t for t in tests if str(t.get('id')) != str(test_id)]
    save_tests(new_tests)
    return len(new_tests) < len(tests)

def load_submissions():
    ensure_data_files()
    try:
        with open(SUBMISSIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading submissions: {e}")
        return {}

def save_submissions(submissions):
    ensure_data_files()
    with open(SUBMISSIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(submissions, f, indent=2)

def get_submission_by_id(submission_id):
    submissions = load_submissions()
    return submissions.get(str(submission_id))

def save_submission(result_data):
    submissions = load_submissions()
    sub_id = result_data.get('submissionId') or str(uuid.uuid4())
    result_data['submissionId'] = sub_id
    submissions[sub_id] = result_data
    save_submissions(submissions)
    return result_data
