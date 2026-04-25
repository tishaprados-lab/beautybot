export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { messages, system, tools } = req.body;
    if (!messages) return res.status(400).json({ error: 'messages required' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel env vars' });

    const body = { model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages };
    if (system) body.system = system;
    if (tools) body.tools = tools;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
