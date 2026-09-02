#!/usr/bin/env python3
"""
Video Intelligence Platform - Backend Server Entrypoint
"""
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn
from app.config import settings

if __name__ == "__main__":
    port = int(os.environ.get("PORT", settings.PORT))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting Video Intelligence Platform API server on http://{host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
