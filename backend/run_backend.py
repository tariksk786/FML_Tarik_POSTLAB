"""
Convenient runner script for VehicleSense Backend
"""
import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure backend directory is in python path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    print("Starting VehicleSense FastAPI Backend on http://127.0.0.1:8001 ...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=False)
