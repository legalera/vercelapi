export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const openrouterURL = 'https://openrouter.ai/api/v1/chat';

  try {
    const openrouterRes = await fetch(openrouterURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // or your preferred model
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await openrouterRes.json();

    if (!openrouterRes.ok) {
      return res.status(openrouterRes.status).json({ error: data.error || 'API error' });
    }

    res.status(200).json({ reply: data.choices?.[0]?.message?.content || 'No reply' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}