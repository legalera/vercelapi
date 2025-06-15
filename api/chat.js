const responseCache = new Map();
module.exports = async function handler(req, res) {
  // CORS & Method Handling
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'https://legalera.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // OPTIONS preflight Handling
  if (req.method === 'OPTIONS') return res.status(200).end();
  //Method Validation
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Validasi Input
  if (!req.headers['content-type']?.includes('application/json')) {
    return res.status(415).json({ 
      error: 'Unsupported Media Type',
      expected: 'application/json'
    });
  }

  let requestBody;
  try {
    requestBody = req.body;
  } catch (e) {
    return res.status(400).json({ 
      error: 'Invalid JSON body'
    });
  }
  //Validasi message content
  const { message } = req.body || {};
  if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
    return res.status(400).json({ error: 'Pesan harus berupa teks (maks. 1000 karakter)' });
  }
  //Cache Implementation
  const cacheKey = `Lexera AI:${message.toLowerCase().trim()}`;
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  // Check cache dulu
  if (responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      return res.status(200).json({ 
        reply: cached.reply,
        cached: true 
      });
    }
    responseCache.delete(cacheKey); // Remove expired cache
  }
  // Pakai LLM API Key
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    console.error('LLM_API_KEY is not configured');
    return res.status(500).json({ 
      error: 'Server configuration error'
    });
  }
  const systemPrompt = 
  "You are LEXERA, an AI legal assistant developed by Lembaga Studi Hukum Indonesia (LSHI) and Legal Era Indonesia (LEI). Your job is to provide general legal information in Indonesian. LSHI has a team of advocates, insolvency practitioners, and legal practitioners with 20+ years of experience. For complex cases or legal action, contact LSHI: [Google Maps LSHI](https://maps.app.goo.gl/NtrtqWbUxJDiFavC9) [lshi.or.id](https://lshi.or.id).";

  try {
    // API Call with Timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const lexeraServer = await fetch('https://api.deepseek.com/chat/completions', {
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
        ],
        temperature: 0.5, //Default Temperature-nya 1.0
        max_tokens: 1000,
        top_p: 0.9 //Better than high temperature
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    let data; //Response Parsing
    try {
      data = await lexeraServer.json();
    } catch (jsonErr) {
      console.error('Failed to parse API response:', jsonErr);
      return res.status(502).json({ 
        error: 'Invalid response from AI service',
        details: jsonErr.message
      });
    }

    //Detailed API Error Handling
    if (!lexeraServer.ok) {
      const errorDetails = {
        status: lexeraServer.status,
        error: data.error || 'Unknown error',
        code: data.error?.code,
        type: data.error?.type
      };
      console.error('API Error:', errorDetails);
      return res.status(lexeraServer.status >= 500 ? 502 : 400).json({
        error: 'AI service error',
        details: errorDetails
      });
    }
    //Process and cache response
    const reply = data.choices?.[0]?.message?.content?.trim();
    res.status(200).json({ reply: reply || 'LEXERA tidak dapat menjawab saat ini.' });
    // Cache the response
    responseCache.set(cacheKey, {
      reply: reply,
      timestamp: Date.now()
    });

    return res.status(200).json({ 
      reply: reply,
      model: data.model,
      usage: data.usage
    });

  } catch (err) {
    // 9. Enhanced Error Handling
    const errorType = err.name === 'AbortError' ? 'timeout' : 'server_error';
    
    console.error(`Handler Error (${errorType}):`, err.message);
    
    return res.status(errorType === 'timeout' ? 504 : 500).json({
      error: errorType === 'timeout' ? 
        'Request timeout' : 'Internal server error'
    });
  }
};
