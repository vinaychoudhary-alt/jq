const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    d.team = [{ id: "isha_01", name: "Isha Singh", title: "Associate - Global Partnerships", email: "ishaa@joveo.com", color: "#2563eb" }];
    return d;
  } catch {
    return { team: [{ id: "isha_01", name: "Isha Singh", title: "Associate - Global Partnerships", email: "ishaa@joveo.com", color: "#2563eb" }], gaps: [] };
  }
}

function writeData(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch(e) {}
}

const SYSTEM_PROMPT = `You are Joveo's Supply Gap Agent. Return ONLY a JSON array.
For every publisher found, you MUST identify a specific person (POC) and their work email.
Format: [{"name":"Name","url":"URL","poc_name":"Name","poc_email":"email@domain.com","why":"Value","model":"CPC/CPA","priority":"HIGH"}]
NEVER suggest: Indeed, LinkedIn, ZipRecruiter, Monster, CareerBuilder, Glassdoor.
Sender Identity: Isha Singh (ishaa@joveo.com).`;

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const payload = JSON.parse(body);
      payload.system = SYSTEM_PROMPT;
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      };
      const proxyReq = https.request(options, (pRes) => {
        let data = '';
        pRes.on('data', c => data += c);
        pRes.on('end', () => { res.writeHead(pRes.statusCode); res.end(data); });
      });
      proxyReq.write(JSON.stringify(payload));
      proxyReq.end();
    });
    return;
  }

  if (req.url === '/api/data') {
    if (req.method === 'GET') res.end(JSON.stringify(readData()));
    else {
      let b = ''; req.on('data', c => b += c);
      req.on('end', () => { writeData(JSON.parse(b)); res.end('ok'); });
    }
    return;
  }

  const f = req.url === '/' ? 'index.html' : req.url.slice(1);
  fs.readFile(path.join(__dirname, f), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.end(data);
  });
}).listen(PORT);
