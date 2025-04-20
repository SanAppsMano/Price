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
// carregamos do localStorage; chave mantida de antes
let historyArr        = JSON.parse(localStorage.getItem("searchHistory") || "[]");

// helper para persistir histórico
function saveHistory() {
  localStorage.setItem("searchHistory", JSON.stringify(historyArr));
}

// Função que redesenha resumo + cards a partir de um item de histórico
function loadFromCache(item) {
  const { name: productName, image: productImg, dados } = item;

  // Cabeçalho do produto
  summaryContainer.innerHTML = `
    <div class="product-header">
      ${productImg
        ? `<img src="${productImg}" alt="${productName}" />`
        : `<p>${productName}</p>`
      }
      <p><strong>${dados.length}</strong> estabelecimento(s) no histórico.</p>
    </div>
  `;

  // Cards
  resultContainer.innerHTML = "";
  const sorted = [...dados].sort((a,b) => a.valMinimoVendido - b.valMinimoVendido);
  const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];
  [menor, maior].forEach((e,i) => {
    const priceLab = i === 0 ? "Menor preço" : "Maior preço";
    const card     = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        ${priceLab} — ${e.nomFantasia||e.nomRazaoSocial||'—'}
      </div>
      <div class="card-body">
        <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
        <p><strong>Bairro/Município:</strong>
           ${e.nomBairro||'—'} / ${e.nomMunicipio||'—'}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}"
           target="_blank">
          <i class="fas fa-map-marker-alt"></i> Como chegar
        </a>
      </div>
    `;
    resultContainer.appendChild(card);
  });
}

// Função que desenha a lista horizontal de histórico
function renderHistory() {
  historyListEl.innerHTML = "";
  historyArr.forEach(item => {
    const li = document.createElement("li");
    li.className = "history-item";

    const btn = document.createElement("button");
    btn.title = item.name;
    btn.addEventListener("click", () => {
      loadFromCache(item);
    });

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

// renderiza ao iniciar
renderHistory();

// — Seleção de raio —
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

  // mostra loading e limpa anteriores
  loading.classList.add("active");
  resultContainer.innerHTML  = "";
  summaryContainer.innerHTML = "";

  // localização
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
    [latitude, longitude] = document.getElementById("city").value.split(",");
  }

  const order = document.getElementById("ordenar").value;

  // chamada POST
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
    console.log("Resposta da busca:", data);
  } catch {
    loading.classList.remove("active");
    alert("Erro ao buscar preços. Tente novamente mais tarde.");
    return;
  }

  loading.classList.remove("active");

  // normaliza array
  const dados = Array.isArray(data)
    ? data
    : (Array.isArray(data.dados) ? data.dados : []);
  if (!dados.length) {
    resultContainer.innerHTML = `
      <p>Nenhum estabelecimento encontrado em até <strong>${selectedRadius} km</strong>.</p>
    `;
    return;
  }

  // cabeçalho do produto
  const primeiro    = dados[0];
  const productName = data.dscProduto || primeiro.dscProduto || 'Produto não identificado';
  const productImg  = primeiro.codGetin
    ? `https://cdn-cosmos.bluesoft.com.br/products/${primeiro.codGetin}`
    : '';

  summaryContainer.innerHTML = `
    <div class="product-header">
      ${productImg
        ? `<img src="${productImg}" alt="${productName}" />`
        : `<p>${productName}</p>`
      }
      <p><strong>${dados.length}</strong> estabelecimento(s) encontrado(s).</p>
    </div>
  `;

  // adiciona ao histórico
  historyArr.unshift({ code: barcode, name: productName, image: productImg, dados });
  if (historyArr.length > 20) historyArr.pop();
  saveHistory();
  renderHistory();

  // renderiza cards
  const sorted = [...dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
  const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];
  [menor, maior].forEach((e,i) => {
    const priceLab = i === 0 ? "Menor preço" : "Maior preço";
    const card     = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        ${priceLab} — ${e.nomFantasia||e.nomRazaoSocial||'—'}
      </div>
      <div class="card-body">
        <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
        <p><strong>Bairro/Município:</strong>
           ${e.nomBairro||'—'} / ${e.nomMunicipio||'—'}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}"
           target="_blank">
          <i class="fas fa-map-marker-alt"></i> Como chegar
        </a>
      </div>
    `;
    resultContainer.appendChild(card);
  });
});
