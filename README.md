# 🎥 AI Video Intelligence & Learning Platform

> **Transforming passive video watching into an active, intelligent, and personalized learning experience.**

[![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Faster-Whisper](https://img.shields.io/badge/Faster--Whisper-CTranslate2-FF6F00?logo=python&logoColor=white)](https://github.com/SYSTRAN/faster-whisper)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## 🎯 What This App Solves

### The Problem in Modern Digital Learning
1. **Passive Video Watching & High Drop-Off Rates:**  
   Traditional video learning is purely linear and passive. Students sit through 1–2 hour lectures, zone out, and retain less than 20% of the material because there is no active recall or real-time dialogue.
2. **Search Fatigue ("The Needle in a Haystack"):**  
   When a student forgets a concept, formula, or definition, they are forced to blindly scrub back and forth along a 90-minute video progress bar. Searching through video content is notoriously painful, slow, and frustrating.
3. **Absence of Immediate Remediation:**  
   Standard quizzes tell students *what* they got wrong, but leave them stranded on *how* to fix it. Students often do not know which specific topic caused their mistake or where to find a concise explanation.
4. **Disconnected Communication Channels:**  
   Course discussion forums, Slack channels, and comment sections are completely decoupled from video playback. Students struggle to describe "the part at the 43rd minute where the instructor wrote on the board", causing back-and-forth communication bottlenecks with instructors.

---

### How Our Platform Solves It
* **Video Becomes an Interactive Knowledge Base:**  
  Every uploaded video or YouTube lecture is automatically transcribed using **Faster-Whisper** with second-by-second word timestamps, transforming raw video into an indexed, searchable semantic database.
* **Timestamp-Cited AI Video Tutor:**  
  Students ask natural language questions about any moment in the lecture. The AI tutor retrieves the exact context and generates answers accompanied by **clickable jump-to-timestamp buttons** that immediately navigate the video player to the exact second the concept was taught.
* **Intelligent Diagnostic Quizzes & Weak-Topic Remediation:**  
  Generates interactive multiple-choice quizzes tailored directly to the video curriculum. When a student struggles, the platform automatically **diagnoses the weak concept** and delivers **targeted, curated YouTube video tutorials** that specifically teach that missing concept.
* **Integrated Multi-Modal Instructor Q&A Studio:**  
  A unified communication hub where learners can send questions, screenshots, code files, PDF documents, and audio voice notes directly to course instructors. Instructors can attach specific video lectures right into the conversation.

---

## 🤖 Multi-Agent AI System

The platform is designed around a cooperative multi-agent architecture powered by **Google Gemini 2.5 Flash** and localized speech models:

```
                          ┌──────────────────────────┐
                          │   Video / Audio Ingest   │
                          │   (yt-dlp + FFmpeg)      │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  Speech-to-Text Engine   │
                          │  (Faster-Whisper int8)   │
                          └─────────────┬────────────┘
                                        │
                      ┌─────────────────┴─────────────────┐
                      ▼                                   ▼
          ┌───────────────────────┐           ┌───────────────────────┐
          │  RAG Video Tutor      │           │  Assessment & Quiz    │
          │  Agent                │           │  Agent                │
          │  • Semantic Retrieval │           │  • Dynamic MCQs       │
          │  • Jump-to-Timestamp  │           │  • Error Diagnosis    │
          └───────────────────────┘           └───────────┬───────────┘
                      │                                   │
                      ▼                                   ▼
          ┌───────────────────────┐           ┌───────────────────────┐
          │  Synthesis & Notes    │           │  Remediation Agent    │
          │  Agent                │           │  • YouTube Recommender│
          │  • Structured Notes   │           │  • Weak-Topic Search  │
          │  • Executive Summary  │           │  • Custom Curations   │
          └───────────────────────┘           └───────────────────────┘
```

1. **RAG Video Tutor Agent:** Performs sliding-window semantic chunk retrieval over video transcripts, answering queries with exact timestamp citations.
2. **Assessment & Quiz Agent:** Formulates context-aware quizzes, evaluates learner submissions, and diagnoses cognitive errors.
3. **Remediation & Recommendation Agent:** Maps quiz errors to micro-topics and queries YouTube for high-yield 3- to 10-minute video tutorials to reinforce identified weaknesses.
4. **Synthesis & Notes Agent:** Condenses long lectures into structured study guides, key formulas, bulleted summaries, and exportable PDF notes.

---

## ✨ Key Features

- ⏱️ **Clickable Jump-to-Timestamp Navigation:** Jump directly to the exact second in the video player referenced by the AI's explanation.
- 📚 **Structured Course Curriculum:** Enroll in multi-video courses with isolated learning studios, progress tracking, and personalized bookmarks.
- 📝 **AI Structured Notes & Summaries:** One-click generation of comprehensive study notes, cheat sheets, and executive summaries with instant PDF export.
- 🎯 **Diagnostic Quizzes with Score History:** Take quizzes with difficulty selection (Easy, Medium, Hard), instant grade calculations, and detailed historical attempt tracking.
- 📺 **Curated YouTube Video Recommendations:** Automatic post-quiz detection of weak topics paired with personalized YouTube video recommendation cards.
- 🎙️ **Multi-Modal Instructor Doubts Studio:** Send text, image attachments, documents, voice notes, and embedded YouTube references in a unified chat with your course instructor.
- 🔑 **Dynamic In-App API Key Management:** Set, test, and remove your Google Gemini API key directly from the dashboard modal without restarting servers or editing environment files.
- 📊 **Instructor & Admin Command Center:** Manage courses, inspect enrolled students, monitor quiz completion rates, and review learner performance logs.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS | High-performance Single Page Application (SPA) with custom dark mode design system. |
| **Backend API** | C# .NET 9, ASP.NET Core Web API | Clean architecture RESTful API with Argon2 password hashing and JWT authentication. |
| **Database** | Entity Framework Core, SQLite (WAL Mode) | Consolidated database with Write-Ahead Logging for high-concurrency read/write transactions. |
| **Speech-to-Text** | Faster-Whisper (CTranslate2, int8) | 4.5x faster acoustic speech-to-text inference with second-by-second word alignment. |
| **Generative AI** | Google Gemini 2.5 Flash | Sub-2-second semantic Q&A, structured study notes, and strict JSON-schema quiz generation. |
| **Media Processing** | FFmpeg, yt-dlp | Asynchronous background audio demuxing, video downloading, and stream normalization. |
| **Deployment** | Docker, Docker Compose, Nginx Alpine | Multi-stage production containerization with reverse proxy routing and caching. |

---

## ⚡ Performance Engineering

This platform was built from the ground up for low-latency inference, minimal memory footprint, and instantaneous UI interactions.

For detailed benchmarks, CTranslate2 optimizations, and bundle reduction metrics:
👉 **[Read the Full Performance Engineering Report (PERFORMANCE_INCREASE.md)](PERFORMANCE_INCREASE.md)**

---

## 🚀 Quick Start & Installation

### Option 1: Docker (Single Command)
```bash
# Clone the repository
git clone https://github.com/itsmeakarshan/video-intelligence-platform.git
cd video-intelligence-platform

# Configure environment template
cp backend/.env.example backend/.env

# Build and start the container stack
docker-compose up --build
```
* **Frontend:** `http://localhost`
* **Backend API:** `http://localhost:8000`

### Option 2: Local Development
For detailed prerequisites (.NET 9, Node.js 20+, FFmpeg, Python) and step-by-step local commands:
👉 **[Read the System Setup Guide (SETUP.md)](SETUP.md)**

---

## 🔐 Default Demo Accounts

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Learner (Demo)** | `user@ex.com` | `password` | Enrolled in Computer Basics with pre-processed videos. |
| **Student 1** | `student1@learn.com` | `Student1@123` | Enrolled across all courses with 15 quiz attempts and scores. |
| **Administrator** | `admin@example.com` | `admin123` | Full access to Admin Panel, Course Management, and Student Doubts. |

---

## 📄 License & Attribution

All original video, audio, and educational materials processed by this platform belong to their respective copyright owners. This project is intended for educational and research purposes under fair use.

---

## 👨‍💻 Author

**Akarshan Rasyal**  
* Email: [akarshanrasyal4@gmail.com](mailto:akarshanrasyal4@gmail.com)  
* GitHub: [@itsmeakarshan](https://github.com/itsmeakarshan)
