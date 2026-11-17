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
# A single bounded JSON writer: the browser must never receive an empty HTTP 500.
function Send-TaviJson {
  param([object]$Response,[int]$StatusCode,[hashtable]$Data)
  $jsonText = ConvertTo-Json -InputObject $Data -Depth 6 -Compress -ErrorAction Stop
  $bytes = [Text.Encoding]::UTF8.GetBytes($jsonText)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = 'application/json; charset=utf-8'
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes,0,$bytes.Length)
}
# PowerShell's HTTP exception hides the upstream Ollama JSON error unless read.
# Only return a short diagnostic; never log the prompt or Tavi's private memories.
function Get-TaviOllamaFailure {
  param([object]$Failure)
  $status=0
  $detail=''
  try {
    if ($Failure.Exception.Response) {
      $status=[int]$Failure.Exception.Response.StatusCode
      $stream=$Failure.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader=[System.IO.StreamReader]::new($stream,[Text.Encoding]::UTF8)
        try { $detail=$reader.ReadToEnd() } finally { $reader.Dispose() }
      }
    }
  } catch {}
  if ([string]::IsNullOrWhiteSpace($detail)) { $detail=[string]$Failure.ErrorDetails.Message }
  if ([string]::IsNullOrWhiteSpace($detail)) { $detail=[string]$Failure.Exception.Message }
  try {
    $obj=ConvertFrom-Json -InputObject $detail -ErrorAction Stop
    if ($obj.error) { $detail=[string]$obj.error }
  } catch {}
  $detail=[regex]::Replace($detail,'[\r\n\t]+',' ').Trim()
  if ($detail.Length -gt 300) { $detail=$detail.Substring(0,300) }
  return @{status=$status;detail=$detail}
}
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

      # Restricted local-only Ollama bridge. Every branch returns JSON and lets the
      # enclosing finally close the HttpListener response exactly once.
      if ($context.Request.Url.AbsolutePath -eq '/api/brain') {
        try {
          $origin = [string]$context.Request.Headers['Origin']
          if ($origin -and $origin -cne 'http://localhost:8765') {
            Send-TaviJson $context.Response 403 @{error='The local model accepts requests only from Tavi World on localhost:8765'; code='ORIGIN_FORBIDDEN'}
            continue
          }
          if ($context.Request.HttpMethod -ne 'POST' -or
              $context.Request.ContentLength64 -le 0 -or
              $context.Request.ContentLength64 -gt 16384 -or
              [string]$context.Request.ContentType -notmatch '^application/json\b') {
            Send-TaviJson $context.Response 400 @{error='Expected a JSON POST request up to 16 KB'; code='INVALID_REQUEST'}
            continue
          }
          $reader = $null
          try {
            # Use a real .NET constructor (not the ambiguous New-Object Type(args) form).
            $reader = [System.IO.StreamReader]::new($context.Request.InputStream,[Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
          } finally { if ($reader) { $reader.Dispose() } }
          try {
            $req = ConvertFrom-Json -InputObject $body -ErrorAction Stop
            $model = [string]$req.model
            if ($model -notmatch '^[a-zA-Z0-9._:/-]{1,70}$') { throw 'Invalid model name. Run ollama list and use an installed model.' }
            $prompt = [string]$req.instruction + "`nContext: " + ($req.context | ConvertTo-Json -Depth 8 -Compress -ErrorAction Stop)
            if ($prompt.Length -gt 13000) { throw 'Request context exceeded the local model prompt limit.' }
          } catch {
            Send-TaviJson $context.Response 400 @{error=('Invalid model request: '+[string]$_.Exception.Message);code='INVALID_MODEL_REQUEST'}
            continue
          }
          # Disable separate thinking output for models such as Qwen3, where a
          # small generation can otherwise be consumed by reasoning, leaving
          # a blank response field. No thinking trace is sent to the browser.
          $payload = @{model=$model; prompt=$prompt; stream=$false; think=$false; format='json'; options=@{temperature=0.5;num_predict=512}} | ConvertTo-Json -Depth 6 -Compress
          $upstreamFailure=$null
          try {
            $reply = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/generate' -Method Post -Body $payload -ContentType 'application/json' -TimeoutSec 80 -ErrorAction Stop
          } catch {
            $upstreamFailure=Get-TaviOllamaFailure $_
            # An older or different Ollama model may reject the optional think
            # field with HTTP 400. Retry ONCE without it, preserving JSON mode.
            if ($upstreamFailure.status -eq 400) {
              Write-Host ('[Tavi Ollama HTTP 400] '+$upstreamFailure.detail+'. Retrying without optional think field.') -ForegroundColor Yellow
              $compatPayload = @{model=$model;prompt=$prompt;stream=$false;format='json';options=@{temperature=0.5;num_predict=512}} | ConvertTo-Json -Depth 6 -Compress
              try {
                $reply = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/generate' -Method Post -Body $compatPayload -ContentType 'application/json' -TimeoutSec 80 -ErrorAction Stop
                $upstreamFailure=$null
              } catch { $upstreamFailure=Get-TaviOllamaFailure $_ }
            }
          }
          if ($upstreamFailure) {
            $code=if ($upstreamFailure.status -eq 400) {'OLLAMA_BAD_REQUEST'} else {'OLLAMA_UNAVAILABLE'}
            $message=if ($upstreamFailure.status -eq 400) {'Ollama rejected this model request (HTTP 400): '+$upstreamFailure.detail} else {'Could not get an Ollama reply: '+$upstreamFailure.detail}
            Write-Host ('[Tavi Ollama connection] '+$message) -ForegroundColor Yellow
            Send-TaviJson $context.Response 502 @{error=$message;code=$code}
            continue
          }
          $answer=[string]$reply.response
          if ([string]::IsNullOrWhiteSpace($answer) -or $answer.Trim() -eq 'undefined') {
            $reason='Ollama finished without a usable answer. The selected model may need a different format or more generation tokens.'
            if (-not [string]::IsNullOrWhiteSpace([string]$reply.thinking)) {
              $reason='Ollama produced thinking text but no final answer. Try a model that supports think:false or update Ollama.'
            }
            Write-Host ('[Tavi Ollama empty response] Model: ' + $model + '. ' + $reason) -ForegroundColor Yellow
            Send-TaviJson $context.Response 502 @{error=$reason;code='OLLAMA_EMPTY_ANSWER'}
            continue
          }
          Send-TaviJson $context.Response 200 @{response=$answer}
        } catch {
          $message=[string]$_.Exception.Message
          if($message.Length -gt 240){$message=$message.Substring(0,240)}
          Write-Host ('[TAVI BRIDGE ERROR] ' + $message) -ForegroundColor Red
          try { Send-TaviJson $context.Response 500 @{error='Local bridge exception. Read the [TAVI BRIDGE ERROR] line in the PowerShell launcher.';code='BRIDGE_EXCEPTION'} }
          catch { Write-Host ('[TAVI BRIDGE SEND FAILED] ' + [string]$_.Exception.Message) -ForegroundColor Red }
        }
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
      $message=[string]$_.Exception.Message
      if($message.Length -gt 240){$message=$message.Substring(0,240)}
      Write-Host ('[TAVI SERVER ERROR] ' + $message) -ForegroundColor Red
      try {
        if ($context.Request.Url.AbsolutePath -like '/api/*') {
          Send-TaviJson $context.Response 500 @{error='Tavi server error; see the PowerShell launcher diagnostic.';code='SERVER_EXCEPTION'}
        } else {
          $context.Response.StatusCode = 500
        }
      } catch { Write-Host ('[TAVI SERVER SEND FAILED] ' + [string]$_.Exception.Message) -ForegroundColor Red }
    } finally {
      try { $context.Response.Close() } catch {}
    }
  }
} finally { $listener.Stop(); $listener.Close() }