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
      # Explicit read-only research: exact HTTPS public hosts, no redirects, cookies,
      # arbitrary ports, local/IP destinations, file writes, or state-changing verbs.
      if ($context.Request.Url.AbsolutePath -eq '/api/read') {
        $origin=[string]$context.Request.Headers['Origin']
        if ($origin -and $origin -cne 'http://localhost:8765') { $context.Response.StatusCode=403; $context.Response.Close(); continue }
        $context.Response.ContentType = 'application/json; charset=utf-8'
        $context.Response.Headers.Set('Cache-Control', 'no-store')
        $context.Response.Headers.Set('Access-Control-Allow-Origin', 'http://localhost:8765')
        if ($context.Request.HttpMethod -ne 'POST' -or $context.Request.ContentLength64 -le 0 -or $context.Request.ContentLength64 -gt 512) {
          $context.Response.StatusCode = 400
          $context.Response.Close()
          continue
        }
        $textReader = New-Object IO.StreamReader($context.Request.InputStream, [Text.Encoding]::UTF8)
        $raw = $textReader.ReadToEnd()
        $req = $raw | ConvertFrom-Json
        $requested = [string]$req.url
        $target = $null
        $valid = [Uri]::TryCreate($requested,[UriKind]::Absolute,[ref]$target)
        $allowed = @('en.wikipedia.org','en.wikisource.org','www.gutenberg.org')
        $path = if ($valid) { $target.AbsolutePath } else { '' }
        if (-not $valid -or $requested.Length -gt 300 -or $target.Scheme -cne 'https' -or $target.Port -ne 443 -or $target.UserInfo -or $target.Host -cnotin $allowed -or $target.Query -or $target.Fragment -or $path -notmatch '^/(wiki|ebooks|cache/epub|files)/') {
          $context.Response.StatusCode = 403
          $reply = '{"error":"Only approved HTTPS Wikipedia, Wikisource and Gutenberg reading pages are available"}'
          $bytes = [Text.Encoding]::UTF8.GetBytes($reply)
          $context.Response.ContentLength64 = $bytes.Length
          $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
          $context.Response.Close()
          continue
        }
        if (($target.Host -ceq 'en.wikipedia.org' -or $target.Host -ceq 'en.wikisource.org') -and $path -notmatch '^/wiki/') {
          $context.Response.StatusCode = 403; $context.Response.Close(); continue
        }
        $handler = New-Object System.Net.Http.HttpClientHandler
        $handler.AllowAutoRedirect = $false
        $handler.UseCookies = $false
        $handler.AutomaticDecompression = [Net.DecompressionMethods]::GZip -bor [Net.DecompressionMethods]::Deflate
        $client = New-Object System.Net.Http.HttpClient($handler)
        $client.Timeout = [TimeSpan]::FromSeconds(10)
        $client.DefaultRequestHeaders.UserAgent.ParseAdd('TaviWorld-ReadOnlyResearch/1.0 (local sandbox; learning excerpts)')
        $stream = $null
        $remote = $null
        try {
          $remote = $client.GetAsync($target,[System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
          if (-not $remote.IsSuccessStatusCode) { throw ('Source returned HTTP ' + [int]$remote.StatusCode) }
          if ($remote.Content.Headers.ContentLength -gt 262144) { throw 'Page exceeds the 256 KB reading limit' }
          $remoteMime = [string]$remote.Content.Headers.ContentType.MediaType
          if ($remoteMime -notmatch '^(text/html|text/plain|application/xhtml\+xml)$') { throw 'Unsupported document type; only text pages are readable' }
          $stream = $remote.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
          $buffer = New-Object byte[] 8192
          $mem = New-Object System.IO.MemoryStream
          while ($true) {
            $count = $stream.Read($buffer,0,$buffer.Length)
            if ($count -le 0) { break }
            if ($mem.Length + $count -gt 262144) { throw 'Page exceeds the 256 KB reading limit' }
            $mem.Write($buffer,0,$count)
          }
          $html = [Text.Encoding]::UTF8.GetString($mem.ToArray())
          if ($remoteMime -eq 'text/plain') { $extracted = $html; $title = [IO.Path]::GetFileName($target.AbsolutePath) }
          else {
            $titleMatch = [regex]::Match($html,'(?is)<title[^>]*>(.*?)</title>')
            $title = if ($titleMatch.Success) { [Net.WebUtility]::HtmlDecode($titleMatch.Groups[1].Value) } else { 'Public article' }
            $clean = [regex]::Replace($html,'(?is)<(script|style|nav|header|footer|svg|noscript)[^>]*>.*?</\1>',' ')
            $clean = [regex]::Replace($clean,'(?i)<(br|/p|/div|/h[1-6]|/li)\b[^>]*>',"`n")
            $clean = [regex]::Replace($clean,'<[^>]+>',' ')
            $extracted = [Net.WebUtility]::HtmlDecode($clean)
          }
          $extracted = [regex]::Replace($extracted,'[ \t]+',' ')
          $extracted = [regex]::Replace($extracted,'\s{3,}',"`n`n").Trim()
          if ($extracted.Length -lt 80) { throw 'No readable text was found' }
          $content = @{title=[string]$title;url=$requested;text=$extracted.Substring(0,[Math]::Min(12000,$extracted.Length));retrievedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json -Compress -Depth 4
          $bytes=[Text.Encoding]::UTF8.GetBytes($content)
          $context.Response.ContentLength64=$bytes.Length
          $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
        } catch {
          $context.Response.StatusCode=502
          $error = @{error=('Read failed: '+[string]$_.Exception.Message).Substring(0,[Math]::Min(180,('Read failed: '+[string]$_.Exception.Message).Length))} | ConvertTo-Json -Compress
          $bytes = [Text.Encoding]::UTF8.GetBytes($error)
          $context.Response.ContentLength64=$bytes.Length
          $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
        } finally {
          if ($stream) { $stream.Dispose() }
          if ($remote) { $remote.Dispose() }
          $client.Dispose();$handler.Dispose()
          $context.Response.Close()
        }
        continue
      }

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