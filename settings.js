async function loadSettings() {
  const { geminiApiKey, baseResume } = await chrome.storage.local.get([
    'geminiApiKey',
    'baseResume',
  ]);
  if (geminiApiKey) document.getElementById('apiKey').value = geminiApiKey;
  if (baseResume) document.getElementById('baseResume').value = baseResume;
}

async function saveSettings() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const baseResume = document.getElementById('baseResume').value.trim();

  await chrome.storage.local.set({
    geminiApiKey: apiKey,
    baseResume,
  });

  const status = document.getElementById('saveStatus');
  status.classList.add('visible');
  setTimeout(() => status.classList.remove('visible'), 2000);
}

document.getElementById('saveBtn').addEventListener('click', saveSettings);

loadSettings();
