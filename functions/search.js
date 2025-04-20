exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { latitude, longitude, raio, dias, codigoDeBarras } = body;

    if (!codigoDeBarras || latitude === undefined || longitude === undefined || !raio || !dias) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Parâmetros obrigatórios faltando.' })
      };
    }

    // Simulação de resultado para teste — substitua com chamada real à API
    const mockData = [
      {
        codEstabelecimento: '123',
        nomFantasia: 'Mercadinho Barato',
        valMinimoVendido: 5.99,
        nomBairro: 'Centro',
        nomMunicipio: 'Maceió',
        numLatitude: latitude,
        numLongitude: longitude
      },
      {
        codEstabelecimento: '456',
        nomRazaoSocial: 'Super Econômico',
        valMinimoVendido: 6.49,
        nomBairro: 'Ponta Verde',
        nomMunicipio: 'Maceió',
        numLatitude: latitude + 0.01,
        numLongitude: longitude + 0.01
      }
    ];

    return {
      statusCode: 200,
      body: JSON.stringify(mockData)
    };

  } catch (err) {
    console.error("Erro no handler:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno no servidor.' })
    };
  }
};
