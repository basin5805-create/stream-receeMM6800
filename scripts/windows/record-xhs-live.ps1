param(
    [Parameter(Mandatory = $true)]
    [string]$Url,

    [string]$OutputDir,

    [int]$DurationSeconds = 0,

    [string]$FfmpegPath
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

if (-not $OutputDir) {
    $OutputDir = Join-Path $repoRoot "runtime\\recordings"
}

if (-not $FfmpegPath) {
    $command = Get-Command ffmpeg -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
    if (-not $command) {
        throw "ffmpeg not found. Install ffmpeg and make sure it is in PATH, or pass -FfmpegPath explicitly."
    }
    $FfmpegPath = $command
}

function Get-RoomId {
    param([string]$LiveUrl)

    $match = [regex]::Match($LiveUrl, "/livestream/(?:[^/]+/)?(\d+)")
    if (-not $match.Success) {
        throw "Unable to parse room_id from live URL: $LiveUrl"
    }
    return $match.Groups[1].Value
}

function Get-LiveInfo {
    param([string]$RoomId)

    $apiUrl = "https://www.xiaohongshu.com/api/sns/red/live/app/v1/ecology/outside/share_info?room_id=$RoomId"
    $response = Invoke-WebRequest -UseBasicParsing -Uri $apiUrl
    $payload = $response.Content | ConvertFrom-Json
    if ($payload.code -ne 0) {
        throw "share_info returned an error: code=$($payload.code), msg=$($payload.msg)"
    }
    return $payload.data
}

function Get-FlvUrl {
    param(
        [string]$RoomId,
        [string]$LiveLink
    )

    if ($LiveLink -match "flvUrl=([^&]+)") {
        return [System.Uri]::UnescapeDataString($Matches[1])
    }
    return "http://live.xhscdn.com/live/$RoomId.flv"
}

function Sanitize-FileNamePart {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return "unknown"
    }

    $invalidChars = [System.IO.Path]::GetInvalidFileNameChars()
    $sanitized = $Value
    foreach ($char in $invalidChars) {
        $sanitized = $sanitized.Replace([string]$char, "_")
    }
    return $sanitized.Trim()
}

$roomId = Get-RoomId -LiveUrl $Url
$liveInfo = Get-LiveInfo -RoomId $roomId
$room = $liveInfo.room
$hostInfo = $liveInfo.host_info

if ($room.status -ne 0) {
    throw "The room is not currently live. room_id=$roomId, status=$($room.status)"
}

$flvUrl = Get-FlvUrl -RoomId $roomId -LiveLink $room.live_link
$hostName = Sanitize-FileNamePart -Value $hostInfo.nickname
$title = Sanitize-FileNamePart -Value $room.name
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

if (-not (Test-Path -LiteralPath $FfmpegPath)) {
    throw "ffmpeg was not found: $FfmpegPath"
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$outputPath = Join-Path $OutputDir "$hostName-$title-$timestamp.flv"

$ffmpegArgs = @(
    "-hide_banner"
    "-y"
    "-rw_timeout", "20000000"
    "-user_agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0"
    "-i", $flvUrl
)

if ($DurationSeconds -gt 0) {
    $ffmpegArgs += @("-t", "$DurationSeconds")
}

$ffmpegArgs += @(
    "-c", "copy"
    "-f", "flv"
    $outputPath
)

Write-Host "room_id: $roomId"
Write-Host "host: $($hostInfo.nickname)"
Write-Host "title: $($room.name)"
Write-Host "stream URL: $flvUrl"
Write-Host "output file: $outputPath"

$originalHttpProxy = $env:HTTP_PROXY
$originalHttpsProxy = $env:HTTPS_PROXY
$originalAllProxy = $env:ALL_PROXY

try {
    $env:HTTP_PROXY = ""
    $env:HTTPS_PROXY = ""
    $env:ALL_PROXY = ""
    & $FfmpegPath @ffmpegArgs
}
finally {
    $env:HTTP_PROXY = $originalHttpProxy
    $env:HTTPS_PROXY = $originalHttpsProxy
    $env:ALL_PROXY = $originalAllProxy
}
