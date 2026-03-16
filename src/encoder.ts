// src/encoder.ts
import { top1000Words, domainCodes } from "./dictionary";
import { getHuffmanTables, computeCanonicalLengths } from "./huffman";

const NORMAL_PREFIX = "0"; // Normal Huffman code
const CAP_PREFIX = "10"; // CAP flag + Huffman code
const ALL_PREFIX = "110"; // ALL flag + Huffman code
const ESCAPE_PREFIX = "111"; // Escape + 8-bit length + UTF-8
const LENGTH_BITS = 8;

let tablesCache: ReturnType<typeof getHuffmanTables> | null = null;

function getTables() {
  if (!tablesCache) {
    const lengths = computeCanonicalLengths(top1000Words);
    tablesCache = getHuffmanTables(top1000Words, lengths);
  }
  return tablesCache;
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
      // Placeholder - use same namespace when implemented
      bits.push(NORMAL_PREFIX); // temporary
      bits.push(domainCodes[word]);
    } else {
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
