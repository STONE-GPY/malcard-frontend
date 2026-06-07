@echo off
REM ===========================================================================
REM  MalCard dev -- single start/stop launcher (Windows, double-clickable)
REM
REM  Bootstraps portable runtimes (cached), starts the backend + frontend, opens
REM  a public Cloudflare tunnel and prints a QR. Press Ctrl+C in THIS window to
REM  stop everything (backend, frontend, tunnel). If it ever leaves something
REM  running, use stop.bat.
REM
REM  This file is a batch + PowerShell polyglot: the few lines below launch
REM  PowerShell on the body that starts after the marker line near the top.
REM ===========================================================================
set "MALCARD_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$m=[char]35+'MALCARDPSBODY'; $c=[IO.File]::ReadAllText($env:MALCARD_SELF); Invoke-Expression $c.Substring($c.LastIndexOf($m)+$m.Length)"
exit /b %errorlevel%
#MALCARDPSBODY
$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$env:PYTHONIOENCODING = 'utf-8'

$ScriptDir = Split-Path $env:MALCARD_SELF -Parent          # ...\scripts
$ROOT      = Split-Path $ScriptDir -Parent                 # project root
$BACKEND   = Join-Path $ROOT 'backend'
$VENV      = Join-Path $BACKEND '.venv'
$PY        = Join-Path $VENV 'Scripts\python.exe'

# Runtime cache precedence: override -> existing project .runtime -> per-user cache.
$RUNTIME = if ($env:MALCARD_RUNTIME_DIR) { $env:MALCARD_RUNTIME_DIR }
           elseif (Test-Path (Join-Path $ROOT '.runtime')) { Join-Path $ROOT '.runtime' }
           else { Join-Path $env:LOCALAPPDATA 'malcard-runtime' }

$PBS_PY   = Join-Path $RUNTIME 'python\python\python.exe'
$PY_URL   = 'https://github.com/astral-sh/python-build-standalone/releases/download/20260602/cpython-3.11.15+20260602-x86_64-pc-windows-msvc-install_only.tar.gz'
$NODE_VER = 'v22.12.0'
$NODE_DIR = Join-Path $RUNTIME "node\node-$NODE_VER-win-x64"
$PNPM     = Join-Path $NODE_DIR 'pnpm.cmd'
$PNPM_VER = '9.9.0'
$CF       = Join-Path $RUNTIME 'cloudflared\cloudflared.exe'

function Die($m) { Write-Host "[ERROR] $m" -ForegroundColor Red; exit 1 }

if (-not (Test-Path (Join-Path $BACKEND 'app\main.py'))) {
  Die 'backend submodule missing. Run: git submodule update --init --recursive'
}

# --- portable Python (download once) ---------------------------------------
if (-not (Test-Path $PY)) {
  if (-not (Test-Path $PBS_PY)) {
    Write-Host '[setup] downloading portable Python 3.11 ...'
    New-Item -ItemType Directory -Force (Join-Path $RUNTIME 'python') | Out-Null
    $z = Join-Path $RUNTIME 'python\py.tar.gz'
    Invoke-WebRequest $PY_URL -OutFile $z
    tar -xf $z -C (Join-Path $RUNTIME 'python'); Remove-Item $z -EA SilentlyContinue
    if (-not (Test-Path $PBS_PY)) { Die 'portable Python download failed' }
  }
  Write-Host '[setup] creating backend venv ...'
  & $PBS_PY -m venv $VENV
}

# --- portable Node + pnpm (download once) ----------------------------------
if (-not (Test-Path (Join-Path $NODE_DIR 'node.exe'))) {
  Write-Host "[setup] downloading portable Node $NODE_VER ..."
  New-Item -ItemType Directory -Force (Join-Path $RUNTIME 'node') | Out-Null
  $z = Join-Path $RUNTIME 'node\node.zip'
  Invoke-WebRequest "https://nodejs.org/dist/$NODE_VER/node-$NODE_VER-win-x64.zip" -OutFile $z
  Expand-Archive -Path $z -DestinationPath (Join-Path $RUNTIME 'node') -Force; Remove-Item $z -EA SilentlyContinue
  if (-not (Test-Path (Join-Path $NODE_DIR 'node.exe'))) { Die 'Node download failed' }
}
$env:Path = "$NODE_DIR;$env:Path"
if (-not (Test-Path $PNPM)) {
  Write-Host "[setup] installing pnpm $PNPM_VER ..."
  & (Join-Path $NODE_DIR 'npm.cmd') install -g "pnpm@$PNPM_VER" 2>$null | Out-Null
  if (-not (Test-Path $PNPM)) { Die 'pnpm install failed' }
}

# --- backend deps (first run only; torch etc., several minutes) ------------
if (-not (Test-Path (Join-Path $VENV '.deps-installed'))) {
  Write-Host '[setup] installing backend requirements (several minutes) ...'
  & $PY -m pip install --upgrade pip
  & $PY -m pip install -r (Join-Path $BACKEND 'requirements.txt')
  if ($LASTEXITCODE -ne 0) { Die 'backend pip install failed' }
  'installed' | Out-File -Encoding ascii (Join-Path $VENV '.deps-installed')
}

