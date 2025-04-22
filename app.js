/* Updated app.js to use icon-only button for search and remove text labels */

// — Referências ao DOM —
const btnSearch        = document.getElementById("btn-search");
const barcodeInput     = document.getElementById("barcode");
const resultContainer  = document.getElementById("result");
const summaryContainer = document.getElementById("summary");
const loading          = document.getElementById("loading");
const radiusButtons    = document.querySelectorAll('.radius-btn');

// — Histórico —
const historyListEl    = document.getElementById("history-list");
const clearHistoryBtn  = document.getElementById("clear-history");
let historyArr         = JSON.parse(localStorage.getItem("searchHistory") || "[]");
const MAX_HISTORY      = 20; // limite de entradas no histórico

// HTML do ícone de pesquisa
const searchIconHTML = '<i class="fas fa-search"></i>';

// Inicializa botão sempre com ícone
btnSearch.innerHTML = searchIconHTML;

// Persiste histórico em localStorage
function saveHistory() {
  try {
    localStorage.setItem("searchHistory", JSON.stringify(historyArr));
  } catch (e) {
    console.warn('Não foi possível salvar histórico:', e);
  }
}

// — Modal de lista ordenada —
const openModalBtn     = document.getElementById("open-modal");
const closeModalBtn    = document.getElementById("close-modal");
const modal            = document.getElementById("modal");
const modalList        = document.getElementById("modal-list");
let currentResults     = [];

// Renderiza o resumo + cards a partir do cache
function loadFromCache(item) {
  if (!item.dados || !Array.isArray(item.dados)) {
    alert("Sem dados em cache para este produto. Faça a busca primeiro.");
    return;
  }

  currentResults = item.dados;
  barcodeInput.value = item.code;

  const { name: productName, image: productImg, dados } = item;
  summaryContainer.innerHTML = `
    <div class="product-header">
      <div class="product-image-wrapper">
        <img src="${productImg || 'https://via.placeholder.com/150'}" alt="${productName}" />
        <div class="product-name-overlay">${productName}</div>
      </div>
      <p><strong>${dados.length}</strong> estabelecimento(s) no histórico.</p>
    </div>
  `;

  resultContainer.innerHTML = "";
  const sorted = [...dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
  const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];
  [menor, maior].forEach((e, i) => {
    const priceLab = i === 0 ? "Menor preço" : "Maior preço";
    const mapL = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
    const dirL = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
    const when = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : "—";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">${priceLab} — ${e.nomFantasia || e.nomRazaoSocial || '—'}</div>
      <div class="card-body">
        <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
        <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
        <p><strong>Quando:</strong> ${when}</p>
        <p style="font-size: 0.95rem;">
          <a href="${mapL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> |
          <a href="${dirL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a>
        </p>
      </div>
    `;
    resultContainer.appendChild(card);
  });
}

// Desenha lista horizontal do histórico
function renderHistory() {
  historyListEl.innerHTML = "";
  historyArr.forEach(item => {
    const li = document.createElement("li");
    li.className = "history-item";
    const btn = document.createElement("button");
    btn.title = item.name;
    btn.addEventListener("click", () => loadFromCache(item));

    if (item.image) {
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.name;
      btn.appendChild(img);
    } else {
      btn.textContent = item.name;
    }

    li.appendChild(btn);
    historyListEl.appendChild(li);
  });
}

// Limpa histórico
clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Deseja limpar o histórico de buscas?")) {
    historyArr = [];
    saveHistory();
    renderHistory();
  }
});

renderHistory();

// — Seleção de raio de busca —
let selectedRadius = document.querySelector('.radius-btn.active').dataset.value;
radiusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  });
});

// — Função principal de busca —
btnSearch.addEventListener("click", async () => {
  const barcode = barcodeInput.value.trim();
  if (!barcode) {
    alert("Digite um código de barras válido.");
    return;
  }

  // exibe ícone e remove possíveis labels
  btnSearch.innerHTML = searchIconHTML;
  loading.classList.add("active");
  resultContainer.innerHTML  = "";
  summaryContainer.innerHTML = "";

  const locType = document.querySelector('input[name="loc"]:checked').value;
  let latitude, longitude;
  if (locType === 'gps') {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );
      latitude  = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch {
      loading.classList.remove("active");
      alert("Não foi possível obter sua localização.");
      return;
    }
  } else {
    [latitude, longitude] = document.getElementById("city").value.split(",").map(Number);
  }

  let data;
  try {
    const res = await fetch('/.netlify/functions/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigoDeBarras: barcode,
        latitude:       Number(latitude),
        longitude:      Number(longitude),
        raio:           Number(selectedRadius),
        dias:           3
      })
    });
    data = await res.json();
  } catch {
    loading.classList.remove("active");
    alert("Erro ao buscar preços. Tente novamente mais tarde.");
    return;
  }

  loading.classList.remove("active");
  // mantém apenas ícone no botão após busca
  btnSearch.innerHTML = searchIconHTML;

  const dados = Array.isArray(data)
    ? data
    : (Array.isArray(data.dados) ? data.dados : []);
  if (!dados.length) {
    resultContainer.innerHTML = `<p>Nenhum estabelecimento encontrado em até <strong>${selectedRadius} km</strong>.</p>`;
    return;
  }

  currentResults = dados;
  const primeiro    = dados[0];
  const productName = data.dscProduto || primeiro.dscProduto || 'Produto não identificado';
  const productImg  = primeiro.codGetin
    ? `https://cdn-cosmos.bluesoft.com.br/products/${primeiro.codGetin}`
    : '';

  summaryContainer.innerHTML = `
    <div class="product-header">
      <div class="product-image-wrapper">
        <img src="${productImg || 'https://via.placeholder.com/150'}" alt="${productName}" />
        <div class="product-name-overlay">${productName}</div>
      </div>
      <p><strong>${dados.length}</strong> estabelecimento(s) encontrado(s).</p>
    </div>
  `;

  // Atualiza histórico com limite de entradas
  historyArr.unshift({ code: barcode, name: productName, image: productImg, dados });
  if (historyArr.length > MAX_HISTORY) {
    historyArr = historyArr.slice(0, MAX_HISTORY);
  }
  saveHistory();
  renderHistory();

  const sorted2 = [...dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
  const [minItem, maxItem] = [sorted2[0], sorted2[sorted2.length - 1]];
  [minItem, maxItem].forEach((e, i) => {
    const priceLab = i === 0 ? "Menor preço" : "Maior preço";
    const mapL = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
    const dirL = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
    const when = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).
