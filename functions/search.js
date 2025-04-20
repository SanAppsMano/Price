// functions/search.js

exports.handler = async (event) => {
  const { barcode } = event.queryStringParameters || {};
  if (!barcode) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'É preciso informar o código de barras.' })
    };
  }

  // URL da API real da Sefaz/AL
  const apiUrl = `http://api.sefaz.al.gov.br/sfz_nfce_api/api/public/consultarPrecosPorCodigoDeBarras?codigoBarras=${encodeURIComponent(barcode)}`;

  try {
    // usa o fetch nativo do Node 18+
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Status ${response.status}`);

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
