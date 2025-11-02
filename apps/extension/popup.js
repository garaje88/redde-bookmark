async function getActiveTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab.url;
}

document.getElementById('save').addEventListener('click', async () => {
  const url = await getActiveTabUrl();
  const target = `https://TU_DOMINIO/app/new?url=${encodeURIComponent(url)}`; // ej: http://localhost:4321
  chrome.tabs.create({ url: target });
});
