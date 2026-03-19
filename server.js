const http  = require('http');
const https = require('https');

const PORT     = process.env.PORT || 3000;
const SECRET   = process.env.API_SECRET || 'leo2026';
const SUPA_URL = process.env.SUPABASE_URL || 'https://nosrpbpcxnrxsdykhojp.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vc3JwYnBjeG5yeHNkeWtob2pwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg4MTM3OCwiZXhwIjoyMDg5NDU3Mzc4fQ.jRd7ywLpU_CqEmBbVpOloB-9Da8cIBiPpZDMwycNjos';
const FH_KEY   = 'd6s1n1pr01qpss2i1fm0d6s1n1pr01qpss2i1fmg';

// ── Supabase REST helper ─────────────────────────────────────
function supa(method, path, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(SUPA_URL + '/rest/v1/' + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'apikey':        SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    };
    if (method === 'POST' || method === 'PATCH') {
      headers['Prefer'] = 'return=representation';
    }
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers,
    };

    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch(e) {
          parsed = raw || null;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Finnhub proxy helper ─────────────────────────────────────
function finnhub(path) {
  return new Promise((resolve, reject) => {
    https.get(
      { hostname:'finnhub.io', path:`/api/v1/${path}&token=${FH_KEY}`, headers:{'User-Agent':'node'} },
      res => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => { try { resolve(JSON.parse(buf)); } catch(e) { reject(e); } });
      }
    ).on('error', reject);
  });
}

// ── HTTP helpers ─────────────────────────────────────────────
function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type':  'application/json',
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Secret',
  });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { resolve({}); } });
  });
}
function auth(req, res) {
  if (req.headers['x-secret'] !== SECRET) { sendJSON(res, 401, { error:'Unauthorized' }); return false; }
  return true;
}

// ── Cálculos ─────────────────────────────────────────────────
function monthKey(date) {
  const d = date ? new Date(date) : new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}

