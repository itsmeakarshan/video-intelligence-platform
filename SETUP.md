# ⚙️ Setup Guide

Follow the steps below to set up and run the Video Intelligence Platform on your local machine.

---

# System Requirements

This project was developed and tested with:

| Software | Version |
|----------|----------|
| Python | 3.13.14 |
| Node.js | 26.5.1 |
| npm | 11.17.0 |
| FFmpeg | 8.1.2 |

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

Create a virtual environment.

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

Install the required packages.

```bash
pip install -r requirements.txt
```

---

# Step 6 - Configure Environment Variables

Inside the **backend** folder you'll find:

```
.env.example
```

Create a copy named `.env`.

### Windows

```powershell
copy .env.example .env
```

### macOS / Linux

```bash
cp .env.example .env
```

Open the `.env` file and replace:

```env
GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY_HERE
```

with your own Gemini API key.

You can generate a free API key here:

https://aistudio.google.com/app/apikey

---

# Step 7 - Start the Backend

```bash
uvicorn app.main:app --reload
```

The backend will run on:

```
http://127.0.0.1:8000
```

---

# Step 8 - Frontend Setup

Open a new terminal.

```bash
cd frontend
```

Install the required packages.

```bash
npm install
```

Start the frontend.

```bash
npm run dev
```

The frontend will run on:

```
http://localhost:5173
```

---

# Step 9 - Using the Application

### Upload Videos

Upload one or more videos.

Videos remain in the **Uploaded** state until you manually process them.

### Process Videos

Click **Process** and choose one of the available Whisper models:

- Tiny – Fastest
- Base – Recommended
- Small
- Medium
- Large-v3 – Best Quality

### AI Chat

Ask questions about one or more processed videos.

### AI Summary

Generate summaries from selected videos.

### AI Notes

Generate study notes from selected videos.

### AI Quiz

Select one or more videos, choose the difficulty and number of questions, then generate a quiz.

---

# Step 10 - Demo Data

The repository already includes:

- Preprocessed demo videos
- SQLite database
- ChromaDB vector database

Simply add your Gemini API key and the application is ready to use.

You can also upload and process your own videos.

---

# Troubleshooting

### Missing Gemini API Key

Copy:

```
.env.example
```

to:

```
.env
```

and replace:

```env
GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY_HERE
```

with your own API key.

### Whisper Models

The first time a Whisper model is selected, it will be downloaded automatically.

---

If you encounter any issues, feel free to mail @akarshanrasyal4@gmail.com