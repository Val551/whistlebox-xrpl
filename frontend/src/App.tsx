import { useEffect, useMemo, useState } from "react";
import PixelBlast from "../components/PixelBlast";

type Campaign = {
  id: string;
  title: string;
  description: string;
  journalistAddress: string;
  verifierAddress: string;
  goalXrp?: number;
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
const EXPLORER_BASE = "https://testnet.xrpl.org/transactions";

// Helper component for external link icon
const ExternalLinkIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusClass = () => {
    switch (status.toLowerCase()) {
      case "locked":
        return "locked";
      case "released":
        return "released";
      default:
        return "pending";
    }
  };

  return (
    <span className={`status-badge ${getStatusClass()}`}>
      <span className="status-indicator" />
      {status}
    </span>
  );
};

// Explorer Link Component
const ExplorerLink = ({ txHash, label }: { txHash: string; label?: string }) => {
  if (!txHash) return null;
  
  return (
    <a
      href={`${EXPLORER_BASE}/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="explorer-link"
    >
      {label || "View on Explorer"}
      <ExternalLinkIcon />
    </a>
  );
};

// Progress Bar Component
const ProgressBar = ({ current, goal }: { current: number; goal: number }) => {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="progress-text">
        {current} XRP raised of {goal} XRP goal ({percentage.toFixed(1)}%)
      </p>
    </div>
  );
};

export default function App() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [amountXrp, setAmountXrp] = useState("25");
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
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
        setStatusType("error");
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
      setStatusType("success");
      
      // Reload data after successful donation
      const escrowsRes = await fetch(`${API_BASE}/api/escrows`);
      const escrowsData = await escrowsRes.json();
      setEscrows(escrowsData.escrows ?? []);
      
      const campaignRes = await fetch(`${API_BASE}/api/campaigns/${CAMPAIGN_ID}`);
      const campaignData = await campaignRes.json();
      setCampaign(campaignData);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Donation failed");
      setStatusType("error");
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
      setStatus(`Escrow ${escrowId} released successfully.`);
      setStatusType("success");
      
      // Reload data after successful release
      const escrowsRes = await fetch(`${API_BASE}/api/escrows`);
      const escrowsData = await escrowsRes.json();
      setEscrows(escrowsData.escrows ?? []);
      
      const campaignRes = await fetch(`${API_BASE}/api/campaigns/${CAMPAIGN_ID}`);
      const campaignData = await campaignRes.json();
      setCampaign(campaignData);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Release failed");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      {/* PixelBlast Background Layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <PixelBlast color="#8960df" 
                    pixelSize={4}
                    patternDensity={1}  // increase from 1 to make pixels more dense
                    enableRipples={true}/>
      </div>
      
      {/* Main Content Layer */}
      <div className="page" style={{ position: 'relative', zIndex: 1 }}>
      <header className="hero">
        <p className="tag">GLASS BOX FUNDING</p>
        <h1>{campaign?.title ?? "Loading campaign..."}</h1>
        <p className="subtitle">
          {campaign?.description ?? "Glass-box funding for investigative journalism."}
        </p>
        
        {/* Progress Bar - Feature #3 */}
        {campaign?.goalXrp && (
          <ProgressBar 
            current={campaign.totalRaisedXrp} 
            goal={campaign.goalXrp} 
          />
        )}
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
                {/* Enhanced Escrow Details - Feature #4 */}
                <div className="escrow-details">
                  <div className="escrow-header">
                    <div>
                      <div className="escrow-id">{escrow.id}</div>
                      <div className="escrow-amount">{escrow.amountXrp} XRP</div>
                    </div>
                    {/* Status Badge - Feature #2 */}
                    <StatusBadge status={escrow.status} />
                  </div>
                  
                  {/* Explorer Links - Feature #1 */}
                  {escrow.escrowCreateTx && (
                    <div className="escrow-meta">
                      <ExplorerLink 
                        txHash={escrow.escrowCreateTx} 
                        label="Create Tx" 
                      />
                      {escrow.escrowFinishTx && (
                        <ExplorerLink 
                          txHash={escrow.escrowFinishTx} 
                          label="Release Tx" 
                        />
                      )}
                    </div>
                  )}
                </div>
                
                <button onClick={() => releaseEscrow(escrow.id)} disabled={loading}>
                  Verify & Release
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Enhanced Status Messages with Types */}
      {status && (
        <div className={`status ${statusType}`}>
          {status}
        </div>
      )}
      </div>
    </div>
  );
}