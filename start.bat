@echo off
echo ========================================================
echo Starting Hostel Expense & Mess Manager (Full Stack)
echo ========================================================

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Backend - FastAPI" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Frontend Vite Dev Server on http://localhost:5173 ...
start "Frontend - Vite" cmd /k "cd frontend && npm run dev"

echo.
echo Application is starting!
echo Access the website at: http://localhost:5173
echo API Docs at: http://127.0.0.1:8000/api/v1/docs
echo ========================================================
pause
