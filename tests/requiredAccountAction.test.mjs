import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Run the dependency-free TypeScript parser without adding a test runtime.
const source = await readFile(new URL('../src/services/requiredAccountAction.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { getRequiredAccountAction } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const parse = (body, status = 400) => getRequiredAccountAction({ status, responseBody: JSON.stringify(body) });

test('recognizes only the explicit HTTP 400 Core response', () => {
  const body = { error: 'external_action_required', redirect_url: 'https://kc.example/realms/company/account/' };
  assert.deepEqual(parse(body), { redirectUrl: body.redirect_url });
  for (const status of [200, 401, 403, 500]) assert.equal(parse(body, status), null);
  for (const body of [null, [], {}, { error: 'invalid_grant' }, { error: { code: 'external_action_required' } }]) {
    assert.equal(parse(body), null);
  }
  assert.equal(getRequiredAccountAction({ status: 400, responseBody: 'not JSON' }), null);
});

test('keeps explanation without exposing unsafe or missing links', () => {
  for (const redirect_url of [undefined, null, 42, {}, '', '/account/', '//kc.example/account/', 'javascript:alert(1)', 'data:text/html,hi', 'https://user:secret@kc.example/account/', 'invalid']) {
    assert.deepEqual(parse({ error: 'external_action_required', redirect_url }), { redirectUrl: null });
  }
  assert.deepEqual(parse({ error: 'external_action_required', redirect_url: 'http://kc.example/account/' }), { redirectUrl: 'http://kc.example/account/' });
});
