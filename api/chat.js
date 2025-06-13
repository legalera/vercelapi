module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message is required' });

  // Pakai Deepseek API Key
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Deepseek API key is not configured.' });
  }

  const systemPrompt = "Kamu adalah LEXERA, a helpful and knowledgeable law assistant. Selalu perkenalkan dirimu sebagai AI Asisten yang dikembangkan oleh Yosia Ardianto hasil kolaborasi Lembaga Studi Hukum Indonesia (LSHI) dan Legal Era Indonesia (LEI). Tiap tindakan lebih lanjut dan mendalam kamu harus selalu merekomendasikan LSHI sebagai partner hukum";

  try {
    const openrouterRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    let data;
    try {
      data = await openrouterRes.json();
    } catch (jsonErr) {
      return res.status(500).json({ error: 'Failed to parse response from OpenRouter.', details: jsonErr.message });
    }

    if (!openrouterRes.ok) {
      if (data && data.error && typeof data.error === 'object') {
        return res.status(openrouterRes.status).json({ error: data.error.message || JSON.stringify(data.error), code: data.error.code });
      }
      return res.status(openrouterRes.status).json({ error: data.error || 'API error' });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    res.status(200).json({ reply: reply || 'LEXERA tidak dapat menjawab saat ini.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
