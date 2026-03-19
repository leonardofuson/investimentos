const http = require('http');
const PORT = process.env.PORT || 3000;
const SECRET = process.env.API_SECRET || 'leo2026';

let positions = [
  { ticker: 'AGQ', shares: 74.30638538,   entry: 124.19 },
  { ticker: 'UGL', shares: 127.45806629,  entry: 66.69  },
];

let pnlHistory = {
  "2025-12": { realized: -0.15, trades: [
    { ticker:'UUP', entry:28.16, exit:27.95, shares:3.57, pnl:-0.88, date:'2025-12-12' },
    { ticker:'REK', entry:17.20, exit:17.31, shares:6.11, pnl:0.73,  date:'2025-12-17' },
  ]},
  "2026-01": { realized: 416.33, trades: [
    { ticker:'SLV',  entry:60.31,  exit:77.29,  shares:3.17,   pnl:53.81,  date:'2026-01-09' },
    { ticker:'SLV',  entry:60.27,  exit:77.32,  shares:6.65,   pnl:113.36, date:'2026-01-09' },
    { ticker:'GLD',  entry:379.20, exit:423.24, shares:0.92,   pnl:40.48,  date:'2026-01-09' },
    { ticker:'PPLT', entry:195.71, exit:213.12, shares:0.51,   pnl:8.90,   date:'2026-01-09' },
    { ticker:'GLD',  entry:395.00, exit:423.21, shares:0.28,   pnl:7.90,   date:'2026-01-09' },
    { ticker:'PPLT', entry:197.92, exit:213.20, shares:0.53,   pnl:8.06,   date:'2026-01-09' },
    { ticker:'DBA',  entry:20.00,  exit:19.92,  shares:5.00,   pnl:-0.40,  date:'2026-01-15' },
    { ticker:'FXY',  entry:59.50,  exit:57.97,  shares:1.70,   pnl:-2.60,  date:'2026-01-15' },
    { ticker:'FXF',  entry:111.00, exit:109.12, shares:0.90,   pnl:-1.69,  date:'2026-01-15' },
    { ticker:'NVDD', entry:39.80,  exit:38.63,  shares:2.60,   pnl:-3.04,  date:'2026-01-21' },
    { ticker:'NVDD', entry:40.74,  exit:38.60,  shares:2.71,   pnl:-5.79,  date:'2026-01-21' },
    { ticker:'PLTD', entry:6.95,   exit:6.99,   shares:15.00,  pnl:0.96,   date:'2026-01-21' },
    { ticker:'PLTD', entry:7.10,   exit:6.96,   shares:15.50,  pnl:-1.79,  date:'2026-01-21' },
    { ticker:'TSLS', entry:5.30,   exit:5.19,   shares:20.34,  pnl:-2.24,  date:'2026-01-21' },
    { ticker:'BITI', entry:22.30,  exit:22.91,  shares:42.00,  pnl:27.15,  date:'2026-01-22' },
    { ticker:'SETH', entry:43.47,  exit:42.14,  shares:4.73,   pnl:-6.31,  date:'2026-01-22' },
    { ticker:'PSQ',  entry:29.74,  exit:29.75,  shares:3.98,   pnl:8.01,   date:'2026-01-26' },
    { ticker:'GLL',  entry:19.94,  exit:21.45,  shares:113.00, pnl:170.64, date:'2026-01-28' },
  ]},
  "2026-02": { realized: 2694.74, trades: [
    { ticker:'GLL',  entry:21.15, exit:21.40,  shares:15.03,  pnl:3.78,    date:'2026-02-02' },
    { ticker:'ZSL',  entry:2.28,  exit:2.66,   shares:174.88, pnl:66.65,   date:'2026-02-02' },
    { ticker:'PSQ',  entry:29.76, exit:29.74,  shares:18.65,  pnl:-0.37,   date:'2026-02-02' },
    { ticker:'PSQ',  entry:30.05, exit:29.75,  shares:59.86,  pnl:-17.95,  date:'2026-02-02' },
    { ticker:'GLL',  entry:20.23, exit:21.34,  shares:15.00,  pnl:16.68,   date:'2026-02-02' },
    { ticker:'QID',  entry:19.50, exit:20.02,  shares:38.03,  pnl:19.78,   date:'2026-02-03' },
    { ticker:'QID',  entry:19.46, exit:20.02,  shares:73.17,  pnl:40.99,   date:'2026-02-03' },
    { ticker:'QID',  entry:19.51, exit:20.02,  shares:91.29,  pnl:46.56,   date:'2026-02-03' },
    { ticker:'QLD',  entry:65.93, exit:65.65,  shares:55.80,  pnl:-15.62,  date:'2026-02-05' },
    { ticker:'BITX', entry:15.32, exit:16.97,  shares:722.29, pnl:1660.17, date:'2026-02-06' },
    { ticker:'SBIT', entry:61.09, exit:63.40,  shares:31.69,  pnl:73.20,   date:'2026-02-11' },
    { ticker:'SQQQ', entry:68.22, exit:71.99,  shares:139.29, pnl:524.91,  date:'2026-02-12' },
    { ticker:'BITI', entry:28.58, exit:29.79,  shares:104.00, pnl:125.84,  date:'2026-02-24' },
    { ticker:'SBIT', entry:64.21, exit:69.66,  shares:25.13,  pnl:136.96,  date:'2026-02-24' },
    { ticker:'SQQQ', entry:70.43, exit:68.01,  shares:49.51,  pnl:-119.87, date:'2026-02-25' },
  ]},
  "2026-03": { realized: 6107.73, trades: [
    { ticker:'SQQQ', entry:75.47, exit:72.97,  shares:66.24,  pnl:-165.28, date:'2026-03-02' },
    { ticker:'SQQQ', entry:71.00, exit:72.97,  shares:44.01,  pnl:86.92,   date:'2026-03-02' },
    { ticker:'SBIT', entry:61.48, exit:61.26,  shares:15.48,  pnl:-3.40,   date:'2026-03-03' },
    { ticker:'SBIT', entry:59.52, exit:61.26,  shares:56.57,  pnl:98.43,   date:'2026-03-03' },
    { ticker:'SBIT', entry:58.24, exit:61.26,  shares:42.04,  pnl:126.97,  date:'2026-03-03' },
    { ticker:'BITI', entry:26.74, exit:27.40,  shares:151.00, pnl:99.88,   date:'2026-03-03' },
    { ticker:'GLL',  entry:15.97, exit:17.83,  shares:250.00, pnl:465.03,  date:'2026-03-03' },
    { ticker:'SQQQ', entry:69.56, exit:72.27,  shares:93.90,  pnl:254.47,  date:'2026-03-06' },
    { ticker:'SQQQ', entry:69.54, exit:72.27,  shares:6.73,   pnl:18.36,   date:'2026-03-06' },
    { ticker:'SBIT', entry:50.43, exit:56.30,  shares:138.58, pnl:813.47,  date:'2026-03-06' },
    { ticker:'UGL',  entry:74.05, exit:77.29,  shares:93.35,  pnl:302.47,  date:'2026-03-10' },
    { ticker:'UGL',  entry:74.21, exit:77.80,  shares:121.06, pnl:434.59,  date:'2026-03-10' },
    { ticker:'UCO',  entry:33.32, exit:39.01,  shares:216.58, pnl:1234.49, date:'2026-03-12' },
    { ticker:'SBIT', entry:53.42, exit:54.22,  shares:176.31, pnl:141.05,  date:'2026-03-12' },
    { ticker:'SQQQ', entry:72.64, exit:76.04,  shares:116.33, pnl:395.92,  date:'2026-03-13' },
    { ticker:'SBIT', entry:49.57, exit:52.78,  shares:192.83, pnl:618.98,  date:'2026-03-13' },
    { ticker:'AGQ',  entry:138.10,exit:140.81, shares:64.05,  pnl:173.58,  date:'2026-03-16' },
    { ticker:'UGL',  entry:71.63, exit:71.58,  shares:142.09, pnl:-7.10,   date:'2026-03-16' },
    { ticker:'SQQQ', entry:72.89, exit:74.57,  shares:123.73, pnl:207.87,  date:'2026-03-18' },
    { ticker:'SBIT', entry:48.03, exit:51.86,  shares:211.76, pnl:811.03,  date:'2026-03-18' },
  ]},
};

