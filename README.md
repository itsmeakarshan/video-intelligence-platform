# 🎥 Video Intelligence Platform

An AI-powered video learning platform for understanding, searching, and interacting with educational videos using **Open AI Whisper**, **Sentence Transformers**, **ChromaDB**, **Retrieval-Augmented Generation (RAG)**, and **Google Gemini**.

Upload videos, generate transcripts, ask questions about video content, find relevant moments, generate summaries and study notes, create quizzes, and interact with the AI using voice.

---

## 🚀 Features

* 🎥 Upload and manage multiple videos
* 🎙️ Automatic transcription
* 💬 AI-powered chat about video content
* 🧠 Conversation memory for follow-up questions
* 🔍 Semantic search using ChromaDB
* 📚 Retrieval-Augmented Generation (RAG)
* 📍 Timestamped references to relevant parts of videos
* ▶️ Jump directly to relevant timestamps
* 📄 AI-generated summaries
* 📝 AI-generated study notes
* 🧠 AI-generated quizzes
* 🎯 Select specific videos for AI analysis
* 🎤 Ask questions using your microphone
* 🔊 Speak AI answers aloud
* 🗑️ Delete uploaded videos and processed data
* 🌙 Modern dark glassmorphism interface

---

## 🎬 Demo Content

The current demonstration uses **pre-processed educational videos from the Computer Basics playlist by LearnFree**.

### YouTube Playlist

https://www.youtube.com/playlist?list=PL4316FC411AD077AA

The playlist contains educational videos covering topics such as:

* What is a computer?
* Computer hardware
* Computer ports and buttons
* Inside a computer
* Laptop computers
* Operating systems
* Applications
* Setting up a computer
* Other computer fundamentals

The videos used in the demonstration have already been **processed, transcribed, chunked, embedded, and indexed** for the application.

You can therefore start the application and ask questions about the available videos without processing them again.

---

## ⚠️ Copyright Notice

The videos used for the demonstration are **not owned by this project**.

All rights to the original videos, audio, educational material, thumbnails, and associated content belong to their **respective copyright owners**.

This project does **not claim ownership** of any third-party video content.

The playlist is used only as demonstration/test content to showcase the functionality of the Video Intelligence Platform.

YouTube playlist:

https://www.youtube.com/playlist?list=PL4316FC411AD077AA

If you want to use different videos with the platform, make sure you have the appropriate rights or permission to use that content.

---

## 🤖 Try the AI

The demo videos have already been processed, so you can immediately select a video and start asking questions.

### Example Questions

```text
What is a computer?
```

```text
What are the main parts of a computer?
```

```text
What are the different types of ports found on a computer?
```

```text
What is an operating system and what does it do?
```

```text
What is the difference between hardware and software?
```

You can also ask questions about specific parts of the videos:

```text
When are computer ports discussed in the video?
```

```text
What does the video explain about laptops?
```

```text
What are applications used for?
```

```text
Explain this topic in simple terms.
```

---

## 🔄 Follow-Up Questions

The AI supports conversational follow-up questions.

For example:

```text
User:
What is an operating system?
```

After receiving the answer, you can ask:

```text
User:
What are some examples?
```

The conversation history helps the AI understand what you are referring to.

---

# 🧠 AI / RAG Workflow

```text
                         Video
                           │
                           ▼
                        Whisper
                           │
                           ▼
                       Transcript
                           │
                           ▼
                  Transcript Chunks
                           │
                           ▼
              Sentence Transformer Model
                           │
                           ▼
                      Embeddings
                           │
                           ▼
                        ChromaDB
                           │
                           ▼
                    Semantic Search
                           │
                           ▼
                Relevant Video Context
                           │
                           ▼
                     Google Gemini
                           │
                           ▼
                      AI Response
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
             Answer     Summary      Quiz
```

---


# 📄 AI Summaries

The platform can generate structured summaries from the selected videos.

Summaries are designed to help users quickly understand the main topics covered in the video.

---

# 📝 AI Study Notes

The platform can generate organised study notes from video content.

Notes can include:

* Important concepts
* Explanations
* Examples
* Key points
* Revision material

---

# 🧠 AI Quiz Generation

The platform can generate quizzes based on the selected video content.

The quiz system supports:

* Multiple-choice questions
* Four answer options
* Correct answers
* Explanations
* Different difficulty levels

### Example

```text
Question:
What is the primary purpose of an operating system?

A. To physically connect computer components
B. To manage computer hardware and software
C. To create internet connections
D. To replace computer hardware
```

Quiz questions are generated from the processed video content.

---

# 🛠️ Tech Stack

## Frontend

* React
* TypeScript
* Material UI
* Axios
* Browser Speech Recognition
* Browser Speech Synthesis

## Backend

* Python
* FastAPI
* SQLAlchemy
* SQLite
* Whisper
* ChromaDB
* Sentence Transformers
* Google Gemini API

## AI / NLP

* Whisper
* BAAI/bge-m3
* Sentence Transformers
* Retrieval-Augmented Generation (RAG)
* Google Gemini

---

# ⚡ Quick Start

The complete installation and configuration instructions are available in:

**SETUP.md**


# 🔐 API Keys & Environment Variables

API keys should **never** be committed to GitHub.

Create a local `.env` file and provide your own credentials.

Example:

```env
GEMINI_API_KEY=your_api_key_here
```

Make sure `.env` is included in `.gitignore`.

**Never publish your actual API keys.**

---

# 🎥 Using Your Own Videos

The repository contains pre-processed demonstration content so that the AI functionality can be tested immediately.

The platform itself is designed to process new videos as well.

You can:

1. Upload a video.
2. Select a Whisper model.
3. Start processing.
4. Generate the transcript.
5. Create transcript chunks.
6. Generate embeddings.
7. Index the content in ChromaDB.
8. Ask questions about the video.

Only use video content that you have the appropriate rights or permission to process and use.

---

# 🗑️ Video Processing Pipeline

When a new video is uploaded, the general processing flow is:

```text
Video Upload
     │
     ▼
Video Storage
     │
     ▼
  Whisper
     │
     ▼
Timestamped Transcript
     │
     ▼
Transcript Segments
     │
     ▼
Transcript Chunks
     │
     ▼
Embedding Generation
     │
     ▼
ChromaDB Indexing
     │
     ▼
Video Ready for AI
```

Once processing is complete, the video becomes available for AI-powered questions and other features.

---

# 🎯 Project Goal

The goal of the **Video Intelligence Platform** is to make long educational videos easier to understand and interact with.

Instead of manually searching through a long video, users can simply ask questions such as:

```text
What is this video about?
```

```text
When is this topic discussed?
```

```text
Explain this concept in simple terms.
```

```text
What are the main points from this video?
```

The platform retrieves relevant information from the processed video and uses generative AI to provide a useful response.

The project combines:

**Video Processing + Speech-to-Text + NLP + Embeddings + Vector Search + RAG + Generative AI**

into a single educational application.

---

# 📚 Demo Playlist

The current processed demonstration content comes from:

**LearnFree – Computer Basics**

YouTube playlist:

https://www.youtube.com/playlist?list=PL4316FC411AD077AA

All original content remains the property of its respective copyright owners.

---

# 📸 Screenshots

Screenshots coming soon. XD

Planned screenshots:

* Dashboard
* Video Library
* Video Player
* AI Chat
* AI Summary
* AI Notes
* AI Quiz
* Voice Input
* Speak Aloud

---

# 👨‍💻 Author

**Akarshan Rasyal**

akarshanrasyal4@gmail.com

---

⭐ If you found this project interesting, consider giving the repository a star.
