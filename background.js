const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 10000, 15000];
const TAB_LIFECYCLE = {
  LOAD_TIMEOUT: 15000,
  ACTION_TIMEOUT: 10000
};

let executionQueue = [];
let currentProcess = null;
let updateTabId = null;
let isRunning = false; // Nuevo estado persistente

async function processItem(url, attempt = 0) {
  try {
    console.log(`🔄 Intento ${attempt + 1}/${MAX_RETRIES} para ${url}`);

    if (updateTabId === null) {
      const tab = await chrome.tabs.create({ url, active: true });
      updateTabId = tab.id;
    } else {
      await chrome.tabs.update(updateTabId, { url, active: true });
    }

    let success = false;

    const result = await new Promise((resolve) => {
      chrome.runtime.onMessage.addListener(function listener(message, sender) {
        if (sender.tab?.id === updateTabId) {
          chrome.runtime.onMessage.removeListener(listener);

          if (message.action === "updateCompleted") {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: message.reason || "Error desconocido" });
          }
        }
      });

      setTimeout(() => {
        resolve({ success: false, error: "Timeout excedido" });
      }, TAB_LIFECYCLE.LOAD_TIMEOUT);
    });

    if (result.success) {
      console.log(`✅ Éxito en ${url}`);
      return true;
    } else if (attempt < MAX_RETRIES - 1) {
      console.log(`⏳ Reintentando en ${RETRY_DELAYS[attempt] / 1000} segundos...`);
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
      return processItem(url, attempt + 1);
    } else {
      console.error(`❌ Fallo definitivo en ${url}: ${result.error}`);
      return false;
    }

  } catch (error) {
    console.error(`⚠️ Error crítico procesando ${url}:`, error);
    return false;
  }
}

async function processQueue() {
  while (executionQueue.length > 0 && isRunning) { // Verificar estado continuamente
    currentProcess = executionQueue.shift();
    await processItem(currentProcess.url);
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log("✅ Todos los productos han sido actualizados.");
  isRunning = false;
  currentProcess = null;
}

async function startProcess() {
  isRunning = true;
  chrome.storage.local.get(['savedUrls'], async (result) => {
    executionQueue = [...result.savedUrls.map(url => ({ url }))];

    if (executionQueue.length > 0) {
      await processQueue();
    } else {
      console.log("📌 No hay URLs guardadas para actualizar.");
      isRunning = false;
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "startProcess":
      startProcess();
      sendResponse({ success: true });
      break;

    case "stopProcess":
      executionQueue = [];
      isRunning = false;
      currentProcess = null;
      sendResponse({ success: true });
      break;

    case "getStatus":
      sendResponse({ isRunning });
      break;

    default:
      sendResponse({ success: false, message: "Acción no reconocida" });
  }
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === updateTabId && changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tabId, { action: "urlChanged" });
  }
});