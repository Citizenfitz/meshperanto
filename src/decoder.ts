// src/decoder.ts
import { top1000Words } from "./dictionary";
import { getHuffmanTables, computeCanonicalLengths } from "./huffman";

// Must match encoder.ts exactly
const NORMAL_PREFIX = "00";
const CAP_PREFIX = "01";
const ALL_PREFIX = "10";
const ESCAPE_PREFIX = "11";

const LENGTH_BITS = 8;
const WORD_COUNT_BITS = 16;

function getTables() {
  const words = Array.from(top1000Words);
  const lengths = computeCanonicalLengths(words);
  return getHuffmanTables(words, lengths);
}

export function decode(
  buffer: Uint8Array,
  options: { language?: string } = {},
): string {
  if (options.language && options.language !== "en") {
    throw new Error('Only "en" language is supported in v1.0');
  }

  const { decodeTable, maxCodeLength } = getTables();

  let bitPos = 0;
  const totalBits = buffer.length * 8;
  const words: string[] = [];

  const getNextBit = (): string => {
    if (bitPos >= totalBits) throw new Error("Unexpected end of buffer");
    const byte = buffer[bitPos >> 3];
    const bit = (byte >> (7 - (bitPos & 7))) & 1;
    bitPos++;
    return bit.toString();
  };

  // FIX: read 16-bit word count header written by encoder
  let countStr = "";
  for (let i = 0; i < WORD_COUNT_BITS; i++) countStr += getNextBit();
  const wordCount = parseInt(countStr, 2);

  // FIX: loop exactly wordCount times — stops before padding bits
  while (words.length < wordCount) {
    // FIX: read full 2-bit prefix — unambiguous, no overlap with Huffman codes
    const p1 = getNextBit();
    const p2 = getNextBit();
    const prefix = p1 + p2;

    if (prefix === ESCAPE_PREFIX) {
      // Read 8-bit byte length, then raw UTF-8 bytes
      if (bitPos + LENGTH_BITS > totalBits)
        throw new Error("Unexpected end of buffer");
      let lenStr = "";
      for (let i = 0; i < LENGTH_BITS; i++) lenStr += getNextBit();
      const len = parseInt(lenStr, 2);
      if (bitPos + len * 8 > totalBits)
        throw new Error("Unexpected end of buffer");
      const utf8Bytes: number[] = [];
      for (let i = 0; i < len; i++) {
        let byte = 0;
        for (let j = 0; j < 8; j++) {
          byte = (byte << 1) | parseInt(getNextBit(), 10);
        }
        utf8Bytes.push(byte);
      }
      words.push(new TextDecoder().decode(new Uint8Array(utf8Bytes)));
      continue;
    }

    // Huffman decode: read bits one at a time until we find a table match
    let code = "";
    let matched = false;
    for (let i = 0; i < maxCodeLength; i++) {
      if (bitPos >= totalBits) break;
      code += getNextBit();
      if (decodeTable.has(code)) {
        let word = decodeTable.get(code)!;
        if (prefix === CAP_PREFIX) {
          word = word.charAt(0).toUpperCase() + word.slice(1);
        } else if (prefix === ALL_PREFIX) {
          word = word.toUpperCase();
        }
        // NORMAL_PREFIX ("00") needs no transformation
        words.push(word);
        matched = true;
        break;
      }
    }

    // FIX: loud failure instead of silent word drop
    if (!matched) {
      throw new Error(
        `Huffman decode failed at bit ${bitPos} — no match after ${maxCodeLength} bits, accumulated: "${code}"`,
      );
    }
  }

  return words.join(" ");
}
