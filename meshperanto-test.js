// meshperanto-test.js - Simplified single-file Meshperanto test (plain JS, no deps)
// Run: node meshperanto-test.js

// Tiny dictionary for testing (real version would have 1000+)
const dictionary = [
  "the",
  "of",
  "and",
  "to",
  "a",
  "in",
  "for",
  "is",
  "on",
  "that",
  "this",
  "with",
  "i",
  "you",
  "it",
  "not",
  "or",
  "be",
  "are",
  "from",
  // Domain examples
  "node",
  "gps",
  "qth",
  "meshtastic",
];

// Assign fixed codes (4–6 bits, no tree)
const codeTable = new Map();
const reverseTable = new Map();
dictionary.forEach((word, idx) => {
  let code;
  if (idx < 8)
    code = idx.toString(2).padStart(4, "0"); // 4 bits
  else if (idx < 24)
    code = (idx - 8 + 8).toString(2).padStart(5, "0"); // 5 bits
  else code = (idx - 24 + 24).toString(2).padStart(6, "0"); // 6 bits
  codeTable.set(word, code);
  reverseTable.set(code, word);
});

// Prefixes (namespace avoids collisions)
const NORMAL_PREFIX = "0";
const SPECIAL_PREFIX = "1";
const CAP_SUB = "00"; // 1 + 00 = CAP
const ALL_SUB = "01"; // 1 + 01 = ALL
const ESCAPE_SUB = "1"; // 1 + 1 = escape + 8-bit len

function encode(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const bits = [];

  words.forEach((original) => {
    const word = original.toLowerCase();
    const code = codeTable.get(word);

    if (code) {
      let prefix = NORMAL_PREFIX;
      if (/^[A-Z][a-z]*$/.test(original)) {
        prefix = SPECIAL_PREFIX + CAP_SUB;
      } else if (/^[A-Z]+$/.test(original)) {
        prefix = SPECIAL_PREFIX + ALL_SUB;
      }
      bits.push(prefix + code);
    } else {
      // OOV
      const utf8 = new TextEncoder().encode(original);
      if (utf8.length > 255) throw new Error(`OOV too long: ${original}`);
      const lenBin = utf8.length.toString(2).padStart(8, "0");
      bits.push(SPECIAL_PREFIX + ESCAPE_SUB + lenBin);
      for (const b of utf8) {
        bits.push(b.toString(2).padStart(8, "0"));
      }
    }
  });

  const bitStr = bits.join("");
  const byteLen = Math.ceil(bitStr.length / 8);
  const bytes = new Uint8Array(byteLen);

  for (let i = 0; i < bitStr.length; i++) {
    if (bitStr[i] === "1") {
      bytes[i >> 3] |= 1 << (7 - (i & 7));
    }
  }

  return bytes;
}

function decode(bytes) {
  let bitPos = 0;
  const totalBits = bytes.length * 8;
  const words = [];

  function getBit() {
    if (bitPos >= totalBits) throw new Error("Buffer underflow");
    const b = bytes[bitPos >> 3];
    const bit = (b >> (7 - (bitPos & 7))) & 1;
    bitPos++;
    return bit.toString();
  }

  while (bitPos < totalBits) {
    if (totalBits - bitPos < 5) break; // padding

    const prefix = getBit();

    if (prefix === "0") {
      // Normal word
      let code = "";
      for (let i = 0; i < 6; i++) {
        // max 6 bits
        code += getBit();
        if (reverseTable.has(code)) {
          words.push(reverseTable.get(code));
          break;
        }
      }
    } else {
      // Special
      const sub1 = getBit();
      if (sub1 === "0") {
        const sub2 = getBit();
        let code = "";
        for (let i = 0; i < 6; i++) {
          code += getBit();
          if (reverseTable.has(code)) {
            let w = reverseTable.get(code);
            if (sub2 === "0")
              w = w.charAt(0).toUpperCase() + w.slice(1); // CAP
            else w = w.toUpperCase(); // ALL
            words.push(w);
            break;
          }
        }
      } else {
        // Escape
        let lenStr = "";
        for (let i = 0; i < 8; i++) lenStr += getBit();
        const len = parseInt(lenStr, 2);
        const utf8 = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          let b = 0;
          for (let j = 0; j < 8; j++) {
            b = (b << 1) | parseInt(getBit());
          }
          utf8[i] = b;
        }
        words.push(new TextDecoder().decode(utf8));
      }
    }
  }

  return words.join(" ");
}

// Test harness
const tests = [
  "the quick brown fox",
  "This is a test",
  "GPS at Node ABC",
  "Department S I Was a Teenage Frankenstein.",
  "This is a test to see if it actually fixes the issue",
  "SWIMMINGLY is an adverb",
  "QTH Washington DC",
  "the of and to a in for is on that this with i you it not or be are from",
  "battery low at node xyz need help",
  "ETA 2 hours waypoint 38.8951 -77.0364",
];

console.log("Running Meshperanto simplified tests...\n");

tests.forEach((input, idx) => {
  try {
    const encoded = encode(input);
    const decoded = decode(encoded);
    const hex = Array.from(encoded)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const pass = decoded === input;

    console.log(`Test ${idx + 1}: "${input}"`);
    console.log(`  Encoded (${encoded.length} bytes): ${hex}`);
    console.log(`  Decoded: "${decoded}"`);
    console.log(
      `  ${pass ? "PASS" : "FAIL"}${pass ? "" : ` (expected "${input}")`}\n`,
    );
  } catch (err) {
    console.error(`Test ${idx + 1} failed with error: ${err.message}\n`);
  }
});
