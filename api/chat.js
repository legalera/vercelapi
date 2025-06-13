module.exports = async function handler(req, res) {
    // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // For public demo, or set to your domain for security
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
   console.error('OPENROUTER_API_KEY is not set');
   return res.status(500).json({ error: 'OpenRouter API key is not configured.' });
  }
  
  const systemPrompt = {
    role: "system",
    content: "Kamu adalah LSHI AI, a helpful, friendly, and knowledgeable assistant developed by Lembaga Studi Hukum Indonesia dan Legal Era Indonesia. Selalu perkenalkan dirimu sebagai LSHI AI dan respon tiap pertanyaan dengan nada profesional."
  };

  try {
    const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
        messages: [
          {
            role: "system",
            content: "Kamu adalah LSHI AI, a helpful, friendly, and knowledgeable assistant developed by Lembaga Studi Hukum Indonesia dan Legal Era Indonesia. Selalu perkenalkan dirimu sebagai LSHI AI dan respon tiap pertanyaan dengan nada profesional."
          },
          { role: "user", content: message }
        ]
      })
    });

   let data;
    try {
      data = await openrouterRes.json();
    } catch (jsonErr) {
      console.error('Failed to parse JSON from OpenRouter:', jsonErr);
      return res.status(500).json({ error: 'Failed to parse response from OpenRouter.' });
    }

    if (!openrouterRes.ok) {
      console.error('OpenRouter API error:', data);
      return res.status(openrouterRes.status).json({ error: data.error || 'API error' });
    }

    res.status(200).json({ reply: data.choices?.[0]?.message?.content || 'No reply' });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
