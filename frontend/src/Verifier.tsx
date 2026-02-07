import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PixelBlast from "../components/PixelBlast";
import { ParticleCard, BentoCardGrid, GlobalSpotlight, useMobileDetection } from "../components/MagicBento";
import "../components/MagicBento.css";

type Escrow = {
  id: string;
  campaignId: string;
  amount: number;
  status: "locked" | "released" | "failed";
  txHashCreate?: string;
  txHashFinish?: string;
  createdAt: string;
  releasedAt?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";
const XRPL_NETWORK = (import.meta.env.VITE_XRPL_NETWORK ?? "testnet").toLowerCase();
const EXPLORER_BASE =
  import.meta.env.VITE_XRPL_EXPLORER_BASE ??
  (XRPL_NETWORK === "devnet"
    ? "https://devnet.xrpl.org/transactions"
    : "https://testnet.xrpl.org/transactions");
const EXPLORER_LABEL = XRPL_NETWORK === "devnet" ? "Devnet" : "Testnet";

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 400;
const DEFAULT_GLOW_COLOR = "132, 0, 255";

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

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusClass = () => {
    switch (status.toLowerCase()) {
      case "released":
        return "released";
      case "locked":
        return "locked";
      default:
        return "locked";
    }
  };

  return (
    <span className={`status-badge ${getStatusClass()}`}>
      <span className="status-indicator" />
      {status}
    </span>
  );
};

