document.addEventListener('DOMContentLoaded', () => {
  const updateBtn = document.getElementById('updateBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');
  const loader = document.getElementById('loader');

  // Verificar estado al abrir
  checkStatus();
  
  // Recuperar estado si el popup se cerró
  chrome.storage.local.get(['wasRunning'], (result) => {
    if (result.wasRunning) {
      checkStatus();
      chrome.storage.local.remove(['wasRunning']);
    }
  });

  function updateUI(running) {
    updateBtn.disabled = running;
    stopBtn.style.display = running ? 'inline-block' : 'none';
    loader.style.display = running ? 'block' : 'none';
    status.textContent = running ? '⏳ Proceso en curso...' : '✅ Listo';
  }

  async function checkStatus() {
    try {
      const response = await sendMessage({ action: "getStatus" });
      updateUI(response?.isRunning ?? false);
    } catch (error) {
      console.error("Error obteniendo estado:", error);
      updateUI(false);
    }
  }

  async function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  // Guardar estado al perder foco
  window.addEventListener('blur', () => {
    if (stopBtn.style.display === 'inline-block') {
      chrome.storage.local.set({ wasRunning: true });
    }
  });

  updateBtn.addEventListener('click', async () => {
    try {
      const response = await sendMessage({ action: "startProcess" });
      updateUI(true);
    } catch (error) {
      console.error("Error iniciando proceso:", error);
      alert("Error al iniciar el proceso");
    }
  });

  stopBtn.addEventListener('click', async () => {
    try {
      await sendMessage({ action: "stopProcess" });
      updateUI(false);
    } catch (error) {
      console.error("Error deteniendo proceso:", error);
      alert("Error al detener el proceso");
    }
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  });
});