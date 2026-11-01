import os
import json
import uuid
import time
from datetime import datetime
from functools import wraps
from flask import (
    Flask, render_template, request, jsonify, redirect, url_for, session, send_from_directory, abort
)
from werkzeug.utils import secure_filename
from storage import (
    load_tests, save_test, get_test_by_id, delete_test,
    load_submissions, get_submission_by_id
)
from scoring import calculate_and_save_result

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, 'public', 'uploads')
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.environ.get('SESSION_SECRET', 'horizon-test-series-secret-key-2026')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'jee2026admin')

# Helper: Admin auth decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'success': False, 'error': 'Unauthorized'}), 401
            return redirect(url_for('admin_login', next=request.path))
        return f(*args, **kwargs)
    return decorated_function

# ----------------- Public Routes -----------------

@app.route('/')
def index():
    tests = load_tests()
    published_tests = [t for t in tests if t.get('status') == 'published']
    # Add computed totalQuestions to each
    for t in published_tests:
        t['totalQuestions'] = sum(s.get('totalQuestions', 0) for s in t.get('subjects', []))
    return render_template('index.html', tests=published_tests)

@app.route('/test/<test_id>')
def test_page(test_id):
    test = get_test_by_id(test_id)
    if not test:
        return render_template('error.html', message='Requested test paper was not found.'), 404
    candidate_name = request.args.get('name', '').strip() or 'JEE Aspirant'
    return render_template('test.html', test_id=test_id, candidate_name=candidate_name)

@app.route('/result/<submission_id>')
def result_page(submission_id):
    result = get_submission_by_id(submission_id)
    if not result:
        return render_template('error.html', message='Submission result not found.'), 404
    return render_template('result.html', submission=result)

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOADS_DIR, filename)

# ----------------- Student APIs -----------------

@app.route('/api/tests/<test_id>', methods=['GET'])
def api_get_test(test_id):
    public_test = get_test_by_id(test_id, public_only=True)
    if not public_test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404
    return jsonify({'success': True, 'test': public_test})

@app.route('/api/tests/<test_id>/submit', methods=['POST'])
def api_submit_test(test_id):
    test = get_test_by_id(test_id)
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    data = request.get_json(silent=True) or {}
    candidate_responses = data.get('candidateResponses', {})
    time_taken_seconds = data.get('timeTakenSeconds', 0)
    candidate_name = data.get('candidateName', 'JEE Aspirant')

    submission_req = {
        'candidateResponses': candidate_responses,
        'timeTakenSeconds': time_taken_seconds,
        'candidateName': candidate_name,
    }

    result = calculate_and_save_result(test, submission_req)
    return jsonify({
        'success': True,
        'submissionId': result['submissionId'],
        'message': 'Test submitted successfully'
    })

@app.route('/api/results/<submission_id>', methods=['GET'])
def api_get_result(submission_id):
    result = get_submission_by_id(submission_id)
    if not result:
        return jsonify({'success': False, 'error': 'Result not found'}), 404
    return jsonify({'success': True, 'result': result})

# ----------------- Admin Routes & APIs -----------------

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    error = None
    if request.method == 'POST':
        entered_password = request.form.get('password', '')
        if entered_password == ADMIN_PASSWORD:
            session['is_admin'] = True
            next_url = request.args.get('next') or url_for('admin_dashboard')
            return redirect(next_url)
        else:
            error = 'Invalid password. Please try again.'
    return render_template('login.html', error=error)

@app.route('/admin/logout')
def admin_logout():
    session.pop('is_admin', None)
    return redirect(url_for('index'))

@app.route('/admin')
@admin_required
def admin_dashboard():
    tests = load_tests()
    for t in tests:
        t['totalQuestions'] = sum(s.get('totalQuestions', 0) for s in t.get('subjects', []))
    submissions = list(load_submissions().values())
    # Sort submissions by submittedAt desc
    submissions.sort(key=lambda s: s.get('submittedAt', ''), reverse=True)
    return render_template('admin.html', tests=tests, submissions=submissions)

