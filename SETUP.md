# ⚙️ Setup Guide

Follow the steps below to set up and run the Video Intelligence Platform on your local machine.

---

# System Requirements

We will install the following software versions:

| Software | Version |
| -------- | ------- |
| Python   | 3.13.14 |
| Node.js  | 26.5.1  |
| npm      | 11.17.0 |
| FFmpeg   | 8.1.2   |

---

# Step 1 - Install Python

### Windows

```powershell
winget install Python.Python.3.13
```

### macOS

```bash
brew install python@3.13
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip
```

---

# Step 2 - Install Node.js

### Windows

```powershell
winget install OpenJS.NodeJS
```

### macOS

```bash
brew install node
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install nodejs npm
```

---

# Step 3 - Install FFmpeg

### Windows

```powershell
winget install Gyan.FFmpeg
```

### macOS

```bash
brew install ffmpeg
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install ffmpeg
```

---

# Step 4 - Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/video-intelligence-platform.git

cd video-intelligence-platform
```

---

# Step 5 - Backend Setup

Navigate to the backend folder.

```bash
cd backend
```

Create a Python virtual environment.

### Windows

```powershell
py -3.13 -m venv .venv
```

### macOS / Linux

```bash
python3.13 -m venv .venv
```

Activate the virtual environment.

### Windows

```powershell
.venv\Scripts\activate
```

### macOS / Linux

```bash
source .venv/bin/activate
```

Install the required Python packages.

```bash
pip install -r requirements.txt
```

---

# Step 6 - Configure Environment Variables

Inside the **backend** folder you will find:

```text
.env.example
```

Create a copy named:

```text
.env
```

### Windows

```powershell
copy .env.example .env
```

### macOS / Linux

```bash
cp .env.example .env
```

Your backend folder should now contain:

```text
backend/
├── .env
├── .env.example
├── app/
├── uploads/
└── ...
```

Open the `.env` file.

You will need to configure both the **Gemini API key** and the **JWT secret key**.

---

## 🔑 Gemini API Key

Find:

```env
GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY_HERE
```

Replace the placeholder with your own Gemini API key.

You can create a Gemini API key here:

https://aistudio.google.com/app/apikey

For example:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Do not share your API key or commit it to GitHub.

---

## 🔐 JWT Secret Key

The application uses **JSON Web Tokens (JWT)** for authentication.

The JWT secret key is used by the backend to securely sign and verify authentication tokens.

Find these lines in your `.env` file:

```env
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
```

You need to generate your own secret key.

### macOS / Linux

Run:

```bash
openssl rand -hex 32
```

This will generate a random secret similar to:

```text
8f4c2a7b9d1e6fxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Copy the generated value.

### Windows

If OpenSSL is available, run:

```powershell
openssl rand -hex 32
```

If OpenSSL is not available, PowerShell can generate a random value:

```powershell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copy the generated value.

### Add the secret to `.env`

Replace:

```env
JWT_SECRET_KEY=your_jwt_secret_key_here
```

with your generated secret:

```env
JWT_SECRET_KEY=YOUR_GENERATED_SECRET
JWT_ALGORITHM=HS256
```

For example:

```env
JWT_SECRET_KEY=8f4c2a7b9d1e6fxxxxxxxxxxxxxxxxxxxxxxxx
JWT_ALGORITHM=HS256
```

Do **not** use the example value above. Generate your own secret.

---

# Step 6 - Start the Backend

Make sure your virtual environment is activated.

From the `backend` directory:

```bash
uvicorn app.main:app --reload
```

The backend will run on:

```text
http://127.0.0.1:8000
```

You can also access the FastAPI documentation at:

```text
http://127.0.0.1:8000/docs
```

---

# Step 7 - Frontend Setup

Open a **new terminal**.

Navigate to the project directory:

```bash
cd video-intelligence-platform/frontend
```

Install the required packages:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

---

# Step 8 - Using the Application

Once both the backend and frontend are running, open:

```text
http://localhost:5173
```

---

## 🎥 Upload Videos

Upload one or more videos through the application.

Videos remain in the **Uploaded** state until you manually process them.

---

## 🎙️ Process Videos

Click **Process**

The Whisper model will be downloaded automatically the first time it is used.

Processing includes:

```text
Video
 ↓
Audio Processing
 ↓
Open AI Whisper
 ↓
Transcript
 ↓
Transcript Segments
 ↓
Transcript Chunks
 ↓
Embeddings
 ↓
ChromaDB
```

---

## 💬 AI Chat

After a video has been processed, select the video and ask questions about its content.

Example:

```text
What is this video about?
```

You can also ask questions about specific topics or moments:

```text
When is this topic discussed?
```

The application uses semantic search and RAG to retrieve relevant information before sending the context to Google Gemini.

---

## 🔊 Speak Aloud

AI responses can also be read aloud using the browser's speech synthesis functionality.

Use the **Speak Aloud** button on an AI response to listen to the generated answer.

---

## 📄 AI Summary

Select one or more processed videos and generate an AI summary.

---

# Demo Data

The repository contains **pre-processed demonstration content**.

This includes:

- Pre-processed demo videos
- SQLite database
- ChromaDB vector database
- Processed transcript data

This allows you to test the AI features without having to process the demonstration videos yourself.

Simply configure your Gemini API key and JWT secret, start the backend and frontend, and open the application.

You can also upload and process your own videos.

---

# 🎬 Demo Video Content

The current demonstration uses educational videos from the following Computer Basics playlist:

https://www.youtube.com/playlist?list=PL4316FC411AD077AA

The videos are used as demonstration content for the platform.

All original videos, audio, educational material, and associated content belong to their respective copyright owners.

This project does not claim ownership of the original video content.

If you use your own videos, make sure you have the appropriate rights or permission to process and use them.

---

### `uploads/`

Stores uploaded video files.

### `chroma_db/`

Stores the vector database used for semantic search and RAG.

### `video_intelligence.db`

Stores application data such as videos, transcripts, users, and other database records.

---


# 📧 Contact

If you encounter any issues with the project, feel free to contact:

**Akarshan Rasyal**

Email:

akarshanrasyal4@gmail.com