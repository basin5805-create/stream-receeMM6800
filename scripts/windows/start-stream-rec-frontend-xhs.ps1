$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$frontendDir = Join-Path $repoRoot "frontend"

$containerName = "stream-rec-frontend-xhs"
$imageName = "streamrec/stream-rec-front:xhs-local"
$hostPort = 15281
$containerPort = 15281

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is required but was not found in PATH. Install Docker Desktop first."
}

$imageExists = docker image inspect $imageName 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend image not found, building from local frontend source..."
    docker build -t $imageName $frontendDir
}

$existing = docker ps -aq -f "name=^${containerName}$"
if ($existing) {
    docker rm -f $containerName | Out-Null
}

docker run -d `
  --name $containerName `
  -p "${hostPort}:${containerPort}" `
  -e PORT="${containerPort}" `
  -e HOSTNAME="0.0.0.0" `
  -e API_URL="http://host.docker.internal:12555/api" `
  -e NEXT_PUBLIC_API_URL="http://127.0.0.1:12555/api" `
  -e WS_API_URL="ws://host.docker.internal:12555/live/update" `
  -e NEXT_PUBLIC_WS_API_URL="ws://127.0.0.1:12555/live/update" `
  -e NEXTAUTH_URL="http://localhost:${hostPort}/" `
  -e NEXTAUTH_URL_INTERNAL="http://localhost:${hostPort}/" `
  -e AUTH_URL="http://localhost:${hostPort}/" `
  -e AUTH_SECRET="change-me-before-real-use" `
  -e NEXTAUTH_SECRET="change-me-before-real-use" `
  -e AUTH_TRUST_HOST="true" `
  -e TZ="Asia/Shanghai" `
  $imageName | Out-Null

Write-Output "Frontend started at http://localhost:${hostPort}/zh/login"
