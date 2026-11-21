# Rebuild zte-agent (zig cross-compile) and deploy to the U60 Pro over ADB.
# Usage: deploy-u60pro.ps1 -AgentPassword <你的 Agent 密码>   （或设置环境变量 ZTE_AGENT_PASSWORD）
param([string]$AgentPassword = $env:ZTE_AGENT_PASSWORD)
if (-not $AgentPassword) { throw '缺少 Agent 密码：请用 -AgentPassword <密码> 或设置环境变量 ZTE_AGENT_PASSWORD' }
$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\Administrator\Downloads\open-u60-pro'
$tools = 'C:\Users\Administrator\Downloads\tools'
$env:PATH = "$tools\zig-windows-x86_64-0.13.0;$tools\platform-tools;" + $env:PATH
Set-Location $repo
Write-Host '== build =='
cargo zigbuild --release --target aarch64-unknown-linux-musl -p zte-agent
if ($LASTEXITCODE -ne 0) { throw 'build failed' }
$bin = Join-Path $repo 'target\aarch64-unknown-linux-musl\release\zte-agent'
$size = (Get-Item $bin).Length
$sha = (Get-FileHash $bin -Algorithm SHA256).Hash.ToLower()
Write-Host "binary: $size bytes sha256=$sha"
Write-Host '== push + install =='
adb push $bin /data/local/tmp/zte-agent.new | Out-Null
# LF-normalize helper scripts before pushing (Git checkout may be CRLF on Windows).
$supervisor = [System.IO.File]::ReadAllText((Join-Path $repo 'scripts\router\zte-agent-supervisor.sh')) -replace "`r`n","`n"
[System.IO.File]::WriteAllText((Join-Path $env:TEMP 'zte-agent-supervisor.sh'), $supervisor, (New-Object System.Text.UTF8Encoding($false)))
adb push (Join-Path $env:TEMP 'zte-agent-supervisor.sh') /data/local/tmp/zte-agent-supervisor.sh | Out-Null
$install = [System.IO.File]::ReadAllText((Join-Path $env:TEMP 'u60-install.sh')) -replace "`r`n","`n"
adb push (Join-Path $env:TEMP 'u60-install.sh') /data/local/tmp/install-zh.sh | Out-Null
adb shell "chmod 755 /data/local/tmp/zte-agent-supervisor.sh; sh /data/local/tmp/install-zh.sh; killall zte-agent 2>/dev/null; sleep 1; sh /data/local/tmp/start_zte_agent.sh; sleep 2; pidof zte-agent"
Write-Host '== verify =='
try {
  $login = Invoke-WebRequest -Uri 'http://192.168.0.1:9090/api/auth/login' -Method Post -ContentType 'application/json' -Body ("{`"password`":`"$AgentPassword`"}") -UseBasicParsing -TimeoutSec 10
  $token = ($login.Content | ConvertFrom-Json).data.token
  $console = Invoke-WebRequest -Uri 'http://192.168.0.1:9090/console/' -UseBasicParsing -TimeoutSec 10
  $zh = if ($console.Content -match '<html lang="zh-CN"') { 'zh-CN console OK' } else { 'WARNING: console not Chinese' }
  $api = Invoke-RestMethod -Uri 'http://192.168.0.1:9090/api/device' -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 10
  Write-Host "login OK, $zh, device=$($api.data.hostname)"
} catch { Write-Host "verify FAIL: $($_.Exception.Message)" }