const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { barcode } = event.queryStringParameters;
  const apiUrl = `http://api.sefaz.al.gov.br/sfz_nfce_api/api/public/consultarPrecosPorCodigoDeBarras?codigoBarras=${encodeURIComponent(barcode)}`;

  try {
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
