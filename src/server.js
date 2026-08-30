const http = require('http');

const port = Number(process.env.PORT || 3000);
const serviceName = process.env.SERVICE_NAME || 'platform-status-api';

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/healthz') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  if (req.url === '/readyz') {
    res.writeHead(200);
    return res.end(JSON.stringify({ ready: true }));
  }

  if (req.url === '/') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      service: serviceName,
      environment: process.env.APP_ENV || 'unknown',
      timestamp: new Date().toISOString()
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`${serviceName} listening on ${port}`);
});
