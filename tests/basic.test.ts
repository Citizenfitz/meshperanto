import { encode, decode } from "../src/index";
import test from "node:test";
import assert from "node:assert";

// Helper
function roundtrip(s: string): string {
  return decode(encode(s));
}

test("round-trip simple text", () => {
  const text = "the quick brown fox jumps over the lazy dog";
  assert.strictEqual(roundtrip(text), text);
});

test("OOV fallback", () => {
  const text = "swim swimmingly";
  assert.strictEqual(roundtrip(text), text);
});

// --- Capitalisation flags ---
test("title case preserved", () => {
  assert.strictEqual(roundtrip("Hello"), "Hello");
});

test("all caps preserved", () => {
  assert.strictEqual(roundtrip("REALLY"), "REALLY");
});

test("mixed caps in sentence", () => {
  const s = "This is a REALLY big message.";
  assert.strictEqual(roundtrip(s), s);
});

// --- OOV / escape path ---
test("OOV word with punctuation", () => {
  assert.strictEqual(roundtrip("message."), "message.");
});

test("all OOV words", () => {
  assert.strictEqual(
    roundtrip("xylophone bazinga quux"),
    "xylophone bazinga quux",
  );
});

test("OOV mixed with in-vocabulary", () => {
  assert.strictEqual(
    roundtrip("the xylophone is loud"),
    "the xylophone is loud",
  );
});

// --- Edge cases ---
test("empty string", () => {
  assert.strictEqual(roundtrip(""), "");
});

test("single in-vocabulary word", () => {
  assert.strictEqual(roundtrip("the"), "the");
});

test("single character word", () => {
  assert.strictEqual(roundtrip("i"), "i");
});

test("multiple spaces collapsed to one", () => {
  // split/filter normalises multiple spaces — this is expected behaviour
  assert.strictEqual(roundtrip("hello  world"), "hello world");
});

// --- Compression sanity ---
test("common words compress below original size", () => {
  const input = "the the the the the the the the the the";
  const enc = encode(input);
  const original = new TextEncoder().encode(input).length;
  assert.ok(
    enc.length < original,
    `expected compression, got ${enc.length} >= ${original}`,
  );
});

// --- Determinism ---
test("encode is deterministic", () => {
  const input = "this is a test of the encoder";
  assert.deepStrictEqual(encode(input), encode(input));
});
