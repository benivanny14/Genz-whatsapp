$env:GENZ_DEV_PORT = '5181'
$frontendDir = 'C:\Users\dell\OneDrive\Documents\Desktop\Genz messages\.freebuff\worktrees\03fb0770-ca84-4d17-931a-a17ecad8a043\frontend'
$log = 'C:\Users\dell\OneDrive\Documents\Desktop\Genz messages\.freebuff\preview-03fb0770-ca84-4d17-931a-a17ecad8a043.log'
$logErr = $log + '.err'

$batPath = Join-Path $PSScriptRoot 'preview-launch.bat'
$argString = "/c `"$batPath`""

$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList $argString `
  -RedirectStandardOutput $log -RedirectStandardError $logErr `
  -WindowStyle Hidden -PassThru

Write-Output $proc.Id
