// app.js

// — Referências ao DOM —
const btnSearch        = document.getElementById("btn-search");
const barcodeInput     = document.getElementById("barcode");
const resultContainer  = document.getElementById("result");
const summaryContainer = document.getElementById("summary");
const loading          = document.getElementById("loading");
const radiusButtons    = document.querySelectorAll('.radius-btn');

// variáveis globais para a localização atual
let userLatitude = null, userLongitude = null;

// — Histórico —
const historyListEl   = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");
let historyArr        = JSON.parse(localStorage.getItem("searchHistory") || "[]");

// Persiste histórico em localStorage
function saveHistory() {
  localStorage.setItem("searchHistory", JSON.stringify(historyArr));
}

// Carrega um item do histórico na interface
function loadFromCache(item) {
  // ... (sem alterações)
}

// Desenha histórico horizontal
function renderHistory() {
  // ... (sem alterações)
}

// Limpa histórico
clearHistoryBtn.addEventListener("click", () => {
  // ... (sem alterações)
});

// Renderiza histórico ao iniciar
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

  // Ajusta botão
  btnSearch.textContent = "Atualizar Preço";
  btnSearch.classList.add("btn-update-font");

  loading.classList.add("active");
  resultContainer.innerHTML  = "";
  summaryContainer.innerHTML = "";

  // 1) obtém localização: GPS ou município
  const locType = document.querySelector('input[name="loc"]:checked').value;
  if (locType === 'gps') {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );
      userLatitude  = pos.coords.latitude;
      userLongitude = pos.coords.longitude;
    } catch {
      loading.classList.remove("active");
      alert("Não foi possível obter sua localização.");
      return;
    }
  } else {
    [userLatitude, userLongitude] = document.getElementById("city").value.split(",").map(Number);
  }

  // 2) chamada à função
  let data;
  try {
    const res = await fetch('/.netlify/functions/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigoDeBarras: barcode,
        latitude:       userLatitude,
        longitude:      userLongitude,
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

  // restaura estados
  loading.classList.remove("active");
  btnSearch.textContent = "Pesquisar Preço";
  btnSearch.classList.remove("btn-update-font");

  // normaliza resultados
  const dados = Array.isArray(data)
    ? data
    : (Array.isArray(data.dados) ? data.dados : []);
  if (!dados.length) {
    resultContainer.innerHTML = `<p>Nenhum estabelecimento em até <strong>${selectedRadius} km</strong>.</p>`;
    return;
  }

  // cabeçalho do produto (sem alterações)
  // ...

  // renderiza cards usando origin=userLatitude,userLongitude
  resultContainer.innerHTML = "";
  dados.sort((a,b) => a.valMinimoVendido - b.valMinimoVendido)
       .slice(0,2)  // menor e maior
       .forEach((e,i) => {
    const priceLab  = i === 0 ? "Menor preço" : "Maior preço";
    const originStr = userLatitude != null
      ? `&origin=${userLatitude},${userLongitude}`
      : "";
    const href = `https://www.google.com/maps/dir/?api=1${originStr}&destination=${e.latitude},${e.longitude}`;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">${priceLab} — ${e.nomFantasia||e.nomRazaoSocial||'—'}</div>
      <div class="card-body">
        <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
        <p><strong>Bairro/Município:</strong> ${e.nomBairro||'—'} / ${e.nomMunicipio||'—'}</p>
        <a href="${href}" target="_blank">
          <i class="fas fa-map-marker-alt"></i> Como chegar
        </a>
      </div>
    `;
    resultContainer.appendChild(card);
  });

  // atualiza histórico (sem alterações)
});
