$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'game'
$port = 8765
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
  $listener.Start()
} catch {
  Write-Host "Could not start local server on port $port. Close other Tavi World windows and try again."
  Write-Host "If Windows denied permission, try OPEN-TAVI-WITHOUT-SERVER.bat for an offline preview."
  Write-Host ('Details: ' + $_.Exception.Message)
  throw
}
Write-Host "Tavi World is running at http://localhost:$port/"
Write-Host 'Keep this window open while playing. Press Ctrl+C to stop.'
try { Start-Process "http://localhost:$port/" } catch { Write-Host 'Browser did not open automatically. Enter this URL yourself: http://localhost:8765/' }
$mime = @{'.html'='text/html; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.json'='application/json';'.svg'='image/svg+xml';'.png'='image/png';'.ico'='image/x-icon';'.webp'='image/webp';'.woff2'='font/woff2';'.txt'='text/plain'}
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      # Restricted local-only proxy for Ollama. The browser never gets filesystem or shell access.
      if ($context.Request.Url.AbsolutePath -eq '/api/brain') {
        $context.Response.ContentType = 'application/json; charset=utf-8'
        if ($context.Request.HttpMethod -ne 'POST' -or $context.Request.ContentLength64 -gt 16384 -or $context.Request.ContentLength64 -lt 0) {
          $context.Response.StatusCode = 400
          $context.Response.Close()
          continue
        }
        $reader = New-Object IO.StreamReader($context.Request.InputStream, [Text.Encoding]::UTF8)
        $body = $reader.ReadToEnd()
        $req = $body | ConvertFrom-Json
        $model = [string]$req.model
        if ($model -notmatch '^[a-zA-Z0-9._:/-]{1,70}$') { $context.Response.StatusCode = 400; $context.Response.Close(); continue }
        $prompt = [string]$req.instruction + "`nContext: " + ($req.context | ConvertTo-Json -Depth 8 -Compress)
        if ($prompt.Length -gt 13000) { $context.Response.StatusCode = 400; $context.Response.Close(); continue }
        $json = @{model=$model; prompt=$prompt; stream=$false; format='json'; options=@{temperature=0.7; num_predict=220}} | ConvertTo-Json -Depth 6 -Compress
        try {
          $reply = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/generate' -Method Post -Body $json -ContentType 'application/json' -TimeoutSec 40
          $result = @{response=[string]$reply.response} | ConvertTo-Json -Compress
          $bytes = [Text.Encoding]::UTF8.GetBytes($result)
          $context.Response.ContentLength64 = $bytes.Length
          $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
        } catch {
          $context.Response.StatusCode = 503
          $bytes = [Text.Encoding]::UTF8.GetBytes('{"error":"Ollama not available"}')
          $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
        }
        $context.Response.Close()
        continue
      }
      $urlPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
      $relative = $urlPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
      if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
      $full = [IO.Path]::GetFullPath((Join-Path $root $relative))
      $rootFull = [IO.Path]::GetFullPath($root).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
      if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) { $context.Response.StatusCode = 403; $context.Response.Close(); continue }
      if (-not [IO.File]::Exists($full)) { $full = Join-Path $root 'index.html' }
      $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
      $context.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $context.Response.Headers.Set('Cache-Control', 'no-store, max-age=0')
      $context.Response.Headers.Set('Pragma', 'no-cache')
      $context.Response.Headers.Set('X-Content-Type-Options', 'nosniff')
      $bytes = [IO.File]::ReadAllBytes($full)
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
    } catch {
      try { $context.Response.StatusCode = 500 } catch {}
    } finally {
      try { $context.Response.Close() } catch {}
    }
  }
} finally { $listener.Stop(); $listener.Close() }