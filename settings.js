document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('urlsTextarea');
  const saveBtn = document.getElementById('saveBtn');

  chrome.storage.local.get(['savedUrls'], (result) => {
    if (result.savedUrls) {
      textarea.value = result.savedUrls.join('\n');
    }
  });

  saveBtn.addEventListener('click', () => {
    const urls = textarea.value
      .split('\n')
      .map(url => url.trim())
      .filter(url => {
        if (!url) return false;
        try {
          const urlObj = new URL(url);
          const isValidPath = /\/item\/.+\-\d{6,}$/.test(urlObj.pathname);
          return urlObj.hostname.includes('wallapop.com') && isValidPath;
        } catch {
          return false;
        }
      });

    if (urls.length === 0) {
      alert('❌ Formato requerido:\nhttps://es.wallapop.com/item/título-del-producto-123456');
      return;
    }

    chrome.storage.local.set({ savedUrls: urls }, () => {
      alert(`✅ ${urls.length} enlaces válidos guardados!`);
      window.close();
    });
  });
});