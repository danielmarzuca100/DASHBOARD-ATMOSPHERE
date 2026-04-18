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
    const url = `https://mcp.utmify.com.br/api/dashboards/${DASH_ID}/summary?from=${from}T00:00:00-03:00&to=${to}T23:59:59-03:00`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
    });
    const raw = await resp.json();

    const spent = (raw.ads?.spent || 0) / 100;
    const revenue = (raw.comissions?.gross || 0) / 100;
    const lucro = (raw.analytics?.profit || 0) / 100;
    const roi = raw.analytics?.roi !== null ? raw.analytics.roi : null;
    const roas = raw.analytics?.roas !== null ? raw.analytics.roas : null;
    const vendas = raw.ordersCount?.total || 0;
    const vendasAprovadas = raw.ordersCount?.approved || 0;
    const cliques = raw.ads?.clicks || 0;
    const cpa = raw.analytics?.cpa !== null ? (raw.analytics.cpa / 100) : null;
    const ticketMedio = raw.analytics?.avgTicket !== null ? (raw.analytics.avgTicket / 100) : null;

    const lucroByHour = (raw.profitByHourNet || [])
      .filter(h => h.cents !== 0)
      .map(h => ({ hora: h.hour, valor: h.cents / 100 }));

    const produtos = (raw.ordersCount?.byProductName || [])
      .filter(p => p.count > 0)
      .map(p => ({ nome: p.productName, faturamento: (p.revenue || 0) / 100, vendas: p.count }));

    res.status(200).json({ gasto: spent, faturamento: revenue, lucro, roi, roas, vendas, vendasAprovadas, cliques, cpa, ticketMedio, lucroByHour, produtos });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
