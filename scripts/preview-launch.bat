@echo off
set "GENZ_DEV_PORT=5181"
set "FRONTEND=C:\Users\dell\OneDrive\Documents\Desktop\Genz messages\.freebuff\worktrees\03fb0770-ca84-4d17-931a-a17ecad8a043\frontend"
cd /d "%FRONTEND%"
"C:\Program Files\nodejs\node.exe" "node_modules\vite\bin\vite.js"
