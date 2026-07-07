const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export async function handlePlaque(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  let plaque;
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw);
    plaque = body.plaque;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ error: 'body JSON invalide' }));
    return;
  }

  if (!plaque) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ error: 'plaque manquante' }));
    return;
  }

  const plaque_normalized = String(plaque).toUpperCase().replace(/[\s-]/g, '');

  const vehicle = {
    plaque: String(plaque),
    plaque_normalized,
    ktype: 12492,
    brand: 'Peugeot',
    model: '206',
    version: '1.4 HDi',
    year: 2003,
    fuel: 'Diesel',
    vin: 'VF32ARHZE43000001',
    power_kw: 50,
    power_cv: 68,
    engine_code: '8HZ',
    co2: 118,
    doors: 5,
    source: 'mock',
  };

  res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(vehicle));
}
