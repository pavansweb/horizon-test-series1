import os
import json
import uuid
import urllib.request
import urllib.error
from datetime import datetime

# Load environment variables from .env.local or .env if present
def load_dotenv():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for env_filename in ['.env.local', '.env']:
        env_path = os.path.join(base_dir, env_filename)
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            k, v = line.split('=', 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass

load_dotenv()

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
TESTS_FILE = os.path.join(DATA_DIR, 'tests.json')
SUBMISSIONS_FILE = os.path.join(DATA_DIR, 'submissions.json')

SUPABASE_URL = (
    os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or 
    os.environ.get('SUPABASE_URL') or ''
).rstrip('/')

SUPABASE_KEY = (
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or
    os.environ.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') or
    os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or
    os.environ.get('SUPABASE_KEY') or ''
)

_supabase_available = True

def is_supabase_enabled():
    return bool(SUPABASE_URL and SUPABASE_KEY and _supabase_available)

def supabase_request(endpoint, method='GET', payload=None):
    global _supabase_available
    if not is_supabase_enabled():
        return None
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f"Bearer {SUPABASE_KEY}",
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            resp_body = resp.read().decode('utf-8')
            if resp_body:
                return json.loads(resp_body)
            return True
    except Exception as e:
        # PostgREST table not created yet or offline: fallback to local JSON
        _supabase_available = False
        return None

def ensure_data_files():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(TESTS_FILE):
        with open(TESTS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, indent=2)
    if not os.path.exists(SUBMISSIONS_FILE):
        with open(SUBMISSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump({}, f, indent=2)

def load_tests_local():
    ensure_data_files()
    try:
        with open(TESTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading local tests: {e}")
        return []

def load_tests():
    # Attempt Supabase first if available
    if is_supabase_enabled():
        sb_tests = supabase_request('jee_tests?select=*&order=createdAt.desc')
        if sb_tests is not None and len(sb_tests) > 0:
            return sb_tests

    return load_tests_local()

def save_tests(tests):
    ensure_data_files()
    with open(TESTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(tests, f, indent=2)

def get_test_by_id(test_id, public_only=False):
    test = None
    if is_supabase_enabled():
        sb_test = supabase_request(f'jee_tests?id=eq.{test_id}&select=*')
        if sb_test and len(sb_test) > 0:
            test = sb_test[0]

    if not test:
        tests = load_tests_local()
        for t in tests:
            if str(t.get('id')) == str(test_id):
                test = t
                break

    if test:
        if public_only:
            # Return sanitized public copy without answerKey
            public_copy = dict(test)
            public_copy.pop('answerKey', None)
            total_q = sum(s.get('totalQuestions', 0) for s in test.get('subjects', []))
            public_copy['totalQuestions'] = total_q or 75
            return public_copy
        return test

    return None

def save_test(test_data):
    test_id = test_data.get('id')
    now = datetime.utcnow().isoformat() + 'Z'
    
    if not test_id:
        test_id = str(uuid.uuid4())
        test_data['id'] = test_id
        test_data['createdAt'] = now
        test_data['updatedAt'] = now
    else:
        test_data['updatedAt'] = now
        if 'createdAt' not in test_data:
            test_data['createdAt'] = now

    # Save to Supabase if configured
    if is_supabase_enabled():
        supabase_request('jee_tests', method='POST', payload=test_data)

    # Always persist locally as well
    tests = load_tests_local()
    found = False
    for i, t in enumerate(tests):
        if str(t.get('id')) == str(test_id):
            tests[i] = test_data
            found = True
            break
    if not found:
        tests.insert(0, test_data)
        
    save_tests(tests)
    return test_data

def delete_test(test_id):
    if is_supabase_enabled():
        supabase_request(f'jee_tests?id=eq.{test_id}', method='DELETE')

    tests = load_tests_local()
    new_tests = [t for t in tests if str(t.get('id')) != str(test_id)]
    save_tests(new_tests)
    return len(new_tests) < len(tests)

def load_submissions_local():
    ensure_data_files()
    try:
        with open(SUBMISSIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading submissions: {e}")
        return {}

def load_submissions():
    return load_submissions_local()

def save_submissions(submissions):
    ensure_data_files()
    with open(SUBMISSIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(submissions, f, indent=2)

def get_submission_by_id(submission_id):
    if is_supabase_enabled():
        sb_sub = supabase_request(f'jee_submissions?submissionId=eq.{submission_id}&select=*')
        if sb_sub and len(sb_sub) > 0 and 'data' in sb_sub[0]:
            return sb_sub[0]['data']

    submissions = load_submissions_local()
    return submissions.get(str(submission_id))

def save_submission(result_data):
    sub_id = result_data.get('submissionId') or str(uuid.uuid4())
    result_data['submissionId'] = sub_id

    # Persist to Supabase
    if is_supabase_enabled():
        supabase_request('jee_submissions', method='POST', payload={
            'submissionId': sub_id,
            'testId': result_data.get('testId', ''),
            'data': result_data,
            'createdAt': result_data.get('submittedAt') or datetime.utcnow().isoformat() + 'Z'
        })

    # Persist locally
    submissions = load_submissions_local()
    submissions[sub_id] = result_data
    save_submissions(submissions)
    return result_data
