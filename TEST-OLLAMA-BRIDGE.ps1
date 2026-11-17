param([string]$Model='tavi')
$ErrorActionPreference='Stop'
# Validate launcher script syntax using the actual installed PowerShell parser.
$tokens=$null
$parseErrors=$null
[System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Start-TaviWorld.ps1'),[ref]$tokens,[ref]$parseErrors) | Out-Null
if ($parseErrors.Count -gt 0) {
  Write-Host 'Tavi launcher has a PowerShell syntax error:' -ForegroundColor Red
  $parseErrors | ForEach-Object { Write-Host $_.Message }
  exit 9
}
Write-Host 'TAVI WORLD - Local Ollama connection diagnostics'
Write-Host 'No passwords, save data, or conversation history are sent.'
Write-Host ''
try {
  $data=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -Method Get -TimeoutSec 8
  $installed=@($data.models | ForEach-Object { [string]$_.name })
  Write-Host ('Ollama reachable. Installed models: ' + ($installed -join ', ')) -ForegroundColor Green
  if ($installed.Count -eq 0) { throw 'No models are installed. Use ollama list.' }
} catch {
  Write-Host ('Ollama could not be reached: ' + [string]$_.Exception.Message) -ForegroundColor Red
  Write-Host 'Open Ollama and try: ollama list'
  exit 1
}
if (-not ($installed | Where-Object { $_ -eq $Model -or $_ -eq ($Model + ':latest') })) {
  Write-Host ('Selected model is ' + $Model + '; use an installed name from the list above.') -ForegroundColor Yellow
  exit 2
}
Write-Host ('Testing model: ' + $Model)
$body=@{model=$Model;prompt='Return JSON with one field: {"reply":"ready"}';stream=$false;think=$false;format='json';options=@{num_predict=80;temperature=0}} | ConvertTo-Json -Depth 5 -Compress
try {
  $res=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/generate' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 80
  if ([string]::IsNullOrWhiteSpace([string]$res.response)) {
    Write-Host 'Ollama responded, but response was empty. Update Ollama or try another installed model.' -ForegroundColor Red
    exit 3
  }
  Write-Host 'Direct Ollama generation succeeded.' -ForegroundColor Green
} catch {
  Write-Host ('Direct Ollama generation failed: ' + [string]$_.Exception.Message) -ForegroundColor Red
  exit 4
}
# Check Tavi's local bridge with a small safe test request; no persistent change.
try {
  $request=@{model=$Model;instruction='Return JSON only: {"area":0,"obj":0,"thought":"ready"}';context=@{test=$true}} | ConvertTo-Json -Depth 5 -Compress
  $res=Invoke-RestMethod -Uri 'http://localhost:8765/api/brain' -Method Post -Body $request -ContentType 'application/json' -TimeoutSec 85
  if ([string]::IsNullOrWhiteSpace([string]$res.response)) { throw 'Bridge returned no model response.' }
  Write-Host 'Tavi local bridge succeeded. Connection is ready.' -ForegroundColor Green
} catch {
  Write-Host ('Tavi bridge test failed: ' + [string]$_.Exception.Message) -ForegroundColor Yellow
  Write-Host 'Confirm START-TAVI-WORLD.bat is running from this same extracted folder.'
  Write-Host 'Check its PowerShell window for a [TAVI BRIDGE ERROR] diagnostic.'
  exit 5
}