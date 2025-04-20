// app.js

// Referências aos elementos do DOM
const btnSearch        = document.getElementById("btn-search");
const barcodeInput     = document.getElementById("barcode");
const resultContainer  = document.getElementById("result");
const summaryContainer = document.getElementById("summary");
const loading          = document.getElementById("loading");

const radiusButtons    = document.querySelectorAll('.radius-btn');
let selectedRadius     = document.querySelector('.radius-btn.active').dataset.value;

// 1) Tratamento dos botões de raio
radiusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  });
});

// 2) Função de busca
btnSearch.addEventListener("click", async () => {
  const barcode = barcodeInput.value.trim();
  if (!barcode) {
    alert("Digite um código de barras válido.");
    return;
  }

  // Exibe loading e limpa resultados anteriores
  loading.classList.add("active");
  resultContainer.innerHTML  = "";
  summaryContainer.innerHTML = "";

  // 2.1) Monta parâmetros de localização
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

  // 2.2) Chama a Netlify Function via POST
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

  // 2.3) Normaliza o array de resultados
  const dados = Array.isArray(data)
    ? data
    : (Array.isArray(data.dados) ? data.dados : []);
  if (!dados.length) {
    resultContainer.innerHTML = `
      <p>Nenhum estabelecimento encontrado em até <strong>${selectedRadius} km</strong>.</p>
    `;
    return;
  }

  // 2.4) Monta cabeçalho do produto: imagem + nome
  const productName   = data.nomeProduto || 'Produto não identificado';
  const productImgUrl = data.imagemProdutoUrl || 'https://via.placeholder.com/150';

  summaryContainer.innerHTML = `
    <div class="product-header">
      <img src="${productImgUrl}" alt="Imagem do produto">
      <p>${productName}</p>
    </div>
  `;

  // 2.5) Renderiza cards de menor e maior preço
  const sorted = [...dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
  const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];

  [menor, maior].forEach((e, i) => {
    const priceLab = i === 0 ? "Menor preço" : "Maior preço";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        ${priceLab} — ${e.nomFantasia || e.nomRazaoSocial || '—'}
      </div>
      <div class="card-body">
        <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
        <p><strong>Bairro/Município:</strong> 
           ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}" 
           target="_blank">
          <i class="fas fa-map-marker-alt"></i> Como chegar
        </a>
      </div>
    `;
    resultContainer.appendChild(card);
  });
});
