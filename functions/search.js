const fetch = require('node-fetch');

exports.handler = async (event) => {
  const q = event.queryStringParameters;
  const { barcode, locType, city, lat, lon, radius, sort } = q;

  // Monta URL da sua API de preços externos
  let apiUrl = `https://api.exemplo.com/prices?barcode=${encodeURIComponent(barcode)}&radius=${radius}`;
  if (locType === 'city') apiUrl += `&city=${encodeURIComponent(city)}`;
  else if (locType === 'gps') apiUrl += `&lat=${lat}&lon=${lon}`;
  apiUrl += `&sort=${sort}`;

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
