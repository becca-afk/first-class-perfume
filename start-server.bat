@echo off
cd /d "%~dp0"
echo Starting First Class Perfume server...
echo.
echo When you see "Server running at http://localhost:3000"
echo open your browser and go to:  http://localhost:3000
echo.
echo Keep this window open while using the site. Press Ctrl+C to stop.
echo.
node server.js
pause
