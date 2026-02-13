@echo off
echo Preparing to deploy to Google Cloud...
echo.

echo 1. Checking Google Cloud login status...
call gcloud auth login

echo.
echo 2. Pushing code to Google Cloud App Engine...
echo This will take a few minutes...
call gcloud app deploy --project=first-class-perfume-app --quiet

echo.
echo Deployment Complete!
echo Your site is now live on Google Cloud.
pause
