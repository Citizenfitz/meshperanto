// src/decoder.ts
import { top1000Words } from "./dictionary";
import { getHuffmanTables, computeCanonicalLengths } from "./huffman";

const NORMAL_PREFIX = "0";
const CAP_PREFIX = "10";
const ALL_PREFIX = "110";
const ESCAPE_PREFIX = "111";
const LENGTH_BITS = 8;

function getTables() {
  const lengths = computeCanonicalLengths(top1000Words);
  return getHuffmanTables(top1000Words, lengths);
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

  while (bitPos < totalBits) {
    if (totalBits - bitPos < 4) break; // padding / too few bits

    const prefix = getNextBit();

    if (prefix === "0") {
      // Normal Huffman code
      let code = "";
      for (let i = 0; i < maxCodeLength; i++) {
        if (bitPos >= totalBits) break;
        code += getNextBit();
        if (decodeTable.has(code)) {
          words.push(decodeTable.get(code)!);
          break;
        }
      }
    } else {
      // Special mode: read next bits to distinguish
      if (bitPos >= totalBits) break;
      const nextBit = getNextBit();
      if (nextBit === "0") {
        // CAP = "10"
        let code = "";
        for (let i = 0; i < maxCodeLength; i++) {
          if (bitPos >= totalBits) break;
          code += getNextBit();
          if (decodeTable.has(code)) {
            let word = decodeTable.get(code)!;
            word = word.charAt(0).toUpperCase() + word.slice(1);
            words.push(word);
            break;
          }
        }
      } else {
        if (bitPos >= totalBits) break;
        const nextNextBit = getNextBit();
        if (nextNextBit === "0") {
          // ALL = "110"
          let code = "";
          for (let i = 0; i < maxCodeLength; i++) {
            if (bitPos >= totalBits) break;
            code += getNextBit();
            if (decodeTable.has(code)) {
              let word = decodeTable.get(code)!;
              word = word.toUpperCase();
              words.push(word);
              break;
            }
          }
        } else {
          // ESCAPE = "111" + 8-bit length + data
          if (bitPos + LENGTH_BITS > totalBits) break;
          let lenStr = "";
          for (let i = 0; i < LENGTH_BITS; i++) lenStr += getNextBit();
          const len = parseInt(lenStr, 2);
          if (bitPos + len * 8 > totalBits) throw new Error("Unexpected end of buffer");
          const utf8Bytes: number[] = [];
          for (let i = 0; i < len; i++) {
            let byte = 0;
            for (let j = 0; j < 8; j++) {
              byte = (byte << 1) | parseInt(getNextBit(), 2);
            }
            utf8Bytes.push(byte);
          }
          const decoded = new TextDecoder().decode(new Uint8Array(utf8Bytes));
          words.push(decoded);
        }
      }
    }
  }

  return words.join(" ");
}
