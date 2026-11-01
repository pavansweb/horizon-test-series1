# HORIZON TEST SERIES - CBT Mock Test Platform (Python Flask & Next.js)

A full-featured personal mock test platform replicating the official **HORIZON TEST SERIES** Computer Based Test (CBT) examination experience.

Available in both **Python Flask** and **Next.js**.

---

## Running with Python Flask

1. Activate virtual environment (or install requirements):
```bash
./venv/bin/pip install -r requirements.txt
```

2. Run the server:
```bash
python3 run.py
```
Or with custom port:
```bash
PORT=5000 python3 run.py
```

3. Open in your browser:
* **Student CBT Portal:** [http://localhost:5000](http://localhost:5000)
* **Sample Test:** [http://localhost:5000/test/jee-2026-sample-01](http://localhost:5000/test/jee-2026-sample-01)
* **Admin Dashboard:** [http://localhost:5000/admin](http://localhost:5000/admin) (Password: `jee2026admin`)

---


## Key Features

### 1. Student Examination CBT Interface
* **Authentic NTA CBT Replica**: Desktop-first layout mirroring the official NTA JEE Main interface (colors, fonts, header, candidate profile, and button hierarchy).
* **Independent Vertically Scrollable PDF Viewer**: Embedded question paper viewer with zoom-in, zoom-out, fit-width, pop-out, and fullscreen support. Navigation and PDF scrolling operate independently—no OCR or question detection required.
* **4-Option Answer Selector (A, B, C, D)**: Standard radio options with instant visual feedback and response clearing.
* **Official 5-State Question Palette**:
  - `Not Visited` (Silver/Gray box)
  - `Not Answered` (Red/Orange trapezoid badge)
  - `Answered` (Green polygon badge)
  - `Marked for Review` (Purple circle)
  - `Answered & Marked for Review` (Purple circle with green evaluated indicator)
* **Subject Sections**: Physics, Chemistry, and Mathematics navigation tabs with question counts and real-time status tracking.
* **Countdown Timer**: Real-time examination clock with low-time warning (< 15 mins) and urgent flashing (< 5 mins), automatically submitting when time expires.
* **NTA Control Actions**: *Save & Next*, *Save & Mark for Review*, *Clear Response*, *Mark for Review & Next*, *Previous*, and *Next*.
* **Automatic Progress Persistence**: Progress, active question, and timer ticks are auto-saved in `localStorage` (`jee_cbt_attempt_[testId]`) so accidental refreshes or browser crashes will never lose answers.
* **Tabular Submission Summary**: Confirmation dialog displaying subject-wise counts (*Answered*, *Not Answered*, *Marked for Review*, *Answered & Marked*, *Not Visited*) before final evaluation.
* **Comprehensive Performance Analytics**:
  - Total Score, Maximum Marks, Accuracy %, Correct, Incorrect, and Left counts.
  - Subject-wise breakdown table for Physics, Chemistry, and Mathematics.
  - Question-wise detailed review with candidate answer vs. correct answer, marks awarded (+4, -1, 0), and side-by-side question paper review.

### 2. Admin Management Dashboard
* **Protected Admin Route**: Secured with password authentication and HMAC-signed session cookies.
* **60-Second Test Upload Workflow**:
  1. Upload any JEE Main question paper PDF.
  2. Set test title, duration (default 180 mins), and total marks (default 300).
  3. Configure question distribution for Physics, Chemistry, and Mathematics (e.g. 30/30/30 or 25/25/25).
  4. Paste answer key using the **Fast Bulk Paste Tool** (supports `A B C D...` or `1:A, 2:B...`) or click in the interactive matrix editor.
  5. Configure marking scheme (e.g. +4, -1, 0).
  6. Publish instantly to the student portal.
* **Test Lifecycle Management**: Edit details, replace question paper PDFs, update answer keys, toggle draft/published, or delete tests.
* **Zero Code Changes**: Adding new tests never requires modifying source code or manually editing JSON files.

### 3. Server-Side Security
* **Private Answer Keys**: Answer keys are stored exclusively on the server and are strictly stripped from all public endpoints. The client never receives correct answers until after submission.

---

## Architecture & Storage Strategy

The application uses an environment-aware storage abstraction:

| Environment | Database | PDF Storage | External Setup Needed? |
| :--- | :--- | :--- | :--- |
| **Local Development** | Local JSON DB (`data/tests.json`) | Local disk (`public/uploads/`) | **None** (Works immediately out-of-the-box) |
| **Vercel (Option A: Recommended)** | Local JSON DB / Supabase | **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`) | 1-Click Blob store on Vercel |
| **Vercel (Option B: Full Cloud)** | **Supabase PostgreSQL** | **Supabase Storage** (`jee-question-papers`) | Free Supabase project |

---

## Quick Start (Local Development)

```bash
# 1. Navigate to project directory
cd /home/zen/Projects/jee-mock-portal

# 2. Install dependencies (if not already installed)
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
* **Student Homepage**: `http://localhost:3000/`
* **Admin Dashboard**: `http://localhost:3000/admin`
* **Default Admin Password**: `jee2026admin` (configured in `.env.local`)

---

## Vercel Deployment Instructions

### Option 1: Deploy with Vercel Blob (Fastest - 2 minutes)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of JEE Main CBT Mock Test Portal"
   git remote add origin https://github.com/your-username/jee-mock-portal.git
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your repository and click **Deploy**.

3. **Add Vercel Blob Storage**:
   - In your Vercel project dashboard, go to the **Storage** tab.
   - Click **Create Database** and select **Blob**.
   - Connect the Blob store to your project. Vercel automatically sets `BLOB_READ_WRITE_TOKEN`.

4. **Set Environment Variables**:
   In your Vercel project settings (**Settings -> Environment Variables**), add:
   - `ADMIN_PASSWORD`: Your secret admin password (e.g. `MySecurePass2026!`).
   - `SESSION_SECRET`: A random 32+ character string.

5. Click **Redeploy**. Your persistent mock test portal is live!

---

### Option 2: Deploy with Supabase (Free Database + Storage)

1. Open your Supabase project (e.g. `https://supabase.com/dashboard/project/xdfpixytkjneiedexhfk`).
2. Go to **SQL Editor** on the left menu.
3. Open [`supabase_schema.sql`](supabase_schema.sql) in this repository, copy its entire contents, paste it into the SQL Editor, and click **Run**.
   - This creates `jee_tests` and `jee_submissions` tables with RLS policies.
   - It sets up the `jee-question-papers` public storage bucket.
   - It automatically seeds the initial 75-question JEE Main 2026 Full Syllabus Mock Test!
4. In your Vercel Project Settings (**Settings -> Environment Variables**), add:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://xdfpixytkjneiedexhfk.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_uHfcoUDYpPqHxJldoiBsfQ_8G5xKnhH`
   - `ADMIN_PASSWORD`: Your chosen admin password (e.g. `jee2026admin`).
   - `SESSION_SECRET`: A random 32+ character string.
5. Deploy or Redeploy on Vercel!

---

## How to Add a New Test Paper

1. Navigate to `/admin` and log in with your admin password.
2. Click **Upload New JEE Test Paper**.
3. **Details**: Enter the test name (e.g., *JEE Main 2025 Jan 28 Shift 2*) and drag in your PDF.
4. **Subjects & Marking**: Confirm question counts for Physics, Chemistry, and Mathematics (default: 30 each) and marking scheme (+4, -1, 0).
5. **Answer Key**: Paste the answer key (e.g., `A B C D A B...` or `1:A, 2:B, 3:C...`) and click **Parse & Apply**, or use the visual matrix to adjust any questions.
6. Click **Publish JEE Mock Test**.
7. The test immediately appears on the homepage for full CBT examination practice.
