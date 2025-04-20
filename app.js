// app.js

const btnSearch        = document.getElementById("btn-search");
const resultContainer  = document.getElementById("result");
const summaryContainer = document.getElementById("summary");
const loading          = document.getElementById("loading");

// 1) Lógica de seleção de raio
const radiusButtons = document.querySelectorAll('.radius-btn');
let selectedRadius  = document.querySelector('.radius-btn.active').dataset.value;

radiusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  });
});

btnSearch.addEventListener("click", async () => {
  const barcode = document.getElementById("barcode").value.trim();
  if (!barcode) {
    alert("Digite um código de barras válido.");
    return;
  }

  // mostra loading
  loading.classList.add("active");
  resultContainer.innerHTML = "";
  summaryContainer.innerHTML = "";

  // 2) Monta parâmetros de localização
  const locType = document.querySelector('input[name="loc"]:checked').value;
  let latitude, longitude;

  if (locType === 'gps') {
    // tenta pegar geolocalização do navegador
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
    // município selecionado
    [latitude, longitude] = document.getElementById("city").value.split(",");
  }

  // 3) Ordenação
  const order = document.getElementById("ordenar").value;

  // 4) Chama API com o raio
  const url = `/functions/search?q=${barcode}`
            + `&lat=${latitude}&lng=${longitude}`
            + `&radius=${selectedRadius}`
            + `&order=${order}`;

  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch (e) {
    alert("Erro ao buscar preços. Tente novamente mais tarde.");
    loading.classList.remove("active");
    return;
  }

  loading.classList.remove("active");

  // 5) Se não vier nada
  if (!data.dados?.length) {
    resultContainer.innerHTML = `
      <p>Nenhum estabelecimento encontrado em até <strong>${selectedRadius} km</strong>.</p>
    `;
    return;
  }

  // 6) Mostra resumo (quantidade + imagem)
  summaryContainer.innerHTML = `
    <p><strong>${data.dados.length}</strong> estabelecimento(s) encontrado(s).</p>
    ${data.imagemProdutoUrl ? `
      <div class="image-card">
        <img src="${data.imagemProdutoUrl}" alt="Imagem do produto">
        <h3>${data.nomeProduto || ''}</h3>
      </div>
    ` : ''}
  `;

  // 7) Renderiza menor e maior preço
  const sorted = [...data.dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
  const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];

  [menor, maior].forEach((e, i) => {
    const isFav    = e.favorito;
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

  // ... abrir modal, histórico etc, segue igual
});
