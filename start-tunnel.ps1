$logFile = Join-Path $PSScriptRoot "tunnel-url.txt"
$proc = Start-Process -FilePath (Join-Path $PSScriptRoot "cloudflared.exe") -ArgumentList "tunnel --url http://localhost:5000" -NoNewWindow -RedirectStandardOutput $logFile -PassThru
Write-Output "Cloudflared PID: $($proc.Id)"
Write-Output "Waiting for tunnel URL..."
Start-Sleep -Seconds 12
if (Test-Path $logFile) {
    $content = Get-Content $logFile -Raw
    $urlMatch = [regex]::Match($content, 'https://[a-z-]+\.trycloudflare\.com')
    if ($urlMatch.Success) {
        $url = $urlMatch.Value
        Write-Output "Tunnel URL: $url"
        Set-Content -Path (Join-Path $PSScriptRoot "tunnel-url.txt") -Value $url
    } else {
        Write-Output "No URL found yet. Log content:"
        Write-Output $content
    }
}
