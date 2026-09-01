# 🛠️ System Setup & Deployment Guide

Welcome to the **AI Video Intelligence & Learning Platform** setup guide. This document provides step-by-step instructions for running the application locally or deploying it in production using Docker.

---

## ⚡ Quick Verification Credentials

To immediately test and explore the platform without manually registering or processing new videos:

| Role | Email | Password | Pre-loaded Data |
| :--- | :--- | :--- | :--- |
| **Student (Default)** | `user@ex.com` | `password` | Enrolled in Computer Basics, ready with video transcripts & quizzes. |
| **Student 1** | `student1@learn.com` | `Student1@123` | Enrolled in all 3 courses with 15 completed quiz attempts and analytics. |
| **Administrator** | `admin@example.com` | `admin123` | Full access to Admin Panel, Course Management, and Student Doubts Q&A. |

---

## 🐳 Option A: Docker Deployment (Recommended)

Run the entire multi-container stack (.NET C# backend + Faster-Whisper + React Nginx frontend) with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/itsmeakarshan/video-intelligence-platform.git
cd video-intelligence-platform

# 2. Copy the environment template
cp backend/.env.example backend/.env

# 3. Add your Gemini API Key
# Open backend/.env and set:
# GEMINI_API_KEY=your_actual_gemini_api_key

# 4. Build and run the containers
docker-compose up --build
```

* **Frontend:** `http://localhost` (Port 80)
* **Backend API:** `http://localhost:8000` (Port 8000)

---

## 💻 Option B: Manual Local Setup (Development)

### Prerequisites

| Tool | Version | Purpose |
| :--- | :--- | :--- |
| **.NET SDK** | 9.0+ | High-Performance ASP.NET Core Web API |
| **Node.js & npm** | 20+ / 22+ | React 19 + Vite Frontend Development |
| **Python** | 3.10 - 3.12 | Faster-Whisper Speech-to-Text Transcription |
| **FFmpeg** | 6.0+ | Video processing and audio extraction |

---

### Step 1: Install System Dependencies

#### macOS (Homebrew)
```bash
brew install dotnet-sdk node ffmpeg python@3.11
```

#### Windows (winget / Chocolatey)
```powershell
winget install Microsoft.DotNet.SDK.9
winget install OpenJS.NodeJS
winget install Gyan.FFmpeg
winget install Python.Python.3.11
```

#### Ubuntu / Debian
```bash
sudo apt update && sudo apt install -y dotnet-sdk-9.0 nodejs npm ffmpeg python3 python3-pip python3-venv
```

---

### Step 2: Configure Whisper Speech-to-Text

From the repository root, set up the Python virtual environment for Faster-Whisper:

```bash
cd backend/ml
python3 -m venv .venv

# On macOS/Linux:
source .venv/bin/activate

# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
cd ../..
```

---

### Step 3: Configure and Run the Backend (.NET C#)

Navigate to `backend/`:

```bash
cd backend

# Copy environment configuration
cp .env.example .env

# Edit backend/.env and set your Gemini API key (or configure via the UI):
# GEMINI_API_KEY=your_api_key_here

# Restore dependencies and start server
dotnet restore
dotnet run
```

* The ASP.NET Core Web API will start listening at: `http://localhost:8000`

---

### Step 4: Configure and Run the Frontend (React + Vite)

Open a **new terminal** and navigate to `frontend/`:

```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```

* The React frontend will run at: `http://localhost:5173`

---

## 🚀 Verifying the Deployment

1. Open `http://localhost:5173` in your browser.
2. Sign in with `user@ex.com` (`password`) or register a new learner account.
3. **Configure Gemini API Key**: Click on the Settings / API Key modal in the dashboard to set or test your Gemini API Key directly in the UI (stored securely in SQLite `system_settings`).
4. **Try Video Q&A**: Ask questions in the AI Tutor Chat and click on any timestamp citation to jump directly to that exact moment in the video.
5. **Take Quizzes**: Generate tailored multiple-choice quizzes, view your score, and explore automated YouTube recommendation cards for identified weak areas.
6. **Ask Doubts**: Open the **Instructor Q&A** tab to submit questions, photos, documents, or voice notes directly to the course instructor.

---

## 📖 Additional Documentation

* **[README.md](README.md)**: Architectural overview, problem statement, and feature showcase.
* **[PERFORMANCE_INCREASE.md](PERFORMANCE_INCREASE.md)**: Benchmarks, CTranslate2 optimizations, bundle reductions, and query tuning.
