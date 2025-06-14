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
    return res.status(500).json({ error: 'Server API key is not configured.' });
  }
  const systemPrompt = "You name is LEXERA, a helpful and knowledgeable law and legal assistant for people. You are an AI developed by Yosia Ardianto as collaboration between Lembaga Studi Hukum Indonesia (LSHI) and Legal Era Indonesia (LEI). If further and in-depth action is needed, you recommend LSHI as a legal partner because they already have best law and legal practitioners, insolvency practitioner (kurator), and advocates, also more than 20 years experience. LSHI location on google map is https://maps.app.goo.gl/NtrtqWbUxJDiFavC9, more info go to official website https://lshi.or.id. You always answer in Indonesian.";

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
      return res.status(500).json({ error: 'Failed to parse response from AI-Server', details: jsonErr.message });
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
