window.addEventListener('DOMContentLoaded', () => {
  const statusEl     = document.getElementById('api-status');
  const locRadios    = document.querySelectorAll('input[name="loc"]');
  const cityBlock    = document.getElementById('city-block');
  const citySel      = document.getElementById('city');
  const radiusBtns   = document.querySelectorAll('.radius-btn');
  const btnSearch    = document.getElementById('btn-search');
  const barcodeIn    = document.getElementById('barcode');
  const ordenarSel   = document.getElementById('ordenar');
  const resultDiv    = document.getElementById('result');
  const modalBtn     = document.getElementById('open-modal');
  const modal        = document.getElementById('modal');
  const modalClose   = document.getElementById('close-modal');
  const modalList    = document.getElementById('modal-list');
  const FN_URL       = `${window.location.origin}/.netlify/functions/search`;

  let favorites = JSON.parse(localStorage.getItem('favorites')||'[]');
  function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }

  let lastData = [];

  locRadios.forEach(r => r.addEventListener('change', () => {
    cityBlock.style.display = r.value === 'city' ? 'block' : 'none';
  }));

  radiusBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      radiusBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  modalBtn.addEventListener('click', () => {
    renderModal(lastData);
    modal.style.display = 'block';
  });
  modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  window.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });

  function renderAll(data) {
    const arr = [...data];
    if (arr.length === 0) {
      resultDiv.innerHTML = '<p>Nenhum estabelecimento encontrado.</p>';
      return;
    }

    arr.sort((a, b) => a.valMinimoVendido - b.valMinimoVendido);
    const menor = arr[0];
    const maior = arr[arr.length - 1];
    const total = arr.length;
    const produtoNome = menor.dscProduto || maior.dscProduto || 'Produto não identificado';
    const produtoImg = menor.codGetin ? `https://cdn-cosmos.bluesoft.com.br/products/${menor.codGetin}` : 'https://via.placeholder.com/150';

    const renderCard = (e, label) => {
      const isFav = favorites.includes(e.codEstabelecimento);
      return `
        <div class="card">
          <div class="tag-label">${label}</div>
          <button class="fav-btn" data-code="${e.codEstabelecimento}" title="Favorito">
            ${isFav ? '❤️' : '🤍'}
          </button>
          <h2>${e.nomFantasia || e.nomRazaoSocial || '—'}</h2>
          <p><strong>Preço:</strong> R$ ${e.valMinimoVendido.toFixed(2)}</p>
          <p><strong>Bairro/Município:</strong> ${e.nomBairro || '—'} / ${e.nomMunicipio || '—'}</p>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}" target="_blank" title="Como chegar">
            <i class="fas fa-map-marker-alt"></i> Como chegar
          </a>
        </div>
      `;
    };

    const cardsHtml = `
      <div class="product-header" style="text-align: center; margin-bottom: 1em;">
        <p style="font-size: 1.1em;"><strong>${produtoNome}</strong></p>
        <img src="${produtoImg}" alt="Imagem do produto" style="max-width: 150px; display: block; margin: 0.5em auto;"/>
      </div>
      <div class="card-container">
        ${renderCard(menor, 'Menor preço')}
        ${renderCard(maior, 'Maior preço')}
      </div>
    `;

    resultDiv.innerHTML = `<p><strong>Total de estabelecimentos encontrados:</strong> ${total}</p>` + cardsHtml;
  }

  function renderModal(data) {
    const sorted = [...data].sort((a,b)=>a.valMinimoVendido - b.valMinimoVendido);
    modalList.innerHTML = sorted.map((e, i) => {
      const preco = e.valMinimoVendido.toFixed(2);
      const nome  = e.nomFantasia || e.nomRazaoSocial || '—';
      const bairro = e.nomBairro || '—';
      const municipio = e.nomMunicipio || '—';
      return `
        <li>
          <strong>${i+1}.</strong> R$ ${preco} - ${nome} (${bairro} / ${municipio})
          <a href="https://www.google.com/maps/dir/?api=1&destination=${e.numLatitude},${e.numLongitude}" target="_blank" title="Como chegar">
            <i class="fas fa-location-arrow"></i>
          </a>
        </li>
      `;
    }).join('');
  }

  btnSearch.addEventListener('click', async () => {
    const code = barcodeIn.value.trim(); if(!code){ alert('Informe o código'); return; }
    const raio = parseInt(document.querySelector('.radius-btn.active').dataset.value,10);
    const [lat, lng] = citySel.value.split(',').map(Number);
    try {
      const resp = await fetch(FN_URL,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({codigoDeBarras:code,dias:2,latitude:lat,longitude:lng,raio})
      });
      const data = await resp.json();
      lastData = data;
      renderAll(data);
    } catch(err) {
      resultDiv.innerHTML = `<p class="error">Erro na busca: ${err.message}</p>`;
    }
  });
});
