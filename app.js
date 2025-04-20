// app.js

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

btnSearch.addEventListener("click", async () => {
  const barcode = barcodeInput.value.trim();
  if (!barcode) {
    return alert("Digite um código de barras válido.");
  }

  // exibe loading e limpa resultados antigos
  loading.classList.add("active");
  resultContainer.innerHTML  = "";
  summaryContainer.innerHTML = "";

  // monta localização
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

  // e ordenação
  const order = document.getElementById("ordenar").value;

  // 2) fetch POST
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
  } catch (err) {
    loading.classList.remove("active");
    return alert("Erro ao buscar preços. Tente novamente mais tarde.");
  }

  loading.classList.remove("active");

  // 3) NORMALIZAÇÃO do array de resultados
  // se a função devolveu um array raiz, usa ele; senão, tenta data.dados
  const dados = Array.isArray(data)
    ? data
    : (Array.isArray(data.dados) ? data.dados : []);

  if (!dados.length) {
    return resultContainer.innerHTML = `
      <p>Nenhum estabelecimento encontrado em até <strong>${selectedRadius} km</strong>.</p>
    `;
  }

  // 4) resumo
  summaryContainer.innerHTML = `
    <p><strong>${dados.length}</strong> estabelecimento(s) encontrado(s).</p>
    ${data.imagemProdutoUrl ? `
      <div class="image-card">
        <img src="${data.imagemProdutoUrl}" alt="Imagem do produto">
        <h3>${data.nomeProduto || ''}</h3>
      </div>
    ` : ''}
  `;

  // 5) menor e maior preço
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

  // 6) aqui você pode preencher o modal e histórico...
});