# --- frontend deps (first run only) ----------------------------------------
if (-not (Test-Path (Join-Path $ROOT 'node_modules\.malcard-installed'))) {
  Write-Host '[setup] installing frontend dependencies (pnpm) ...'
  & $PNPM install
  if ($LASTEXITCODE -ne 0) { Die 'pnpm install (frontend) failed' }
  'installed' | Out-File -Encoding ascii (Join-Path $ROOT 'node_modules\.malcard-installed')
}

# --- prune old generated artifacts (keep newest 20; never delete tracked) --
$ART = Join-Path $BACKEND 'artifacts'
if (Test-Path $ART) {
  $tracked = @{}
  try { & git -C $BACKEND ls-files -- artifacts 2>$null | ForEach-Object {
          $p = $_ -split '/'; if ($p.Length -ge 2 -and $p[0] -eq 'artifacts') { $tracked[$p[1]] = $true } } } catch {}
  $drop = Get-ChildItem -LiteralPath $ART -Directory |
          Where-Object { $_.Name -match '^\d{8}_\d{6}' -and -not $tracked.ContainsKey($_.Name) } |
          Sort-Object Name -Descending | Select-Object -Skip 20
  if ($drop) { Write-Host "[clean] removing $($drop.Count) old artifact run(s)."; $drop | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force -EA SilentlyContinue } }
}

# --- cloudflared + qrcode (for the tunnel + QR) ----------------------------
if (-not (Test-Path $CF)) {
  Write-Host '[setup] downloading cloudflared ...'
  New-Item -ItemType Directory -Force (Split-Path $CF) | Out-Null
  Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $CF
  if (-not (Test-Path $CF)) { Die 'cloudflared download failed' }
}
$QPY = if (Test-Path $PBS_PY) { $PBS_PY } else { $PY }
& $QPY -c 'import importlib.util,sys; sys.exit(0 if importlib.util.find_spec("qrcode") else 1)' 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host '[setup] installing qrcode ...'; & $QPY -m pip install qrcode --quiet --disable-pip-version-check 2>$null | Out-Null }

# --- launch backend + frontend (each in its own window) --------------------
Write-Host '[start] backend  -> http://0.0.0.0:8000'
$back = Start-Process $PY -ArgumentList '-m','uvicorn','app.main:app','--host','0.0.0.0','--port','8000' -WorkingDirectory $BACKEND -PassThru
Write-Host '[start] frontend -> http://0.0.0.0:5173'
$front = Start-Process $PNPM -ArgumentList 'dev' -WorkingDirectory $ROOT -PassThru

function Stop-All {
  param($procs)
  foreach ($p in $procs) { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -EA SilentlyContinue } }
  Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -EA SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue }
}

try {
  # wait for the frontend to bind :5173 (up to ~40s)
  Write-Host '[tunnel] waiting for the frontend on :5173 ...'
  for ($i = 0; $i -lt 40; $i++) {
    if (Get-NetTCPConnection -LocalPort 5173 -State Listen -EA SilentlyContinue) { break }
    Start-Sleep -Seconds 1
  }

  # open the Cloudflare quick tunnel, parse the public URL
  $log = Join-Path $RUNTIME 'tunnel.log'; $err = "$log.err"
  Remove-Item $log, $err -EA SilentlyContinue
  $cf = Start-Process $CF -ArgumentList 'tunnel','--url','http://localhost:5173' `
          -RedirectStandardOutput $log -RedirectStandardError $err -PassThru -WindowStyle Hidden
  $url = $null
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 1
    $hit = Select-String -Path $log, $err -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -EA SilentlyContinue | Select-Object -First 1
    if ($hit) { $url = $hit.Matches[0].Value; break }
    if ($cf.HasExited) { break }
  }

  $lan = Get-NetIPAddress -AddressFamily IPv4 -EA SilentlyContinue |
         Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and ($_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual') } |
         Select-Object -First 1 -ExpandProperty IPAddress
  Write-Host ''
  Write-Host '============================================================'
  Write-Host '  Local   : http://localhost:5173'
  if ($lan) { Write-Host "  Wi-Fi   : http://$lan`:5173" }
  if ($url) { Write-Host "  Public  : $url" } else { Write-Host '  Public  : (tunnel URL not detected; see tunnel.log)' }
  Write-Host '============================================================'
  if ($url) {
    Write-Host ''
    & $QPY -c 'import qrcode,sys; q=qrcode.QRCode(border=2); q.add_data(sys.argv[1]); q.print_ascii(invert=True)' $url
  }
  Write-Host ''
  Write-Host 'Running. Press Ctrl+C here to stop backend + frontend + tunnel.' -ForegroundColor Cyan
  Wait-Process -Id $cf.Id
}
finally {
  Write-Host ''
  Write-Host '[stop] shutting down backend + frontend + tunnel ...'
  Stop-All @($cf, $front, $back)   # Stop-All skips any $null (e.g. $cf if the tunnel never started)
  Write-Host '[stop] done.'
}