const pnlBRL = { realized: 563.83 };

function totalHistorical() { return Object.values(pnlHistory).reduce((a,m)=>a+(m.realized||0),0); }
function currentMonthKey() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function currentMonthPnl() { const k=currentMonthKey(); return pnlHistory[k]?pnlHistory[k].realized:0; }
function getMonthKey(date) { const d=date?new Date(date):new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }

function sendJSON(res, status, data) {
  res.writeHead(status, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Secret'});
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise(resolve => { let b=''; req.on('data',c=>b+=c); req.on('end',()=>{try{resolve(JSON.parse(b));}catch(e){resolve({});}}); });
}
function authCheck(req,res) { if(req.headers['x-secret']!==SECRET){sendJSON(res,401,{error:'Unauthorized'});return false;} return true; }

http.createServer(async(req,res)=>{
  const {url,method}=req;
  if(method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Secret'});return res.end();}
  if(method==='GET'&&url==='/health') return sendJSON(res,200,{status:'ok',ts:new Date().toISOString()});
  if(method==='GET'&&url==='/data') return sendJSON(res,200,{positions,pnlHistory,pnlBRL,currentMonth:currentMonthKey(),currentMonthPnl:currentMonthPnl(),totalHistorical:totalHistorical()});
  if(method==='GET'&&url==='/positions') return sendJSON(res,200,{positions});
  if(method==='POST'&&url==='/positions'){
    if(!authCheck(req,res))return;
    const b=await readBody(req);
    if(!Array.isArray(b.positions))return sendJSON(res,400,{error:'positions deve ser array'});
    positions=b.positions; return sendJSON(res,200,{ok:true,positions});
  }
  if(method==='POST'&&url==='/trade'){
    if(!authCheck(req,res))return;
    const b=await readBody(req);
    const{ticker,entry,exit,shares,date}=b;
    if(!ticker||!entry||!exit||!shares)return sendJSON(res,400,{error:'ticker,entry,exit,shares obrigatórios'});
    const pnl=Math.round((exit-entry)*shares*100)/100;
    const mk=getMonthKey(date);
    if(!pnlHistory[mk])pnlHistory[mk]={realized:0,trades:[]};
    pnlHistory[mk].realized=Math.round((pnlHistory[mk].realized+pnl)*100)/100;
    pnlHistory[mk].trades.push({ticker,entry,exit,shares,pnl,date:date||new Date().toISOString().split('T')[0]});
    return sendJSON(res,200,{ok:true,trade:{ticker,entry,exit,shares,pnl},monthKey:mk,newMonthTotal:pnlHistory[mk].realized,totalHistorical:totalHistorical()});
  }
  if(method==='GET'&&url==='/pnl') return sendJSON(res,200,{currentMonth:currentMonthKey(),currentMonthPnl:currentMonthPnl(),totalHistorical:totalHistorical(),pnlBRL,history:pnlHistory});

  // ── PROXY /quote?symbol=SLV — evita bloqueio CORS do Finnhub no browser ──
  if(method==='GET'&&url.startsWith('/quote?symbol=')) {
    const sym = decodeURIComponent(url.split('=')[1]);
    const FH_KEY = 'd6s1n1pr01qpss2i1fm0d6s1n1pr01qpss2i1fmg';
    const fhPath = `/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${FH_KEY}`;
    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      https.get({ hostname:'finnhub.io', path:fhPath, headers:{'User-Agent':'node'} }, r => {
        let body = '';
        r.on('data', c => body += c);
        r.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
      }).on('error', reject);
    });
    return sendJSON(res, 200, data);
  }

  sendJSON(res,404,{error:'Not found'});
}).listen(PORT,()=>console.log('Carteira API na porta '+PORT));
