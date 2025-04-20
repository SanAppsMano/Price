// app.js

// — Referências DOM —
const btnSearch        = document.getElementById("btn-search");
const barcodeInput     = document.getElementById("barcode");
const resultContainer  = document.getElementById("result");
const summaryContainer = document.getElementById("summary");
const loading          = document.getElementById("loading");

const radiusButtons    = document.querySelectorAll('.radius-btn');
let selectedRadius     = document.querySelector('.radius-btn.active').dataset.value;

// Histórico de buscas
const historyList     = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
let historyArr        = JSON.parse(localStorage.getItem('priceSearchHistory') || '[]');

function renderHistory() {
  historyList.innerHTML = '';
  historyArr.forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div class="history-thumb">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}">`
          : `<div style="width:48px;height:48px;background:#ccc;border-radius:.25rem"></div>`
        }
      </div>
      <div class="history-info">
        <span class="history-name">${item.name}</span>
        <span class="history-date">${item.date}</span>
      </div>
    `;
    historyList.appendChild(li);
  });
}
function saveHistory() {
  localStorage.setItem('priceSearchHistory', JSON.stringify(historyArr));
}
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Deseja limpar todo o histórico de buscas?')) {
    historyArr = [];
    saveHistory();
    renderHistory();
  }
});
renderHistory();

// — Lógica de seleção de raio —
radiusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  });
});

// — Função de busca —
btnSearch.addEventListener("click", async () => {
  const barcode = barcodeInput.value.trim();
  if (!barcode) return alert("Digite um código de barras válido.");

  // mostra loading e limpa áreas
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
      return alert("Não foi possível obter sua localização.");
    }
  } else {
    [latitude, longitude] = document.getElementById("city").value.split(",");
  }

  const order = document.getElementById("ordenar").value;

  // chamada POST à função Netlify
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
    return alert("Erro ao buscar preços. Tente novamente mais tarde.");
  }

  loading.classList.remove("active");

  // normaliza resultado
  const dados = Array.isArray(data)
    ? data
    : (Array.isArray(data.dados) ? data.dados : []);

  if (!dados.length) {
    resultContainer.innerHTML = `
      <p>Nenhum estabelecimento encontrado em até <strong>${selectedRadius} km</strong>.</p>
    `;
    return;
  }

  // — Resumo com imagem e nome do produto —
  summaryContainer.innerHTML = `
    <div class="image-card">
      <img src="${data.imagemProdutoUrl}" alt="${data.nomeProduto}">
      <h3>${data.nomeProduto}</h3>
    </div>
    <p><strong>${dados.length}</strong> estabelecimento(s) encontrado(s).</p>
  `;

  // — Adiciona ao histórico —
  historyArr.unshift({
    name:  data.nomeProduto || barcode,
    image: data.imagemProdutoUrl || '',
    date:  new Date().toLocaleString('pt-BR', { hour12: false })
  });
  if (historyArr.length > 20) historyArr.pop();
  saveHistory();
  renderHistory();

  // — Encontra menor e maior preço e renderiza cards —
  const sorted = [...dados].sort((a,b) => a.valMinimoVendido - b.valMinimoVendido);
  const [menor, maior] = [sorted[0], sorted[sorted.length-1]];

  [menor, maior].forEach((e, i) => {
    const isFav    = !!e.favorito;
    const priceLab = i === 0 ? "Menor preço" : "Maior preço";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        ${priceLab} — ${isFav ? '❤️' : '🤍'} ${e.nomFantasia||e.nomRazaoSocial||'—'}
      </div>
      <div class="card-body">
        <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
        <p><strong>Bairro/Município:</strong> ${e.nomBairro||'—'} / ${e.nomMunicipio||'—'}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}" target="_blank">
          <i class="fas fa-map-marker-alt"></i> Como chegar
        </a>
      </div>
    `;
    resultContainer.appendChild(card);
  });

  // — (Opcional) Modal e histórico adicionais… —
});
