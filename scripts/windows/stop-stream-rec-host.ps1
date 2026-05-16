$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$jarPath = Join-Path $repoRoot "backend\stream-rec\build\libs\stream-rec.jar"

$processes = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "java.exe" -and
    $_.CommandLine -and
    $_.CommandLine.Contains($jarPath)
}

if (-not $processes) {
    Write-Host "No running stream-rec host backend found."
    exit 0
}

foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force
    Write-Host "Stopped stream-rec host backend PID $($process.ProcessId)"
}
