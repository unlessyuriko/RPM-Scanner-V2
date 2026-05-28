module.exports = async function handler(req, res) {
  const origin = process.env.CORS_ORIGIN || 'https://unlessyuriko.github.io';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { apiKey, model, input } = req.body || {};

  if (!apiKey || !model || !input) {
    return res.status(400).json({ error: 'apiKey, model, and input are required' });
  }

  try {
    const upstream = await fetch('https://genai.heineken.com/models/openai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, input })
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('GenAI proxy error:', err.message);
    return res.status(502).json({ error: err.message });
  }
};
