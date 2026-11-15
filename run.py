import sys
import os
import uvicorn
from pathlib import Path

# Add backend directory to python path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"================================================================")
    print(f"  Starting CareCircle Platform on http://localhost:{port}")
    print(f"  Philosophy: Independence first. Assistance when needed.")
    print(f"================================================================")
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
