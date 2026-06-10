@echo off
title ORCA Deploy
color 0A
cd /d "%~dp0"

echo.
echo  ================================
echo   ORCA -- Deploying to Production
echo  ================================
echo.

echo  [1/3]  Saving to GitHub...
git add -A
git commit -m "update" --allow-empty
git push origin main --force
if errorlevel 1 (
  echo  [!] GitHub push failed -- retrying...
  git push origin main --force
)

echo.
echo  [2/3]  Deploying to Vercel...
npx vercel --prod --yes

echo.
echo  ================================
echo   Done! Open orcafin.app
echo  ================================
echo.
pause
