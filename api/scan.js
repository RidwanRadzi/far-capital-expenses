export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { base64, mediaType } = req.body;
  if (!base64 || !mediaType) return res.status(400).json({ error: 'Missing file data' });

  const contentType = mediaType.startsWith('image/') ? 'image' : 'document';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: `You are a receipt/invoice scanner for Far Capital, a Malaysian property investment firm. Extract key fields from the uploaded document. Respond ONLY with valid JSON and nothing else. No markdown, no backticks. Format: {"vendor":"...","date":"YYYY-MM-DD","amount":0.00,"category":"...","description":"..."} Categories must be one of: Marketing, Travel, Utilities, Professional Fees, Office Supplies, Maintenance, Others. Amount in RM as a number only. If date unclear, use today's date.`,
        messages: [{
          role: 'user',
          content: [
            {
              type: contentType,
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            { type: 'text', text: 'Extract expense details from this receipt/invoice.' }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' });

    const text = data.content.map(i => i.text || '').join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
