// Função serverless da Vercel: GET /api/cnpj/:cnpj
// Repassa a consulta para a BrasilAPI e guarda a resposta em cache na borda por 24h,
// reduzindo o número de chamadas e o risco de bater no limite de requisições.

export default async function handler(req, res) {
  const cnpj = String(req.query.cnpj || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cnpj.length !== 14) {
    return res.status(400).json({ erro: 'O CNPJ deve ter 14 caracteres.' });
  }

  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { 'User-Agent': 'FomentoIO/0.1' },
    });
    const corpo = await resposta.text();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (resposta.ok) {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    }
    return res.status(resposta.status).send(corpo);
  } catch {
    return res.status(502).json({ erro: 'Falha ao consultar a BrasilAPI.' });
  }
}
