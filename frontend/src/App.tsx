import { useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  title: string;
  description: string;
  journalistAddress: string;
  verifierAddress: string;
  totalRaisedXrp: number;
  totalLockedXrp: number;
  totalReleasedXrp: number;
  escrowCount: number;
  status: string;
  escrows?: Array<{ id: string; amountXrp: number; status: string }>;
};

type Escrow = {
  id: string;
  campaignId: string;
  amountXrp: number;
  status: string;
  escrowCreateTx?: string;
  escrowFinishTx?: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";
const CAMPAIGN_ID = import.meta.env.VITE_CAMPAIGN_ID ?? "cityhall-001";

export default function App() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [amountXrp, setAmountXrp] = useState("25");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lockedEscrows = useMemo(
    () => escrows.filter((escrow) => escrow.status === "locked"),
    [escrows]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const campaignRes = await fetch(`${API_BASE}/api/campaigns/${CAMPAIGN_ID}`);
        const campaignData = await campaignRes.json();
        setCampaign(campaignData);

        const escrowsRes = await fetch(`${API_BASE}/api/escrows`);
        const escrowsData = await escrowsRes.json();
        setEscrows(escrowsData.escrows ?? []);
      } catch (error) {
        setStatus("Failed to load campaign data. Is the backend running?");
      }
    };

    load();
  }, []);

  const donate = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: CAMPAIGN_ID, amountXrp: Number(amountXrp) })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Donation failed");
      }

      setStatus(`Donation received. Escrow created: ${data.escrowId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Donation failed");
    } finally {
      setLoading(false);
    }
  };

  const releaseEscrow = async (escrowId: string) => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/escrows/${escrowId}/release`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Release failed");
      }
      setStatus(`Escrow ${escrowId} released (stub).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Release failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <p className="tag">HELPP MEEE</p>
        <h1>{campaign?.title ?? "Loading campaign..."}</h1>
        <p className="subtitle">
          {campaign?.description ?? "Glass-box funding for investigative journalism."}
        </p>
      </header>

      <section className="stats">
        <div>
          <h3>Total Raised</h3>
          <p>{campaign?.totalRaisedXrp ?? "-"} XRP</p>
        </div>
        <div>
          <h3>Locked in Escrow</h3>
          <p>{campaign?.totalLockedXrp ?? "-"} XRP</p>
        </div>
        <div>
          <h3>Released</h3>
          <p>{campaign?.totalReleasedXrp ?? "-"} XRP</p>
        </div>
      </section>

      <section className="panel">
        <h2>Donate (Test XRP)</h2>
        <div className="row">
          <input
            type="number"
            min="1"
            value={amountXrp}
            onChange={(event) => setAmountXrp(event.target.value)}
          />
          <button onClick={donate} disabled={loading}>
            Create Escrow
          </button>
        </div>
        <p className="hint">Pseudonymous by default. No donor identities stored.</p>
      </section>

      <section className="panel">
        <h2>Locked Escrows</h2>
        {lockedEscrows.length === 0 ? (
          <p className="hint">No locked escrows yet.</p>
        ) : (
          <ul className="list">
            {lockedEscrows.map((escrow) => (
              <li key={escrow.id}>
                <div>
                  <strong>{escrow.id}</strong>
                  <span>{escrow.amountXrp} XRP</span>
                </div>
                <button onClick={() => releaseEscrow(escrow.id)} disabled={loading}>
                  Verify & Release
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {status && <div className="status">{status}</div>}
    </div>
  );
}
