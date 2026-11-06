import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAdvisorHistory, languageInstruction } from './advisor';

test('frontend advisor history excludes errors and keeps latest ten messages', () => {
  const msgs = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'model' as const : 'user' as const, text: String(i), error: i === 3 }));
  const h = buildAdvisorHistory(msgs);
  assert.equal(h.length, 10);
  assert.equal(h.some((x) => x.text === '3'), false);
  assert.equal(h.at(-1)?.text, '11');
});

test('frontend advisor language instruction follows selected language', () => {
  assert.match(languageInstruction('am'), /Amharic/);
  assert.match(languageInstruction('en'), /English/);
});
