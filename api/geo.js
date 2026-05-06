// Vercel Serverless Function — returns the nearest EIA region based on visitor IP
// Vercel automatically provides geo headers: x-vercel-ip-city, x-vercel-ip-region, x-vercel-ip-country

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const state = (req.headers['x-vercel-ip-region'] || '').toUpperCase();
  const country = (req.headers['x-vercel-ip-country'] || '').toUpperCase();
  const city = req.headers['x-vercel-ip-city'] || '';

  // Only works for US visitors
  if (country !== 'US' || !state) {
    return res.status(200).json({ region: null, reason: 'non-US or unknown location' });
  }

  // Try to match to one of the 10 EIA metro areas first (by city name),
  // then fall back to state → region mapping
  const regionKey = matchCity(city, state) || matchState(state);

  return res.status(200).json({ region: regionKey, state, city });
}

// Approximate city matching — Vercel's x-vercel-ip-city is the ISP-reported city
// which may not match exactly, so we check loosely
function matchCity(city, state) {
  const c = city.toLowerCase();

  if (state === 'MA' && (c.includes('boston') || c.includes('cambridge') || c.includes('somerville') || c.includes('quincy')))
    return 'boston';
  if (state === 'IL' && (c.includes('chicago') || c.includes('evanston') || c.includes('naperville') || c.includes('aurora')))
    return 'chicago';
  if (state === 'OH' && (c.includes('cleveland') || c.includes('akron') || c.includes('parma')))
    return 'cleveland';
  if (state === 'CO' && (c.includes('denver') || c.includes('aurora') || c.includes('lakewood') || c.includes('boulder')))
    return 'denver';
  if (state === 'TX' && (c.includes('houston') || c.includes('pasadena') || c.includes('sugar land') || c.includes('baytown')))
    return 'houston';
  if (state === 'CA' && (c.includes('los angeles') || c.includes('long beach') || c.includes('anaheim') || c.includes('santa monica') || c.includes('glendale') || c.includes('pasadena')))
    return 'la';
  if (state === 'CA' && (c.includes('san francisco') || c.includes('oakland') || c.includes('san jose') || c.includes('berkeley') || c.includes('fremont')))
    return 'sf';
  if (state === 'FL' && (c.includes('miami') || c.includes('fort lauderdale') || c.includes('hialeah') || c.includes('hollywood')))
    return 'miami';
  if ((state === 'NY' || state === 'NJ') && (c.includes('new york') || c.includes('brooklyn') || c.includes('manhattan') || c.includes('queens') || c.includes('bronx') || c.includes('jersey city') || c.includes('newark')))
    return 'nyc';
  if (state === 'WA' && (c.includes('seattle') || c.includes('tacoma') || c.includes('bellevue') || c.includes('kent')))
    return 'seattle';

  return null;
}

// Fallback: map US state to nearest EIA city or PADD region
function matchState(state) {
  const map = {
    // New England → Boston
    MA: 'boston', RI: 'boston', NH: 'boston', CT: 'boston',
    ME: 'padd1a', VT: 'padd1a',

    // Mid-Atlantic → NYC or Central Atlantic
    NY: 'nyc', NJ: 'nyc',
    PA: 'padd1b', DE: 'padd1b', MD: 'padd1b', DC: 'padd1b',

    // Southeast → Lower Atlantic or Miami
    VA: 'padd1c', WV: 'padd1c', NC: 'padd1c', SC: 'padd1c', GA: 'padd1c',
    FL: 'miami',

    // Gulf Coast
    AL: 'padd3', MS: 'padd3', LA: 'houston', AR: 'padd3',

    // Midwest → Chicago or Cleveland or PADD 2
    OH: 'cleveland',
    IL: 'chicago', IN: 'chicago', WI: 'chicago',
    MI: 'padd2', MN: 'padd2', IA: 'padd2', MO: 'padd2',
    KS: 'padd2', NE: 'padd2', SD: 'padd2', ND: 'padd2',
    KY: 'padd2', TN: 'padd2',
    OK: 'padd3',

    // Texas → Houston
    TX: 'houston',

    // Rocky Mountain → Denver or PADD 4
    CO: 'denver',
    WY: 'padd4', MT: 'padd4', ID: 'padd4', UT: 'padd4',

    // West Coast
    CA: 'la',  // default for CA when city didn't match SF
    WA: 'seattle', OR: 'seattle',
    AZ: 'padd5', NV: 'sf', NM: 'padd3',
    HI: 'padd5', AK: 'padd5',
  };

  return map[state] || 'us';
}
