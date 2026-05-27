const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Jenkins + k3s pipeline! V2\n');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});