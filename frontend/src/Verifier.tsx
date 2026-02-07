import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PixelBlast from "../components/PixelBlast";
import { ParticleCard, BentoCardGrid, GlobalSpotlight, useMobileDetection } from "../components/MagicBento";
import "../components/MagicBento.css";

type Campaign = {
  id: string;
  verifierAddress: string;
  journalistAddress: string;
  totalReleasedXrp: number;
};

type Escrow = {
  id: string;
  campaignId: string;
  amountXrp: number;
  status: "locked" | "released" | "failed";
  escrowCreateTx?: string;
  escrowFinishTx?: string | null;
  finishAfter?: string;
  destinationAddress?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";
const CAMPAIGN_ID = import.meta.env.VITE_CAMPAIGN_ID ?? "cityhall-001";
const VERIFIER_API_TOKEN = import.meta.env.VITE_VERIFIER_API_TOKEN ?? "";
const XRPL_NETWORK = (import.meta.env.VITE_XRPL_NETWORK ?? "testnet").toLowerCase();
const EXPLORER_BASE =
  import.meta.env.VITE_XRPL_EXPLORER_BASE ??
  (XRPL_NETWORK === "devnet"
    ? "https://devnet.xrpl.org/transactions"
    : "https://testnet.xrpl.org/transactions");
const EXPLORER_LABEL = XRPL_NETWORK === "devnet" ? "Devnet" : "Testnet";
const XRPL_TX_HASH_REGEX = /^[A-F0-9]{64}$/i;
const XRPL_ENGINE_CODE_REGEX = /(tec[A-Z_]+|tem[A-Z_]+|tel[A-Z_]+|ter[A-Z_]+)/;

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
      case "verified":
        return "released";
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
  const normalizedHash = txHash.trim();
  if (!XRPL_TX_HASH_REGEX.test(normalizedHash)) return null;

  return (
    <a
      href={`${EXPLORER_BASE}/${normalizedHash}`}
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
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletStatus, setWalletStatus] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();

  const fetchEscrows = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const [campaignRes, escrowsRes] = await Promise.all([
        fetch(`${API_BASE}/api/campaigns/${CAMPAIGN_ID}`),
        fetch(`${API_BASE}/api/escrows`)
      ]);
      if (!campaignRes.ok) throw new Error(`Campaign load failed (${campaignRes.status})`);
      if (!escrowsRes.ok) throw new Error(`Escrow load failed (${escrowsRes.status})`);
      const [campaignData, escrowsData] = await Promise.all([
        campaignRes.json(),
        escrowsRes.json()
      ]);
      setCampaign(campaignData);
      const list = Array.isArray(escrowsData) ? escrowsData : escrowsData.escrows ?? [];
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
    const expectedVerifier = campaign?.verifierAddress?.trim();
    const connected = walletConnected && walletAddress.trim().length > 0;
    if (!connected) {
      setStatus("Connect the verifier wallet before releasing.");
      setStatusType("error");
      return;
    }
    if (!VERIFIER_API_TOKEN.trim()) {
      setStatus("Missing verifier API token in frontend env (VITE_VERIFIER_API_TOKEN).");
      setStatusType("error");
      return;
    }
    if (expectedVerifier && walletAddress.trim() !== expectedVerifier) {
      setStatus("Connected wallet does not match the verifier address on record.");
      setStatusType("error");
      return;
    }
    const escrow = escrows.find((item) => item.id === escrowId);
    if (escrow?.finishAfter) {
      const finishAfterMs = Date.parse(escrow.finishAfter);
      if (!Number.isNaN(finishAfterMs) && Date.now() < finishAfterMs) {
        setStatus(
          `Escrow cannot be released yet. Try again after ${new Date(
            finishAfterMs
          ).toLocaleString()} (engine: tecNO_PERMISSION)`
        );
        setStatusType("info");
        return;
      }
    }

    setReleasingId(escrowId);
    setStatus("Submitting EscrowFinish to XRPL and waiting for ledger validation...");
    setStatusType("info");
    try {
      const res = await fetch(`${API_BASE}/api/escrows/${escrowId}/release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-verifier-token": VERIFIER_API_TOKEN,
          "x-actor-id": walletAddress.trim() || "verifier-ui"
        },
        body: JSON.stringify({ requestId: `release:${escrowId}` })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const baseMessage =
          typeof body?.error === "string" ? body.error : `Release failed (${res.status})`;
        const engineResult =
          typeof body?.engineResult === "string"
            ? body.engineResult
            : typeof body?.details?.engineResult === "string"
              ? body.details.engineResult
              : undefined;
        throw new Error(engineResult ? `${baseMessage} (engine: ${engineResult})` : baseMessage);
      }

      setStatus(`Escrow ${escrowId} released successfully.`);
      setStatusType("success");
      await fetchEscrows();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Release failed";
      const engineCode = message.match(XRPL_ENGINE_CODE_REGEX)?.[0];
      if (engineCode === "tecNO_PERMISSION") {
        setStatus(
          "Escrow cannot be released yet because the finish time has not been reached (engine: tecNO_PERMISSION)"
        );
        setStatusType("info");
      } else if (engineCode === "tecNO_TARGET") {
        setStatus(
          "Escrow target was not found or is already finished (engine: tecNO_TARGET)"
        );
        setStatusType("error");
      } else {
        setStatus(message);
        setStatusType("error");
      }
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
  const verifierMatch = campaign?.verifierAddress
    ? walletAddress.trim() === campaign.verifierAddress.trim()
    : false;

  const connectWallet = () => {
    setWalletStatus(null);
    if (!walletAddress.trim()) {
      setWalletStatus("Enter a verifier wallet address to connect.");
      return;
    }
    setWalletConnected(true);
    setWalletStatus("Verifier wallet connected (local only).");
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
    setWalletStatus("Wallet disconnected.");
  };

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
                {campaign && (
                  <div className="magic-bento-card__description">
                    Total Released: {campaign.totalReleasedXrp} XRP
                  </div>
                )}
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
                <div className="magic-bento-card__label">Verifier Wallet</div>
                {walletConnected && (
                  <StatusBadge status={verifierMatch ? "verified" : "locked"} />
                )}
              </div>
              <div className="magic-bento-card__content" style={{ gap: "12px" }}>
                <div className="magic-bento-card__description">
                  Address on record:
                </div>
                <div className="address-line">{campaign?.verifierAddress ?? "-"}</div>
                <div className="row">
                  <input
                    type="text"
                    placeholder="r... (only stored locally)"
                    value={walletAddress}
                    onChange={(event) => setWalletAddress(event.target.value)}
                    disabled={walletConnected}
                    style={{ minWidth: "240px" }}
                  />
                  {walletConnected ? (
                    <button onClick={disconnectWallet} disabled={loading}>
                      Disconnect
                    </button>
                  ) : (
                    <button onClick={connectWallet} disabled={loading}>
                      Connect
                    </button>
                  )}
                </div>
                {walletConnected && (
                  <div className="wallet-note">
                    Connected: {walletAddress} — Only visible to you
                  </div>
                )}
                {walletConnected && campaign?.verifierAddress && (
                  <div
                    className="wallet-status"
                    style={{ color: verifierMatch ? "#34d399" : "#fca5a5" }}
                  >
                    {verifierMatch
                      ? "Verifier address match"
                      : "Wallet does not match verifier address"}
                  </div>
                )}
                {walletStatus && <div className="wallet-status">{walletStatus}</div>}
              </div>
            </ParticleCard>


          </BentoCardGrid>
        </>

        {status && (
          <div className={`status ${statusType}`} style={{ marginTop: "24px" }}>
            {status}
          </div>
        )}

        {pending.length > 0 && (
          <section className="panel" style={{ marginTop: "24px" }}>
            <h2>Pending Escrows ({pending.length})</h2>
            <ul className="list">
              {pending.map((escrow) => (
                <li key={escrow.id}>
                  <div className="escrow-details">
                    <div className="escrow-header">
                      <div>
                        <div className="escrow-id">{escrow.id}</div>
                        <div className="escrow-amount">{escrow.amountXrp} XRP</div>
                        <span className="status-icon pending">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Pending
                        </span>
                      </div>
                    </div>
                    <div className="escrow-meta">
                      {escrow.escrowCreateTx && (
                        <ExplorerLink txHash={escrow.escrowCreateTx} label="Create Tx" />
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRelease(escrow.id)}
                    disabled={releasingId === escrow.id || !walletConnected || !verifierMatch}
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
                        <div className="escrow-amount">{escrow.amountXrp} XRP</div>
                        <span className="status-icon released">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          Released
                        </span>
                      </div>
                    </div>
                    <div className="escrow-meta">
                      {escrow.destinationAddress && (
                        <div className="address-line">{escrow.destinationAddress}</div>
                      )}
                      {escrow.escrowFinishTx && (
                        <ExplorerLink txHash={escrow.escrowFinishTx} label="Release Tx" />
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
