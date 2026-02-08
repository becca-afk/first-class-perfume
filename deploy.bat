@echo off
echo Pushing changes to GitHub...
cd /d "c:\Users\USER\Desktop\first class perfume\full-site"

git add .
git commit -m "Fixed M-Pesa error styling and image paths - %date% %time%"
git push origin main

echo.
echo Changes pushed! Your Render site will update in 1-2 minutes.
echo Visit your Render URL to see the updates.
pause
