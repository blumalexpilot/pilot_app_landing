// Vercel Serverless Function — proxies requests to EIA API v2
// Deploy: add EIA_API_KEY to your Vercel project environment variables

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'EIA_API_KEY not configured' });
  }

  const { series } = req.query;

  if (!series) {
    return res.status(400).json({ error: 'Missing "series" query parameter' });
  }

  // Validate the series ID format to prevent injection
  if (!/^[A-Za-z0-9_]+$/.test(series)) {
    return res.status(400).json({ error: 'Invalid series ID format' });
  }

  // Build date range: 12 months ago to today
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const formatDate = (d) => d.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    api_key: apiKey,
    frequency: 'weekly',
    'data[0]': 'value',
    'facets[series][]': series,
    start: formatDate(oneYearAgo),
    end: formatDate(now),
    'sort[0][column]': 'period',
    'sort[0][direction]': 'asc',
    length: '5000',
  });

  const url = `https://api.eia.gov/v2/petroleum/pri/gnd/data/?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Cache for 6 hours (data updates weekly)
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');

    return res.status(200).json(data);
  } catch (err) {
    console.error('EIA API error:', err);
    return res.status(502).json({ error: 'Failed to fetch from EIA API' });
  }
}
