import { useEffect, useState } from "react";
import axios from "axios";

const BASE = import.meta.env.VITE_BACKEND_URL;

export default function App() {
  const [health, setHealth] = useState(null);
  const [xrpl, setXrpl] = useState(null);

  useEffect(() => {
    axios.get(`${BASE}/health`).then(r => setHealth(r.data)).catch(e => setHealth({ ok: false, error: String(e) }));
    axios.get(`${BASE}/xrpl/ping`).then(r => setXrpl(r.data)).catch(e => setXrpl({ ok: false, error: String(e) }));
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Whistlebox XRPL</h1>
      <h3>Backend health</h3>
      <pre>{JSON.stringify(health, null, 2)}</pre>

      <h3>XRPL ping</h3>
      <pre>{JSON.stringify(xrpl, null, 2)}</pre>
    </div>
  );
}
