# Resume Tailor: Chrome Extension

> Scrapes job descriptions from LinkedIn, Indeed, and Accenture · Sends them to Gemini AI · Downloads a fully tailored LaTeX resume + cover letter in seconds.

---

## How It Works

```
Job Page  →  Content Script  →  Popup  →  Gemini 2.5 Flash  →  Filled .tex  →  Download
                                                                  Cover Letter  →  Download
```

1. Navigate to a job listing on LinkedIn, Indeed, or Accenture Careers
2. Click the extension icon — it auto-detects the job description
3. First-time: paste your Gemini API key and base resume in the setup panel
4. Hit **Tailor My Resume** — Gemini fills your LaTeX template with role-specific bullets and writes a cover letter
5. `resume-tailored.tex` downloads automatically — open in [Overleaf](https://overleaf.com) to compile to PDF
6. Hit **Download Cover Letter** to save the cover letter as a `.txt` file

---

## Features

- **Multi-site scraping** — LinkedIn Jobs, Indeed, and Accenture Careers (with DOM fallback selectors for each)
- **Structured Gemini prompt** — returns a strict JSON object with named fields for every resume section; no free-form parsing
- **LaTeX template engine** — 22 `{{PLACEHOLDER}}` values filled via `String.replaceAll()` — zero LaTeX structure is touched
- **Resume rules enforcement** — five sections only, exactly three Tech Proficiency categories, no em dashes or hyphens, AI tools in Projects only (never Experience)
- **Jane Street cover letter format** — strong opening, Stevens MS bridge, company tech callout, F1 + Nu metal closing
- **Inline setup panel** — paste your resume and API key directly in the popup; no separate settings tab needed
- **Error log download** — on any failure, a `resume-tailor-error.log` downloads with the full error, stack trace, and JD snippet

---

## File Structure

```
chrome extention/
├── manifest.json          # MV3 config — permissions, host_permissions, content scripts
├── content.js             # Injected into job pages — scrapes JD text with fallback selectors
├── background.js          # Service worker — Gemini API call, template fill, file downloads
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic — JD detection, tailor button, cover letter download
├── settings.html          # Settings page (API key + base resume — also editable via popup)
├── settings.js            # Settings page logic
└── resume-template.tex    # LaTeX resume with {{PLACEHOLDER}} values for dynamic content
```

---

## Setup

### 1. Get a Gemini API Key
Go to [aistudio.google.com](https://aistudio.google.com) → Get API Key → copy it.

### 2. Load the Extension in Chrome
```
chrome://extensions → Enable Developer Mode → Load Unpacked → select this folder
```

### 3. First-time Configuration
Open any supported job listing, click the extension icon, and fill in the **Setup panel**:
- Paste your Gemini API key
- Paste your base resume as plain text
- Click **Save & Continue**

---

## Supported Job Sites

| Site | URL Pattern |
|---|---|
| LinkedIn | `linkedin.com/jobs/*` |
| Indeed | `indeed.com/viewjob*` |
| Accenture | `accenture.com/*/careers/jobdetails*` |

---

## Resume Template Rules

The LaTeX template (`resume-template.tex`) enforces these constraints via the Gemini system prompt:

| Rule | Detail |
|---|---|
| Sections | Exactly 5: Education, Technical Proficiencies, Experience, Projects, Awards |
| Tech Proficiencies | Exactly 3 categories: Languages · Data & AI · Tools & Automation |
| Bullet points | Single sentence, concise — no multi-clause sprawl |
| Typography | No em dashes, no hyphens anywhere in output |
| AI tools | Allowed in Projects and cover letter — never in Experience |
| LaTeX escaping | `%` → `\%`, `&` → `\&`, `#` → `\#` (handled automatically) |

---

## Tech Stack

- **Vanilla JS** — no React, no bundler, loads directly as unpacked in Chrome
- **Manifest V3** — service worker, `chrome.storage.local`, `chrome.downloads`
- **Gemini 2.5 Flash** — structured JSON output via `system_instruction` + `generationConfig`
- **LaTeX** — Helvetica 10.75pt, custom `\resumeItem` / `\resumeSubheading` commands

---

## API Key Security

Your Gemini API key is stored in `chrome.storage.local` — it never leaves your machine except in requests made directly from your browser to `generativelanguage.googleapis.com`.

---

## Compiling the .tex to PDF

Download the `.tex` file and either:
- Drag it into **[Overleaf](https://overleaf.com)** and click Recompile
- Or compile locally: `pdflatex resume-tailored.tex`

Required packages: `fontsize`, `helvet`, `geometry`, `titlesec`, `enumitem`, `hyperref`, `fancyhdr`, `tabularx`

---

## Error Handling

If anything fails, `resume-tailor-error.log` downloads automatically containing:
- Timestamp
- Error message and stack trace
- First 1000 characters of the job description that triggered the failure
