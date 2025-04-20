// DOM
const btnSearch       = document.getElementById('btn-search');
const barcodeInput    = document.getElementById('barcode');
const resultEl        = document.getElementById('result');
const historyList     = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const openModalBtn    = document.getElementById('open-modal');
const closeModalBtn   = document.getElementById('close-modal');
const modal           = document.getElementById('modal');
const modalList       = document.getElementById('modal-list');
const modalSort       = document.getElementById('modal-sort');
const loadingEl       = document.getElementById('loading');

let historyData = [];

// Função de busca
async function doSearch() {
  const barcode = barcodeInput.value.trim();
  if (!barcode) {
    alert('Informe um código de barras.');
    return;
  }

  loadingEl.classList.add('active');
  try {
    const resp = await fetch(`/.netlify/functions/search?barcode=${encodeURIComponent(barcode)}`);
    if (!resp.ok) throw new Error(resp.statusText);
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
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-header">${item.razaoSocial || item.nomeEstabelecimento}</div>
      <div class="product-info">
        <div class="product-price">R$ ${Number(item.valorUnitario || item.preco).toFixed(2).replace('.', ',')}</div>
        <div>${item.bairro || ''} — ${item.municipio || ''}</div>
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
  populateModal();
  modal.classList.add('open');
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
  Array.from(modalList.children)
    .sort((a, b) => {
      const pa = parseFloat(a.querySelector('.product-price').textContent.replace('R$', '').replace(',', '.'));
      const pb = parseFloat(b.querySelector('.product-price').textContent.replace('R$', '').replace(',', '.'));
      return order === 'asc' ? pa - pb : pb - pa;
    })
    .forEach(li => modalList.append(li));
}

// Eventos
btnSearch.addEventListener('click', doSearch);
barcodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
clearHistoryBtn.addEventListener('click', () => { historyData = []; renderHistory(); });
openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modalSort.addEventListener('change', sortModal);
