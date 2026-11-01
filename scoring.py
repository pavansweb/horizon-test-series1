import uuid
from datetime import datetime
from storage import save_submission

def normalize_option(opt):
    if not opt:
        return ''
    o = str(opt).strip().upper()
    mapping = {'1': 'A', '2': 'B', '3': 'C', '4': 'D'}
    return mapping.get(o, o)

def calculate_and_save_result(test, submission):
    candidate_responses = submission.get('candidateResponses', {})
    time_taken_seconds = submission.get('timeTakenSeconds', 0)
    candidate_name = submission.get('candidateName', 'JEE Aspirant')

    marking_scheme = test.get('markingScheme', {'correct': 4, 'incorrect': -1, 'unattempted': 0})
    subjects = test.get('subjects', [])
    answer_key = test.get('answerKey', {})

    subject_results_map = {}
    for s in subjects:
        sub_id = s.get('id')
        subject_results_map[sub_id] = {
            'subjectId': sub_id,
            'subjectName': s.get('name', sub_id),
            'score': 0,
            'maxScore': s.get('totalQuestions', 0) * marking_scheme.get('correct', 4),
            'totalQuestions': s.get('totalQuestions', 0),
            'attempted': 0,
            'correct': 0,
            'incorrect': 0,
            'unattempted': 0,
            'accuracy': 0,
        }

    question_reviews = []
    total_score = 0
    total_attempted = 0
    total_correct = 0
    total_incorrect = 0
    total_unattempted = 0

    total_q = sum(s.get('totalQuestions', 0) for s in subjects)

    for q_num in range(1, total_q + 1):
        # Determine subject
        target_sub = subjects[0] if subjects else {'id': 'default', 'name': 'General'}
        for s in subjects:
            if s.get('startQuestion', 1) <= q_num <= s.get('endQuestion', total_q):
                target_sub = s
                break

        sub_id = target_sub.get('id')
        sub_stat = subject_results_map.get(sub_id)

        raw_selected = candidate_responses.get(str(q_num)) or candidate_responses.get(q_num)
        raw_correct = answer_key.get(str(q_num)) or answer_key.get(q_num, '')

        norm_selected = normalize_option(raw_selected)
        norm_correct = normalize_option(raw_correct)

        is_attempted = bool(norm_selected)
        is_correct = is_attempted and (norm_selected == norm_correct)

        marks_awarded = 0
        if is_attempted:
            total_attempted += 1
            if sub_stat:
                sub_stat['attempted'] += 1
            if is_correct:
                marks_awarded = marking_scheme.get('correct', 4)
                total_correct += 1
                if sub_stat:
                    sub_stat['correct'] += 1
            else:
                marks_awarded = marking_scheme.get('incorrect', -1)
                total_incorrect += 1
                if sub_stat:
                    sub_stat['incorrect'] += 1
        else:
            total_unattempted += 1
            if sub_stat:
                sub_stat['unattempted'] += 1
            marks_awarded = marking_scheme.get('unattempted', 0)

        if sub_stat:
            sub_stat['score'] += marks_awarded
        total_score += marks_awarded

        status = 'unattempted' if not is_attempted else ('correct' if is_correct else 'incorrect')

        question_reviews.append({
            'questionNumber': q_num,
            'subjectId': sub_id,
            'subjectName': target_sub.get('name', sub_id),
            'selectedOption': raw_selected if raw_selected else None,
            'correctOption': raw_correct if raw_correct else '',
            'isCorrect': is_correct,
            'isAttempted': is_attempted,
            'marksAwarded': marks_awarded,
            'status': status,
        })

    # Calculate accuracy
    subject_results = []
    for s_id, s_data in subject_results_map.items():
        att = s_data['attempted']
        corr = s_data['correct']
        s_data['accuracy'] = round((corr / att) * 100) if att > 0 else 0
        subject_results.append(s_data)

    overall_accuracy = round((total_correct / total_attempted) * 100) if total_attempted > 0 else 0
    max_score = total_q * marking_scheme.get('correct', 4)

    submission_id = str(uuid.uuid4())
    result_data = {
        'submissionId': submission_id,
        'testId': test.get('id'),
        'testTitle': test.get('title', 'Horizon Mock Test'),
        'pdfUrl': test.get('pdfUrl', ''),
        'candidateName': candidate_name,
        'submittedAt': datetime.utcnow().isoformat() + 'Z',
        'totalScore': total_score,
        'maxScore': max_score,
        'totalQuestions': total_q,
        'totalAttempted': total_attempted,
        'totalCorrect': total_correct,
        'totalIncorrect': total_incorrect,
        'totalUnattempted': total_unattempted,
        'overallAccuracy': overall_accuracy,
        'timeTakenSeconds': time_taken_seconds,
        'durationMinutes': test.get('duration', 180),
        'subjectResults': subject_results,
        'questionReviews': question_reviews,
    }

    save_submission(result_data)
    return result_data
