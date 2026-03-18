const http = require('http');
const PORT = process.env.PORT || 3000;
const SECRET = process.env.API_SECRET || 'leo2026';

// ── DADOS EM MEMÓRIA ─────────────────────────────────────────
// Posições abertas
let positions = [
  { ticker: 'SQQQ', shares: 123.73398271, entry: 72.89 },
  { ticker: 'SBIT', shares: 211.75819074, entry: 48.03 },
];

// P&L realizado histórico por mês: { "2026-03": { realized: 8199.76, trades: [] }, ... }
let pnlHistory = {
  "2026-01": { realized: 240.50, trades: [
    { ticker: 'AGQ',  entry: 130.00, exit: 135.00, shares: 48.0,  pnl: 240.00, date: '2026-01-15' },
  ]},
  "2026-02": { realized: 3100.00, trades: [
    { ticker: 'TQQQ', entry: 55.00, exit: 68.00, shares: 238.0, pnl: 3094.00, date: '2026-02-20' },
  ]},
  "2026-03": { realized: 8199.76, trades: [
    { ticker: 'AGQ',  entry: 138.10, exit: 140.81, shares: 64.05,  pnl: 173.58,  date: '2026-03-16' },
    { ticker: 'UGL',  entry: 71.63,  exit: 71.58,  shares: 142.09, pnl: -7.10,   date: '2026-03-16' },
  ]},
};

// ── HELPERS ──────────────────────────────────────────────────
function getMonthKey(date) {
  const d = date ? new Date(date) : new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function totalHistorical() {
  return Object.values(pnlHistory).reduce((a, m) => a + (m.realized || 0), 0);
}

function currentMonthKey() {
  return getMonthKey();
}

function currentMonthPnl() {
  const key = currentMonthKey();
  return pnlHistory[key] ? pnlHistory[key].realized : 0;
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Secret',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch(e) { resolve({}); }
    });
  });
}

function authCheck(req, res) {
  const secret = req.headers['x-secret'];
  if (secret !== SECRET) {
    sendJSON(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
}

// ── SERVIDOR ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Secret',
    });
    res.end();
    return;
  }

  // ── GET /health ── ping simples
  if (method === 'GET' && url === '/health') {
    return sendJSON(res, 200, { status: 'ok', ts: new Date().toISOString() });
  }

  // ── GET /data ── retorna tudo de uma vez para o HTML
  if (method === 'GET' && url === '/data') {
    return sendJSON(res, 200, {
      positions,
      pnlHistory,
      currentMonth: currentMonthKey(),
      currentMonthPnl: currentMonthPnl(),
      totalHistorical: totalHistorical(),
    });
  }

  // ── GET /positions ── lista posições abertas
  if (method === 'GET' && url === '/positions') {
    return sendJSON(res, 200, { positions });
  }

  // ── POST /positions ── substitui todas as posições (requer secret)
  if (method === 'POST' && url === '/positions') {
    if (!authCheck(req, res)) return;
    const body = await readBody(req);
    if (!Array.isArray(body.positions)) {
      return sendJSON(res, 400, { error: 'positions deve ser um array' });
    }
    positions = body.positions;
    return sendJSON(res, 200, { ok: true, positions });
  }

  // ── POST /trade ── registra uma operação fechada e atualiza P&L do mês
  if (method === 'POST' && url === '/trade') {
    if (!authCheck(req, res)) return;
    const body = await readBody(req);
    const { ticker, entry, exit, shares, date } = body;
    if (!ticker || !entry || !exit || !shares) {
      return sendJSON(res, 400, { error: 'ticker, entry, exit e shares são obrigatórios' });
    }
    const pnl = (exit - entry) * shares;
    const monthKey = getMonthKey(date);
    if (!pnlHistory[monthKey]) pnlHistory[monthKey] = { realized: 0, trades: [] };
    pnlHistory[monthKey].realized += pnl;
    pnlHistory[monthKey].trades.push({ ticker, entry, exit, shares, pnl, date: date || new Date().toISOString().split('T')[0] });
    return sendJSON(res, 200, {
      ok: true,
      trade: { ticker, entry, exit, shares, pnl },
      monthKey,
      newMonthTotal: pnlHistory[monthKey].realized,
      totalHistorical: totalHistorical(),
    });
  }

  // ── GET /pnl ── retorna P&L mensal e histórico
  if (method === 'GET' && url === '/pnl') {
    return sendJSON(res, 200, {
      currentMonth: currentMonthKey(),
      currentMonthPnl: currentMonthPnl(),
      totalHistorical: totalHistorical(),
      history: pnlHistory,
    });
  }

  // 404
  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log('Carteira API rodando na porta ' + PORT);
});
