@echo off
echo Building portfolio site...
call npm run build

echo.
echo Deploying to Cloudflare Pages...
call wrangler pages deploy dist --project-name=portfolio

echo.
echo Deployment complete!
echo Site will be live at: https://justinwei.ca
pause
