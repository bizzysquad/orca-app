@echo off
echo.
echo  Deploying ORCA to production...
echo  ================================
echo.

cd /d "%~dp0"

echo  [1/3] Saving changes to GitHub...
git add -A
git commit -m "update" --allow-empty
git push origin main --force

echo.
echo  [2/3] Deploying to Vercel...
npx vercel --prod --yes

echo.
echo  [3/3] Done! Visit orcafin.app
echo.
pause