const ExplorerLink = ({ txHash, label }: { txHash: string; label?: string }) => {
  if (!txHash) return null;

  return (
    <a
      href={`${EXPLORER_BASE}/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="explorer-link"
    >
      {label || `View on ${EXPLORER_LABEL} Explorer`}
      <ExternalLinkIcon />
    </a>
  );
};

export default function Verifier() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();

  const fetchEscrows = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/escrows`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.escrows ?? [];
      setEscrows(list);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load escrows!");
      setStatusType("error");
    } finally {
      setLoading(false);
    } 
  }, []);

  useEffect(() => {
    fetchEscrows();
  }, [fetchEscrows]);

  const handleRelease = async (escrowId: string) => {
    setReleasingId(escrowId);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/escrows/${escrowId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Release failed (${res.status})`);
      }

      setStatus(`Escrow ${escrowId} released successfully.`);
      setStatusType("success");
      await fetchEscrows();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Release failed");
      setStatusType("error");
    } finally {
      setReleasingId(null);
    }
  };

  const pending = useMemo(
    () => escrows.filter((escrow) => escrow.status === "locked"),
    [escrows]
  );
  const released = useMemo(
    () => escrows.filter((escrow) => escrow.status === "released"),
    [escrows]
  );

  const shouldDisableAnimations = isMobile;

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100vh", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
        <PixelBlast
          color="#8960df"
          pixelSize={4}
          patternDensity={1}
          enableRipples={true}
        />
      </div>

      <div className="page" style={{ position: "relative", zIndex: 1 }}>
        <header className="hero">
          <p className="tag">VERIFIER DASHBOARD</p>
          <h1>Review Escrows</h1>
          <p className="subtitle">
            Approve locked escrows and release funds to journalists.
          </p>
        </header>

        <>
          <GlobalSpotlight
            gridRef={gridRef}
            disableAnimations={shouldDisableAnimations}
            enabled={true}
            spotlightRadius={DEFAULT_SPOTLIGHT_RADIUS}
            glowColor={DEFAULT_GLOW_COLOR}
          />

          <BentoCardGrid gridRef={gridRef} className="verifier-grid">
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: "#060010", gridColumn: "auto", gridRow: "auto" } as React.CSSProperties}
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
                <h2 className="magic-bento-card__title">{pending.length}</h2>
                <p className="magic-bento-card__description">Awaiting Approval</p>
              </div>
            </ParticleCard>

            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: "#060010" } as React.CSSProperties}
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
                <h2 className="magic-bento-card__title">{released.length}</h2>
                <p className="magic-bento-card__description">Verified Payouts</p>
              </div>
            </ParticleCard>

            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: "#060010" } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Total</div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className="magic-bento-card__title">{escrows.length}</h2>
                <p className="magic-bento-card__description">All Escrows</p>
              </div>
            </ParticleCard>

            {pending.length > 0 ? (
              <ParticleCard
                className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
                style={{ backgroundColor: "#060010", gridColumn: "auto", gridRow: "auto" } as React.CSSProperties}
                disableAnimations={shouldDisableAnimations}
                particleCount={DEFAULT_PARTICLE_COUNT}
                glowColor={DEFAULT_GLOW_COLOR}
                enableTilt={false}
                clickEffect={true}
                enableMagnetism={false}
              >
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">Next Approval</div>
                  <StatusBadge status={pending[0].status} />
                </div>
                <div className="magic-bento-card__content" style={{ gap: "12px" }}>
                  <div>
                    <div className="escrow-id" style={{ fontSize: "11px", marginBottom: "6px" }}>
                      {pending[0].id}
                    </div>
                    <h2 className="magic-bento-card__title">{pending[0].amount} XRP</h2>
                  </div>
                  <div style={{ fontSize: "12px", color: "#a0aec0" }}>
                    Created {new Date(pending[0].createdAt).toLocaleString()}
                  </div>
                  {pending[0].txHashCreate && (
                    <div style={{ marginTop: "8px" }}>
                      <ExplorerLink txHash={pending[0].txHashCreate} label="Create Tx" />
                    </div>
                  )}
                  <button
                    onClick={() => handleRelease(pending[0].id)}
                    disabled={releasingId === pending[0].id}
                    style={{ marginTop: "8px", fontSize: "13px", padding: "10px 16px" }}
                  >
                    {releasingId === pending[0].id ? "Releasing..." : "Approve & Release"}
                  </button>
                </div>
              </ParticleCard>
            ) : (
              <ParticleCard
                className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
                style={{ backgroundColor: "#060010", gridColumn: "auto", gridRow: "auto" } as React.CSSProperties}
                disableAnimations={shouldDisableAnimations}
                particleCount={DEFAULT_PARTICLE_COUNT}
                glowColor={DEFAULT_GLOW_COLOR}
                enableTilt={false}
                clickEffect={true}
                enableMagnetism={false}
              >
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">Next Approval</div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title">No Pending</h2>
                  <p className="magic-bento-card__description">Nothing waiting for review.</p>
                </div>
              </ParticleCard>
            )}

            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: "#060010", gridColumn: "1 / -1" } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Sync</div>
              </div>
              <div className="magic-bento-card__content" style={{ gap: "12px" }}>
                <h2 className="magic-bento-card__title">Refresh</h2>
                <p className="magic-bento-card__description">Pull latest escrows</p>
                <button onClick={fetchEscrows} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </ParticleCard>
          </BentoCardGrid>
        </>

        {status && (
          <div className={`status ${statusType}`} style={{ marginTop: "24px" }}>
            {status}
          </div>
        )}

        {pending.length > 1 && (
          <section className="panel" style={{ marginTop: "24px" }}>
            <h2>All Pending Escrows ({pending.length})</h2>
            <ul className="list">
              {pending.map((escrow) => (
                <li key={escrow.id}>
                  <div className="escrow-details">
                    <div className="escrow-header">
                      <div>
                        <div className="escrow-id">{escrow.id}</div>
                        <div className="escrow-amount">{escrow.amount} XRP</div>
                      </div>
                      <StatusBadge status={escrow.status} />
                    </div>
                    <div className="escrow-meta">
                      <span>{new Date(escrow.createdAt).toLocaleString()}</span>
                      {escrow.txHashCreate && (
                        <ExplorerLink txHash={escrow.txHashCreate} label="Create Tx" />
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRelease(escrow.id)}
                    disabled={releasingId === escrow.id}
                  >
                    {releasingId === escrow.id ? "Releasing..." : "Approve & Release"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {released.length > 0 && (
          <section className="panel" style={{ marginTop: "24px" }}>
            <h2>Released Escrows ({released.length})</h2>
            <ul className="list">
              {released.map((escrow) => (
                <li key={escrow.id}>
                  <div className="escrow-details">
                    <div className="escrow-header">
                      <div>
                        <div className="escrow-id">{escrow.id}</div>
                        <div className="escrow-amount">{escrow.amount} XRP</div>
                      </div>
                      <StatusBadge status={escrow.status} />
                    </div>
                    <div className="escrow-meta">
                      <span>
                        {escrow.releasedAt
                          ? new Date(escrow.releasedAt).toLocaleString()
                          : "Released"}
                      </span>
                      {escrow.txHashFinish && (
                        <ExplorerLink txHash={escrow.txHashFinish} label="Release Tx" />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