@app.route('/api/admin/tests', methods=['POST'])
@admin_required
def api_admin_create_test():
    title = request.form.get('title', '').strip()
    duration = int(request.form.get('duration', 180))
    total_marks = int(request.form.get('totalMarks', 300))
    status = request.form.get('status', 'draft')

    subjects_raw = request.form.get('subjects', '[]')
    try:
        subjects = json.loads(subjects_raw)
    except Exception:
        subjects = []

    if not subjects:
        subjects = [
            {'id': 'physics', 'name': 'Physics', 'startQuestion': 1, 'endQuestion': 25, 'totalQuestions': 25},
            {'id': 'chemistry', 'name': 'Chemistry', 'startQuestion': 26, 'endQuestion': 50, 'totalQuestions': 25},
            {'id': 'mathematics', 'name': 'Mathematics', 'startQuestion': 51, 'endQuestion': 75, 'totalQuestions': 25},
        ]

    pdf_file = request.files.get('pdf')
    pdf_url = ''
    pdf_file_name = ''

    if pdf_file and pdf_file.filename:
        filename = f"{int(time.time() * 1000)}-{secure_filename(pdf_file.filename)}"
        filepath = os.path.join(UPLOADS_DIR, filename)
        pdf_file.save(filepath)
        pdf_url = f"/uploads/{filename}"
        pdf_file_name = pdf_file.filename

    marking_scheme = {
        'correct': int(request.form.get('markingCorrect', 4)),
        'incorrect': int(request.form.get('markingIncorrect', -1)),
        'unattempted': int(request.form.get('markingUnattempted', 0)),
    }

    # Automatically compute maximum marks
    total_q = sum(s.get('totalQuestions', 0) for s in subjects) or 75
    total_marks = total_q * marking_scheme.get('correct', 4)

    pdf_start_page = int(request.form.get('pdfStartPage', 1)) if request.form.get('pdfStartPage') else 1
    pdf_end_page = int(request.form.get('pdfEndPage')) if request.form.get('pdfEndPage') else None

    integer_questions = []
    if request.form.get('integerQuestions'):
        try:
            integer_questions = json.loads(request.form.get('integerQuestions'))
        except Exception:
            integer_questions = []

    new_test = {
        'id': str(uuid.uuid4()),
        'title': title,
        'duration': duration,
        'totalMarks': total_marks,
        'pdfUrl': pdf_url,
        'pdfFileName': pdf_file_name,
        'pdfStartPage': pdf_start_page,
        'pdfEndPage': pdf_end_page,
        'subjects': subjects,
        'integerQuestions': integer_questions,
        'markingScheme': marking_scheme,
        'answerKey': {},
        'status': status,
    }

    saved = save_test(new_test)
    return jsonify({'success': True, 'test': saved})

@app.route('/api/admin/tests/<test_id>', methods=['GET'])
@admin_required
def api_admin_get_test(test_id):
    test = get_test_by_id(test_id)
    if not test:
        return jsonify({'success': False, 'error': 'Test not found'}), 404
    return jsonify({'success': True, 'test': test})

@app.route('/api/admin/tests/<test_id>', methods=['PUT'])
@admin_required
def api_admin_update_test(test_id):
    existing = get_test_by_id(test_id)
    if not existing:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    data = request.get_json(silent=True) or {}
    for key in ['title', 'duration', 'totalMarks', 'pdfStartPage', 'pdfEndPage', 'integerQuestions', 'subjects', 'markingScheme', 'answerKey', 'status', 'pdfUrl', 'pdfFileName']:
        if key in data:
            existing[key] = data[key]

    saved = save_test(existing)
    return jsonify({'success': True, 'test': saved})

@app.route('/api/admin/tests/<test_id>/pdf', methods=['POST'])
@admin_required
def api_admin_replace_pdf(test_id):
    existing = get_test_by_id(test_id)
    if not existing:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    pdf_file = request.files.get('pdf')
    if not pdf_file or not pdf_file.filename:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400

    filename = f"{int(time.time() * 1000)}-{secure_filename(pdf_file.filename)}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    pdf_file.save(filepath)

    existing['pdfUrl'] = f"/uploads/{filename}"
    existing['pdfFileName'] = pdf_file.filename
    save_test(existing)

    return jsonify({'success': True, 'pdfUrl': existing['pdfUrl'], 'pdfFileName': existing['pdfFileName']})

@app.route('/api/admin/tests/<test_id>/toggle-publish', methods=['POST'])
@admin_required
def api_admin_toggle_publish(test_id):
    existing = get_test_by_id(test_id)
    if not existing:
        return jsonify({'success': False, 'error': 'Test not found'}), 404

    existing['status'] = 'draft' if existing.get('status') == 'published' else 'published'
    save_test(existing)
    return jsonify({'success': True, 'status': existing['status']})

@app.route('/api/admin/tests/<test_id>', methods=['DELETE'])
@admin_required
def api_admin_delete_test(test_id):
    deleted = delete_test(test_id)
    return jsonify({'success': deleted})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
