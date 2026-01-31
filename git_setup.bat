@echo off
echo Initializing Git repository...
git init
if %errorlevel% neq 0 goto :error

echo.
echo Adding files...
git add .
if %errorlevel% neq 0 goto :error

echo.
echo Committing files...
git commit -m "Initial commit - MyCashFlow App"
if %errorlevel% neq 0 goto :error

echo.
echo ========================================================
echo Git repository initialized successfully!
echo.
echo NOW FOLLOW THESE STEPS TO DEPLOY TO GITHUB PAGES:
echo.
echo 1. Go to https://github.com/new and create a new repository
echo    named "mycashflow-app" (or similar).
echo    Do NOT check "Initialize with README".
echo.
echo 2. Copy the URL of your new repository.
echo    (e.g., https://github.com/YOUR_USERNAME/mycashflow-app.git)
echo.
echo 3. Run the following commands in your terminal:
echo    git remote add origin YOUR_REPOSITORY_URL
echo    git branch -M main
echo    git push -u origin main
echo.
echo 4. Go to your repository settings on GitHub -> Pages
echo    and set the source to "main" branch.
echo ========================================================
pause
exit /b 0

:error
echo.
echo An error occurred. Please check the output above.
pause
exit /b 1
