import uuid
from datetime import datetime
from storage import save_submission

def normalize_option(opt):
    if not opt:
        return ''
    o = str(opt).strip().upper()
    mapping = {'1': 'A', '2': 'B', '3': 'C', '4': 'D'}
    return mapping.get(o, o)

def is_integer_question(q_num, test):
    int_qs = test.get('integerQuestions')
    if int_qs and len(int_qs) > 0:
        return q_num in int_qs
    return (21 <= q_num <= 25) or (45 <= q_num <= 50) or (70 <= q_num <= 75)

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

        raw_selected = candidate_responses.get(str(q_num))
        if raw_selected is None:
            raw_selected = candidate_responses.get(q_num)
        raw_correct = answer_key.get(str(q_num))
        if raw_correct is None:
            raw_correct = answer_key.get(q_num, '')

        norm_selected = normalize_option(raw_selected)
        norm_correct = normalize_option(raw_correct)

        is_int_q = is_integer_question(q_num, test)
        is_attempted = bool(raw_selected is not None and str(raw_selected).strip() != '')
        is_correct = False

        if is_attempted:
            if is_int_q:
                try:
                    cand_f = float(str(raw_selected).strip())
                    corr_f = float(str(raw_correct).strip())
                    is_correct = abs(cand_f - corr_f) < 0.0001
                except ValueError:
                    is_correct = str(raw_selected).strip().lower() == str(raw_correct).strip().lower()
            else:
                is_correct = (norm_selected == norm_correct)

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
            'selectedOption': str(raw_selected) if raw_selected is not None else None,
            'correctOption': str(raw_correct) if raw_correct is not None else '',
            'isCorrect': is_correct,
            'isAttempted': is_attempted,
            'marksAwarded': marks_awarded,
            'status': status
        })

    # Calculate accuracies
    for s_id, s_data in subject_results_map.items():
        if s_data['attempted'] > 0:
            s_data['accuracy'] = round((s_data['correct'] / s_data['attempted']) * 100, 1)

    total_accuracy = round((total_correct / total_attempted) * 100, 1) if total_attempted > 0 else 0
    max_total_marks = total_q * marking_scheme.get('correct', 4)

    result_data = {
        'submissionId': str(uuid.uuid4()),
        'testId': test.get('id'),
        'testTitle': test.get('title', 'JEE Mock Test'),
        'pdfUrl': test.get('pdfUrl', ''),
        'candidateName': candidate_name,
        'submittedAt': datetime.utcnow().isoformat() + 'Z',
        'timeTakenSeconds': time_taken_seconds,
        'totalScore': total_score,
        'maxScore': max_total_marks,
        'accuracy': total_accuracy,
        'totalAttempted': total_attempted,
        'totalCorrect': total_correct,
        'totalIncorrect': total_incorrect,
        'totalUnattempted': total_unattempted,
        'subjectResults': list(subject_results_map.values()),
        'questionReviews': question_reviews
    }

    save_submission(result_data)
    return result_data
