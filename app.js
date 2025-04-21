// app.js

// — Referências ao DOM —
const btnSearch        = document.getElementById("btn-search");
const barcodeInput     = document.getElementById("barcode");
const resultContainer  = document.getElementById("result");
const summaryContainer = document.getElementById("summary");
const loading          = document.getElementById("loading");
const radiusButtons    = document.querySelectorAll('.radius-btn');

// — Histórico —
const historyListEl   = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");
let historyArr        = JSON.parse(localStorage.getItem("searchHistory") || "[]");

// Persiste histórico em localStorage
function saveHistory() {
  localStorage.setItem("searchHistory", JSON.stringify(historyArr));
}

// Renderiza histórico com image, city e timestamp
function renderHistory() {
  historyListEl.innerHTML = "";
  historyArr.forEach(item => {
    const li = document.createElement("li");
    li.className = "history-item";

    if (item.image) {
      const wrapper = document.createElement("div");
      wrapper.className = "history-item-wrapper";
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.name;
      wrapper.appendChild(img);

      const overlay = document.createElement("div");
      overlay.className = "history-meta";
      const d = new Date(item.timestamp);
      const dateStr = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
      const timeStr = d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
      overlay.textContent = `${item.city} • ${dateStr} • ${timeStr}`;
      wrapper.appendChild(overlay);

      wrapper.addEventListener('click', () => loadFromCache(item));
      li.appendChild(wrapper);
    } else {
      const btn = document.createElement("button");
      btn.textContent = item.name;
      btn.addEventListener("click", () => loadFromCache(item));
      li.appendChild(btn);
    }

    historyListEl.appendChild(li);
  });
}

// Carrega e renderiza um item do histórico
function loadFromCache(item) {
  // ... (mantém seu código atual de loadFromCache) ...
}

// Inicializa histórico
renderHistory();

// Função principal de busca
btnSearch.addEventListener("click", async () => {
  // ... seu código de busca atual ...

  // após obter dados: renderiza cards, etc.

  // Inclui city e timestamp ao salvar no histórico
  const now = Date.now();
  const locType = document.querySelector('input[name="loc"]:checked').value;
  const cityLabel = locType === 'gps'
    ? 'Minha localização'
    : document.getElementById('city').selectedOptions[0].text;

  historyArr.unshift({
    code: barcode,
    name: productName,
    image: productImg,
    city: cityLabel,
    timestamp: now,
    dados
  });

  saveHistory();
  renderHistory();

  // ... restante do seu código ...
});

// ===== Footer & Modal =====
// ... mantém seu código atual para modal ...
