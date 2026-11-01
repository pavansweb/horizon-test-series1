# Implementation Plan: Smart Answer Key Pipeline & Effortless Upload

Eliminate the mess and friction of uploading answer keys for JEE Main and other mock papers (such as `jee_main_2026_sample_paper_1.pdf`) through intelligent multi-format parsing, multi-column table detection, zero-mouse rapid keyboard entry ("Speed-Tagger"), and CSV/Excel import.

---

## 1. The Core Problem
When you get question papers like `jee_main_2026_sample_paper_1.pdf`, answer keys come separately (from WhatsApp, text files, answer key sheets, or PDFs) in very messy formats:
1. **Multi-column copied tables**: e.g., copying across columns results in rows like `1 A 26 B 51 C` instead of sequential `1..75`.
2. **Numeric option notation**: e.g. `1: (3), 2: (1), 3: (4)` where (1,2,3,4) mean (A,B,C,D), while question 21 has `21: 45` where 45 is an integer numerical value!
3. **Spreadsheet tables**: Tab-separated key tables from Excel or Google Sheets.
4. **Delimited strings**: `A B C D A...` or `1.A 2.B 3.C`.
5. **Answer tables embedded in the PDF**: Tables on the final pages of the PDF.

---

## 2. Proposed Solution & Features

### Feature 1: Universal Smart Parser
Paste **ANY** messy text format and it will automatically parse:
- **Intelligent Type Awareness**:
  - For MCQs (Q1–Q20, Q26–Q45, Q51–Q70): automatically converts `1` → `A`, `2` → `B`, `3` → `C`, `4` → `D` (handles `(1)`, `[2]`, `Option 3`, etc.).
  - For Integer questions (Q21–Q25, Q45–Q50, Q70–Q75): preserves the exact number (`5`, `12.5`, `-3`).
- **Multi-Column Table Demuxer**:
  - Automatically detects horizontal multi-column table copies like:
    ```
    1 A 26 B 51 C
    2 B 27 C 52 D
    ```
    and correctly maps Q1, Q2, Q26, Q27, Q51, Q52 to their proper questions!
- **Tab-separated & Excel Grid**:
  - Direct clipboard paste from Excel / Google Sheets (`Q.No [TAB] Answer`).

### Feature 2: Speed-Tagger (Zero-Mouse Keyboard Entry)
For someone keying in answers from a physical sheet or book in front of them:
- Focused card: `Q. 1 [ Physics - MCQ ]`
- Pressing `1` (or `A`), `2` (`B`), `3` (`C`), `4` (`D`) on your keyboard sets the answer and **instantly auto-advances** to the next question.
- For integer questions, cursor auto-focuses the numeric input. Type number and press `Enter` to advance.
- You can fill all 75 questions in **under 45 seconds without touching the mouse**!

### Feature 3: CSV & Excel Template Import / Export
- **1-Click Download CSV Template**: Generates a pre-filled CSV template (`Question Number, Type, Answer`).
- **Upload CSV**: Upload your filled CSV or text file to populate the entire answer key instantly.

### Feature 4: In-PDF Answer Auto-Scan
- A **"Scan PDF for Answers"** button in the upload modal that checks the final pages of the uploaded PDF for answer key tables and pre-fills them if found.

---

## 3. Files to Create & Update
1. `src/lib/answerKeyParser.ts` [NEW]: Dedicated parser engine with multi-column, Excel, and numerical differentiation algorithms.
2. `src/components/admin/AnswerKeyEditor.tsx` [MODIFY]: Add Smart Paste tab, Speed-Tagger mode, and CSV import/export.
3. `templates/admin.html` [MODIFY]: Add the same smart parser and rapid entry features to Flask admin.
