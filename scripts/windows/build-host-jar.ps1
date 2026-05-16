$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$backendDir = Join-Path $repoRoot "backend"

if (-not (Test-Path -LiteralPath $backendDir)) {
    throw "Backend source directory not found: $backendDir"
}

$gradleBat = Join-Path $backendDir "gradlew.bat"
if (-not (Test-Path -LiteralPath $gradleBat)) {
    throw "gradlew.bat not found: $gradleBat"
}

Push-Location $backendDir
try {
    & $gradleBat ":stream-rec:buildFatJar"
}
finally {
    Pop-Location
}

$jarPath = Join-Path $backendDir "stream-rec\\build\\libs\\stream-rec.jar"
if (-not (Test-Path -LiteralPath $jarPath)) {
    throw "Build finished but stream-rec.jar was not found: $jarPath"
}

Write-Host "Built jar: $jarPath"
