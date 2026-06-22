let detectedJD = null;
let currentCoverLetter = null;

const statusBar = document.getElementById('statusBar');
const tailorBtn = document.getElementById('tailorBtn');
const spinner = document.getElementById('spinner');
const results = document.getElementById('results');
const downloadCoverBtn = document.getElementById('downloadCoverBtn');
const setupPanel = document.getElementById('setupPanel');
const setupSaveStatus = document.getElementById('setupSaveStatus');

function setStatus(msg, type = '') {
  statusBar.textContent = msg;
  statusBar.className = 'status-bar' + (type ? ` ${type}` : '');
}

async function detectJobDescription() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  const isSupported =
    url.includes('linkedin.com/jobs') ||
    url.includes('indeed.com/viewjob') ||
    url.includes('accenture.com') && url.includes('careers/jobdetails');

  if (!isSupported) {
    setStatus('Open a LinkedIn or Indeed job listing to get started.', 'error');
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_DESCRIPTION' });
    if (response?.jobDescription) {
      detectedJD = response.jobDescription;
      setStatus('Job description detected. Ready to tailor!', 'success');
      tailorBtn.disabled = false;
    } else {
      setStatus('Could not find job description on this page.', 'error');
    }
  } catch {
    setStatus('Could not read page. Try refreshing the job listing.', 'error');
  }
}

async function handleTailor() {
  const { baseResume } = await chrome.storage.local.get('baseResume');
  if (!baseResume) {
    setStatus('No base resume saved. Click Settings to add one.', 'error');
    return;
  }

  const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
  if (!geminiApiKey) {
    setStatus('No Gemini API key set. Click Settings to add one.', 'error');
    return;
  }

  tailorBtn.disabled = true;
  spinner.style.display = 'block';
  results.style.display = 'none';
  setStatus('Sending to Gemini…');

  const response = await chrome.runtime.sendMessage({
    type: 'TAILOR_RESUME',
    jobDescription: detectedJD,
    baseResume,
  });

  spinner.style.display = 'none';
  tailorBtn.disabled = false;

  if (!response.success) {
    setStatus('Error: ' + response.error, 'error');
    return;
  }

  currentCoverLetter = response.coverLetter;
  document.getElementById('bulletOutput').textContent =
    'Your tailored resume-tailored.tex is downloading. Open it in Overleaf or a local LaTeX editor to compile to PDF.';
  document.getElementById('coverOutput').textContent = response.coverLetter;
  downloadCoverBtn.style.display = 'block';
  results.style.display = 'block';
  setStatus('Done! .tex file downloading. Cover letter ready below.', 'success');
}

document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const text = document.getElementById(targetId).textContent;
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = original), 1500);
    });
  });
});

downloadCoverBtn.addEventListener('click', () => {
  if (!currentCoverLetter) return;
  const blob = new Blob([currentCoverLetter], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cover-letter.txt';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

tailorBtn.addEventListener('click', handleTailor);

document.getElementById('saveSetupBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('setupApiKey').value.trim();
  const resume = document.getElementById('setupResume').value.trim();

  if (!apiKey && !resume) {
    setStatus('Please fill in at least one field.', 'error');
    return;
  }

  const toSave = {};
  if (apiKey) toSave.geminiApiKey = apiKey;
  if (resume) toSave.baseResume = resume;

  await chrome.storage.local.set(toSave);

  setupSaveStatus.style.display = 'block';

  // Re-check whether setup is now complete and hide panel if so
  const stored = await chrome.storage.local.get(['geminiApiKey', 'baseResume']);
  if (stored.geminiApiKey && stored.baseResume) {
    setTimeout(() => {
      setupPanel.style.display = 'none';
      setupSaveStatus.style.display = 'none';
    }, 1000);
  }
});

async function checkSetup() {
  const { geminiApiKey, baseResume } = await chrome.storage.local.get([
    'geminiApiKey',
    'baseResume',
  ]);

  if (!geminiApiKey || !baseResume) {
    setupPanel.style.display = 'block';
    // Pre-fill whatever already exists so user only has to fill the missing part
    if (geminiApiKey) document.getElementById('setupApiKey').value = geminiApiKey;
    if (baseResume)   document.getElementById('setupResume').value = baseResume;
  }
}

checkSetup();
detectJobDescription();
