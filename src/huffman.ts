// src/huffman.ts
type HuffmanTables = {
  encodeTable: Map<string, string>;
  decodeTable: Map<string, string>;
  maxCodeLength: number;
};

let cachedTables: HuffmanTables | null = null;

export function getHuffmanTables(
  symbols: string[],
  lengths: number[],
): HuffmanTables {
  if (cachedTables) return cachedTables;

  // Zip and sort by length, then by original index (frequency rank) — NOT lex.
  // Canonical Huffman requires stable ordering by frequency within same-length groups.
  const symLen = symbols.map((s, i) => ({ s, l: lengths[i], i }));
  symLen.sort((a, b) => a.l - b.l || a.i - b.i); // FIX: was a.s.localeCompare(b.s)

  const encodeTable = new Map<string, string>();
  let code = 0;
  let currentLength = symLen[0].l;
  for (const { s, l } of symLen) {
    if (l > currentLength) {
      code <<= l - currentLength;
      currentLength = l;
    }
    const binCode = code.toString(2).padStart(l, "0");
    encodeTable.set(s, binCode);
    code += 1;
  }

  const decodeTable = new Map<string, string>();
  encodeTable.forEach((c, s) => decodeTable.set(c, s));

  const maxCodeLength = Math.max(...lengths);

  cachedTables = { encodeTable, decodeTable, maxCodeLength };
  return cachedTables;
}

// Length computation: log-based for better distribution (min 4, max ~10).
// wordList must be ordered by descending frequency for this to be meaningful.
export function computeCanonicalLengths(wordList: string[]): number[] {
  return wordList.map((_, i) => Math.floor(Math.log2(i + 2)) + 4);
}
