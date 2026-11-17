# Tavi read-only public internet learning

This feature requires the Windows local launcher and an internet connection. In an offline file:// preview there is no proxy and remote reading fails safely. It is deliberately read-only and limited to educational sources.

## Controls
- **Connect → Internet** provides approved topic selection and user-pasted article/book links.
- **Independent research** is off by default. Enabling it permits a curated topic fetch no more than once per ten minutes, while the browser is open and Tavi is unpaused. It pauses during isolated trials to preserve experiment control.
- Approved hosts: `en.wikipedia.org`, `en.wikisource.org`, `www.gutenberg.org`. Only HTTPS with default port, no query strings/fragments, no redirects.
- The launcher accepts only `POST /api/read` from the local page and then issues an HTTP GET to one allowed site. No outbound POST, PUT, DELETE, account/session authentication, cookies, local files, arbitrary IPs or internal-network hosts.
- Individual pages have a 256 KiB response cap and 10 second timeout. Only HTML/plain text is accepted. No javascript from the page is executed.
- Private conversations, memories, and local Ollama prompts are **never sent to external websites** by this feature. The only network data is the public URL chosen.

## Learning semantics
A retrieved source becomes an attributed, timestamped reading note with URL and short excerpt. The text is **unverified third-party content** and does not become an instruction to Tavi or independent proof of reality. This implementation does not establish genuine understanding. User should verify important claims through their sources.

## Limitations
The basic HTML-to-text conversion may include navigation or metadata from some websites. Wikipedia frequently changes its HTML and may block programmatic retrieval. Links that redirect fail instead of being followed. Windows launcher integration requires testing on Windows. No unrestricted internet search, video streaming, downloads, forms, or website interaction is provided.