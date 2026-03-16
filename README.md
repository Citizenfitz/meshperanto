# Meshperanto

Word-level Huffman compression for constrained channels — built for [Meshtastic](https://meshtastic.org/) LoRa mesh networks, where every byte counts.

🌐 [meshperanto.com](https://meshperanto.com) · [citizenfitz.com/](https://citizenfitz.com/)

Meshperanto encodes common English words into compact Huffman-coded bitstreams, typically achieving **1.5–2.5x compression** on natural language. Out-of-vocabulary words fall back gracefully to raw UTF-8. Capitalisation (title case and ALL CAPS) is preserved via flag bits.

---

## Why?

Meshtastic LoRa packets are limited to 237 bytes. A typical sentence of plain text burns through that budget fast. Meshperanto shrinks natural language messages so you can say more per packet, keep message size smaller, and get your messages out faster. It's useful for emergency comms, remote telemetry annotations, and any mesh application where bandwidth is tight.

---

## Installation

```bash
npm install meshperanto
```

---

## Usage

```typescript
import { encode, decode } from "meshperanto";

const bytes = encode("Hello world, this is a test message.");
console.log(bytes.length); // much smaller than the original

const text = decode(bytes);
console.log(text); // 'Hello world, this is a test message.'
```

### `encode(text, options?)`

Encodes a string into a `Uint8Array`.

```typescript
const encoded: Uint8Array = encode("the quick brown fox");
```

- All words are matched case-insensitively against the dictionary
- Title case (`Hello`) and ALL CAPS (`HELLO`) are preserved via prefix flags
- Words not in the dictionary are escaped as raw UTF-8 (with an 8-bit length prefix)
- Only English is supported in v1.0 — passing `options.language` other than `"en"` throws

### `decode(buffer, options?)`

Decodes a `Uint8Array` produced by `encode` back into a string.

```typescript
const text: string = decode(encoded);
```

- Reconstructs capitalisation exactly
- Throws descriptively if the buffer is malformed or truncated

### Compression stats

```typescript
const enc = encode(input);
const stats = {
  original: new TextEncoder().encode(input).length,
  encoded: enc.length,
  ratio: new TextEncoder().encode(input).length / enc.length,
};
console.log(`${stats.ratio.toFixed(2)}x compression`);
```

---

## How it works

Meshperanto uses a **canonical Huffman code** over the 1,000 most frequent English words, with code lengths derived from frequency rank:

```
length = floor(log₂(rank + 2)) + 4
```

This gives shorter codes to more common words (minimum 4 bits) and longer codes to rarer ones (maximum ~14 bits).

Each encoded token is prefixed with a 2-bit flag:

| Prefix | Meaning                                             |
| ------ | --------------------------------------------------- |
| `00`   | Normal (lowercase) Huffman word                     |
| `01`   | Title case (first letter capitalised)               |
| `10`   | ALL CAPS                                            |
| `11`   | Escape — followed by 8-bit length + raw UTF-8 bytes |

A 16-bit word count header is prepended to the bitstream so the decoder knows exactly when to stop, preventing padding bits from being misread as tokens.

---

## Dictionary

The codec ships with the 1,000 most frequent English words, ordered by frequency rank. The word list is derived from Peter Norvig's word frequency analysis of a trillion words of English text — widely considered the gold standard for English word frequency data. See [norvig.com/mayzner.html](http://norvig.com/mayzner.html).

The dictionary is fixed in v1.0 — both encoder and decoder must use the same dictionary, so the codec is **stateless and self-contained**: no dictionary negotiation is needed over the wire.

---

## Building

```bash
npm install
npm run build
```

This bundles `src/` into `dist/` via esbuild, producing both ESM (`dist/index.js`) and CJS (`dist/index.cjs`) outputs.

---

## Testing

```bash
npm test
```

Tests are in `tests/` and run via Node's built-in test runner with `tsx` for TypeScript support. The suite covers:

- Roundtrip fidelity for in-vocabulary sentences
- Title case and ALL CAPS preservation
- Out-of-vocabulary / escape path
- Punctuation attached to words
- Empty string and single-word edge cases
- Compression ratio sanity check
- Encode/decode determinism

---

## Playground

A browser-based playground is included for interactive testing:

```bash
cd playground
npm install
npm run dev
```

Then open `http://localhost:5173`. Type any message, hit **Encode / Decode**, and see the roundtripped result alongside compression stats.

---

## Limitations

- **English only** in v1.0. The dictionary and frequency model are English-specific.
- **Word-level granularity** — punctuation attached to a word (e.g. `message.`) is treated as an OOV token and escaped, which is less efficient than character-level handling. This will improve in future versions.
- **Fixed dictionary** — the codec does not adapt to domain-specific vocabulary. A `domainCodes` extension point exists in the source for future use.
- **Max word length** — escaped words are capped at 255 UTF-8 bytes.

---

## Contributing

This is a personal project maintained on a best-effort basis. Feel free to fork and adapt for your own mesh projects. Bug reports via issues are welcome.

---

## License

MIT © Michael Fitzgerald
