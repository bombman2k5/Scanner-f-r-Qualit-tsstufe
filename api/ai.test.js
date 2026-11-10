import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './ai.js';

function makePair(body = {}, headers = {}) {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    _status(code) { this.statusCode = code; return this; },
    _json(obj) { this.body = obj; this.headers['content-type'] = 'application/json'; return this; },
    status(code) { return this._status(code); },
    json(obj) { return this._json(obj); },
    setHeader(k, v) { this.headers[k] = v; return this; }
  };
  const req = { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body };
  return { req, res };
}

async function capture(handlerFn, req, res) {
  return new Promise((resolve) => {
    const result = handlerFn(req, res);
    if (result && typeof result.then === 'function') result.then(resolve, resolve);
    else resolve(result);
  });
}
test('ai.handler: GET liefert 405', async () => {
  const { req, res } = makePair(undefined);
  req.method = 'GET';
  await capture(handler, req, res);
  assert.strictEqual(res.statusCode, 405);
  assert.ok(res.body.error.includes('POST erforderlich'));
});

test('ai.handler: ohne Authorization liefert 401', async () => {
  const { req, res } = makePair({ mode: 'values', text: 'hallo', fields: [] });
  delete req.headers.authorization;
  await capture(handler, req, res);
  assert.strictEqual(res.statusCode, 401);
  assert.ok(res.body.error.includes('Nicht angemeldet'));
});

test('ai.handler: Token-Validierung schlaegt fehl -> 401 (mocked fetch 401)', async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  try {
    const { req, res } = makePair({ mode: 'values', text: 'hallo', fields: [] });
    req.headers.authorization = 'Bearer falscher-token';
    await capture(handler, req, res);
    assert.strictEqual(res.statusCode, 401);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('ai.handler: nicht auf Whitelist -> 403', async () => {
  const origFetch = globalThis.fetch;
  const origEnv = process.env;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ users: [{ email: 'nutzer@example.com' }] })
  });
  process.env = { ...origEnv, FIREBASE_API_KEY: 'test-key', ALLOWED_EMAILS: 'andere@example.com' };
  try {
    const { req, res } = makePair({ mode: 'values', text: 'hallo', fields: [] });
    req.headers.authorization = 'Bearer token';
    await capture(handler, req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.ok(res.body.error.includes('Nicht freigegeben'));
  } finally {
    globalThis.fetch = origFetch;
    process.env = origEnv;
  }
});

test('ai.handler: text zu lang -> 400', async () => {
  const origFetch = globalThis.fetch;
  const origEnv = process.env;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ users: [{ email: 'nutzer@example.com' }] })
  });
  process.env = { ...origEnv, FIREBASE_API_KEY: 'k', ALLOWED_EMAILS: 'nutzer@example.com' };
  try {
    const { req, res } = makePair({ mode: 'values', text: 'x'.repeat(200000), fields: [] });
    req.headers.authorization = 'Bearer token';
    await capture(handler, req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('zu lang'));
  } finally {
    globalThis.fetch = origFetch;
    process.env = origEnv;
  }
});

test('ai.handler: unbekannter Modus -> 400', async () => {
  const origFetch = globalThis.fetch;
  const origEnv = process.env;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ users: [{ email: 'nutzer@example.com' }] })
  });
  process.env = { ...origEnv, FIREBASE_API_KEY: 'k', ALLOWED_EMAILS: 'nutzer@example.com' };
  try {
    const { req, res } = makePair({ mode: 'unsinn', text: 'hallo', fields: [] });
    req.headers.authorization = 'Bearer token';
    await capture(handler, req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Unbekannter Modus'));
  } finally {
    globalThis.fetch = origFetch;
    process.env = origEnv;
  }
});

test('ai.handler: values-Modus baut korrekten Gemini-Request und parst Antwort', async () => {
  const origFetch = globalThis.fetch;
  const origEnv = process.env;
  let capturedUrl = '';
  let capturedBody = null;
  globalThis.fetch = async (url, opts) => {
    capturedUrl = url;
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"hersteller":"Firma X","belege":{"hersteller":"S.3"}}' }] } }]
      })
    };
  };
  process.env = { ...origEnv, FIREBASE_API_KEY: 'k', ALLOWED_EMAILS: 'nutzer@example.com', GEMINI_API_KEY: 'gk', GEMINI_MODEL: 'gemini-1.5-pro' };
  try {
    const fields = [{ k: 'hersteller', l: 'Hersteller', t: 's' }];
    const { req, res } = makePair({ mode: 'values', text: 'Inhalt...', fields, pdfs: [] });
    req.headers.authorization = 'Bearer token';
    await capture(handler, req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, { hersteller: 'Firma X', belege: { hersteller: 'S.3' } });
    assert.ok(capturedBody.systemInstruction.parts[0].text.startsWith('Du extrahierst Daten'));
    assert.strictEqual(capturedBody.generationConfig.responseMimeType, 'application/json');
    assert.strictEqual(capturedBody.contents[0].role, 'user');
    assert.ok(capturedBody.contents[0].parts[0].text.includes('Inhalt...'));
    assert.ok(capturedUrl.includes('generativelanguage.googleapis.com'));
    assert.ok(capturedUrl.includes('gemini-1.5-pro'));
    assert.ok(capturedUrl.includes('key=gk'));
  } finally {
    globalThis.fetch = origFetch;
    process.env = origEnv;
  }
});

test('ai.handler: Gemini liefert HTTP-Fehler -> 502', async () => {
  const origFetch = globalThis.fetch;
  const origEnv = process.env;
  globalThis.fetch = async () => ({ ok: false, status: 500 });
  process.env = { ...origEnv, FIREBASE_API_KEY: 'k', ALLOWED_EMAILS: 'nutzer@example.com', GEMINI_API_KEY: 'gk' };
  try {
    const { req, res } = makePair({ mode: 'values', text: 'hallo', fields: [] });
    req.headers.authorization = 'Bearer token';
    await capture(handler, req, res);
    assert.strictEqual(res.statusCode, 502);
    assert.ok(res.body.error.includes('KI-Dienst meldet Fehler (500)'));
  } finally {
    globalThis.fetch = origFetch;
    process.env = origEnv;
  }
});

test('ai.handler: rules-Modus baut korrekten Request', async () => {
  const origFetch = globalThis.fetch;
  const origEnv = process.env;
  let capturedBody = null;
  globalThis.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"rows":[]}' }] } }] }) };
  };
  process.env = { ...origEnv, FIREBASE_API_KEY: 'k', ALLOWED_EMAILS: 'nutzer@example.com', GEMINI_API_KEY: 'gk' };
  try {
    const rules = { name: 'Test', fields: [], rows: [] };
    const { req, res } = makePair({ mode: 'rules', text: 'neuer text', rules, stufen: ['QS1', 'QS2'], neu: true, hinweis: 'x' });
    req.headers.authorization = 'Bearer token';
    await capture(handler, req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, { rows: [] });
    assert.ok(capturedBody.systemInstruction.parts[0].text.includes('Regelwerk'));
    assert.ok(capturedBody.contents[0].parts[0].text.includes('AKTUELLES REGELWERK'));
    assert.ok(capturedBody.contents[0].parts[0].text.includes('NEUER TEXT'));
  } finally {
    globalThis.fetch = origFetch;
    process.env = origEnv;
  }
});

console.log('Unit-Tests fuer api/ai.js geschrieben. Ausfuehren mit: node --test api/ai.test.js');

