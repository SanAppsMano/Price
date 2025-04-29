/* app.js */

// Garante que todo o DOM esteja carregado antes de associar eventos
window.addEventListener('DOMContentLoaded', () => {
  // Referências ao DOM
  const btnSearch        = document.getElementById('btn-search');
  const barcodeInput     = document.getElementById('barcode');
  const daysRange        = document.getElementById('daysRange');
  const daysValue        = document.getElementById('daysValue');
  const resultContainer  = document.getElementById('result');
  const summaryContainer = document.getElementById('summary');
  const loading          = document.getElementById('loading');
  const radiusButtons    = document.querySelectorAll('.radius-btn');
  const historyListEl    = document.getElementById('history-list');
  const clearHistoryBtn  = document.getElementById('clear-history');

  // Histórico
  let historyArr        = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  let currentResults    = [];
  let selectedRadius    = document.querySelector('.radius-btn.active').dataset.value;

  // Formatação de moeda
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Inicializa label de dias e atualiza ao mover o slider
  daysValue.textContent = daysRange.value;
  daysRange.addEventListener('input', () => {
    daysValue.textContent = daysRange.value;
  });

  // Funções de histórico
  function saveHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(historyArr));
  }
  function renderHistory() {
    historyListEl.innerHTML = '';
    historyArr.forEach(item => {
      const li  = document.createElement('li'); li.className = 'history-item';
      const btn = document.createElement('button'); btn.title = item.name;
      btn.addEventListener('click', () => loadFromCache(item));
      if (item.image) {
        const img = document.createElement('img'); img.src = item.image; img.alt = item.name; btn.appendChild(img);
      } else btn.textContent = item.name;
      li.appendChild(btn);
      historyListEl.appendChild(li);
    });
  }
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Deseja limpar o histórico de buscas?')) {
      historyArr = [];
      saveHistory();
      renderHistory();
    }
  });
  renderHistory();

  // Seleção de raio
  radiusButtons.forEach(btn => btn.addEventListener('click', () => {
    radiusButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRadius = btn.dataset.value;
  }));

  // Lightbox para imagem
  (function createLightbox() {
    const lb = document.createElement('div'); lb.id = 'lightbox';
    Object.assign(lb.style, {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.8)', display: 'none', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, cursor: 'zoom-out'
    });
    const img = document.createElement('img'); img.id = 'lightbox-img';
    Object.assign(img.style, { maxWidth: '90%', maxHeight: '90%', boxShadow: '0 0 8px #fff' });
    lb.appendChild(img);
    lb.addEventListener('click', () => lb.style.display = 'none');
    document.body.appendChild(lb);
  })();

  function attachLightbox(imgEl) {
    imgEl.style.cursor = 'zoom-in';
    imgEl.addEventListener('click', () => {
      const lb = document.getElementById('lightbox');
      lb.querySelector('img').src = imgEl.src;
      lb.style.display = 'flex';
    });
  }

  // Renderização de resumo
  function renderSummary(list) {
    const first = list[0];
    const name = first.dscProduto || first.dscProduto || 'Produto';
    const imgUrl = first.codGetin ? `https://cdn-cosmos.bluesoft.com.br/products/${first.codGetin}` : '';
    summaryContainer.innerHTML = `
      <div class="product-header">
        <div class="product-image-wrapper">
          <img src="${imgUrl}" alt="${name}" />
          <div class="product-name-overlay">${name}</div>
        </div>
        <p><strong>${list.length}</strong> estabelecimento(s) encontrado(s).</p>
      </div>`;
    const imgEl = summaryContainer.querySelector('img');
    if (imgEl) attachLightbox(imgEl);
  }

  // Renderização de cards
  function renderCards(dados) {
    resultContainer.innerHTML = '';
    const sorted = [...dados].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
    const [menor, maior] = [sorted[0], sorted[sorted.length - 1]];
    [menor, maior].forEach((e, i) => {
      const label = i === 0 ? 'Menor preço' : 'Maior preço';
      const icon  = i === 0 ? 'public/images/ai-sim.png' : 'public/images/eita.png';
      const price = brl.format(e.valMinimoVendido);
      const color = i === 0 ? '#28a745' : '#dc3545';
      const when  = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : '—';
      const mapL  = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirL  = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div class="card-header">${label} — ${e.nomFantasia || e.nomRazaoSocial}</div>
        <div class="card-body">
          <div class="card-icon-right"><img src="${icon}" alt="${label}" /></div>
          <p><strong>Preço:</strong> <span style="color:${color}">${price}</span></p>
          <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
          <p><strong>Quando:</strong> ${when}</p>
          <p style="font-size:0.95rem;"><a href="${mapL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> | <a href="${dirL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a></p>
        </div>`;
      resultContainer.appendChild(card);
    });
  }

  // Carregar do histórico
  function loadFromCache(item) {
    if (!item.dados) { alert('Sem dados em cache.'); return; }
    currentResults = item.dados;
    barcodeInput.value = item.code;
    renderSummary(item.dados);
    renderCards(item.dados);
  }

  // Busca principal
  btnSearch.addEventListener('click', async () => {
    const barcode = barcodeInput.value.trim();
    if (!barcode) { alert('Digite um código de barras válido.'); return; }
    loading.classList.add('active');
    resultContainer.innerHTML = '';
    summaryContainer.innerHTML = '';
    let latitude, longitude;
    if (document.querySelector('input[name="loc"]:checked').value === 'gps') {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        latitude  = pos.coords.latitude;
        longitude = pos.coords.longitude;
          } catch {
      loading.classList.remove('active');
      // Mensagem para demora na resposta
      summaryContainer.innerHTML = `<p>O servidor demorou a responder. Tente novamente mais tarde.</p>`;
      return;
    }
    } else {
      [latitude, longitude] = document.getElementById('city').value.split(',').map(Number);
    }
    try {
      const diasEscolhidos = Number(daysRange.value);
      const res = await fetch('/.netlify/functions/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoDeBarras: barcode, latitude, longitude, raio: Number(selectedRadius), dias: diasEscolhidos })
      });
      const data = await res.json();
      loading.classList.remove('active');
      const dados = Array.isArray(data) ? data : data.dados || [];
      if (!dados.length) {
        summaryContainer.innerHTML = `<p>Nenhum estabelecimento encontrado. Tente novamente mais tarde.</p>`;
        return;
      }
      historyArr.unshift({ code: barcode, name: data.dscProduto || '', image: '', dados });
      saveHistory(); renderHistory();
      renderSummary(dados); renderCards(dados);
    } catch {
      loading.classList.remove('active');
      alert('Erro ao buscar preços.');
    }
  });

  // Modal lista ordenada
  document.getElementById('open-modal').addEventListener('click', () => {
    if (!currentResults.length) { alert('Faça uma busca primeiro.'); return; }
    const modal = document.getElementById('modal');
    const listEl = document.getElementById('modal-list');
    listEl.innerHTML = '';
    const sortedAll = [...currentResults].sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
    sortedAll.forEach((e, i) => {
      const price = e.valMinimoVendido.toFixed(2);
      const color = i === 0 ? '#28a745' : i === sortedAll.length - 1 ? '#dc3545' : '#007bff';
      const when  = e.dthEmissaoUltimaVenda ? new Date(e.dthEmissaoUltimaVenda).toLocaleString() : '—';
      const mapL = `https://www.google.com/maps/search/?api=1&query=${e.numLatitude},${e.numLongitude}`;
      const dirL = `https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}`;
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="card">
          <div class="card-header">${e.nomFantasia || e.nomRazaoSocial}</div>
          <div class="card-body">
            <p><strong>Preço:</strong> <span style="color:${color}">R$ ${price}</span></p>
            <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
            <p><strong>Quando:</strong> ${when}</p>
            <p style="font-size:0.95rem;"><a href="${mapL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver no mapa</a> | <a href="${dirL}" target="_blank"><i class="fas fa-map-marker-alt"></i> Como chegar</a></p>
          </div>
        </div>`;
      listEl.appendChild(li);
    });
    modal.classList.add('active');
  });
  document.getElementById('close-modal').addEventListener('click', () => document.getElementById('modal').classList.remove('active'));
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) document.getElementById('modal').classList.remove('active');
  });
});
