// Injected into LinkedIn, Indeed, and Accenture job pages.
// Scrapes the job description text and sends it to popup.js on request.

function scrapeLinkedIn() {
  const selectors = [
    '.jobs-description__content .jobs-box__html-content',
    '.jobs-description-content__text',
    '.job-view-layout .jobs-description',
    '[class*="jobs-description"]',
    '.description__text',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim()) return el.innerText.trim();
  }
  return null;
}

function scrapeIndeed() {
  const selectors = [
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[class*="jobDescription"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim()) return el.innerText.trim();
  }
  return null;
}

function scrapeAccenture() {
  // Accenture uses Adobe AEM — class names vary by region/template.
  // Try specific known containers first, then progressively broader fallbacks.
  const selectors = [
    // AEM rich-text content blocks
    '.cmp-text',
    // Job detail page structural containers
    '.job-details',
    '.job-description',
    '[class*="job-detail"]',
    '[class*="jobdetail"]',
    // AEM page/container components
    '[class*="cmp-container"]',
    // Landmark fallback — grab the <main> and strip nav noise
    'main',
  ];
  for (const sel of selectors) {
    // When multiple elements match, concatenate all of them (e.g. multiple .cmp-text blocks)
    const els = document.querySelectorAll(sel);
    if (!els.length) continue;
    const text = Array.from(els)
      .map((el) => el.innerText.trim())
      .filter((t) => t.length > 100)
      .join('\n\n');
    if (text.length > 100) return text;
  }
  return null;
}

function getJobDescription() {
  const host = window.location.hostname;
  if (host.includes('linkedin.com')) return scrapeLinkedIn();
  if (host.includes('indeed.com')) return scrapeIndeed();
  if (host.includes('accenture.com')) return scrapeAccenture();
  return null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_JOB_DESCRIPTION') {
    const jd = getJobDescription();
    sendResponse({ jobDescription: jd });
  }
  return true;
});
