# setup-redis-autostart.ps1
# Run this ONCE (as admin) to register Redis to start on Windows login

$redisPath = "C:\tools\redis\redis-server.exe"
$redisConf = "C:\tools\redis\redis.windows.conf"

# Create scheduled task that runs at logon
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -Command `"& '$redisPath' '$redisConf'`""

$trigger = New-ScheduledTaskTrigger -AtLogon

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" `
    -LogonType Interactive -RunLevel Limited

# Remove old task if exists
Unregister-ScheduledTask -TaskName "RedisServer" -Confirm:$false -ErrorAction SilentlyContinue

# Register new task
Register-ScheduledTask -TaskName "RedisServer" `
    -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
    -Description "Redis server for Genz Messenger — auto-starts at login"

Write-Host ""
Write-Host "✅ Redis auto-start registered!" -ForegroundColor Green
Write-Host "   Task: RedisServer"
Write-Host "   Trigger: At every login"
Write-Host "   Program: $redisPath"
Write-Host ""
Write-Host "To test: Restart your computer, then run:" -ForegroundColor Yellow
Write-Host "   C:\tools\redis\redis-cli.exe ping"
