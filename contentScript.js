let lastProcessedUrl = null; // Para evitar ejecuciones repetidas en la misma URL

function detectPageType() {
  const path = window.location.pathname;
  if (path.includes("/item/")) return "DETAIL";
  if (path.includes("/app/catalog/edit/")) return "EDIT";
  return "OTHER";
}

function handleDetailPage() {
  console.log("📌 Detectada página de detalle, intentando redirigir a edición...");
  setTimeout(() => {
    const editButton = document.querySelector('button.item-detail-square-button_ItemDetailSquareButton--edit__FRjPo');
    if (editButton) {
      editButton.click();
    } else {
      console.error("❌ Botón Editar no encontrado.");
      chrome.runtime.sendMessage({ action: "updateFailed", reason: "Edit button not found" });
    }
  }, 2000);
}

function handleEditPage() {
  console.log("📌 Detectada página de edición, buscando botón de actualización...");
  setTimeout(() => {
    const wallaButtons = document.querySelectorAll("walla-button");
    let updateClicked = false;

    wallaButtons.forEach(button => {
      if (button.shadowRoot) {
        const btn = button.shadowRoot.querySelector("button");
        if (btn?.innerText.includes("Actualizar")) {
          btn.click();
          updateClicked = true;

          setTimeout(() => {
            chrome.runtime.sendMessage({ action: "updateCompleted" });
          }, 3000);
        }
      }
    });

    if (!updateClicked) {
      console.error("❌ Botón Actualizar no encontrado.");
      chrome.runtime.sendMessage({ action: "updateFailed", reason: "Update button not found" });
    }
  }, 4000);
}

function main() {
  const currentUrl = window.location.href;
  if (currentUrl === lastProcessedUrl) return; // Evitar ejecuciones repetidas en la misma URL

  lastProcessedUrl = currentUrl;
  const pageType = detectPageType();

  switch (pageType) {
    case "DETAIL":
      handleDetailPage();
      break;
    case "EDIT":
      handleEditPage();
      break;
    default:
      console.warn("⚠️ Página no compatible");
  }
}

// Ejecutar `main` cuando la URL cambie
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "urlChanged") {
    main();
  }
});

main(); // Ejecutar al cargar la página
