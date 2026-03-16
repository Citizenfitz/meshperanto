import { encode } from "./encoder";
import { decode } from "./decoder";

export { encode, decode };

// Optional stats utility
export function getCompressionStats(text: string): {
  original: number;
  encoded: number;
  ratio: number;
} {
  const original = new TextEncoder().encode(text).length;
  const encoded = encode(text);
  return {
    original,
    encoded: encoded.length,
    ratio: original / encoded.length,
  };
}
