import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/services/authClient.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
});

test('login, refresh and profile use the server-authenticated default client', async () => {
  const values = new Map();
  globalThis.window = {
    location: { protocol: 'http:', host: 'oidc.example.test' },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    setTimeout: () => 1,
    clearTimeout: () => {},
  };
  const { createAuthClient, TokenRequestError } = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
  );
  let tokens = { token: null, refreshToken: null };
  const tokenStorage = {
    getTokens: () => tokens,
    getToken: () => tokens.token,
    setTokens: (next) => { tokens = next; },
    setPersistentTokens: (next) => { tokens = next; },
    clearAll: () => { tokens = { token: null, refreshToken: null }; },
  };
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return Response.json(url.endsWith('/actions/me')
      ? { user: { uuid: 'user-one', username: 'admin' } }
      : { access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600 });
  };
  const client = createAuthClient({ tokenStorage });
  try {
    await client.loginWithPassword({ login: 'admin', password: 'test-password', rememberMe: false });
    await client.refreshAccessToken({ rememberMe: false });
    const profile = await client.fetchCurrentUserProfile();
    assert.equal(profile.username, 'admin');
    assert.deepEqual(requests.map(({ url }) => url), [
      'http://oidc.example.test/api/core/v1/iam/clients/default/actions/get_token/invoke',
      'http://oidc.example.test/api/core/v1/iam/clients/default/actions/get_token/invoke',
      'http://oidc.example.test/api/core/v1/iam/clients/default/actions/me',
    ]);
    assert.equal(requests[0].options.body.get('grant_type'), 'login+password');
    assert.equal(requests[1].options.body.get('grant_type'), 'refresh_token');
    assert.equal(requests[1].options.body.get('refresh_token'), 'test-refresh');
    assert.equal(requests[2].options.headers.Authorization, 'Bearer test-access');
    for (const { options } of requests.slice(0, 2)) {
      assert.equal(options.headers['X-OTP'], undefined);
      assert.equal(options.headers['X-Client-Secret'], undefined);
      assert.equal(options.body.has('client_secret'), false);
    }
    await client.loginWithPassword({
      login: 'admin', password: 'test-password', otp: ' 123456 ', rememberMe: false,
    });
    assert.equal(requests[3].url, requests[0].url);
    assert.equal(requests[3].options.headers['X-OTP'], '123456');
    assert.equal(requests[3].options.body.get('password'), 'test-password');
    globalThis.fetch = async () => Response.json({ error: 'invalid_grant' }, { status: 401 });
    await assert.rejects(
      client.loginWithPassword({ login: 'admin', password: 'test-password' }),
      (error) => error instanceof TokenRequestError && error.status === 401,
    );
    await assert.rejects(client.refreshAccessToken(), /401/);
    assert.equal(tokens.token, null);
    assert.equal(tokens.refreshToken, null);
  } finally {
    client.stop();
    delete globalThis.window;
    delete globalThis.fetch;
  }
});
