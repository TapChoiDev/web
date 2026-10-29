const http = require('http');
const app = require('../server/server');
const db = require('../server/config/db');

class TestClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = '';
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(method, path, body = null, customHeaders = {}) {
    const headers = {
      'Connection': 'close',
      ...customHeaders
    };

    if (body && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.cookies) {
      headers['Cookie'] = this.cookies;
    }

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, options);

    // Capture set-cookie
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      this.cookies = setCookie.split(';')[0];
    }

    let data;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }

    return {
      status: res.status,
      headers: res.headers,
      body: data
    };
  }

  get(path, headers = {}) {
    return this.request('GET', path, null, headers);
  }

  post(path, body, headers = {}) {
    return this.request('POST', path, body, headers);
  }

  put(path, body, headers = {}) {
    return this.request('PUT', path, body, headers);
  }

  delete(path, headers = {}) {
    return this.request('DELETE', path, null, headers);
  }
}

let serverInstance = null;
let serverPort = null;

async function startServer() {
  if (serverInstance) {
    return {
      baseUrl: `http://127.0.0.1:${serverPort}`,
      client: () => new TestClient(`http://127.0.0.1:${serverPort}`)
    };
  }

  await new Promise((resolve) => {
    serverInstance = app.listen(0, '127.0.0.1', () => {
      serverPort = serverInstance.address().port;
      resolve();
    });
  });

  return {
    baseUrl: `http://127.0.0.1:${serverPort}`,
    client: () => new TestClient(`http://127.0.0.1:${serverPort}`)
  };
}

async function stopServer() {
  if (serverInstance) {
    if (typeof serverInstance.closeAllConnections === 'function') {
      serverInstance.closeAllConnections();
    }
    await new Promise((resolve) => serverInstance.close(resolve));
    serverInstance = null;
    serverPort = null;
  }
}

async function closeDb() {
  try {
    await db.pool.end();
  } catch (e) {}
}

module.exports = {
  startServer,
  stopServer,
  closeDb,
  TestClient
};
