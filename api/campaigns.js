export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const TOKEN = process.env.UTM_TOKEN;
  const DASH_ID = '66188c1e6dbe942a8d1849ee';
  const period = req.query.period || 'today';

  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  let from, to;
  if (period === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate()-1); from = to = fmt(y);
  } else if (period === 'week') {
    const w = new Date(now); w.setDate(w.getDate()-6); from = fmt(w); to = fmt(now);
  } else if (period === 'month') {
    from = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`; to = fmt(now);
  } else {
    from = to = fmt(now);
  }

  try {
    const url = `https://mcp.utmify.com.br/api/dashboards/${DASH_ID}/meta/campaigns?from=${from}T00:00:00-03:00&to=${to}T23:59:59-03:00`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
    });
    const raw = await resp.json();

    const camps = (raw.results || []).slice(0, 15).map(c => ({
      nome: c.name,
      gasto: (c.spend || 0) / 100,
      faturamento: (c.revenue || 0) / 100,
      lucro: (c.profit || 0) / 100,
      roi: c.roi !== null ? c.roi : null,
      roas: c.roas !== null ? c.roas : null,
      vendas: c.approvedOrdersCount || 0,
      status: c.status,
      cpa: c.cpa !== null ? (c.cpa / 100) : null
    }));

    res.status(200).json(camps);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
