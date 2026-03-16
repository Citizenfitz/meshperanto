import { useState } from "react";
import { encode, decode } from "meshperanto"; // link locally or install

function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<any>(null);

  const handleEncode = () => {
    try {
      const enc = encode(input);
      const decoded = decode(enc);
      setOutput(decoded);
      setStats({
        original: new TextEncoder().encode(input).length,
        encoded: enc.length,
        ratio: new TextEncoder().encode(input).length / enc.length,
      });
    } catch (e) {
      setOutput(`Error: ${e}`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Meshperanto Playground</h1>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter message..."
        rows={5}
        style={{ width: "100%" }}
      />
      <button onClick={handleEncode}>Encode / Decode</button>
      <h3>Decoded:</h3>
      <pre>{output}</pre>
      {stats && (
        <div>
          Original: {stats.original} bytes
          <br />
          Encoded: {stats.encoded} bytes
          <br />
          Ratio: {stats.ratio.toFixed(2)}x
        </div>
      )}
    </div>
  );
}

export default App;
