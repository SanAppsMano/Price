exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  try {
    const {
      codigoDeBarras,
      latitude,
      longitude,
      dias = 3,
      raio = 15
    } = JSON.parse(event.body);

    if (
      typeof codigoDeBarras !== "string" ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Parâmetros inválidos" }),
      };
    }

    const apiUrl = "http://api.sefaz.al.gov.br/sfz_nfce_api/api/public/consultarPrecosPorCodigoDeBarras";

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "AppToken": process.env.APP_TOKEN,
      },
      body: JSON.stringify({
        codigoDeBarras,
        dias,
        latitude,
        longitude,
        raio,
      }),
    });

    const data = await resp.json();
    const statusCode = resp.ok ? 200 : resp.status;

    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };

  } catch (err) {
    console.error("Error in handler:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
