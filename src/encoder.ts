// src/encoder.ts
import { top1000Words, domainCodes } from "./dictionary";
import { getHuffmanTables, computeCanonicalLengths } from "./huffman";

// FIX: uniform 2-bit prefixes — no overlap with Huffman code namespace
const NORMAL_PREFIX = "00";
const CAP_PREFIX = "01";
const ALL_PREFIX = "10";
const ESCAPE_PREFIX = "11";

const LENGTH_BITS = 8;
const WORD_COUNT_BITS = 16;

// FIX: removed redundant local tablesCache — huffman.ts caches internally
function getTables() {
  const words = Array.from(top1000Words);
  const lengths = computeCanonicalLengths(words);
  return getHuffmanTables(words, lengths);
}
export function encode(
  text: string,
  options: { language?: string } = {},
): Uint8Array {
  if (options.language && options.language !== "en") {
    throw new Error('Only "en" language is supported in v1.0');
  }

  const originalWords = text.split(/\s+/).filter(Boolean);
  const lowercaseWords = originalWords.map((w) => w.toLowerCase());

  const bits: string[] = [];
  const { encodeTable } = getTables();

  // FIX: prepend 16-bit word count so decoder knows when to stop,
  // preventing trailing padding bits from being decoded as words
  const wordCountBits = originalWords.length
    .toString(2)
    .padStart(WORD_COUNT_BITS, "0");
  bits.push(wordCountBits);

  for (let i = 0; i < lowercaseWords.length; i++) {
    const word = lowercaseWords[i];
    const original = originalWords[i];
    const code = encodeTable.get(word);

    if (code) {
      if (/^[A-Z][a-z]*$/.test(original)) {
        bits.push(CAP_PREFIX);
      } else if (/^[A-Z]+$/.test(original)) {
        bits.push(ALL_PREFIX);
      } else {
        bits.push(NORMAL_PREFIX);
      }
      bits.push(code);
    } else if (domainCodes[word]) {
      // Placeholder — use dedicated prefix namespace when domain codes are implemented
      bits.push(NORMAL_PREFIX);
      bits.push(domainCodes[word]);
    } else {
      // Escape: emit 2-bit escape prefix + 8-bit byte length + raw UTF-8
      const utf8 = new TextEncoder().encode(original);
      if (utf8.length > 255) {
        throw new Error(`OOV word exceeds 255 UTF-8 bytes: ${original}`);
      }
      const lenBin = utf8.length.toString(2).padStart(LENGTH_BITS, "0");
      bits.push(ESCAPE_PREFIX + lenBin);
      for (const byte of utf8) {
        bits.push(byte.toString(2).padStart(8, "0"));
      }
    }
  }

  const bitString = bits.join("");
  const byteLength = Math.ceil(bitString.length / 8);
  const bytes = new Uint8Array(byteLength);

  for (let i = 0; i < bitString.length; i++) {
    if (bitString[i] === "1") {
      const byteIndex = i >> 3;
      const bitOffset = 7 - (i & 7);
      bytes[byteIndex] |= 1 << bitOffset;
    }
  }

  return bytes;
}
