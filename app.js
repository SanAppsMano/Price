// app.js

// --- Referências aos elementos do DOM ---
const btnSearch        = document.getElementById("btn-search");
const barcodeInput     = document.getElementById("barcode");
const resultContainer  = document.getElementById("result");
const summaryContainer = document.getElementById("summary");
const loading          = document.getElementById("loading");

// Botões de raio
const radiusButtons = document.querySelectorAll('.radius-btn');
// Define o raio inicial a partir do botão com classe .active
let selectedRadius = document.querySelector('.radius-btn.active').dataset.value;

// ——————————————————————————————————————————————————————————
// 1) Clique nos botões de raio
radiusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  });
});

// ——————————————————————————————————————————————————————————
// 2) Função principal de busca
btnSearch.addEventListener("click", async () => {
  const barcode = barcodeInput.value.trim();
  if (!barcode) {
    alert("Digite um código de barras válido.");
    return;
  }

  // exibe loading e limpa resultados antigos
  loading.classList.add("active");
  resultContainer.innerHTML  = "";
  summaryContainer.innerHTML = "";

  // 2.1) Monta parâmetros de localização
  const locType = document.querySelector('input[name="loc"]:checked').value;
  let latitude, longitude;

  if (locType === 'gps') {
    // obtém geolocalização
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );
      latitude  = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch (err) {
      alert("Não foi possível obter sua localização.");
      loading.classList.remove("active");
      return;
    }
  } else {
    // município selecionado no <select id="city">
    [latitude, longitude] = document.getElementById("city").value.split(",");
  }

  // 2.2) Ordenação
  const order = document.getElementById("ordenar").value;

  // 2.3) Chama a Netlify Function via POST
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
        dias:           3             // se quiser parametrizar, troque aqui
      })
    });
    data = await res.json();
  } catch (err) {
    alert("Erro ao buscar preços. Tente novamente mais tarde.");
    loading.classList.remove("active");
    return;
  }

  loading.classList.remove("active");

  // 2.4) Se não houver dados
  if (!data.dados?.length) {
    resultContainer.innerHTML = `
      <p>Nenhum estabelecimento encontrado em até <strong>${selectedRadius} km</strong>.</p>
    `;
    return;
  }

  // 2.5) Exibe resumo: quantidade + imagem do produto
  summaryContainer.innerHTML = `
    <p><strong>${data.dados.length}</strong> estabelecimento(s) encontrado(s).</p>
    ${data.imagemProdutoUrl ? `
      <div class="image-card">
        <img src="${data.imagemProdutoUrl}" alt="Imagem do produto">
        <h3>${data.nomeProduto || ''}</h3>
      </div>
    ` : ''}
  `;

  // 2.6) Ordena para achar menor e maior preço
  const sorted = [...data.dados].sort(
    (a, b) => a.valMinimoVendido - b.valMinimoVendido
  );
  const menor = sorted[0];
  const maior = sorted[sorted.length - 1];

  // 2.7) Renderiza os dois cards
  [menor, maior].forEach((e, i) => {
    const isFav    = !!e.favorito;
    const priceLab = i === 0 ? "Menor preço" : "Maior preço";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        ${priceLab} — ${isFav ? '❤️' : '🤍'} ${e.nomFantasia || e.nomRazaoSocial || '—'}
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

  // 2.8) (Opcional) Preencher modal de lista e histórico aqui...
});
// Fim de app.js
