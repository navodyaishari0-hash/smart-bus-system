@echo off
cd /d C:\Users\IPK COMPUTER\Desktop\smart-bus-system
cloudflared.exe tunnel --url http://localhost:5000 > tunnel-url.txt 2>&1
