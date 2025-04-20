// DOM
const btnSearch      = document.getElementById('btn-search');
const barcodeInput   = document.getElementById('barcode');
const resultEl       = document.getElementById('result');
const historyList    = document.getElementById('history-list');
const clearHistoryBtn= document.getElementById('clear-history');
const openModalBtn   = document.getElementById('open-modal');
const closeModalBtn  = document.getElementById('close-modal');
const modal          = document.getElementById('modal');
const modalList      = document.getElementById('modal-list');
const modalSort      = document.getElementById('modal-sort');
const loadingEl      = document.getElementById('loading');
const citySelect     = document.getElementById('city');
const locRadios      = document.querySelectorAll('input[name="loc"]');
const radiusBtns     = document.querySelectorAll('.radius-btn');
const ordenarSelect  = document.getElementById('ordenar');

let historyData = [];

// Função de busca
async function doSearch() {
  const barcode = barcodeInput.value.trim();
  if (!barcode) {
    alert('Informe um código de barras.');
    return;
  }

  // coleta localização
  const locType = document.querySelector('input[name="loc"]:checked').value;
  const radius  = document.querySelector('.radius-btn.active').dataset.value;
  const sort    = ordenarSelect.value;
  const params  = new URLSearchParams({ barcode, locType, radius, sort });

  if (locType === 'city')        params.set('city', citySelect.value);
  else if (locType === 'gps') {
    // exemplo estático: implementar geolocalização real se quiser
    params.set('lat', '-9.6432331');
    params.set('lon', '-35.7190686');
  }

  loadingEl.classList.add('active');
  try {
    const resp = await fetch(`/.netlify/functions/search?${params}`);
    const data = await resp.json();
    renderResult(data);
    historyData.unshift({ barcode, date: new Date().toLocaleString() });
    renderHistory();
  } catch (err) {
    alert('Erro ao buscar preços: ' + err.message);
  } finally {
    loadingEl.classList.remove('active');
  }
}

// Renderiza resultados no grid
function renderResult(items) {
  resultEl.innerHTML = '';
  items.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-header">${prod.storeName}</div>
      <img class="product-img" src="${prod.imageUrl}" alt="${prod.productName}" />
      <div>${prod.productName}</div>
      <div class="product-info">
        <div class="product-price">R$ ${prod.price.toFixed(2)}</div>
        <div>${prod.distance} km</div>
      </div>
    `;
    resultEl.append(card);
  });
}

// Histórico
function renderHistory() {
  historyList.innerHTML = '';
  historyData.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.barcode} — ${item.date}`;
    historyList.append(li);
  });
}

// Modal
function openModal() {
  modal.classList.add('open');
  populateModal();
}
function closeModal() {
  modal.classList.remove('open');
}
function populateModal() {
  modalList.innerHTML = '';
  document.querySelectorAll('.product-card').forEach(card => {
    const li = document.createElement('li');
    li.innerHTML = card.innerHTML;
    modalList.append(li);
  });
}
function sortModal() {
  const order = modalSort.value;
  const lis = Array.from(modalList.children);
  lis.sort((a, b) => {
    const pa = parseFloat(a.querySelector('.product-price').textContent.replace('R$','').replace(',','.'));
    const pb = parseFloat(b.querySelector('.product-price').textContent.replace('R$','').replace(',','.'));
    return order === 'preco-asc' ? pa - pb : pb - pa;
  });
  modalList.innerHTML = '';
  lis.forEach(li => modalList.append(li));
}

// Eventos
btnSearch.addEventListener('click', doSearch);
barcodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
clearHistoryBtn.addEventListener('click', () => { historyData = []; renderHistory(); });
openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modalSort.addEventListener('change', sortModal);
radiusBtns.forEach(b => b.addEventListener('click', () => {
  radiusBtns.forEach(x => x.classList.remove('active'));
  b.classList.add('active');
}));
