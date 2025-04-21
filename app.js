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

// Renderiza histórico com thumbnail, cidade e timestamp
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

// Carrega do histórico para a tela
function loadFromCache(item) {
  // ... seu código atual de loadFromCache sem alterações ...
}

// Inicializa histórico na carga
renderHistory();

// Seleção de raio
let selectedRadius = document.querySelector('.radius-btn.active').dataset.value;
radiusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  });
});

// Função principal de busca
btnSearch.addEventListener("click", async () => {
  const barcode = barcodeInput.value.trim();
  if (!barcode) { alert("Digite um código de barras válido."); return; }

  btnSearch.textContent = "Atualizar Preço";
  btnSearch.classList.add("btn-update-font");
  loading.classList.add("active");
  resultContainer.innerHTML  = "";
  summaryContainer.innerHTML = "";

  // Localização
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

  // Chamada à API
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
  btnSearch.textContent = "Pesquisar Preço";
  btnSearch.classList.remove("btn-update-font");

  // Normaliza e verifica resultados
  const dados = Array.isArray(data) ? data : (Array.isArray(data.dados) ? data.dados : []);
  if (!dados.length) {
    resultContainer.innerHTML = `<p>Nenhum estabelecimento em até <strong>${selectedRadius} km</strong>.</p>`;
    return;
  }

  // Cabeçalho do produto
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

  // Salva no histórico com cidade e timestamp
  const now     = Date.now();
  const cityLbl = locType === 'gps'
    ? 'Minha localização'
    : document.getElementById('city').selectedOptions[0].text;
  historyArr.unshift({
    code:      barcode,
    name:      productName,
    image:     productImg,
    city:      cityLbl,
    timestamp: now,
    dados
  });
  saveHistory();
  renderHistory();

  // Renderiza Menor/Maior preço
  const sorted2      = [...dados].sort((a,b)=>a.valMinimoVendido-b.valMinimoVendido);
  const [minItem,maxItem] = [sorted2[0], sorted2[sorted2.length-1]];
  [minItem, maxItem].forEach((e,i)=>{
    const priceLab = i===0?"Menor preço":"Maior preço";
    const mapL     = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
    const dirL     = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
    const card = document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div class="card-header">${priceLab} — ${e.nomFantasia||e.nomRazaoSocial||'—'}</div>
      <div class="card-body">
        <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
        <p><strong>Bairro/Município:</strong> ${e.nomBairro||'—'} / ${e.nomMunicipio||'—'}</p>
        <p style="font-size:0.95rem;">
          <a href="${mapL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> |
          <a href="${dirL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a>
        </p>
      </div>
    `;
    resultContainer.appendChild(card);
  });
});

// ===== Footer & Modal =====
document.getElementById('by-sanapps').addEventListener('click', () => {
  document.getElementById('sanapps-modal').classList.add('active');
});
const modal = document.getElementById('sanapps-modal');
modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', e => { if (e.target===modal) modal.classList.remove('active'); });
