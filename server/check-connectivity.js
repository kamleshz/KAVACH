import http from 'http';

const checkConnection = (host, port) => {
  const options = {
    hostname: host,
    port: port,
    path: '/',
    method: 'GET',
    timeout: 2000 // 2s timeout
  };

  const req = http.request(options, (res) => {
    console.log(`Connected to ${host}:${port} - Status: ${res.statusCode}`);
  });

  req.on('error', (e) => {
    console.log(`Failed to connect to ${host}:${port} - Error: ${e.message}`);
  });

  req.on('timeout', () => {
    console.log(`Timeout connecting to ${host}:${port}`);
    req.destroy();
  });

  req.end();
};

console.log("Testing connectivity...");
checkConnection('localhost', 8080);
checkConnection('127.0.0.1', 8080);
checkConnection('::1', 8080);
