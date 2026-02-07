import { useEffect, useMemo, useState, useRef } from "react";
import PixelBlast from "../components/PixelBlast";
import { ParticleCard, BentoCardGrid, GlobalSpotlight, useMobileDetection } from '../components/MagicBento';
import '../components/MagicBento.css';
import Verifier from "./Verifier";

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

// MagicBento configuration
const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 400;
const DEFAULT_GLOW_COLOR = "132, 0, 255";

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
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const [view, setView] = useState<"campaign" | "verifier">("campaign");

  const lockedEscrows = useMemo(
    () => escrows.filter((escrow) => escrow.status === "locked"),
    [escrows]
  );

  const reloadData = async () => {
     const [campaignRes, escrowsRes] = await Promise.all([
       fetch(`${API_BASE}/api/campaigns/${CAMPAIGN_ID}`),
       fetch(`${API_BASE}/api/escrows`)
     ]);
     const [campaignData, escrowsData] = await Promise.all([
       campaignRes.json(),
       escrowsRes.json()
     ]);
     setCampaign(campaignData);
     setEscrows(escrowsData.escrows ?? []);
   };

  useEffect(() => {
    const load = async () => {
      try {
        await reloadData();
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
    const amount = Number(amountXrp);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("Enter a valid XRP amount greater than 0.");
      setStatusType("error");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
        campaignId: CAMPAIGN_ID, 
        amountXrp: amount,
        requestId: crypto.randomUUID()  // ← ADD THIS
        })
      });

      const data = await res.json();
      if (res.status === 409) {
        setStatus(`Donation already processed. Escrow ID: ${data.escrowId}`);
        setStatusType("info");
        await reloadData();
        return;
      }

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

  const shouldDisableAnimations = isMobile;

  if (view === "verifier") {
    return (
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 20,
            display: "flex",
            gap: 8
          }}
        >
          <button
            onClick={() => setView("campaign")}
            style={{
              padding: "8px 12px",
              background: "rgba(15, 10, 30, 0.9)",
              color: "#e2e8f0",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12
            }}
          >
            Back to Campaign
          </button>
        </div>
        <Verifier />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      {/* PixelBlast Background Layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <PixelBlast
          color="#8960df"
          pixelSize={4}
          patternDensity={1}
          enableRipples={true}
        />
      </div>

      {/* Main Content Layer */}
      <div className="page" style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 20,
            display: "flex",
            gap: 8
          }}
        >
          <button
            onClick={() => setView("verifier")}
            style={{
              padding: "8px 12px",
              background: "rgba(15, 10, 30, 0.9)",
              color: "#e2e8f0",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12
            }}
          >
            Verifier View
          </button>
        </div>

        {/* Hero Header - Stays on Top */}
        <header className="hero">
          <p className="tag">GLASS BOX FUNDING</p>
          <h1>{campaign?.title ?? "Loading campaign..."}</h1>
          <p className="subtitle">
            {campaign?.description ?? "Glass-box funding for investigative journalism."}
          </p>

          {/* Progress Bar */}
          {campaign?.goalXrp && (
            <ProgressBar
              current={campaign.totalRaisedXrp}
              goal={campaign.goalXrp}
            />
          )}
        </header>

        {/* MagicBento Grid with Campaign Data */}
        <>
          <GlobalSpotlight
            gridRef={gridRef}
            disableAnimations={shouldDisableAnimations}
            enabled={true}
            spotlightRadius={DEFAULT_SPOTLIGHT_RADIUS}
            glowColor={DEFAULT_GLOW_COLOR}
          />

          <BentoCardGrid gridRef={gridRef}>

            {/* Card 1: Total Raised */}
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: '#060010' } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Funding</div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className="magic-bento-card__title">{campaign?.totalRaisedXrp ?? "-"} XRP</h2>
                <p className="magic-bento-card__description">Total Raised</p>
              </div>
            </ParticleCard>

            {/* Card 2: Locked in Escrow */}
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: '#060010' } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Security</div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className="magic-bento-card__title">{campaign?.totalLockedXrp ?? "-"} XRP</h2>
                <p className="magic-bento-card__description">Locked in Escrow</p>
              </div>
            </ParticleCard>

            {/* Card 3: Donation Panel (Large) */}
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: '#060010' } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Support</div>
              </div>
              <div className="magic-bento-card__content" style={{ gap: '16px' }}>
                <h2 className="magic-bento-card__title">Donate (Test XRP)</h2>
                <div className="row" style={{ marginTop: '12px' }}>
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
                <p className="hint" style={{ marginTop: '8px', fontSize: '11px' }}>
                  Pseudonymous by default. No donor identities stored.
                </p>
              </div>
            </ParticleCard>

            {/* Card 4: First Locked Escrow (if available) - Large */}
            {lockedEscrows.length > 0 ? (
              <ParticleCard
                className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
                style={{ backgroundColor: '#060010' } as React.CSSProperties}
                disableAnimations={shouldDisableAnimations}
                particleCount={DEFAULT_PARTICLE_COUNT}
                glowColor={DEFAULT_GLOW_COLOR}
                enableTilt={false}
                clickEffect={true}
                enableMagnetism={false}
              >
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">Pending</div>
                  <StatusBadge status={lockedEscrows[0].status} />
                </div>
                <div className="magic-bento-card__content" style={{ gap: '12px' }}>
                  <div>
                    <div className="escrow-id" style={{ fontSize: '11px', marginBottom: '6px' }}>
                      {lockedEscrows[0].id}
                    </div>
                    <h2 className="magic-bento-card__title">
                      {lockedEscrows[0].amountXrp} XRP
                    </h2>
                  </div>
                  {lockedEscrows[0].escrowCreateTx && (
                    <div style={{ marginTop: '8px' }}>
                      <ExplorerLink
                        txHash={lockedEscrows[0].escrowCreateTx}
                        label="View Tx"
                      />
                    </div>
                  )}
                  {/* <button
                    onClick={() => releaseEscrow(lockedEscrows[0].id)}
                    disabled={loading}
                    style={{ marginTop: '8px', fontSize: '13px', padding: '10px 16px' }}
                  >
                    Verify & Release
                  </button> */}
                </div>
              </ParticleCard>
            ) : (
              <ParticleCard
                className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
                style={{ backgroundColor: '#060010' } as React.CSSProperties}
                disableAnimations={shouldDisableAnimations}
                particleCount={DEFAULT_PARTICLE_COUNT}
                glowColor={DEFAULT_GLOW_COLOR}
                enableTilt={false}
                clickEffect={true}
                enableMagnetism={false}
              >
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">Pending</div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title">No Escrows</h2>
                  <p className="magic-bento-card__description">
                    No locked escrows yet. Create one above.
                  </p>
                </div>
              </ParticleCard>
            )}

            {/* Card 5: Escrow Count */}
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: '#060010' } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Transparency</div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className="magic-bento-card__title">{lockedEscrows.length}</h2>
                <p className="magic-bento-card__description">Active Escrows</p>
              </div>
            </ParticleCard>

            {/* Card 6: Released Funds */}
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: '#060010' } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Released</div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className="magic-bento-card__title">{campaign?.totalReleasedXrp ?? "-"} XRP</h2>
                <p className="magic-bento-card__description">
                  Verified and distributed to journalist
                </p>
              </div>
            </ParticleCard>

          </BentoCardGrid>
        </>

        {/* Status Messages */}
        {status && (
          <div className={`status ${statusType}`} style={{ marginTop: '24px' }}>
            {status}
          </div>
        )}

        {/* Additional Escrows List (if more than 1) */}
        {lockedEscrows.length > 1 && (
          <section className="panel" style={{ marginTop: '24px' }}>
            <h2>All Locked Escrows ({lockedEscrows.length})</h2>
            <ul className="list">
              {lockedEscrows.map((escrow) => (
                <li key={escrow.id}>
                  <div className="escrow-details">
                    <div className="escrow-header">
                      <div>
                        <div className="escrow-id">{escrow.id}</div>
                        <div className="escrow-amount">{escrow.amountXrp} XRP</div>
                      </div>
                      <StatusBadge status={escrow.status} />
                    </div>

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

                  {/* <button onClick={() => releaseEscrow(escrow.id)} disabled={loading}>
                    Verify & Release
                  </button> */}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}