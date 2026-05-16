param(
    [string]$RuntimeDir,
    [string]$JarPath,
    [switch]$Foreground
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

if (-not $RuntimeDir) {
    $RuntimeDir = Join-Path $repoRoot "runtime"
}
if (-not $JarPath) {
    $JarPath = Join-Path $repoRoot "backend\stream-rec\build\libs\stream-rec.jar"
}

function Resolve-FirstExistingFile {
    param(
        [string[]]$Candidates,
        [string]$Description
    )

    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw "$Description not found. Checked: $($Candidates -join '; ')"
}

function Resolve-FirstExistingDirectory {
    param(
        [string[]]$Candidates,
        [string]$Description
    )

    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Container)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw "$Description not found. Checked: $($Candidates -join '; ')"
}

function Get-JavaExe {
    return Resolve-FirstExistingFile -Description "Java executable" -Candidates @(
        $env:JAVA_BIN
        (Get-Command java -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1)
    )
}

function Get-PythonExe {
    return Resolve-FirstExistingFile -Description "Python executable" -Candidates @(
        $env:PYTHON_BIN
        (Get-Command python -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1)
        (Get-Command py -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1)
    )
}

function Get-FfmpegDir {
    $commandPath = $env:FFMPEG_BIN
    if (-not $commandPath) {
        $commandPath = Get-Command ffmpeg -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
    }
    $commandDir = if ($commandPath) { Split-Path -Parent $commandPath } else { $null }

    return Resolve-FirstExistingDirectory -Description "ffmpeg directory" -Candidates @(
        $commandDir
    )
}

function Test-PortFree {
    param([int]$Port)

    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    return $null -eq $connection
}

if (-not (Test-Path -LiteralPath $JarPath)) {
    throw "Backend jar not found: $JarPath. Build it first with .\\scripts\\windows\\build-host-jar.ps1 or supply -JarPath."
}

$javaExe = Get-JavaExe
$pythonExe = Get-PythonExe
$ffmpegDir = Get-FfmpegDir

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RuntimeDir "db") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RuntimeDir "logs") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RuntimeDir "output") | Out-Null

$appRoot = Join-Path $RuntimeDir "app"
$appScriptsDir = Join-Path $appRoot "scripts"
$appVendorDir = Join-Path $appRoot "vendor"
$pythonShimDir = Join-Path $RuntimeDir "python-shim"

New-Item -ItemType Directory -Force -Path $appScriptsDir | Out-Null
New-Item -ItemType Directory -Force -Path $appVendorDir | Out-Null
New-Item -ItemType Directory -Force -Path $pythonShimDir | Out-Null

Copy-Item -LiteralPath (Join-Path $repoRoot "host\runtime-scripts\xhs_live_room.py") -Destination (Join-Path $appScriptsDir "xhs_live_room.py") -Force

if (Test-Path -LiteralPath (Join-Path $appVendorDir "xhshow")) {
    Remove-Item -LiteralPath (Join-Path $appVendorDir "xhshow") -Recurse -Force
}

Copy-Item -LiteralPath (Join-Path $repoRoot "backend\vendor\xhshow") -Destination $appVendorDir -Recurse -Force

$cryptodomeFallbackSource = Join-Path $repoRoot "backend\vendor\Cryptodome"

if (Test-Path -LiteralPath (Join-Path $appVendorDir "Cryptodome")) {
    Remove-Item -LiteralPath (Join-Path $appVendorDir "Cryptodome") -Recurse -Force
}
if (Test-Path -LiteralPath $cryptodomeFallbackSource) {
    Copy-Item -LiteralPath $cryptodomeFallbackSource -Destination $appVendorDir -Recurse -Force
}

$pythonShimPath = Join-Path $pythonShimDir "python3.cmd"
@"
@echo off
"$pythonExe" %*
"@ | Set-Content -LiteralPath $pythonShimPath -Encoding ASCII

if (-not (Test-PortFree -Port 12555)) {
    throw "Port 12555 is already in use. Stop the other stream-rec backend first."
}

$env:JAVA_HOME = Split-Path (Split-Path $javaExe -Parent) -Parent
$env:PATH = "$pythonShimDir;$ffmpegDir;$(Split-Path $javaExe -Parent);$env:PATH"
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:ALL_PROXY = ""
$env:NO_PROXY = "localhost,127.0.0.1,::1,host.docker.internal,www.xiaohongshu.com,xiaohongshu.com,.xiaohongshu.com,live.xhscdn.com,live-play.xhscdn.com,.xhscdn.com"
$env:TZ = "Asia/Shanghai"
$env:XHS_USE_SIGNED_HELPER = "true"

$javaArgs = "-Djava.net.preferIPv4Stack=true -jar `"$JarPath`""

if ($Foreground) {
    & $javaExe "-Djava.net.preferIPv4Stack=true" "-jar" $JarPath
    exit $LASTEXITCODE
}

$stdoutLog = Join-Path $RuntimeDir "logs\backend.out.log"
$stderrLog = Join-Path $RuntimeDir "logs\backend.err.log"

$process = Start-Process `
    -FilePath $javaExe `
    -ArgumentList $javaArgs `
    -WorkingDirectory $RuntimeDir `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden `
    -PassThru

Write-Host "stream-rec host backend started"
Write-Host "PID: $($process.Id)"
Write-Host "Runtime dir: $RuntimeDir"
Write-Host "Log: $stdoutLog"
