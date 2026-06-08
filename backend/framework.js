/**
 * framework.js — Lightweight Express-compatible router
 * Built on Node.js built-in 'http' module. Zero npm dependencies.
 * Supports: routing, middleware, JSON body parsing, static files,
 *           req.params, req.query, res.json(), res.send(), res.status()
 */

'use strict';

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff2':'font/woff2',
};

class App {
  constructor() {
    this._routes     = [];      // { method, pattern, regex, keys, handlers[] }
    this._middleware = [];      // global middleware
    this._staticDir  = null;
    this._staticRoute = '/';
  }

  /* ── Middleware ─────────────────────────────────────────────── */
  use(pathOrFn, fn) {
    if (typeof pathOrFn === 'function') {
      this._middleware.push({ path: null, fn: pathOrFn });
    } else {
      this._middleware.push({ path: pathOrFn, fn });
    }
  }

  static(route, dir) {
    this._staticRoute = route;
    this._staticDir   = dir;
  }

  /* ── Route registration ─────────────────────────────────────── */
  _addRoute(method, pattern, handlers) {
    const keys  = [];
    const regex = new RegExp(
      '^' + pattern
        .replace(/\//g, '\\/')
        .replace(/:([a-z_]+)/gi, (_, k) => { keys.push(k); return '([^\\/]+)'; })
      + '\\/?$', 'i'
    );
    this._routes.push({ method, pattern, regex, keys, handlers });
  }

  get(p, ...h)   { this._addRoute('GET',   p, h); }
  post(p, ...h)  { this._addRoute('POST',  p, h); }
  patch(p, ...h) { this._addRoute('PATCH', p, h); }
  put(p, ...h)   { this._addRoute('PUT',   p, h); }
  delete(p, ...h){ this._addRoute('DELETE',p, h); }
  options(p, ...h){ this._addRoute('OPTIONS',p, h); }

  /* ── Request / Response enhancement ────────────────────────── */
  _enhance(req, res, parsedUrl) {
    /* ── res helpers ── */
    res.status = (code) => { res.statusCode = code; return res; };
    res.json   = (obj)  => {
      const body = JSON.stringify(obj);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.end(body);
    };
    res.send   = (body) => {
      if (typeof body === 'object') return res.json(body);
      res.setHeader('Content-Type', 'text/plain');
      res.end(String(body));
    };
    res.sendFile = (filePath) => {
      fs.readFile(filePath, (err, data) => {
        if (err) { res.statusCode = 404; return res.end('Not found'); }
        const ext  = path.extname(filePath);
        const mime = MIME[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        res.end(data);
      });
    };

    /* ── req helpers ── */
    req.query  = Object.fromEntries(parsedUrl.searchParams);
    req.params = {};
    req.path   = parsedUrl.pathname;
  }

  /* ── CORS ───────────────────────────────────────────────────── */
  _setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  }

  /* ── Body parser ────────────────────────────────────────────── */
  _parseBody(req) {
    return new Promise((resolve) => {
      const ct = (req.headers['content-type'] || '');
      if (!ct.includes('application/json')) return resolve();
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        try { req.body = JSON.parse(Buffer.concat(chunks).toString()); }
        catch { req.body = {}; }
        resolve();
      });
      req.on('error', () => { req.body = {}; resolve(); });
    });
  }

  /* ── Static file handler ─────────────────────────────────────── */
  _serveStatic(pathname, res) {
    if (!this._staticDir) return false;

    let rel = pathname;
    if (this._staticRoute !== '/') {
      if (!pathname.startsWith(this._staticRoute)) return false;
      rel = pathname.slice(this._staticRoute.length) || '/';
    }

    let filePath = path.join(this._staticDir, rel);

    // Directory → try index.html
    try {
      if (fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
    } catch { return false; }

    if (!fs.existsSync(filePath)) return false;

    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.end(fs.readFileSync(filePath));
    return true;
  }

  /* ── Main request handler ───────────────────────────────────── */
  async _handle(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    this._setCORS(res);
    this._enhance(req, res, parsedUrl);

    // OPTIONS preflight
    if (req.method === 'OPTIONS') { res.statusCode = 200; return res.end(); }

    // Parse body
    await this._parseBody(req);

    const pathname = parsedUrl.pathname;

    // Run global middleware
    for (const mw of this._middleware) {
      if (!mw.path || pathname.startsWith(mw.path)) {
        let next = false;
        await new Promise(resolve => {
          mw.fn(req, res, () => { next = true; resolve(); });
          // If fn doesn't call next but also doesn't end, resolve anyway after 50ms
          setTimeout(() => { if (!next) resolve(); }, 50);
        });
        if (res.writableEnded) return;
        if (!next) return;
      }
    }

    // Match routes
    for (const route of this._routes) {
      if (route.method !== req.method) continue;
      const m = pathname.match(route.regex);
      if (!m) continue;

      // Populate req.params
      route.keys.forEach((k, i) => { req.params[k] = decodeURIComponent(m[i + 1]); });

      // Run handlers chain
      let idx = 0;
      const next = async () => {
        if (idx >= route.handlers.length) return;
        const h = route.handlers[idx++];
        await h(req, res, next);
      };
      await next();
      return;
    }

    // Static files
    if (req.method === 'GET') {
      if (this._serveStatic(pathname, res)) return;
      // SPA fallback — serve index.html for non-API GET requests
      if (!pathname.startsWith('/api') && this._staticDir) {
        const indexPath = path.join(this._staticDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.setHeader('Content-Type', 'text/html');
          return res.end(fs.readFileSync(indexPath));
        }
      }
    }

    res.statusCode = 404;
    res.json({ success: false, message: `Cannot ${req.method} ${pathname}` });
  }

  /* ── listen ─────────────────────────────────────────────────── */
  listen(port, cb) {
    const server = http.createServer((req, res) => {
      this._handle(req, res).catch(err => {
        console.error('[Server Error]', err.message);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.json({ success: false, message: 'Internal server error' });
        }
      });
    });
    server.listen(port, '0.0.0.0', cb);
    return server;
  }
}

module.exports = () => new App();
