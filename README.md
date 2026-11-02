# HORIZON TEST SERIES - JEE (Main) CBT Mock Test Platform

A high-performance, full-featured Computer Based Test (CBT) mock exam platform built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**, featuring **Google Gemini AI** for automatic question paper formatting and authentic **NTA JEE Main CBT simulation**.

---

## 🌟 Highlights & Key Features

### 1. 🤖 AI-Powered Question Paper Auto-Formatting (Powered by Gemini AI)
* **Direct PDF-to-Questions Pipeline**: Upload any official JEE Main question paper PDF.
* **Intelligent Structure Extraction**: Automatically detects question sequence, subject ordering (Physics, Chemistry, Mathematics), Section A (MCQs), and Section B (Numerical Value questions).
* **LaTeX Math & Formula Rendering**: Formatted using KaTeX for mathematical equations, chemical formulas, and diagrams.
* **Auto Answer Key & Solutions**: Extracts answer keys and step-by-step solutions directly from the PDF solutions table.
* **Admin Question Inspector & Editor**: Review, edit, or adjust question statements, options, keys, and explanations before publishing.

### 2. 🖥️ Authentic NTA JEE Main CBT Exam Interface
* **True-to-Life NTA Exam Replica**: Header, candidate profile, timers, subject tabs, and button hierarchy match the real JEE Main CBT.
* **Official 5-State Question Palette**:
  - `Not Visited` (Silver/Gray box)
  - `Not Answered` (Red/Orange trapezoid badge)
  - `Answered` (Green polygon badge)
  - `Marked for Review` (Purple circle)
  - `Answered & Marked for Review` (Purple circle with green evaluated indicator)
* **Real-time Live Counters**: Status counts update dynamically in the legend.
* **NTA Control Actions**:
  - *Save & Next*
  - *Save & Mark for Review*
  - *Clear Response*
  - *Mark for Review & Next*
  - *<< Back* and *Next >>*
  - *Submit Test*
* **Numerical Keypad**: Interactive on-screen keypad for Section B numerical questions.
* **Optional PDF Cross-Reference**: Student can toggle the original PDF viewer at any moment to inspect complex diagrams.
* **Progress Persistence**: Exam state is saved to `localStorage` (`jee_cbt_attempt_[testId]`) so accidental browser refreshes or power drops never lose progress.

### 3. 🌗 Dark & Light Theme Enabled Throughout
* Instant, flicker-free toggle between dark mode and light mode across every page:
  - Homepage & Test Directory
  - Live CBT Examination Screen
  - Question Palette & Header
  - Performance & Result Analytics
  - Admin Dashboard & Modals
* Remembers user preference across sessions (`localStorage`).

### 4. 📈 Comprehensive Performance & Result Analytics
* **Executive Summary**: Total Score, Maximum Marks, Accuracy %, Correct, Wrong, and Left counts.
* **Subject-Wise Breakdown**: Physics, Chemistry, and Mathematics score cards, accuracy bars, and attempt rates.
* **Question-by-Question Review**:
  - Filter by Correct, Wrong, or Left.
  - Formatted question statement with LaTeX math rendering.
  - Candidate's chosen answer vs. official answer key.
  - Step-by-step explanation and solution.
  - Side-by-side verification with full original question paper PDF.

### 5. 🛠️ Admin Management & Student Performances Dashboard
* **Secure Admin Access**: Protected with admin password (`/admin`) and HMAC session cookies.
* **Test Papers Management**: Upload, preview, edit questions, update answer keys, replace PDFs, or toggle draft/published status.
* **Student Performances Tab**:
  - Aggregate statistics: Total Attempts, Average Score, Top Score, Average Accuracy %.
  - Search by student name and filter by test paper.
  - Full attempt history table: candidate name, test title, score, accuracy, breakdown (C/W/L), time taken, and timestamp.
  - One-click access to candidate's full analysis report.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create or verify `.env.local`:
```env
# Admin Credentials
ADMIN_PASSWORD=jee2026admin
SESSION_SECRET=your-random-32-character-session-secret

# Google Gemini AI Studio API Key (from https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Supabase (falls back to local JSON database automatically)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
* **Student Portal:** [http://localhost:3000](http://localhost:3000)
* **Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin) (Default Password: `jee2026admin`)

---

## 🏗️ Building for Production
```bash
npm run build
npm run start
```

---

## ☁️ Deployment (Vercel)
1. Push code to GitHub repository.
2. Import project in [Vercel](https://vercel.com/new).
3. Set environment variables:
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `GEMINI_API_KEY`
4. Click **Deploy**.
