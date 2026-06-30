$logFile = "C:\Users\IPK COMPUTER\Desktop\smart-bus-system\tunnel-url.txt"
$exe = "C:\Users\IPK COMPUTER\Desktop\smart-bus-system\cloudflared.exe"

# Clean up any existing cloudflared
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start and wait for URL
$proc = Start-Process -FilePath $exe -ArgumentList "tunnel --url http://localhost:5000" -NoNewWindow -RedirectStandardOutput $logFile -PassThru

Write-Output "Waiting for tunnel ..."
$timeout = 20
$elapsed = 0
$url = $null
while ($elapsed -lt $timeout -and -not $url) {
    Start-Sleep -Seconds 1
    $elapsed++
    if (Test-Path $logFile) {
        $content = Get-Content $logFile -Raw
        $match = [regex]::Match($content, 'https://[a-z-]+\.trycloudflare\.com')
        if ($match.Success) {
            $url = $match.Value
        }
    }
}

if ($url) {
    Write-Output "TUNNEL_URL=$url"
    Set-Content -Path "C:\Users\IPK COMPUTER\Desktop\smart-bus-system\tunnel-url.txt" -Value $url
} else {
    Write-Output "URL not found after $timeout seconds"
    if (Test-Path $logFile) { Get-Content $logFile -Tail 10 }
}
