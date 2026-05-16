$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

Write-Host "Checking Windows-oriented source layout..."

$requiredPaths = @(
    (Join-Path $repoRoot "host\runtime-scripts\xhs_live_room.py")
    (Join-Path $repoRoot "frontend\Dockerfile")
    (Join-Path $repoRoot "backend\vendor\xhshow")
    (Join-Path $repoRoot "backend\gradlew.bat")
)

$missing = @()
foreach ($path in $requiredPaths) {
    if (-not (Test-Path -LiteralPath $path)) {
        $missing += $path
    }
}

if ($missing.Count -gt 0) {
    throw "Repository layout is incomplete. Missing:`n$($missing -join "`n")"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Warning "Docker was not found in PATH. Frontend container will not start until Docker Desktop or another Docker runtime is installed."
}

Write-Host "Repository layout looks good."
Write-Host "Next steps:"
Write-Host "1. Run .\\scripts\\windows\\build-host-jar.ps1"
Write-Host "2. Run .\\scripts\\windows\\start-stream-rec-host.ps1"
Write-Host "3. Run .\\scripts\\windows\\start-stream-rec-frontend-xhs.ps1"
