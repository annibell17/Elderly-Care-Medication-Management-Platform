# ---------- Stage 1: Frontend build ----------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build   # outputs to /app/frontend/dist

# ---------- Stage 2: Backend runtime ----------
FROM python:3.11-slim AS backend-runtime

# Install OCR system dependencies (tesseract)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        libtesseract-dev \
        gcc \
        musl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source and run script
COPY backend/ ./backend/
COPY run.py .

# Copy built frontend into location expected by FastAPI (backend/app/main.py serves from /frontend/dist)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure FastAPI binds to all interfaces (host is read from env in run.py)
ENV HOST=0.0.0.0

CMD ["python", "run.py"]
