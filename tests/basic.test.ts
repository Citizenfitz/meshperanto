import { encode, decode } from '../src/index';
import test from 'node:test';
import assert from 'node:assert';

test('round-trip simple text', () => {
  const text = 'the quick brown fox jumps over the lazy dog';
  const encoded = encode(text);
  const decoded = decode(encoded);
  assert.strictEqual(decoded, text.toLowerCase()); // lowercase due to normalization
});

test('OOV fallback', () => {
  const text = 'swim swimmingly';
  const encoded = encode(text);
  const decoded = decode(encoded);
  assert.strictEqual(decoded, text.toLowerCase());
});