# Resume Tailor Chrome Extension

## What This Is
A Chrome Extension (Manifest V3) that reads job descriptions from LinkedIn/Indeed 
and uses the Claude API to tailor the user's resume and generate a cover letter.

## Tech Stack
- Vanilla JS (no React, no bundler — keep it simple and directly loadable in Chrome)
- Chrome Extension APIs: chrome.storage.local, chrome.runtime, chrome.tabs
- Anthropic Claude API (claude-sonnet-4-6)
- Manifest V3

## File Structure
- manifest.json       → extension config
- content.js          → injected into job pages, scrapes JD text
- background.js       → service worker, handles Claude API calls
- popup.html/js       → main UI the user sees
- settings.html/js    → where user saves their base resume

## Key Rules — Always Follow These
1. Never use React or any npm packages — this loads directly in Chrome unpacked
2. Always use chrome.storage.local (not localStorage) for persistence
3. API calls go in background.js only — never in popup.js or content.js
4. content.js communicates with popup via chrome.runtime.sendMessage
5. Keep the UI simple — no external CSS frameworks

## Claude API
- Model: claude-sonnet-4-6
- The API key will be stored in chrome.storage.local under the key "claudeApiKey"
- User sets it once in settings.html

## Current Status
- [ ] File scaffold created
- [ ] Content script working on LinkedIn
- [ ] Claude API call implemented
- [ ] Settings page working
- [ ] Copy to clipboard working

## Known Issues / Watch Out For
- LinkedIn frequently changes their DOM — use multiple fallback selectors in content.js
- Manifest V3 uses service workers, not background pages — background.js cannot use window or DOM