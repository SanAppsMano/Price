const btnSearch = document.getElementById("btn-search");
const resultContainer = document.getElementById("result");
const summaryContainer = document.getElementById("summary");
const loading = document.getElementById("loading");
// ... outras refs (modal, history) permanecem

btnSearch.addEventListener("click", async () => {
  const barcode = document.getElementById("barcode").value.trim();
  if (!barcode) return alert("Digite um código de barras válido.");

  // mostra loading
  loading.classList.add("active");
  resultContainer.innerHTML = "";
  summaryContainer.innerHTML = "";

  // chama sua API
  const res = await fetch(`/functions/search?q=${barcode}&...`);
  const data = await res.json();

  loading.classList.remove("active");

  // resumo: quantidade + imagem
  summaryContainer.innerHTML = `
    <p><strong>${data.dados.length}</strong> estabelecimento(s) encontrado(s).</p>
    <div class="image-card">
      <img src="${data.imagemProdutoUrl}" alt="Imagem do produto">
      <h3>${data.nomeProduto}</h3>
    </div>
  `;

  // encontrar menor e maior preço
  const sorted = [...data.dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
  const menor = sorted[0];
  const maior = sorted[sorted.length - 1];

  // renderizar cards
  [menor, maior].forEach((e, i) => {
    const isFav = e.favorito; // ajuste conforme seu esquema
    const priceType = i === 0 ? "Menor preço" : "Maior preço";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">${priceType} — ${isFav ? '❤️' : '🤍'} ${e.nomFantasia || e.nomRazaoSocial || '—'}</div>
      <div class="card-body">
        <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
        <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}" target="_blank">
          <i class="fas fa-map-marker-alt"></i> Como chegar
        </a>
      </div>
    `;
    resultContainer.appendChild(card);
  });

  // opcional: preencher modal e histórico...
});
