# 🚀 GPU Acceleration & Performance Enhancement Guide

By default, this repository uses **CPU-optimized PyTorch** binaries to keep Docker images and virtual environments lightweight (~1.3 GB vs ~11.5 GB) and broadly compatible across standard machines.

If you have a **dedicated GPU** (NVIDIA RTX 3080/4080/4090 or Apple Silicon M1/M2/M3/M4 Mac), you can unlock **10x–20x faster video transcriptions (Whisper)** and **vector embedding generation (SentenceTransformers)** by configuring GPU acceleration.

---

## 💻 Method 1: Local Virtual Environment Setup (Python `.venv`)

### 1️⃣ Open Terminal in the `backend/` directory

Navigate to the `backend` folder in your terminal:

```bash
cd backend
```

---

### 2️⃣ Platform-Specific Commands

#### 🐧 Linux & 🪟 Windows (NVIDIA CUDA 12.x GPUs)
*For NVIDIA RTX 20xx / 30xx / 40xx Series or Cloud GPUs (AWS/GCP)*

##### Linux / WSL2 Bash:
```bash
source .venv/bin/activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --force-reinstall
```

##### Windows PowerShell:
```powershell
.\.venv\Scripts\Activate.ps1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --force-reinstall
```

---

#### 🍏 macOS (Apple Silicon M1 / M2 / M3 / M4)
*macOS uses Apple's built-in **Metal (MPS)** GPU engine. PyTorch on Mac automatically supports GPU acceleration out-of-the-box via standard PyTorch wheels.*

```bash
source .venv/bin/activate
pip install torch torchvision torchaudio --force-reinstall
```
