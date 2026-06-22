// Service worker — handles Gemini API calls and .tex file download.
// Cannot use window or DOM (Manifest V3 constraint).

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_INSTRUCTION = `You are a resume tailoring assistant. Return ONLY a valid JSON object with exactly these keys and no other text:
{
  "languages": "string",
  "data_ai": "string",
  "tools_automation": "string",
  "genpact_bullet_1": "string",
  "genpact_bullet_2": "string",
  "genpact_bullet_3": "string",
  "accelth_bullet_1": "string",
  "accelth_bullet_2": "string",
  "accelth_bullet_3": "string",
  "project_1_name": "string",
  "project_1_stack": "string",
  "project_1_bullet_1": "string",
  "project_1_bullet_2": "string",
  "project_1_bullet_3": "string",
  "project_2_name": "string",
  "project_2_stack": "string",
  "project_2_bullet_1": "string",
  "project_2_bullet_2": "string",
  "project_2_bullet_3": "string",
  "project_3_name": "string",
  "project_3_stack": "string",
  "project_3_bullet_1": "string",
  "project_3_bullet_2": "string",
  "cover_letter": "string"
}

Rules you must follow strictly:
- No em dashes or hyphens anywhere
- Bullet points must be single sentence and concise
- Technical Proficiencies has exactly 3 categories, no new ones
- AI tools like Claude Code go in projects only, never in experience bullets
- Keep LaTeX special characters escaped: % as \\%, & as \\&, # as \\#
- Cover letter follows Jane Street narrative format: strong opening aligned to company mission, bridge Stevens MS coursework to projects, name specific company technologies, close with personality (F1 racing debates and Nu metal guitar)`;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TAILOR_RESUME') {
    tailorResume(message.jobDescription, message.baseResume)
      .then((result) => sendResponse({ success: true, coverLetter: result.coverLetter }))
      .catch((err) => {
        downloadErrorLog(err, message.jobDescription);
        sendResponse({ success: false, error: err.message });
      });
    return true; // keep message channel open for async response
  }
});

async function tailorResume(jobDescription, baseResume) {
  const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
  if (!geminiApiKey) throw new Error('No Gemini API key found. Please set it in Settings.');

  // Step 1 — call Gemini, get structured JSON back
  const json = await callGemini(geminiApiKey, jobDescription, baseResume);

  // Step 2 — fetch the .tex template and fill every placeholder
  const templateText = await fetchTemplate();
  const filledLatex = fillTemplate(templateText, json);

  // Step 3 — download the filled .tex file directly
  await downloadTex(filledLatex);

  return { coverLetter: json.cover_letter };
}

// ── Step 1 ─────────────────────────────────────────────────────────────────

async function callGemini(apiKey, jobDescription, baseResume) {
  const userMessage =
    `Job Description:\n${jobDescription}\n\nBase Resume:\n${baseResume}`;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();

  // Gemini 2.5 Flash returns thinking tokens in earlier parts — skip them
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const raw = (parts.find(p => !p.thought)?.text ?? parts[0]?.text) || '';

  // Extract the JSON object robustly — find first { to last }
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON object found in Gemini response. Raw: ' + raw.slice(0, 500));
  }

  // Gemini emits LaTeX escapes like \%, \&, \# inside JSON strings.
  // These are not valid JSON escape sequences and cause JSON.parse to fail.
  // Fix: double any backslash that isn't a recognised JSON escape character
  // so \% → \\% etc., leaving valid escapes like \n, \t, \", \\ untouched.
  const sanitised = match[0].replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

  try {
    return JSON.parse(sanitised);
  } catch (parseErr) {
    throw new Error(
      'Gemini returned unparseable JSON.\n' +
      'Parse error: ' + parseErr.message + '\n' +
      'Raw (first 500 chars): ' + raw.slice(0, 500)
    );
  }
}

// ── Step 2 ─────────────────────────────────────────────────────────────────

async function fetchTemplate() {
  const url = chrome.runtime.getURL('resume-template.tex');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load resume-template.tex from extension.');
  return res.text();
}

function fillTemplate(template, json) {
  return template
    .replaceAll('{{LANGUAGES}}',         json.languages)
    .replaceAll('{{DATA_AI}}',           json.data_ai)
    .replaceAll('{{TOOLS_AUTOMATION}}',  json.tools_automation)
    .replaceAll('{{GENPACT_BULLET_1}}',  json.genpact_bullet_1)
    .replaceAll('{{GENPACT_BULLET_2}}',  json.genpact_bullet_2)
    .replaceAll('{{GENPACT_BULLET_3}}',  json.genpact_bullet_3)
    .replaceAll('{{ACCELTH_BULLET_1}}',  json.accelth_bullet_1)
    .replaceAll('{{ACCELTH_BULLET_2}}',  json.accelth_bullet_2)
    .replaceAll('{{ACCELTH_BULLET_3}}',  json.accelth_bullet_3)
    .replaceAll('{{PROJECT_1_NAME}}',    json.project_1_name)
    .replaceAll('{{PROJECT_1_STACK}}',   json.project_1_stack)
    .replaceAll('{{PROJECT_1_BULLET_1}}',json.project_1_bullet_1)
    .replaceAll('{{PROJECT_1_BULLET_2}}',json.project_1_bullet_2)
    .replaceAll('{{PROJECT_1_BULLET_3}}',json.project_1_bullet_3)
    .replaceAll('{{PROJECT_2_NAME}}',    json.project_2_name)
    .replaceAll('{{PROJECT_2_STACK}}',   json.project_2_stack)
    .replaceAll('{{PROJECT_2_BULLET_1}}',json.project_2_bullet_1)
    .replaceAll('{{PROJECT_2_BULLET_2}}',json.project_2_bullet_2)
    .replaceAll('{{PROJECT_2_BULLET_3}}',json.project_2_bullet_3)
    .replaceAll('{{PROJECT_3_NAME}}',    json.project_3_name)
    .replaceAll('{{PROJECT_3_STACK}}',   json.project_3_stack)
    .replaceAll('{{PROJECT_3_BULLET_1}}',json.project_3_bullet_1)
    .replaceAll('{{PROJECT_3_BULLET_2}}',json.project_3_bullet_2);
}

// ── Step 3 ─────────────────────────────────────────────────────────────────

async function downloadTex(texString) {
  const base64 = btoa(unescape(encodeURIComponent(texString)));
  const dataUrl = `data:text/plain;base64,${base64}`;
  await chrome.downloads.download({
    url: dataUrl,
    filename: 'resume-tailored.tex',
    saveAs: false,
  });
}

function downloadErrorLog(err, jobDescription) {
  const lines = [
    `Resume Tailor — Error Log`,
    `Timestamp : ${new Date().toISOString()}`,
    ``,
    `Error     : ${err.message}`,
    ``,
    `Stack Trace:`,
    err.stack || '(no stack trace available)',
    ``,
    `Job Description Snippet (first 1000 chars):`,
    (jobDescription || '').slice(0, 1000),
  ];

  const log = lines.join('\n');
  const base64 = btoa(unescape(encodeURIComponent(log)));
  chrome.downloads.download({
    url: `data:text/plain;base64,${base64}`,
    filename: 'resume-tailor-error.log',
    saveAs: false,
  });
}
