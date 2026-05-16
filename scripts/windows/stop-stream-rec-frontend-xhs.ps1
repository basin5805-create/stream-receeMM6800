$ErrorActionPreference = "SilentlyContinue"

docker rm -f stream-rec-frontend-xhs | Out-Null

Write-Output "Frontend stopped"