// ── Servidor ─────────────────────────────────────────────────
http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Secret',
    });
    return res.end();
  }

  // ── GET /health ────────────────────────────────────────────
  if (method === 'GET' && url === '/health')
    return sendJSON(res, 200, { status:'ok', ts: new Date().toISOString() });

  // ── GET /cashflow — aportes e saques ──────────────────────
  if (method === 'GET' && url === '/cashflow') {
    const r = await supa('GET', 'cashflow?order=date.asc');
    const rows = Array.isArray(r.body) ? r.body : [];
    // Calcula capital líquido: soma aportes BRL - saques BRL - saques USD (convertido na hora da consulta)
    // O frontend converte USD pelo câmbio do dia — retornamos os totais separados
    const totalAporteBRL = rows.filter(r=>r.type==='aporte'&&r.valor_brl).reduce((s,r)=>s+parseFloat(r.valor_brl||0),0);
    const totalAporteUSD = rows.filter(r=>r.type==='aporte'&&r.valor_usd).reduce((s,r)=>s+parseFloat(r.valor_usd||0),0);
    const totalSaqueBRL  = rows.filter(r=>r.type==='saque' &&r.valor_brl).reduce((s,r)=>s+parseFloat(r.valor_brl||0),0);
    const totalSaqueUSD  = rows.filter(r=>r.type==='saque' &&r.valor_usd).reduce((s,r)=>s+parseFloat(r.valor_usd||0),0);
    return sendJSON(res, 200, {
      rows,
      totalAporteBRL: Math.round(totalAporteBRL * 100) / 100,
      totalAporteUSD: Math.round(totalAporteUSD * 10000) / 10000,
      totalSaqueBRL:  Math.round(totalSaqueBRL  * 100) / 100,
      totalSaqueUSD:  Math.round(totalSaqueUSD  * 10000) / 10000,
    });
  }

  // ── POST /cashflow — registra novo aporte ou saque ────────
  if (method === 'POST' && url === '/cashflow') {
    if (!auth(req,res)) return;
    const b = await readBody(req);
    const { date, type, valor_brl, valor_usd, corretora, descricao } = b;
    if (!date || !type) return sendJSON(res, 400, { error:'date e type obrigatórios' });
    const r = await supa('POST', 'cashflow', {
      date, type,
      valor_brl: valor_brl ? parseFloat(valor_brl) : null,
      valor_usd: valor_usd ? parseFloat(valor_usd) : null,
      corretora: corretora || null,
      descricao: descricao || null,
    });
    return sendJSON(res, 200, r.body);
  }

  // ── GET /positions — posições abertas ─────────────────────
  if (method === 'GET' && url === '/positions') {
    const r = await supa('GET', 'positions?order=created_at.asc');
    return sendJSON(res, 200, Array.isArray(r.body) ? r.body : []);
  }

  // ── GET /trades — histórico de operações ──────────────────
  if (method === 'GET' && url.startsWith('/trades')) {
    const qs  = url.includes('?') ? url.split('?')[1] : '';
    const r   = await supa('GET', 'trades?' + qs + '&order=date.desc');
    return sendJSON(res, 200, Array.isArray(r.body) ? r.body : []);
  }

  // ── GET /pnl — P&L consolidado por mês ────────────────────
  if (method === 'GET' && url === '/pnl') {
    const r = await supa('GET', 'trades?select=date,pnl,ticker&order=date.asc');
    // Log diagnóstico completo
    console.log('Supabase /trades status:', r.status);
    console.log('Supabase /trades body:', JSON.stringify(r.body)?.slice(0, 300));
    const trades = Array.isArray(r.body) ? r.body : [];
    const byMonth = {};
    let total = 0;
    trades.forEach(t => {
      const mk = monthKey(t.date);
      const pnl = parseFloat(t.pnl) || 0;  // garante número mesmo se vier como string
      if (!byMonth[mk]) byMonth[mk] = { realized: 0 };
      byMonth[mk].realized = Math.round((byMonth[mk].realized + pnl) * 100) / 100;
      total = Math.round((total + pnl) * 100) / 100;
    });
    // Usa o mês mais recente dos dados (não do servidor — evita timezone bug)
    const months = Object.keys(byMonth).sort();
    const latestMonth = months[months.length - 1] || monthKey();
    return sendJSON(res, 200, {
      currentMonth:    latestMonth,
      currentMonthPnl: byMonth[latestMonth]?.realized || 0,
      totalHistorical: total,
      tradesCount:     trades.length,  // debug: confirma quantos trades foram lidos
      pnlBRL:          { realized: 563.83 },
      history:         byMonth,
    });
  }

  // ── GET /data — tudo junto (posições + P&L) ───────────────
  if (method === 'GET' && url === '/data') {
    const [posR, tradeR] = await Promise.all([
      supa('GET', 'positions?order=created_at.asc'),
      supa('GET', 'trades?select=date,pnl,ticker&order=date.asc'),
    ]);
    const positions = Array.isArray(posR.body)   ? posR.body   : [];
    const trades    = Array.isArray(tradeR.body)  ? tradeR.body : [];
    const byMonth = {};
    let total = 0;
    trades.forEach(t => {
      const mk = monthKey(t.date);
      if (!byMonth[mk]) byMonth[mk] = { realized:0 };
      byMonth[mk].realized = Math.round((byMonth[mk].realized + (t.pnl||0))*100)/100;
      total = Math.round((total + (t.pnl||0))*100)/100;
    });
    const months = Object.keys(byMonth).sort();
    const latestMonth = months[months.length - 1] || monthKey();
    return sendJSON(res, 200, {
      positions,
      pnlHistory:      byMonth,
      pnlBRL:          { realized: 563.83 },
      currentMonth:    latestMonth,
      currentMonthPnl: byMonth[latestMonth]?.realized || 0,
      totalHistorical: total,
    });
  }

  // ── POST /trade — registra nova operação fechada ──────────
  if (method === 'POST' && url === '/trade') {
    if (!auth(req,res)) return;
    const b = await readBody(req);
    const { ticker, entry, exit, shares, date, corretora } = b;
    if (!ticker||!entry||!exit||!shares) return sendJSON(res,400,{error:'ticker,entry,exit,shares obrigatórios'});
    const pnl = Math.round((exit-entry)*shares*100)/100;
    const r = await supa('POST', 'trades', {
      ticker, entry, exit, shares, pnl,
      date:      date || new Date().toISOString().split('T')[0],
      corretora: corretora || null,
    });
    return sendJSON(res, 201, { ok:true, trade:r.body?.[0] || b, pnl });
  }

  // ── POST /positions — abre nova posição ───────────────────
  if (method === 'POST' && url === '/positions') {
    if (!auth(req,res)) return;
    const b = await readBody(req);
    const { ticker, shares, entry, corretora } = b;
    if (!ticker||!shares||!entry) return sendJSON(res,400,{error:'ticker,shares,entry obrigatórios'});
    const r = await supa('POST', 'positions', { ticker, shares, entry, corretora: corretora||null });
    return sendJSON(res, 201, { ok:true, position: r.body?.[0] || b });
  }

  // ── DELETE /positions/:ticker — fecha posição ─────────────
  if (method === 'DELETE' && url.startsWith('/positions/')) {
    if (!auth(req,res)) return;
    const ticker = decodeURIComponent(url.split('/positions/')[1]);
    await supa('DELETE', `positions?ticker=eq.${ticker}`);
    return sendJSON(res, 200, { ok:true, deleted: ticker });
  }

  // ── GET /quote?symbol=SLV — proxy Finnhub (evita CORS) ────
  if (method === 'GET' && url.startsWith('/quote?symbol=')) {
    const sym = decodeURIComponent(url.split('=')[1]);
    try {
      const d = await finnhub(`quote?symbol=${encodeURIComponent(sym)}`);
      return sendJSON(res, 200, d);
    } catch(e) {
      return sendJSON(res, 502, { error: e.message });
    }
  }

  sendJSON(res, 404, { error:'Not found' });

}).listen(PORT, () => console.log('Carteira API porta ' + PORT + ' · Supabase conectado'));
